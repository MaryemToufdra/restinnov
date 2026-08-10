<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
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
        $this->assertDatabaseMissing('utilisateurs', ['nom' => 'Fatima Z.']);
    }

    public function test_it_hashes_the_password_and_never_stores_it_in_plaintext(): void
    {
        $response = $this->postJson('/api/utilisateurs', [
            'nom' => 'Fatima Z.',
            'role' => 'menage',
            'password' => 'secret123',
        ]);

        $response->assertCreated();

        $utilisateur = Utilisateur::where('nom', 'Fatima Z.')->firstOrFail();
        $this->assertNotEquals('secret123', $utilisateur->password);
        $this->assertTrue(Hash::check('secret123', $utilisateur->password));
    }

    public function test_password_is_never_exposed_in_the_response(): void
    {
        $response = $this->postJson('/api/utilisateurs', [
            'nom' => 'Fatima Z.',
            'role' => 'menage',
            'password' => 'secret123',
        ]);

        $response->assertCreated();
        $response->assertJsonMissing(['password']);
        $this->assertArrayNotHasKey('password', $response->json());
    }

    public function test_password_is_optional(): void
    {
        $response = $this->postJson('/api/utilisateurs', [
            'nom' => 'Fatima Z.',
            'role' => 'menage',
        ]);

        $response->assertCreated();
        $this->assertDatabaseHas('utilisateurs', [
            'nom' => 'Fatima Z.',
            'password' => null,
        ]);
    }

    public function test_password_must_be_at_least_6_characters(): void
    {
        $response = $this->postJson('/api/utilisateurs', [
            'nom' => 'Fatima Z.',
            'role' => 'menage',
            'password' => '123',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('password');
    }

    public function test_it_creates_a_maintenance_agent_with_password_and_no_appartement_assignment(): void
    {
        $appartement = Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);

        $response = $this->postJson('/api/utilisateurs', [
            'nom' => 'Karim B.',
            'role' => 'maintenance',
            'telephone' => '0622222222',
            'adresse' => '10 rue de la Paix',
            'password' => 'secret123',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('role', 'maintenance');

        $utilisateur = Utilisateur::where('nom', 'Karim B.')->firstOrFail();
        $this->assertTrue(Hash::check('secret123', $utilisateur->password));

        $this->assertDatabaseHas('appartements', [
            'id' => $appartement->id,
            'agent_habituel_id' => null,
        ]);
    }
}
