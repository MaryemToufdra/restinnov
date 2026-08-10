<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\Sejour;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CheckoutAutomatiqueCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_checks_out_en_cours_sejours_departing_today_and_creates_their_mission(): void
    {
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);
        $agent = Utilisateur::create(['nom' => 'Fatima Z.', 'role' => Utilisateur::ROLE_MENAGE]);

        $sejourAujourdhui = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => now()->subDays(3)->toDateString(),
            'date_depart' => now()->toDateString(),
            'nom_voyageur' => 'Jean Dupont',
            'statut' => Sejour::STATUT_EN_COURS,
        ]);

        $sejourDemain = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => now()->subDays(2)->toDateString(),
            'date_depart' => now()->addDay()->toDateString(),
            'nom_voyageur' => 'Marie Curie',
            'statut' => Sejour::STATUT_EN_COURS,
        ]);

        $this->artisan('sejours:checkout-automatique')->assertSuccessful();

        $sejourAujourdhui->refresh();
        $this->assertSame(Sejour::STATUT_TERMINE, $sejourAujourdhui->statut);
        $this->assertDatabaseHas('mission_menages', [
            'sejour_id' => $sejourAujourdhui->id,
            'agent_id' => $agent->id,
            'statut' => 'a_faire',
        ]);

        $sejourDemain->refresh();
        $this->assertSame(Sejour::STATUT_EN_COURS, $sejourDemain->statut);
        $this->assertDatabaseMissing('mission_menages', ['sejour_id' => $sejourDemain->id]);
    }

    public function test_it_checks_out_en_cours_sejours_whose_departure_date_has_already_passed(): void
    {
        // Simulates a missed run (e.g. scheduler container was down for a
        // few days): the sejour's date_depart is in the past, but it never
        // got checked out because no run of this command happened in the
        // meantime.
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);
        $agent = Utilisateur::create(['nom' => 'Fatima Z.', 'role' => Utilisateur::ROLE_MENAGE]);

        $sejourEnRetard = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => now()->subDays(6)->toDateString(),
            'date_depart' => now()->subDays(3)->toDateString(),
            'nom_voyageur' => 'Jean Dupont',
            'statut' => Sejour::STATUT_EN_COURS,
        ]);

        $this->artisan('sejours:checkout-automatique')->assertSuccessful();

        $sejourEnRetard->refresh();
        $this->assertSame(Sejour::STATUT_TERMINE, $sejourEnRetard->statut);
        $this->assertDatabaseHas('mission_menages', [
            'sejour_id' => $sejourEnRetard->id,
            'agent_id' => $agent->id,
            'statut' => 'a_faire',
        ]);
    }

    public function test_it_ignores_a_venir_sejours_even_if_departure_date_is_today(): void
    {
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);

        $sejour = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => now()->subDay()->toDateString(),
            'date_depart' => now()->toDateString(),
            'nom_voyageur' => 'Jean Dupont',
            'statut' => Sejour::STATUT_A_VENIR,
        ]);

        $this->artisan('sejours:checkout-automatique')->assertSuccessful();

        $this->assertSame(Sejour::STATUT_A_VENIR, $sejour->fresh()->statut);
        $this->assertDatabaseMissing('mission_menages', ['sejour_id' => $sejour->id]);
    }
}
