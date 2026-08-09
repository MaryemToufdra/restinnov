<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\Sejour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AppartementStatutCalculeTest extends TestCase
{
    use RefreshDatabase;

    public function test_appartement_is_occupe_while_it_has_an_en_cours_sejour(): void
    {
        $appartement = Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);
        Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Jean Dupont',
            'statut' => 'en_cours',
            'montant_mad' => 1000,
        ]);

        $response = $this->getJson('/api/appartements');

        $response->assertOk();
        $response->assertJsonPath('0.statut', 'occupe');
    }

    public function test_appartement_is_disponible_when_its_sejours_are_a_venir_or_termine(): void
    {
        $appartement = Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);
        Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-09-01',
            'date_depart' => '2026-09-05',
            'nom_voyageur' => 'Marie Curie',
            'statut' => 'a_venir',
            'montant_mad' => 500,
        ]);
        Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-07-01',
            'date_depart' => '2026-07-05',
            'nom_voyageur' => 'Paul Martin',
            'statut' => 'termine',
            'montant_mad' => 300,
        ]);

        $response = $this->getJson('/api/appartements');

        $response->assertOk();
        $response->assertJsonPath('0.statut', 'disponible');
    }

    public function test_stored_statut_column_is_never_authoritative(): void
    {
        // Directly forced to "occupe" at the DB level, with no en_cours
        // sejour -- the API must still report "disponible".
        Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'occupe']);

        $response = $this->getJson('/api/appartements');

        $response->assertOk();
        $response->assertJsonPath('0.statut', 'disponible');
    }

    public function test_it_reflects_occupe_in_the_dashboard_appartements_list_too(): void
    {
        $appartement = Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);
        Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Jean Dupont',
            'statut' => 'en_cours',
            'montant_mad' => 1000,
        ]);

        $response = $this->getJson('/api/dashboard');

        $response->assertOk();
        $response->assertJsonPath('appartements.0.statut', 'occupe');
    }

    public function test_appartement_returns_to_disponible_once_its_sejour_is_checked_out(): void
    {
        $appartement = Appartement::create(['nom' => 'Loft Bastille', 'adresse' => 'A', 'statut' => 'disponible']);
        $sejour = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Jean Dupont',
            'statut' => 'en_cours',
            'montant_mad' => 1000,
        ]);

        $this->assertSame('occupe', $this->getJson('/api/appartements')->json('0.statut'));

        $sejour->update(['statut' => 'termine']);

        $response = $this->getJson('/api/appartements');
        $response->assertJsonPath('0.statut', 'disponible');
    }
}
