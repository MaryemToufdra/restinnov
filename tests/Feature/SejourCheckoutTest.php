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
            'date_arrivee' => now()->addDays(5)->toDateString(),
            'date_depart' => now()->addDays(9)->toDateString(),
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'numero_passeport' => null, 'est_principal' => true],
            ],
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('sejours', [
            'appartement_id' => $appartement->id,
            'nom_voyageur' => 'Jean Dupont',
            'statut' => 'a_venir',
            'plateforme_origine' => 'airbnb',
            'montant_mad' => 0,
        ]);
        $this->assertDatabaseHas('voyageurs', [
            'nom' => 'Jean Dupont',
            'est_principal' => true,
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

    public function test_checkout_never_assigns_a_deactivated_agent_even_if_least_busy(): void
    {
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);

        Utilisateur::create(['nom' => 'Inactive Fatima', 'role' => 'menage', 'actif' => false]);
        $activeAgent = Utilisateur::create(['nom' => 'Karim B.', 'role' => 'menage']);

        $sejour = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Jean Dupont',
        ]);

        $response = $this->patchJson("/api/sejours/{$sejour->id}/checkout");

        $response->assertOk();
        $response->assertJsonPath('mission_menage.agent_id', $activeAgent->id);
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

    public function test_it_lists_sejours_with_appartement_and_mission_menage(): void
    {
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);

        $agent = Utilisateur::create(['nom' => 'Fatima Z.', 'role' => 'menage']);

        $sejour = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Jean Dupont',
            'statut' => 'termine',
        ]);
        MissionMenage::create([
            'sejour_id' => $sejour->id,
            'agent_id' => $agent->id,
            'statut' => 'a_faire',
        ]);

        $response = $this->getJson('/api/sejours');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.nom_voyageur', 'Jean Dupont');
        $response->assertJsonPath('data.0.appartement.nom', 'Loft Bastille');
        $response->assertJsonPath('data.0.mission_menage.agent.nom', 'Fatima Z.');
    }

    public function test_it_lists_appartements(): void
    {
        Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);

        $response = $this->getJson('/api/appartements');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.nom', 'Loft Bastille');
    }
}
