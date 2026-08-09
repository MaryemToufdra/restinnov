<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\MissionMenage;
use App\Models\Sejour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SejourUpdateTest extends TestCase
{
    use RefreshDatabase;

    private function appartement(string $nom = 'Loft Bastille'): Appartement
    {
        return Appartement::create(['nom' => $nom, 'adresse' => 'A', 'statut' => 'disponible']);
    }

    private function sejour(array $overrides = []): Sejour
    {
        $sejour = Sejour::create(array_merge([
            'appartement_id' => $this->appartement()->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Jean Dupont',
            'statut' => 'a_venir',
            'plateforme_origine' => 'airbnb',
            'montant_mad' => 1000,
        ], $overrides));

        $sejour->voyageurs()->create(['nom' => 'Jean Dupont', 'est_principal' => true, 'type' => 'adulte']);

        return $sejour;
    }

    public function test_it_updates_a_sejour_and_replaces_its_voyageurs(): void
    {
        $sejour = $this->sejour();
        $nouvelAppartement = $this->appartement('Zenith');

        $response = $this->patchJson("/api/sejours/{$sejour->id}", [
            'appartement_id' => $nouvelAppartement->id,
            'date_arrivee' => '2026-09-01',
            'date_depart' => '2026-09-10',
            'plateforme_origine' => 'booking',
            'montant_mad' => 2000,
            'voyageurs' => [
                ['nom' => 'Marie Curie', 'numero_passeport' => 'FR999', 'est_principal' => true, 'type' => 'adulte'],
                ['nom' => 'Petit Curie', 'numero_passeport' => null, 'est_principal' => false, 'type' => 'enfant'],
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('appartement_id', $nouvelAppartement->id);
        $response->assertJsonPath('date_arrivee', '2026-09-01');
        $response->assertJsonPath('date_depart', '2026-09-10');
        $response->assertJsonPath('plateforme_origine', 'booking');
        $response->assertJsonPath('nom_voyageur', 'Marie Curie');
        $response->assertJsonCount(2, 'voyageurs');

        $this->assertDatabaseCount('voyageurs', 2);
        $this->assertDatabaseHas('voyageurs', ['nom' => 'Marie Curie', 'sejour_id' => $sejour->id]);
        $this->assertDatabaseMissing('voyageurs', ['nom' => 'Jean Dupont']);
    }

    public function test_it_rejects_updating_a_sejour_that_is_already_termine(): void
    {
        $sejour = $this->sejour(['statut' => 'termine']);
        MissionMenage::create(['sejour_id' => $sejour->id, 'statut' => 'a_faire']);

        $response = $this->patchJson("/api/sejours/{$sejour->id}", [
            'appartement_id' => $sejour->appartement_id,
            'date_arrivee' => '2026-09-01',
            'date_depart' => '2026-09-10',
            'voyageurs' => [
                ['nom' => 'Marie Curie', 'est_principal' => true, 'type' => 'adulte'],
            ],
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('sejours', ['id' => $sejour->id, 'date_arrivee' => '2026-08-01']);
        $this->assertDatabaseHas('voyageurs', ['nom' => 'Jean Dupont', 'sejour_id' => $sejour->id]);
    }

    public function test_it_allows_updating_an_en_cours_sejour(): void
    {
        $sejour = $this->sejour(['statut' => 'en_cours']);

        $response = $this->patchJson("/api/sejours/{$sejour->id}", [
            'appartement_id' => $sejour->appartement_id,
            'date_arrivee' => '2026-08-02',
            'date_depart' => '2026-08-06',
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'est_principal' => true, 'type' => 'adulte'],
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('date_arrivee', '2026-08-02');
    }

    public function test_it_requires_exactly_one_principal_voyageur_on_update(): void
    {
        $sejour = $this->sejour();

        $response = $this->patchJson("/api/sejours/{$sejour->id}", [
            'appartement_id' => $sejour->appartement_id,
            'date_arrivee' => '2026-08-02',
            'date_depart' => '2026-08-06',
            'voyageurs' => [
                ['nom' => 'A', 'est_principal' => false, 'type' => 'adulte'],
                ['nom' => 'B', 'est_principal' => false, 'type' => 'adulte'],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('voyageurs');
    }

    public function test_it_validates_date_depart_after_date_arrivee_on_update(): void
    {
        $sejour = $this->sejour();

        $response = $this->patchJson("/api/sejours/{$sejour->id}", [
            'appartement_id' => $sejour->appartement_id,
            'date_arrivee' => '2026-08-10',
            'date_depart' => '2026-08-05',
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'est_principal' => true, 'type' => 'adulte'],
            ],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('date_depart');
    }

    public function test_updating_a_venir_sejour_to_a_past_arrival_date_activates_it_immediately(): void
    {
        $sejour = $this->sejour(['statut' => 'a_venir', 'date_arrivee' => '2099-01-01', 'date_depart' => '2099-01-05']);

        $response = $this->patchJson("/api/sejours/{$sejour->id}", [
            'appartement_id' => $sejour->appartement_id,
            'date_arrivee' => now()->subDay()->toDateString(),
            'date_depart' => now()->addDays(3)->toDateString(),
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'est_principal' => true, 'type' => 'adulte'],
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('statut', 'en_cours');
        $this->assertDatabaseHas('sejours', ['id' => $sejour->id, 'statut' => 'en_cours']);
    }

    public function test_updating_a_venir_sejour_to_a_future_arrival_date_leaves_it_a_venir(): void
    {
        $sejour = $this->sejour(['statut' => 'a_venir']);

        $response = $this->patchJson("/api/sejours/{$sejour->id}", [
            'appartement_id' => $sejour->appartement_id,
            'date_arrivee' => now()->addDays(5)->toDateString(),
            'date_depart' => now()->addDays(9)->toDateString(),
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'est_principal' => true, 'type' => 'adulte'],
            ],
        ]);

        $response->assertOk();
        $response->assertJsonPath('statut', 'a_venir');
        $this->assertDatabaseHas('sejours', ['id' => $sejour->id, 'statut' => 'a_venir']);
    }
}
