<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\Sejour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SejourChevauchementTest extends TestCase
{
    use RefreshDatabase;

    private function appartement(): Appartement
    {
        return Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);
    }

    private function sejour(Appartement $appartement, array $overrides = []): Sejour
    {
        $sejour = Sejour::create(array_merge([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-10',
            'date_depart' => '2026-08-15',
            'nom_voyageur' => 'Jean Dupont',
            'statut' => 'a_venir',
            'montant_mad' => 1000,
        ], $overrides));

        $sejour->voyageurs()->create(['nom' => 'Jean Dupont', 'est_principal' => true, 'type' => 'adulte']);

        return $sejour;
    }

    private function payload(Appartement $appartement, string $arrivee, string $depart): array
    {
        return [
            'appartement_id' => $appartement->id,
            'date_arrivee' => $arrivee,
            'date_depart' => $depart,
            'voyageurs' => [
                ['nom' => 'Marie Curie', 'est_principal' => true, 'type' => 'adulte'],
            ],
        ];
    }

    // --- store() ---

    public function test_store_rejects_a_total_overlap_with_an_existing_a_venir_sejour(): void
    {
        $appartement = $this->appartement();
        $this->sejour($appartement, ['date_arrivee' => '2026-08-10', 'date_depart' => '2026-08-20']);

        $response = $this->postJson('/api/sejours', $this->payload($appartement, '2026-08-12', '2026-08-18'));

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'Cet appartement est déjà réservé du 2026-08-10 au 2026-08-20.');
        $this->assertDatabaseCount('sejours', 1);
    }

    public function test_store_rejects_a_partial_overlap_with_an_existing_en_cours_sejour(): void
    {
        $appartement = $this->appartement();
        $this->sejour($appartement, ['date_arrivee' => '2026-08-10', 'date_depart' => '2026-08-15', 'statut' => 'en_cours']);

        // Starts before, ends inside the existing stay.
        $response = $this->postJson('/api/sejours', $this->payload($appartement, '2026-08-05', '2026-08-12'));
        $response->assertStatus(422);

        // Starts inside, ends after the existing stay.
        $response2 = $this->postJson('/api/sejours', $this->payload($appartement, '2026-08-12', '2026-08-20'));
        $response2->assertStatus(422);

        $this->assertDatabaseCount('sejours', 1);
    }

    public function test_store_allows_adjacent_dates_that_do_not_really_overlap(): void
    {
        $appartement = $this->appartement();
        $this->sejour($appartement, ['date_arrivee' => '2026-08-10', 'date_depart' => '2026-08-15']);

        // New arrival on the exact day the existing sejour departs.
        $response = $this->postJson('/api/sejours', $this->payload($appartement, '2026-08-15', '2026-08-20'));
        $response->assertCreated();

        $this->assertDatabaseCount('sejours', 2);
    }

    public function test_store_ignores_termine_sejours_when_checking_for_overlap(): void
    {
        $appartement = $this->appartement();
        $this->sejour($appartement, ['date_arrivee' => '2026-08-10', 'date_depart' => '2026-08-15', 'statut' => 'termine']);

        $response = $this->postJson('/api/sejours', $this->payload($appartement, '2026-08-11', '2026-08-13'));

        $response->assertCreated();
    }

    public function test_store_allows_overlapping_dates_on_a_different_appartement(): void
    {
        $appartement = $this->appartement();
        $autreAppartement = Appartement::create(['nom' => 'Zenith', 'adresse' => 'B', 'statut' => 'disponible']);
        $this->sejour($appartement, ['date_arrivee' => '2026-08-10', 'date_depart' => '2026-08-15']);

        $response = $this->postJson('/api/sejours', $this->payload($autreAppartement, '2026-08-11', '2026-08-13'));

        $response->assertCreated();
    }

    // --- update() ---

    public function test_update_rejects_a_change_that_would_overlap_another_sejour(): void
    {
        $appartement = $this->appartement();
        $this->sejour($appartement, ['date_arrivee' => '2026-08-10', 'date_depart' => '2026-08-15']);
        $autreSejour = $this->sejour($appartement, ['date_arrivee' => '2026-09-01', 'date_depart' => '2026-09-05']);

        $response = $this->patchJson("/api/sejours/{$autreSejour->id}", $this->payload($appartement, '2026-08-12', '2026-08-18'));

        $response->assertStatus(422);
        $response->assertJsonPath('message', 'Cet appartement est déjà réservé du 2026-08-10 au 2026-08-15.');
        $this->assertDatabaseHas('sejours', ['id' => $autreSejour->id, 'date_arrivee' => '2026-09-01']);
    }

    public function test_update_excludes_the_sejour_being_edited_from_the_overlap_check(): void
    {
        $appartement = $this->appartement();
        $sejour = $this->sejour($appartement, ['date_arrivee' => '2026-08-10', 'date_depart' => '2026-08-15']);

        // Shrinking its own date range must not conflict with itself.
        $response = $this->patchJson("/api/sejours/{$sejour->id}", $this->payload($appartement, '2026-08-11', '2026-08-14'));

        $response->assertOk();
        $response->assertJsonPath('date_arrivee', '2026-08-11');
    }
}
