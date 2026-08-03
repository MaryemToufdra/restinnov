<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\FraisMaintenance;
use App\Models\Sejour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FraisMaintenanceTest extends TestCase
{
    use RefreshDatabase;

    private function sejour(): Sejour
    {
        $appartement = Appartement::create(['nom' => 'Loft', 'adresse' => 'A', 'statut' => 'disponible']);

        return Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-01-01',
            'date_depart' => '2026-01-02',
            'nom_voyageur' => 'X',
        ]);
    }

    public function test_it_creates_a_frais_maintenance_for_a_sejour(): void
    {
        $sejour = $this->sejour();

        $response = $this->postJson("/api/sejours/{$sejour->id}/frais-maintenance", [
            'description' => 'Réparation robinet',
            'prix' => 250,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('description', 'Réparation robinet');
        $this->assertDatabaseHas('frais_maintenance', [
            'sejour_id' => $sejour->id,
            'description' => 'Réparation robinet',
            'prix' => 250,
        ]);
    }

    public function test_description_and_prix_are_required(): void
    {
        $sejour = $this->sejour();

        $response = $this->postJson("/api/sejours/{$sejour->id}/frais-maintenance", []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['description', 'prix']);
    }

    public function test_it_deletes_a_frais_maintenance(): void
    {
        $sejour = $this->sejour();
        $frais = FraisMaintenance::create([
            'sejour_id' => $sejour->id,
            'description' => 'Réparation robinet',
            'prix' => 250,
        ]);

        $response = $this->deleteJson("/api/frais-maintenance/{$frais->id}");

        $response->assertNoContent();
        $this->assertDatabaseMissing('frais_maintenance', ['id' => $frais->id]);
    }
}
