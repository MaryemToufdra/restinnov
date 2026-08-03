<?php

namespace Tests\Feature;

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
}
