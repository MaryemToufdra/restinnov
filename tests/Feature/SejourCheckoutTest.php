<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\MissionMenage;
use App\Models\Sejour;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SejourCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_a_sejour(): void
    {
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);

        $response = $this->postJson('/api/sejours', [
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Jean Dupont',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('sejours', [
            'appartement_id' => $appartement->id,
            'nom_voyageur' => 'Jean Dupont',
            'statut' => 'a_venir',
        ]);
    }

    public function test_checkout_marks_sejour_termine_and_creates_mission_assigned_to_available_agent(): void
    {
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);

        $agent = Utilisateur::create(['nom' => 'Fatima Z.', 'role' => 'menage', 'telephone' => '0611111111']);
        Utilisateur::create(['nom' => 'Nadia M.', 'role' => 'manager', 'telephone' => '0633333333']);

        $sejour = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Jean Dupont',
        ]);

        $response = $this->patchJson("/api/sejours/{$sejour->id}/checkout");

        $response->assertOk();
        $response->assertJsonPath('sejour.statut', 'termine');
        $response->assertJsonPath('mission_menage.agent_id', $agent->id);
        $response->assertJsonPath('mission_menage.statut', 'a_faire');

        $this->assertDatabaseHas('sejours', [
            'id' => $sejour->id,
            'statut' => 'termine',
        ]);
        $this->assertDatabaseHas('mission_menages', [
            'sejour_id' => $sejour->id,
            'agent_id' => $agent->id,
            'statut' => 'a_faire',
        ]);
    }

    public function test_checkout_assigns_the_least_busy_menage_agent(): void
    {
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);

        $busyAgent = Utilisateur::create(['nom' => 'Fatima Z.', 'role' => 'menage']);
        $freeAgent = Utilisateur::create(['nom' => 'Karim B.', 'role' => 'menage']);

        $previousSejour = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-07-01',
            'date_depart' => '2026-07-05',
            'nom_voyageur' => 'Ancien Voyageur',
        ]);
        MissionMenage::create([
            'sejour_id' => $previousSejour->id,
            'agent_id' => $busyAgent->id,
            'statut' => 'a_faire',
        ]);

        $sejour = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Jean Dupont',
        ]);

        $response = $this->patchJson("/api/sejours/{$sejour->id}/checkout");

        $response->assertOk();
        $response->assertJsonPath('mission_menage.agent_id', $freeAgent->id);
    }

    public function test_checkout_is_rejected_when_sejour_already_terminated(): void
    {
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);

        $sejour = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Jean Dupont',
            'statut' => 'termine',
        ]);

        $response = $this->patchJson("/api/sejours/{$sejour->id}/checkout");

        $response->assertStatus(422);
        $this->assertDatabaseCount('mission_menages', 0);
    }
}
