<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\MissionMenage;
use App\Models\Sejour;
use App\Models\TicketMaintenance;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
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

    public function test_assigner_persists_the_manager_description(): void
    {
        $ticket = $this->ticket();
        $agent = $this->agentMaintenance();

        $response = $this->patchJson("/api/tickets-maintenance/{$ticket->id}/assigner", [
            'agent_id' => $agent->id,
            'description_manager' => 'Changer le joint du robinet dans la salle de bain.',
        ]);

        $response->assertOk();
        $this->assertDatabaseHas('tickets_maintenance', [
            'id' => $ticket->id,
            'description_manager' => 'Changer le joint du robinet dans la salle de bain.',
        ]);
    }

    // --- mesTickets() ---

    public function test_mes_tickets_lists_only_tickets_assigned_to_the_authenticated_agent(): void
    {
        $agent = $this->agentMaintenance();
        $autreAgent = $this->agentMaintenance(['nom' => 'Yassine T.']);
        $monTicket = $this->ticket(['statut' => 'assigne', 'agent_id' => $agent->id, 'description_manager' => 'Réparer la fuite.']);
        $this->ticket(['statut' => 'assigne', 'agent_id' => $autreAgent->id]);

        Sanctum::actingAs($agent, ['*']);

        $response = $this->getJson('/api/tickets-maintenance/mes-tickets');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.id', $monTicket->id);
        $response->assertJsonPath('0.description_manager', 'Réparer la fuite.');
    }

    public function test_mes_tickets_only_includes_tickets_with_statut_assigne(): void
    {
        $agent = $this->agentMaintenance();
        $this->ticket(['statut' => 'ouvert', 'agent_id' => null]);
        $this->ticket(['statut' => 'assigne', 'agent_id' => $agent->id]);
        $this->ticket(['statut' => 'resolu_en_attente_validation', 'agent_id' => $agent->id]);
        $this->ticket(['statut' => 'resolu', 'agent_id' => $agent->id]);

        Sanctum::actingAs($agent, ['*']);

        $response = $this->getJson('/api/tickets-maintenance/mes-tickets');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.statut', 'assigne');
    }

    public function test_mes_tickets_never_exposes_the_menage_agent_signalement_fields(): void
    {
        $agent = $this->agentMaintenance();
        $this->ticket([
            'statut' => 'assigne',
            'agent_id' => $agent->id,
            'description' => 'Description du signalement ménage.',
            'photo_url' => 'signalements/photo.jpg',
            'audio_url' => 'signalements/note.mp3',
        ]);

        Sanctum::actingAs($agent, ['*']);

        $response = $this->getJson('/api/tickets-maintenance/mes-tickets');

        $response->assertOk();
        $ticketJson = $response->json('0');
        $this->assertArrayNotHasKey('description', $ticketJson);
        $this->assertArrayNotHasKey('photo_url', $ticketJson);
        $this->assertArrayNotHasKey('audio_url', $ticketJson);
        $this->assertArrayHasKey('description_manager', $ticketJson);
        $this->assertArrayHasKey('urgence', $ticketJson);
        $this->assertArrayHasKey('appartement', $ticketJson);
        $this->assertArrayHasKey('nom', $ticketJson['appartement']);
        $this->assertArrayHasKey('adresse', $ticketJson['appartement']);
    }

    public function test_mes_tickets_is_forbidden_for_a_menage_account(): void
    {
        $this->actingAsMenage();

        $response = $this->getJson('/api/tickets-maintenance/mes-tickets');

        $response->assertStatus(403);
    }

    public function test_mes_tickets_route_requires_maintenance_role_not_just_manager(): void
    {
        $agent = $this->agentMaintenance();
        $this->ticket(['statut' => 'assigne', 'agent_id' => $agent->id]);

        // A manager may call it, but must supply agent_id explicitly.
        $response = $this->getJson('/api/tickets-maintenance/mes-tickets');
        $response->assertStatus(422);

        $response = $this->getJson("/api/tickets-maintenance/mes-tickets?agent_id={$agent->id}");
        $response->assertOk();
        $response->assertJsonCount(1);
    }

    // --- resoudre() ---

    public function test_resoudre_marks_the_ticket_resolu_en_attente_validation(): void
    {
        Storage::fake('public');

        $agent = $this->agentMaintenance();
        $ticket = $this->ticket(['statut' => 'assigne', 'agent_id' => $agent->id]);
        Sanctum::actingAs($agent, ['*']);

        $response = $this->post("/api/tickets-maintenance/{$ticket->id}/resoudre", [
            '_method' => 'PATCH',
            'photo_apres' => UploadedFile::fake()->image('reparation.jpg'),
            'cout_reparation' => '45.50',
            'note' => 'Joint remplacé.',
        ]);

        $response->assertOk();
        $response->assertJsonPath('statut', 'resolu_en_attente_validation');
        $this->assertNotNull($response->json('photo_apres'));
        $this->assertDatabaseHas('tickets_maintenance', [
            'id' => $ticket->id,
            'statut' => 'resolu_en_attente_validation',
            'cout_reparation' => '45.50',
            'note_resolution' => 'Joint remplacé.',
        ]);
    }

    public function test_resoudre_requires_photo_apres_and_cout_reparation(): void
    {
        $agent = $this->agentMaintenance();
        $ticket = $this->ticket(['statut' => 'assigne', 'agent_id' => $agent->id]);
        Sanctum::actingAs($agent, ['*']);

        $response = $this->patchJson("/api/tickets-maintenance/{$ticket->id}/resoudre", []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['photo_apres', 'cout_reparation']);
    }

    public function test_resoudre_is_rejected_when_the_ticket_is_not_assigne(): void
    {
        Storage::fake('public');

        $agent = $this->agentMaintenance();
        $ticket = $this->ticket(['statut' => 'resolu_en_attente_validation', 'agent_id' => $agent->id]);
        Sanctum::actingAs($agent, ['*']);

        $response = $this->post("/api/tickets-maintenance/{$ticket->id}/resoudre", [
            '_method' => 'PATCH',
            'photo_apres' => UploadedFile::fake()->image('reparation.jpg'),
            'cout_reparation' => '10',
        ]);

        $response->assertStatus(422);
    }

    public function test_an_agent_cannot_resoudre_a_ticket_assigned_to_another_agent(): void
    {
        Storage::fake('public');

        $agentA = $this->agentMaintenance(['nom' => 'Karim B.']);
        $agentB = $this->agentMaintenance(['nom' => 'Yassine T.']);
        $ticket = $this->ticket(['statut' => 'assigne', 'agent_id' => $agentB->id]);
        Sanctum::actingAs($agentA, ['*']);

        $response = $this->post("/api/tickets-maintenance/{$ticket->id}/resoudre", [
            '_method' => 'PATCH',
            'photo_apres' => UploadedFile::fake()->image('reparation.jpg'),
            'cout_reparation' => '10',
        ]);

        $response->assertStatus(403);
        $this->assertDatabaseHas('tickets_maintenance', ['id' => $ticket->id, 'statut' => 'assigne']);
    }

    public function test_resoudre_is_forbidden_for_a_menage_account(): void
    {
        $agent = $this->agentMaintenance();
        $ticket = $this->ticket(['statut' => 'assigne', 'agent_id' => $agent->id]);
        $this->actingAsMenage();

        $response = $this->patchJson("/api/tickets-maintenance/{$ticket->id}/resoudre", []);

        $response->assertStatus(403);
    }

    public function test_manager_can_resoudre_any_ticket(): void
    {
        Storage::fake('public');

        $agent = $this->agentMaintenance();
        $ticket = $this->ticket(['statut' => 'assigne', 'agent_id' => $agent->id]);

        $response = $this->post("/api/tickets-maintenance/{$ticket->id}/resoudre", [
            '_method' => 'PATCH',
            'photo_apres' => UploadedFile::fake()->image('reparation.jpg'),
            'cout_reparation' => '10',
        ]);

        $response->assertOk();
    }

    // --- validerResolution() ---

    public function test_valider_resolution_marks_the_ticket_resolu(): void
    {
        $ticket = $this->ticket(['statut' => 'resolu_en_attente_validation', 'photo_apres' => 'x.jpg', 'cout_reparation' => 20]);

        $response = $this->patchJson("/api/tickets-maintenance/{$ticket->id}/valider-resolution");

        $response->assertOk();
        $response->assertJsonPath('statut', 'resolu');
        $this->assertDatabaseHas('tickets_maintenance', ['id' => $ticket->id, 'statut' => 'resolu']);
    }

    public function test_valider_resolution_is_rejected_when_not_pending_validation(): void
    {
        $ticket = $this->ticket(['statut' => 'assigne']);

        $response = $this->patchJson("/api/tickets-maintenance/{$ticket->id}/valider-resolution");

        $response->assertStatus(422);
    }

    public function test_valider_resolution_is_forbidden_for_a_maintenance_account(): void
    {
        $agent = $this->agentMaintenance();
        $ticket = $this->ticket(['statut' => 'resolu_en_attente_validation', 'agent_id' => $agent->id]);
        Sanctum::actingAs($agent, ['*']);

        $response = $this->patchJson("/api/tickets-maintenance/{$ticket->id}/valider-resolution");

        $response->assertStatus(403);
    }

    public function test_valider_resolution_is_forbidden_for_a_menage_account(): void
    {
        $ticket = $this->ticket(['statut' => 'resolu_en_attente_validation']);
        $this->actingAsMenage();

        $response = $this->patchJson("/api/tickets-maintenance/{$ticket->id}/valider-resolution");

        $response->assertStatus(403);
    }

    // --- index() with resolu_en_attente_validation ---

    public function test_index_filters_by_resolu_en_attente_validation(): void
    {
        $this->ticket(['statut' => 'assigne']);
        $enAttente = $this->ticket(['statut' => 'resolu_en_attente_validation']);

        $response = $this->getJson('/api/tickets-maintenance?statut=resolu_en_attente_validation');

        $response->assertOk();
        $response->assertJsonCount(1);
        $response->assertJsonPath('0.id', $enAttente->id);
    }
}
