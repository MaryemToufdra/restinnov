<?php

namespace Tests\Feature;

use App\Models\Appartement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UtilisateurCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_an_utilisateur(): void
    {
        $response = $this->postJson('/api/utilisateurs', [
            'nom' => 'Fatima Z.',
            'role' => 'menage',
            'telephone' => '0611111111',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('nom', 'Fatima Z.');
        $response->assertJsonPath('role', 'menage');
        $this->assertDatabaseHas('utilisateurs', [
            'nom' => 'Fatima Z.',
            'role' => 'menage',
            'telephone' => '0611111111',
        ]);
    }

    public function test_it_creates_an_utilisateur_without_telephone(): void
    {
        $response = $this->postJson('/api/utilisateurs', [
            'nom' => 'Karim B.',
            'role' => 'maintenance',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('utilisateurs', [
            'nom' => 'Karim B.',
            'role' => 'maintenance',
            'telephone' => null,
        ]);
    }

    public function test_nom_is_required(): void
    {
        $response = $this->postJson('/api/utilisateurs', [
            'role' => 'menage',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('nom');
    }

    public function test_role_is_required_and_must_be_valid(): void
    {
        $response = $this->postJson('/api/utilisateurs', [
            'nom' => 'Fatima Z.',
            'role' => 'invalide',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('role');
    }

    public function test_it_creates_an_utilisateur_with_adresse(): void
    {
        $response = $this->postJson('/api/utilisateurs', [
            'nom' => 'Fatima Z.',
            'role' => 'menage',
            'adresse' => '5 rue des Fleurs, Casablanca',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('adresse', '5 rue des Fleurs, Casablanca');
        $this->assertDatabaseHas('utilisateurs', [
            'nom' => 'Fatima Z.',
            'adresse' => '5 rue des Fleurs, Casablanca',
        ]);
    }

    public function test_it_assigns_the_new_agent_as_agent_habituel_of_selected_appartements(): void
    {
        $appartement1 = Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);
        $appartement2 = Appartement::create(['nom' => 'Zenith', 'adresse' => 'B', 'statut' => 'disponible']);
        $untouched = Appartement::create(['nom' => 'Studio Montmartre', 'adresse' => 'C', 'statut' => 'disponible']);

        $response = $this->postJson('/api/utilisateurs', [
            'nom' => 'Fatima Z.',
            'role' => 'menage',
            'appartement_ids' => [$appartement1->id, $appartement2->id],
        ]);

        $response->assertCreated();
        $agentId = $response->json('id');

        $this->assertDatabaseHas('appartements', [
            'id' => $appartement1->id,
            'agent_habituel_id' => $agentId,
        ]);
        $this->assertDatabaseHas('appartements', [
            'id' => $appartement2->id,
            'agent_habituel_id' => $agentId,
        ]);
        $this->assertDatabaseHas('appartements', [
            'id' => $untouched->id,
            'agent_habituel_id' => null,
        ]);
    }

    public function test_appartement_ids_must_reference_existing_appartements(): void
    {
        $response = $this->postJson('/api/utilisateurs', [
            'nom' => 'Fatima Z.',
            'role' => 'menage',
            'appartement_ids' => [999],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('appartement_ids.0');
        $this->assertDatabaseCount('utilisateurs', 0);
    }
}
