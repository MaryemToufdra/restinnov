<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\MissionMenage;
use App\Models\Sejour;
use App\Models\TicketMaintenance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketMaintenanceParAppartementTest extends TestCase
{
    use RefreshDatabase;

    private function appartement(string $nom = 'Loft Bastille'): Appartement
    {
        return Appartement::create(['nom' => $nom, 'adresse' => '12 rue de la Roquette', 'statut' => 'disponible']);
    }

    private function mission(Appartement $appartement, array $sejourOverrides = []): MissionMenage
    {
        $sejour = Sejour::create(array_merge([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-01-01',
            'date_depart' => '2026-01-02',
            'nom_voyageur' => 'Jean Dupont',
        ], $sejourOverrides));

        return MissionMenage::create(['sejour_id' => $sejour->id, 'statut' => 'a_faire']);
    }

    private function ticket(Appartement $appartement, array $overrides = []): TicketMaintenance
    {
        return TicketMaintenance::create(array_merge([
            'appartement_id' => $appartement->id,
            'mission_origine_id' => $this->mission($appartement)->id,
            'description' => 'Robinet qui fuit.',
            'statut' => 'ouvert',
        ], $overrides));
    }

    public function test_it_groups_tickets_by_appartement_with_count_and_cumulative_cost(): void
    {
        $appartement = $this->appartement();
        $this->ticket($appartement, ['statut' => 'resolu', 'cout_reparation' => 45.50]);
        $this->ticket($appartement, ['statut' => 'resolu', 'cout_reparation' => 20]);
        $this->ticket($appartement, ['statut' => 'ouvert']);

        $response = $this->getJson('/api/tickets-maintenance/par-appartement');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.appartement.nom', 'Loft Bastille');
        $response->assertJsonPath('0.tickets_count', 3);
        $response->assertJsonPath('0.cout_cumule', 65.5);
        $response->assertJsonCount(3, '0.tickets');
    }

    public function test_it_returns_one_group_per_appartement(): void
    {
        $appartementA = $this->appartement('Loft Bastille');
        $appartementB = $this->appartement('Zenith Suite');
        $this->ticket($appartementA);
        $this->ticket($appartementB);
        $this->ticket($appartementB);

        $response = $this->getJson('/api/tickets-maintenance/par-appartement');

        $response->assertOk();
        $response->assertJsonCount(2);
        $noms = collect($response->json())->pluck('appartement.nom')->all();
        $this->assertContains('Loft Bastille', $noms);
        $this->assertContains('Zenith Suite', $noms);
    }

    public function test_it_sorts_groups_by_cumulative_cost_descending(): void
    {
        $cheap = $this->appartement('Petit coût');
        $this->ticket($cheap, ['statut' => 'resolu', 'cout_reparation' => 10]);

        $expensive = $this->appartement('Gros coût');
        $this->ticket($expensive, ['statut' => 'resolu', 'cout_reparation' => 500]);

        $response = $this->getJson('/api/tickets-maintenance/par-appartement');

        $response->assertOk();
        $response->assertJsonPath('0.appartement.nom', 'Gros coût');
        $response->assertJsonPath('1.appartement.nom', 'Petit coût');
    }

    public function test_it_includes_resolu_tickets_by_default(): void
    {
        $appartement = $this->appartement();
        $this->ticket($appartement, ['statut' => 'resolu']);

        $response = $this->getJson('/api/tickets-maintenance/par-appartement');

        $response->assertOk();
        $response->assertJsonPath('0.tickets_count', 1);
    }

    public function test_statut_filter_applies_to_the_grouped_view(): void
    {
        $appartement = $this->appartement();
        $this->ticket($appartement, ['statut' => 'ouvert']);
        $this->ticket($appartement, ['statut' => 'resolu']);

        $response = $this->getJson('/api/tickets-maintenance/par-appartement?statut=resolu');

        $response->assertOk();
        $response->assertJsonPath('0.tickets_count', 1);
        $response->assertJsonPath('0.tickets.0.statut', 'resolu');
    }

    public function test_appartement_id_filter_applies_to_the_grouped_view(): void
    {
        $appartementA = $this->appartement('Loft Bastille');
        $appartementB = $this->appartement('Zenith Suite');
        $this->ticket($appartementA);
        $this->ticket($appartementB);

        $response = $this->getJson('/api/tickets-maintenance/par-appartement?appartement_id='.$appartementA->id);

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.appartement.nom', 'Loft Bastille');
    }

    public function test_sejour_date_range_filter_applies_to_the_grouped_view(): void
    {
        $appartement = $this->appartement();
        $this->ticket($appartement, ['mission_origine_id' => $this->mission($appartement, ['date_arrivee' => '2026-01-10', 'date_depart' => '2026-01-12'])->id]);
        $this->ticket($appartement, ['mission_origine_id' => $this->mission($appartement, ['date_arrivee' => '2026-03-10', 'date_depart' => '2026-03-12'])->id]);

        $response = $this->getJson('/api/tickets-maintenance/par-appartement?date_debut=2026-01-01&date_fin=2026-01-31');

        $response->assertOk();
        $response->assertJsonPath('0.tickets_count', 1);
    }

    public function test_search_filter_applies_to_the_grouped_view(): void
    {
        $appartementA = $this->appartement('Loft Bastille');
        $appartementB = $this->appartement('Zenith Suite');
        $this->ticket($appartementA);
        $this->ticket($appartementB);

        $response = $this->getJson('/api/tickets-maintenance/par-appartement?search=zenith');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.appartement.nom', 'Zenith Suite');
    }

    public function test_it_flags_an_appartement_as_recurrent_with_three_or_more_tickets_in_the_last_two_months(): void
    {
        $appartement = $this->appartement();
        $this->ticket($appartement);
        $this->ticket($appartement);
        $this->ticket($appartement);

        $response = $this->getJson('/api/tickets-maintenance/par-appartement');

        $response->assertOk();
        $response->assertJsonPath('0.recurrent', true);
    }

    public function test_it_does_not_flag_an_appartement_with_fewer_than_three_recent_tickets(): void
    {
        $appartement = $this->appartement();
        $this->ticket($appartement);
        $this->ticket($appartement);

        $response = $this->getJson('/api/tickets-maintenance/par-appartement');

        $response->assertOk();
        $response->assertJsonPath('0.recurrent', false);
    }

    public function test_recurrent_ignores_tickets_older_than_the_two_month_window(): void
    {
        $appartement = $this->appartement();
        $this->ticket($appartement)->forceFill(['created_at' => now()->subMonths(3)])->save();
        $this->ticket($appartement)->forceFill(['created_at' => now()->subMonths(3)])->save();
        $this->ticket($appartement)->forceFill(['created_at' => now()->subMonths(3)])->save();

        $response = $this->getJson('/api/tickets-maintenance/par-appartement');

        $response->assertOk();
        $response->assertJsonPath('0.recurrent', false);
    }

    public function test_recurrent_is_independent_of_the_currently_applied_statut_filter(): void
    {
        $appartement = $this->appartement();
        $this->ticket($appartement, ['statut' => 'ouvert']);
        $this->ticket($appartement, ['statut' => 'resolu']);
        $this->ticket($appartement, ['statut' => 'resolu']);

        // Filtering the view down to just "ouvert" tickets still shows the
        // appartement as récurrent -- the trait reflects all of its recent
        // tickets, not only the ones currently on screen.
        $response = $this->getJson('/api/tickets-maintenance/par-appartement?statut=ouvert');

        $response->assertOk();
        $response->assertJsonCount(1, '0.tickets');
        $response->assertJsonPath('0.recurrent', true);
    }

    public function test_par_appartement_is_forbidden_for_a_menage_account(): void
    {
        $this->actingAsMenage();

        $response = $this->getJson('/api/tickets-maintenance/par-appartement');

        $response->assertStatus(403);
    }
}
