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

    public function test_voyageur_type_defaults_to_adulte_when_not_provided(): void
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
        $response->assertJsonPath('voyageurs.0.type', 'adulte');
        $this->assertDatabaseHas('voyageurs', [
            'nom' => 'Jean Dupont',
            'type' => 'adulte',
        ]);
    }

    public function test_it_creates_a_sejour_with_adults_and_children(): void
    {
        $appartement = $this->appartement();

        $response = $this->postJson('/api/sejours', [
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'est_principal' => true, 'type' => 'adulte'],
                ['nom' => 'Marie Dupont', 'est_principal' => false, 'type' => 'adulte'],
                ['nom' => 'Petit Dupont', 'est_principal' => false, 'type' => 'enfant'],
            ],
        ]);

        $response->assertCreated();
        $response->assertJsonCount(3, 'voyageurs');
        $this->assertDatabaseHas('voyageurs', ['nom' => 'Jean Dupont', 'type' => 'adulte']);
        $this->assertDatabaseHas('voyageurs', ['nom' => 'Marie Dupont', 'type' => 'adulte']);
        $this->assertDatabaseHas('voyageurs', ['nom' => 'Petit Dupont', 'type' => 'enfant']);
    }

    public function test_it_rejects_a_sejour_when_principal_voyageur_is_not_adulte(): void
    {
        $appartement = $this->appartement();

        $response = $this->postJson('/api/sejours', [
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'voyageurs' => [
                ['nom' => 'Adulte Dupont', 'est_principal' => false, 'type' => 'adulte'],
                ['nom' => 'Petit Dupont', 'est_principal' => true, 'type' => 'enfant'],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('voyageurs');
        $this->assertDatabaseCount('sejours', 0);
        $this->assertDatabaseCount('voyageurs', 0);
    }

    public function test_it_rejects_a_sejour_with_no_adulte_voyageur(): void
    {
        $appartement = $this->appartement();

        $response = $this->postJson('/api/sejours', [
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'voyageurs' => [
                ['nom' => 'Petit Dupont', 'est_principal' => true, 'type' => 'enfant'],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('voyageurs');
        $this->assertDatabaseCount('sejours', 0);
        $this->assertDatabaseCount('voyageurs', 0);
    }

    public function test_it_rejects_an_invalid_voyageur_type(): void
    {
        $appartement = $this->appartement();

        $response = $this->postJson('/api/sejours', [
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'est_principal' => true, 'type' => 'senior'],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('voyageurs.0.type');
    }
}
