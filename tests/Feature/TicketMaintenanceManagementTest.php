<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\MissionMenage;
use App\Models\Sejour;
use App\Models\TicketMaintenance;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TicketMaintenanceManagementTest extends TestCase
{
    use RefreshDatabase;

    private function appartement(): Appartement
    {
        return Appartement::create(['nom' => 'Loft Bastille', 'adresse' => '12 rue de la Roquette', 'statut' => 'disponible']);
    }

    private function mission(Appartement $appartement): MissionMenage
    {
        $sejour = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-01-01',
            'date_depart' => '2026-01-02',
            'nom_voyageur' => 'Jean Dupont',
        ]);

        return MissionMenage::create(['sejour_id' => $sejour->id, 'statut' => 'a_faire']);
    }

    private function ticket(array $overrides = []): TicketMaintenance
    {
        $appartement = $this->appartement();

        return TicketMaintenance::create(array_merge([
            'appartement_id' => $appartement->id,
            'mission_origine_id' => $this->mission($appartement)->id,
            'description' => 'Robinet qui fuit.',
            'statut' => 'ouvert',
        ], $overrides));
    }

    private function agentMaintenance(array $overrides = []): Utilisateur
    {
        return Utilisateur::create(array_merge([
            'nom' => 'Karim B.',
            'role' => 'maintenance',
        ], $overrides));
    }

    // --- index() ---

    public function test_index_lists_tickets_with_their_relations(): void
    {
        $this->ticket();

        $response = $this->getJson('/api/tickets-maintenance');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.description', 'Robinet qui fuit.');
        $response->assertJsonPath('0.appartement.nom', 'Loft Bastille');
    }

    public function test_index_filters_by_statut(): void
    {
        $this->ticket(['statut' => 'ouvert']);
        $this->ticket(['statut' => 'resolu']);

        $response = $this->getJson('/api/tickets-maintenance?statut=ouvert');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.statut', 'ouvert');
    }

    public function test_index_lists_ouverts_before_assignes_and_resolus(): void
    {
        $this->ticket(['statut' => 'resolu', 'description' => 'Ticket résolu']);
        $this->ticket(['statut' => 'assigne', 'description' => 'Ticket assigné']);
        $this->ticket(['statut' => 'ouvert', 'description' => 'Ticket ouvert']);

        $response = $this->getJson('/api/tickets-maintenance');

        $response->assertOk();
        $response->assertJsonPath('0.statut', 'ouvert');
        $response->assertJsonPath('1.statut', 'assigne');
        $response->assertJsonPath('2.statut', 'resolu');
    }

    public function test_index_is_forbidden_for_a_menage_account(): void
    {
        $this->ticket();
        $this->actingAsMenage();

        $response = $this->getJson('/api/tickets-maintenance');

        $response->assertStatus(403);
    }

    // --- assigner() ---

    public function test_assigner_assigns_the_ticket_to_an_active_maintenance_agent(): void
    {
        $ticket = $this->ticket();
        $agent = $this->agentMaintenance();

        $response = $this->patchJson("/api/tickets-maintenance/{$ticket->id}/assigner", [
            'agent_id' => $agent->id,
        ]);

        $response->assertOk();
        $response->assertJsonPath('statut', 'assigne');
        $response->assertJsonPath('agent.id', $agent->id);
        $this->assertDatabaseHas('tickets_maintenance', [
            'id' => $ticket->id,
            'agent_id' => $agent->id,
            'statut' => 'assigne',
        ]);
    }

    public function test_assigner_is_rejected_when_the_ticket_is_already_assigned(): void
    {
        $agent = $this->agentMaintenance();
        $ticket = $this->ticket(['statut' => 'assigne', 'agent_id' => $agent->id]);
        $autreAgent = $this->agentMaintenance(['nom' => 'Yassine T.']);

        $response = $this->patchJson("/api/tickets-maintenance/{$ticket->id}/assigner", [
            'agent_id' => $autreAgent->id,
        ]);

        $response->assertStatus(422);
        $this->assertDatabaseHas('tickets_maintenance', ['id' => $ticket->id, 'agent_id' => $agent->id]);
    }

    public function test_assigner_is_rejected_when_the_ticket_is_already_resolu(): void
    {
        $ticket = $this->ticket(['statut' => 'resolu']);
        $agent = $this->agentMaintenance();

        $response = $this->patchJson("/api/tickets-maintenance/{$ticket->id}/assigner", [
            'agent_id' => $agent->id,
        ]);

        $response->assertStatus(422);
    }

    public function test_assigner_rejects_an_agent_that_is_not_role_maintenance(): void
    {
        $ticket = $this->ticket();
        $menageAgent = Utilisateur::create(['nom' => 'Fatima Z.', 'role' => 'menage']);

        $response = $this->patchJson("/api/tickets-maintenance/{$ticket->id}/assigner", [
            'agent_id' => $menageAgent->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('agent_id');
    }

    public function test_assigner_rejects_a_deactivated_maintenance_agent(): void
    {
        $ticket = $this->ticket();
        $agent = $this->agentMaintenance(['actif' => false]);

        $response = $this->patchJson("/api/tickets-maintenance/{$ticket->id}/assigner", [
            'agent_id' => $agent->id,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('agent_id');
    }

    public function test_assigner_is_forbidden_for_a_menage_account(): void
    {
        $ticket = $this->ticket();
        $agent = $this->agentMaintenance();
        $this->actingAsMenage();

        $response = $this->patchJson("/api/tickets-maintenance/{$ticket->id}/assigner", [
            'agent_id' => $agent->id,
        ]);

        $response->assertStatus(403);
    }
}
