<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\ChecklistItem;
use App\Models\MissionMenage;
use App\Models\Sejour;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MissionMenageAgentWorkspaceTest extends TestCase
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

    // --- index() "mes missions" ---

    public function test_index_lists_only_a_faire_and_en_cours_missions_for_the_given_agent(): void
    {
        $appartement = $this->appartement();
        $agent = $this->agent();
        $autreAgent = $this->agent();

        $missionAFaire = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $agent->id, 'statut' => 'a_faire']);
        $missionEnCours = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $agent->id, 'statut' => 'en_cours']);
        MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $agent->id, 'statut' => 'conforme']);
        MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $autreAgent->id, 'statut' => 'a_faire']);

        $response = $this->getJson("/api/mission-menages?agent_id={$agent->id}");

        $response->assertOk();
        $response->assertJsonCount(2);
        $ids = collect($response->json())->pluck('id');
        $this->assertTrue($ids->contains($missionAFaire->id));
        $this->assertTrue($ids->contains($missionEnCours->id));
    }

    public function test_index_includes_appartement_nom_and_adresse(): void
    {
        $appartement = $this->appartement();
        $agent = $this->agent();
        MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $agent->id, 'statut' => 'a_faire']);

        $response = $this->getJson("/api/mission-menages?agent_id={$agent->id}");

        $response->assertOk();
        $response->assertJsonPath('0.sejour.appartement.nom', 'Loft Bastille');
        $response->assertJsonPath('0.sejour.appartement.adresse', '12 rue de la Roquette');
    }

    public function test_agent_id_is_required_for_index(): void
    {
        $response = $this->getJson('/api/mission-menages');

        $response->assertStatus(422);
    }

    // --- ouvrir() ---

    public function test_ouvrir_marks_vue_and_activates_an_a_faire_mission(): void
    {
        $appartement = $this->appartement();
        $agent = $this->agent();
        $mission = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $agent->id, 'statut' => 'a_faire']);

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/ouvrir");

        $response->assertOk();
        $response->assertJsonPath('vue', true);
        $response->assertJsonPath('statut', 'en_cours');
        $this->assertDatabaseHas('mission_menages', ['id' => $mission->id, 'vue' => true, 'statut' => 'en_cours']);
    }

    public function test_ouvrir_does_not_regress_an_already_en_cours_mission(): void
    {
        $appartement = $this->appartement();
        $agent = $this->agent();
        $mission = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $agent->id, 'statut' => 'en_cours', 'vue' => true]);

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/ouvrir");

        $response->assertOk();
        $response->assertJsonPath('statut', 'en_cours');
    }

    // --- terminer() ---

    public function test_terminer_is_rejected_while_items_remain_unchecked(): void
    {
        $appartement = $this->appartement();
        $agent = $this->agent();
        $mission = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $agent->id, 'statut' => 'en_cours']);
        ChecklistItem::create(['mission_menage_id' => $mission->id, 'libelle' => 'Item 1', 'coche' => true, 'ordre' => 0]);
        ChecklistItem::create(['mission_menage_id' => $mission->id, 'libelle' => 'Item 2', 'coche' => false, 'ordre' => 1]);

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/terminer");

        $response->assertStatus(422);
        $this->assertDatabaseHas('mission_menages', ['id' => $mission->id, 'statut' => 'en_cours']);
    }

    public function test_terminer_succeeds_once_all_items_are_checked(): void
    {
        $appartement = $this->appartement();
        $agent = $this->agent();
        $mission = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $agent->id, 'statut' => 'en_cours']);
        ChecklistItem::create(['mission_menage_id' => $mission->id, 'libelle' => 'Item 1', 'coche' => true, 'ordre' => 0]);
        ChecklistItem::create(['mission_menage_id' => $mission->id, 'libelle' => 'Item 2', 'coche' => true, 'ordre' => 1]);

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/terminer");

        $response->assertOk();
        $response->assertJsonPath('statut', 'conforme');
        $this->assertDatabaseHas('mission_menages', ['id' => $mission->id, 'statut' => 'conforme']);
    }

    public function test_terminer_succeeds_when_there_are_no_checklist_items_at_all(): void
    {
        $appartement = $this->appartement();
        $agent = $this->agent();
        $mission = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $agent->id, 'statut' => 'en_cours']);

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/terminer");

        $response->assertOk();
        $response->assertJsonPath('statut', 'conforme');
    }

    // --- checklist item toggle ---

    public function test_it_toggles_a_checklist_item(): void
    {
        $appartement = $this->appartement();
        $agent = $this->agent();
        $mission = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $agent->id, 'statut' => 'en_cours']);
        $item = ChecklistItem::create(['mission_menage_id' => $mission->id, 'libelle' => 'Item 1', 'coche' => false, 'ordre' => 0]);

        $response = $this->patchJson("/api/checklist-items/{$item->id}", ['coche' => true]);

        $response->assertOk();
        $response->assertJsonPath('coche', true);
        $this->assertDatabaseHas('checklist_items', ['id' => $item->id, 'coche' => true]);
    }

    public function test_it_uncocks_a_checklist_item(): void
    {
        $appartement = $this->appartement();
        $agent = $this->agent();
        $mission = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $agent->id, 'statut' => 'en_cours']);
        $item = ChecklistItem::create(['mission_menage_id' => $mission->id, 'libelle' => 'Item 1', 'coche' => true, 'ordre' => 0]);

        $response = $this->patchJson("/api/checklist-items/{$item->id}", ['coche' => false]);

        $response->assertOk();
        $response->assertJsonPath('coche', false);
    }

    public function test_it_attaches_a_photo_to_a_checklist_item(): void
    {
        \Illuminate\Support\Facades\Storage::fake('public');

        $appartement = $this->appartement();
        $agent = $this->agent();
        $mission = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $agent->id, 'statut' => 'en_cours']);
        $item = ChecklistItem::create(['mission_menage_id' => $mission->id, 'libelle' => 'Item 1', 'coche' => false, 'ordre' => 0]);

        $photo = \Illuminate\Http\UploadedFile::fake()->image('preuve.jpg');

        $response = $this->post("/api/checklist-items/{$item->id}", [
            '_method' => 'PATCH',
            'coche' => 'true',
            'photo' => $photo,
        ]);

        $response->assertOk();
        $response->assertJsonPath('coche', true);
        $this->assertNotNull($response->json('photo_url'));
    }

    // --- ownership: a "menage" account may only act on its own missions ---

    public function test_a_menage_account_always_gets_its_own_missions_regardless_of_the_agent_id_query_param(): void
    {
        $appartement = $this->appartement();
        $moi = $this->actingAsMenage();
        $autreAgent = $this->agent();

        $maMission = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $moi->id, 'statut' => 'a_faire']);
        MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $autreAgent->id, 'statut' => 'a_faire']);

        $response = $this->getJson("/api/mission-menages?agent_id={$autreAgent->id}");

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.id', $maMission->id);
    }

    public function test_a_menage_account_cannot_view_another_agents_mission(): void
    {
        $appartement = $this->appartement();
        $autreAgent = $this->agent();
        $leurMission = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $autreAgent->id, 'statut' => 'a_faire']);

        $this->actingAsMenage();

        $response = $this->getJson("/api/mission-menages/{$leurMission->id}");

        $response->assertStatus(403);
    }

    public function test_a_menage_account_cannot_open_another_agents_mission(): void
    {
        $appartement = $this->appartement();
        $autreAgent = $this->agent();
        $leurMission = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $autreAgent->id, 'statut' => 'a_faire']);

        $this->actingAsMenage();

        $response = $this->patchJson("/api/mission-menages/{$leurMission->id}/ouvrir");

        $response->assertStatus(403);
        $this->assertDatabaseHas('mission_menages', ['id' => $leurMission->id, 'statut' => 'a_faire', 'vue' => false]);
    }

    public function test_a_menage_account_cannot_toggle_a_checklist_item_on_another_agents_mission(): void
    {
        $appartement = $this->appartement();
        $autreAgent = $this->agent();
        $leurMission = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $autreAgent->id, 'statut' => 'en_cours']);
        $item = ChecklistItem::create(['mission_menage_id' => $leurMission->id, 'libelle' => 'Item 1', 'coche' => false, 'ordre' => 0]);

        $this->actingAsMenage();

        $response = $this->patchJson("/api/checklist-items/{$item->id}", ['coche' => true]);

        $response->assertStatus(403);
        $this->assertDatabaseHas('checklist_items', ['id' => $item->id, 'coche' => false]);
    }

    public function test_a_manager_account_can_view_and_act_on_any_agents_mission(): void
    {
        $appartement = $this->appartement();
        $agent = $this->agent();
        $mission = MissionMenage::create(['sejour_id' => $this->sejour($appartement)->id, 'agent_id' => $agent->id, 'statut' => 'a_faire']);

        $this->actingAsManager();

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/ouvrir");

        $response->assertOk();
    }
}
