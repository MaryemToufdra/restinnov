<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\MissionMenage;
use App\Models\Sejour;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MissionMenageRefusTest extends TestCase
{
    use RefreshDatabase;

    private function appartement(): Appartement
    {
        return Appartement::create(['nom' => 'Loft Bastille', 'adresse' => '12 rue de la Roquette', 'statut' => 'disponible']);
    }

    private function agent(): Utilisateur
    {
        return Utilisateur::create(['nom' => 'Fatima Z.', 'role' => 'menage']);
    }

    private function sejour(Appartement $appartement): Sejour
    {
        return Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Jean Dupont',
            'statut' => 'termine',
        ]);
    }

    private function mission(array $overrides = []): MissionMenage
    {
        $appartement = $this->appartement();

        return MissionMenage::create(array_merge([
            'sejour_id' => $this->sejour($appartement)->id,
            'agent_id' => $this->agent()->id,
            'statut' => 'en_attente_validation',
        ], $overrides));
    }

    public function test_refuser_requires_at_least_one_of_motif_audio_or_photo(): void
    {
        $mission = $this->mission();

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/refuser", []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('motif');
        $this->assertDatabaseHas('mission_menages', ['id' => $mission->id, 'statut' => 'en_attente_validation']);
    }

    public function test_refuser_with_text_motif_moves_the_mission_to_non_conforme(): void
    {
        $manager = $this->actingAsManager();
        $mission = $this->mission();

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/refuser", [
            'motif' => 'La salle de bain n\'est pas propre.',
        ]);

        $response->assertOk();
        $response->assertJsonPath('statut', 'non_conforme');
        $this->assertDatabaseHas('mission_menages', ['id' => $mission->id, 'statut' => 'non_conforme']);
        $this->assertDatabaseHas('mission_menage_refus', [
            'mission_menage_id' => $mission->id,
            'manager_id' => $manager->id,
            'motif' => 'La salle de bain n\'est pas propre.',
        ]);
    }

    public function test_refuser_accepts_audio_only(): void
    {
        $mission = $this->mission();

        $response = $this->patch("/api/mission-menages/{$mission->id}/refuser", [
            'motif_audio' => UploadedFile::fake()->create('motif.mp3', 100, 'audio/mpeg'),
        ]);

        $response->assertOk();
        $response->assertJsonPath('statut', 'non_conforme');
        $refus = $mission->refus()->first();
        $this->assertNotNull($refus->motif_audio_url);
        $this->assertNull($refus->motif);
    }

    public function test_refuser_accepts_photo_only(): void
    {
        $mission = $this->mission();

        $response = $this->patch("/api/mission-menages/{$mission->id}/refuser", [
            'motif_photo' => UploadedFile::fake()->image('motif.jpg'),
        ]);

        $response->assertOk();
        $refus = $mission->refus()->first();
        $this->assertNotNull($refus->motif_photo_url);
    }

    public function test_refuser_is_rejected_when_not_en_attente_validation(): void
    {
        foreach (['a_faire', 'en_cours', 'conforme', 'non_conforme'] as $statut) {
            $mission = $this->mission(['statut' => $statut]);

            $response = $this->patchJson("/api/mission-menages/{$mission->id}/refuser", ['motif' => 'Motif.']);

            $response->assertStatus(422);
            $this->assertDatabaseHas('mission_menages', ['id' => $mission->id, 'statut' => $statut]);
        }
    }

    public function test_refuser_is_forbidden_for_a_menage_account(): void
    {
        $mission = $this->mission();
        $this->actingAsMenage();

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/refuser", ['motif' => 'Motif.']);

        $response->assertStatus(403);
    }

    public function test_refuser_keeps_every_successive_refusal_in_history(): void
    {
        $manager = $this->actingAsManager();
        $mission = $this->mission();

        $this->patchJson("/api/mission-menages/{$mission->id}/refuser", ['motif' => 'Premier refus.'])->assertOk();

        $mission->refresh()->update(['statut' => 'en_attente_validation']);

        $this->patchJson("/api/mission-menages/{$mission->id}/refuser", ['motif' => 'Second refus.'])->assertOk();

        $this->assertDatabaseCount('mission_menage_refus', 2);
        $this->assertDatabaseHas('mission_menage_refus', ['mission_menage_id' => $mission->id, 'motif' => 'Premier refus.']);
        $this->assertDatabaseHas('mission_menage_refus', ['mission_menage_id' => $mission->id, 'motif' => 'Second refus.']);
    }

    public function test_refuser_never_reassigns_the_mission(): void
    {
        $agent = $this->agent();
        $mission = $this->mission(['agent_id' => $agent->id]);

        $this->patchJson("/api/mission-menages/{$mission->id}/refuser", ['motif' => 'Motif.'])->assertOk();

        $this->assertDatabaseHas('mission_menages', ['id' => $mission->id, 'agent_id' => $agent->id]);
    }

    public function test_index_exposes_refus_to_the_owning_agent_without_the_manager_identity(): void
    {
        $agent = $this->agent();
        $mission = $this->mission(['agent_id' => $agent->id, 'statut' => 'non_conforme']);
        $mission->refus()->create(['manager_id' => $this->actingAsManager()->id, 'motif' => 'Motif visible.']);

        Sanctum::actingAs($agent, ['*']);

        $response = $this->getJson('/api/mission-menages?agent_id='.$agent->id);

        $response->assertOk();
        $response->assertJsonPath('0.refus.0.motif', 'Motif visible.');
        $this->assertArrayNotHasKey('manager', $response->json('0.refus.0'));
    }

    public function test_refus_vu_marks_every_unread_refus_as_seen(): void
    {
        $agent = $this->agent();
        $mission = $this->mission(['agent_id' => $agent->id, 'statut' => 'non_conforme']);
        $mission->refus()->create(['manager_id' => $this->actingAsManager()->id, 'motif' => 'Motif.']);

        Sanctum::actingAs($agent, ['*']);

        $this->assertFalse($mission->refus()->first()->vu);

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/refus-vu");

        $response->assertOk();
        $this->assertTrue($mission->refus()->first()->fresh()->vu);
    }

    public function test_refus_vu_is_forbidden_for_another_agent(): void
    {
        $mission = $this->mission(['statut' => 'non_conforme']);
        $otherAgent = Utilisateur::create(['nom' => 'Autre Agent', 'role' => 'menage']);
        Sanctum::actingAs($otherAgent, ['*']);

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/refus-vu");

        $response->assertStatus(403);
    }
}
