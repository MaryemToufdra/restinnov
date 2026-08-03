<?php

namespace Tests\Feature;

use App\Models\ChecklistModele;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AppartementCreationTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_creates_an_appartement_with_minimal_fields(): void
    {
        $response = $this->postJson('/api/appartements', [
            'nom' => 'Zenith 3ème étage',
            'adresse' => '10 avenue Hassan II, Casablanca',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('statut', 'disponible');
        $this->assertDatabaseHas('appartements', [
            'nom' => 'Zenith 3ème étage',
            'adresse' => '10 avenue Hassan II, Casablanca',
            'statut' => 'disponible',
            'checklist_modele_id' => null,
            'agent_habituel_id' => null,
        ]);
    }

    public function test_it_creates_an_appartement_with_photo_checklist_and_agent_habituel(): void
    {
        Storage::fake('public');

        $checklist = ChecklistModele::create(['nom' => 'Checklist standard']);
        $agent = Utilisateur::create(['nom' => 'Fatima Z.', 'role' => 'menage']);

        $photo = UploadedFile::fake()->image('appartement.jpg');

        $response = $this->post('/api/appartements', [
            'nom' => 'Zenith 3ème étage',
            'adresse' => '10 avenue Hassan II, Casablanca',
            'checklist_modele_id' => $checklist->id,
            'agent_habituel_id' => $agent->id,
            'photo' => $photo,
        ], ['Accept' => 'application/json']);

        $response->assertCreated();
        $response->assertJsonPath('checklist_modele.nom', 'Checklist standard');
        $response->assertJsonPath('agent_habituel.nom', 'Fatima Z.');

        $appartement = $this->getJson('/api/appartements')->json()[0];
        $this->assertNotNull($appartement['photo_principale']);
        Storage::disk('public')->assertExists($appartement['photo_principale']);
    }

    public function test_statut_cannot_be_set_manually_and_defaults_to_disponible(): void
    {
        $response = $this->postJson('/api/appartements', [
            'nom' => 'Zenith 3ème étage',
            'adresse' => '10 avenue Hassan II, Casablanca',
            'statut' => 'occupe',
        ]);

        $response->assertCreated();
        $response->assertJsonPath('statut', 'disponible');
    }

    public function test_agent_habituel_must_have_menage_role(): void
    {
        $manager = Utilisateur::create(['nom' => 'Nadia M.', 'role' => 'manager']);

        $response = $this->postJson('/api/appartements', [
            'nom' => 'Zenith 3ème étage',
            'adresse' => '10 avenue Hassan II, Casablanca',
            'agent_habituel_id' => $manager->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('agent_habituel_id');
    }

    public function test_it_lists_and_creates_checklist_modeles(): void
    {
        ChecklistModele::create(['nom' => 'Checklist standard']);

        $response = $this->getJson('/api/checklist-modeles');
        $response->assertOk();
        $response->assertJsonCount(1);

        $createResponse = $this->postJson('/api/checklist-modeles', [
            'nom' => 'Checklist grand studio',
        ]);
        $createResponse->assertCreated();
        $createResponse->assertJsonPath('nom', 'Checklist grand studio');

        $this->assertDatabaseHas('checklist_modeles', ['nom' => 'Checklist grand studio']);
        $this->getJson('/api/checklist-modeles')->assertJsonCount(2);
    }

    public function test_it_lists_utilisateurs_filtered_by_role(): void
    {
        Utilisateur::create(['nom' => 'Fatima Z.', 'role' => 'menage']);
        Utilisateur::create(['nom' => 'Nadia M.', 'role' => 'manager']);

        $response = $this->getJson('/api/utilisateurs?role=menage');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.nom', 'Fatima Z.');
    }
}
