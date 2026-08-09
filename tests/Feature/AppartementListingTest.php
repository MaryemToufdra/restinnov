<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\Sejour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppartementListingTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_returns_a_flat_array_by_default(): void
    {
        Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);
        Appartement::create(['nom' => 'Zenith', 'adresse' => 'B', 'statut' => 'disponible']);

        $response = $this->getJson('/api/appartements');

        $response->assertOk();
        $response->assertJsonCount(2);
        $response->assertJsonPath('0.nom', 'Loft Bastille');
    }

    public function test_it_paginates_when_page_or_per_page_is_requested(): void
    {
        for ($i = 1; $i <= 12; $i++) {
            Appartement::create(['nom' => "Appartement {$i}", 'adresse' => 'A', 'statut' => 'disponible']);
        }

        $response = $this->getJson('/api/appartements?per_page=5&page=2');

        $response->assertOk();
        $response->assertJsonStructure(['data', 'current_page', 'last_page', 'per_page', 'total']);
        $response->assertJsonCount(5, 'data');
        $response->assertJsonPath('current_page', 2);
        $response->assertJsonPath('total', 12);
    }

    public function test_it_filters_by_search_on_nom_or_adresse(): void
    {
        Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'Rue de Paris', 'statut' => 'disponible']);
        Appartement::create(['nom' => 'Zenith', 'adresse' => 'Avenue Hassan II', 'statut' => 'disponible']);

        $byNom = $this->getJson('/api/appartements?search=Zenith&page=1');
        $byNom->assertOk();
        $byNom->assertJsonCount(1, 'data');
        $byNom->assertJsonPath('data.0.nom', 'Zenith');

        $byAdresse = $this->getJson('/api/appartements?search=Hassan&page=1');
        $byAdresse->assertOk();
        $byAdresse->assertJsonCount(1, 'data');
        $byAdresse->assertJsonPath('data.0.nom', 'Zenith');
    }

    public function test_it_filters_by_statut(): void
    {
        Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);
        $zenith = Appartement::create(['nom' => 'Zenith', 'adresse' => 'B', 'statut' => 'disponible']);

        // "occupe" is derived from a live en_cours sejour, never from the
        // stored statut column.
        Sejour::create([
            'appartement_id' => $zenith->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Paul Martin',
            'statut' => 'en_cours',
            'montant_mad' => 300,
        ]);

        $response = $this->getJson('/api/appartements?statut=occupe&page=1');

        $response->assertOk();
        $response->assertJsonCount(1, 'data');
        $response->assertJsonPath('data.0.nom', 'Zenith');
    }

    public function test_it_sorts_by_nom_descending(): void
    {
        Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);
        Appartement::create(['nom' => 'Zenith', 'adresse' => 'B', 'statut' => 'disponible']);

        $response = $this->getJson('/api/appartements?sort_by=nom&sort_dir=desc&page=1');

        $response->assertOk();
        $response->assertJsonPath('data.0.nom', 'Zenith');
        $response->assertJsonPath('data.1.nom', 'Loft Bastille');
    }

    public function test_it_reports_sejours_count_and_dernier_sejour_per_appartement(): void
    {
        $appartement = Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);
        Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-01-01',
            'date_depart' => '2026-01-05',
            'nom_voyageur' => 'Jean Dupont',
            'statut' => 'termine',
            'montant_mad' => 1000,
        ]);
        Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-03-01',
            'date_depart' => '2026-03-05',
            'nom_voyageur' => 'Marie Curie',
            'statut' => 'a_venir',
            'montant_mad' => 500,
        ]);

        $response = $this->getJson('/api/appartements');

        $response->assertOk();
        $response->assertJsonPath('0.sejours_count', 2);
        $response->assertJsonPath('0.dernier_sejour', '2026-03-05');
    }
}
