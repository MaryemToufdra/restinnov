<?php

namespace Tests\Feature;

use App\Models\Appartement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SejourVoyageursTest extends TestCase
{
    use RefreshDatabase;

    private function appartement(): Appartement
    {
        return Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);
    }

    public function test_it_creates_a_sejour_with_multiple_voyageurs(): void
    {
        $appartement = $this->appartement();

        $response = $this->postJson('/api/sejours', [
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'plateforme_origine' => 'direct',
            'montant_mad' => 1500,
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'numero_passeport' => 'FR123456', 'est_principal' => true],
                ['nom' => 'Marie Dupont', 'numero_passeport' => null, 'est_principal' => false],
            ],
        ]);

        $response->assertCreated();
        $response->assertJsonPath('nom_voyageur', 'Jean Dupont');
        $response->assertJsonPath('plateforme_origine', 'direct');
        $response->assertJsonCount(2, 'voyageurs');

        $this->assertDatabaseHas('sejours', [
            'appartement_id' => $appartement->id,
            'plateforme_origine' => 'direct',
            'montant_mad' => 1500,
        ]);
        $this->assertDatabaseHas('voyageurs', [
            'nom' => 'Jean Dupont',
            'numero_passeport' => 'FR123456',
            'est_principal' => true,
        ]);
        $this->assertDatabaseHas('voyageurs', [
            'nom' => 'Marie Dupont',
            'numero_passeport' => null,
            'est_principal' => false,
        ]);
    }

    public function test_it_rejects_a_sejour_with_no_principal_voyageur(): void
    {
        $appartement = $this->appartement();

        $response = $this->postJson('/api/sejours', [
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'est_principal' => false],
                ['nom' => 'Marie Dupont', 'est_principal' => false],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('voyageurs');
        $this->assertDatabaseCount('sejours', 0);
        $this->assertDatabaseCount('voyageurs', 0);
    }

    public function test_it_rejects_a_sejour_with_more_than_one_principal_voyageur(): void
    {
        $appartement = $this->appartement();

        $response = $this->postJson('/api/sejours', [
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'est_principal' => true],
                ['nom' => 'Marie Dupont', 'est_principal' => true],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('voyageurs');
        $this->assertDatabaseCount('sejours', 0);
        $this->assertDatabaseCount('voyageurs', 0);
    }

    public function test_it_rejects_a_sejour_with_no_voyageur(): void
    {
        $appartement = $this->appartement();

        $response = $this->postJson('/api/sejours', [
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'voyageurs' => [],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('voyageurs');
    }

    public function test_it_rejects_a_sejour_where_depart_is_not_strictly_after_arrivee(): void
    {
        $appartement = $this->appartement();

        $response = $this->postJson('/api/sejours', [
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-05',
            'date_depart' => '2026-08-05',
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'est_principal' => true],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('date_depart');
    }

    public function test_it_defaults_plateforme_origine_to_airbnb_and_montant_to_zero(): void
    {
        $appartement = $this->appartement();

        $response = $this->postJson('/api/sejours', [
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'est_principal' => true],
            ],
        ]);

        $response->assertCreated();
        $response->assertJsonPath('plateforme_origine', 'airbnb');
        $this->assertDatabaseHas('sejours', [
            'appartement_id' => $appartement->id,
            'plateforme_origine' => 'airbnb',
            'montant_mad' => 0,
        ]);
    }

    public function test_it_accepts_booking_as_plateforme_origine(): void
    {
        $appartement = $this->appartement();

        $response = $this->postJson('/api/sejours', [
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'plateforme_origine' => 'booking',
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'est_principal' => true],
            ],
        ]);

        $response->assertCreated();
        $response->assertJsonPath('plateforme_origine', 'booking');
        $this->assertDatabaseHas('sejours', [
            'appartement_id' => $appartement->id,
            'plateforme_origine' => 'booking',
        ]);
    }
}
