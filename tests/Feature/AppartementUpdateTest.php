<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\ChecklistModele;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppartementUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_updates_nom_and_adresse(): void
    {
        $appartement = Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);

        $response = $this->patchJson("/api/appartements/{$appartement->id}", [
            'nom' => 'Loft Bastille rénové',
            'adresse' => 'Nouvelle adresse',
        ]);

        $response->assertOk();
        $response->assertJsonPath('nom', 'Loft Bastille rénové');
        $response->assertJsonPath('adresse', 'Nouvelle adresse');
        $this->assertDatabaseHas('appartements', ['id' => $appartement->id, 'nom' => 'Loft Bastille rénové']);
    }

    public function test_it_updates_checklist_and_agent_habituel(): void
    {
        $appartement = Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);
        $checklist = ChecklistModele::create(['nom' => 'Checklist standard']);
        $agent = Utilisateur::create(['nom' => 'Fatima Z.', 'role' => 'menage']);

        $response = $this->patchJson("/api/appartements/{$appartement->id}", [
            'nom' => 'Loft Bastille',
            'adresse' => 'A',
            'checklist_modele_id' => $checklist->id,
            'agent_habituel_id' => $agent->id,
        ]);

        $response->assertOk();
        $response->assertJsonPath('checklist_modele.nom', 'Checklist standard');
        $response->assertJsonPath('agent_habituel.nom', 'Fatima Z.');
    }

    public function test_it_replaces_the_agent_habituel_when_changed(): void
    {
        $agent1 = Utilisateur::create(['nom' => 'Fatima Z.', 'role' => 'menage']);
        $agent2 = Utilisateur::create(['nom' => 'Karim B.', 'role' => 'menage']);
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => 'A',
            'statut' => 'disponible',
            'agent_habituel_id' => $agent1->id,
        ]);

        $response = $this->patchJson("/api/appartements/{$appartement->id}", [
            'nom' => 'Loft Bastille',
            'adresse' => 'A',
            'agent_habituel_id' => $agent2->id,
        ]);

        $response->assertOk();
        $response->assertJsonPath('agent_habituel_id', $agent2->id);
        $this->assertDatabaseHas('appartements', ['id' => $appartement->id, 'agent_habituel_id' => $agent2->id]);
    }

    public function test_statut_cannot_be_changed_via_update(): void
    {
        $appartement = Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);

        $response = $this->patchJson("/api/appartements/{$appartement->id}", [
            'nom' => 'Loft Bastille',
            'adresse' => 'A',
            'statut' => 'occupe',
        ]);

        $response->assertOk();
        $response->assertJsonPath('statut', 'disponible');
        $this->assertDatabaseHas('appartements', ['id' => $appartement->id, 'statut' => 'disponible']);
    }

    public function test_agent_habituel_must_have_menage_role_on_update(): void
    {
        $appartement = Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);
        $manager = Utilisateur::create(['nom' => 'Nadia M.', 'role' => 'manager']);

        $response = $this->patchJson("/api/appartements/{$appartement->id}", [
            'nom' => 'Loft Bastille',
            'adresse' => 'A',
            'agent_habituel_id' => $manager->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('agent_habituel_id');
    }

    public function test_nom_and_adresse_are_required_on_update(): void
    {
        $appartement = Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);

        $response = $this->patchJson("/api/appartements/{$appartement->id}", [
            'nom' => '',
            'adresse' => '',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['nom', 'adresse']);
    }
}
