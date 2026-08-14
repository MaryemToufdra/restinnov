<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesTicketAccess;
use App\Models\TicketMaintenance;
use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TicketMaintenanceController extends Controller
{
    use AuthorizesTicketAccess;

    private const DETAIL_RELATIONS = ['appartement', 'missionOrigine.sejour', 'agent'];

    /**
     * Display a listing of maintenance tickets for the Manager, optionally
     * filtered by statut. Regardless of the filter, open/unassigned tickets
     * always sort first, then by urgence (haute first), then most recent.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'statut' => ['sometimes', 'in:ouvert,assigne,resolu_en_attente_validation,resolu'],
        ]);

        $query = TicketMaintenance::with(self::DETAIL_RELATIONS)
            ->orderByRaw("CASE statut WHEN 'ouvert' THEN 0 WHEN 'assigne' THEN 1 ELSE 2 END")
            ->orderByRaw("CASE urgence WHEN 'haute' THEN 0 WHEN 'normale' THEN 1 ELSE 2 END")
            ->latest();

        if (! empty($validated['statut'])) {
            $query->where('statut', $validated['statut']);
        }

        return response()->json($query->get());
    }

    /**
     * Manager assigns an open ticket to an active maintenance agent. The
     * agent's own workspace (built separately) picks it up from there.
     */
    public function assigner(Request $request, TicketMaintenance $ticketMaintenance): JsonResponse
    {
        if ($ticketMaintenance->statut !== TicketMaintenance::STATUT_OUVERT) {
            return response()->json([
                'message' => 'Ce ticket a déjà été assigné ou résolu.',
            ], 422);
        }

        $validated = $request->validate([
            'agent_id' => [
                'required',
                Rule::exists('utilisateurs', 'id')->where('role', Utilisateur::ROLE_MAINTENANCE)->where('actif', true),
            ],
            // The instruction the maintenance agent will actually see on
            // their ticket detail -- the ménage agent's own description/
            // photo/audio stay Manager-only, never shown to maintenance.
            'description_manager' => ['nullable', 'string', 'max:1000'],
        ]);

        $ticketMaintenance->update([
            'agent_id' => $validated['agent_id'],
            'description_manager' => $validated['description_manager'] ?? null,
            'statut' => TicketMaintenance::STATUT_ASSIGNE,
        ]);

        return response()->json($ticketMaintenance->fresh(self::DETAIL_RELATIONS));
    }

    /**
     * The maintenance agent's own workspace: tickets currently assigned to
     * them (statut "assigne" only -- not yet-open or already-resolved
     * ones). The response is an explicit whitelist, never the raw model:
     * the ménage agent's original `description`/`photo_url`/`audio_url`
     * signalement fields must never reach a maintenance agent, only the
     * Manager-authored `description_manager` may.
     */
    public function mesTickets(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role === Utilisateur::ROLE_MAINTENANCE) {
            $agentId = $user->id;
        } else {
            $validated = $request->validate([
                'agent_id' => ['required', 'integer', 'exists:utilisateurs,id'],
            ]);
            $agentId = $validated['agent_id'];
        }

        $tickets = TicketMaintenance::where('agent_id', $agentId)
            ->where('statut', TicketMaintenance::STATUT_ASSIGNE)
            ->with('appartement:id,nom,adresse')
            ->orderBy('created_at')
            ->get()
            ->map(fn (TicketMaintenance $ticket) => [
                'id' => $ticket->id,
                'statut' => $ticket->statut,
                'urgence' => $ticket->urgence,
                'description_manager' => $ticket->description_manager,
                'appartement' => $ticket->appartement ? [
                    'id' => $ticket->appartement->id,
                    'nom' => $ticket->appartement->nom,
                    'adresse' => $ticket->appartement->adresse,
                ] : null,
            ]);

        return response()->json($tickets);
    }

    /**
     * The assigned maintenance agent (checked explicitly server-side, not
     * just via route middleware) marks their ticket resolved: photo proof
     * and repair cost are mandatory, a note is optional. This moves the
     * ticket to "resolu_en_attente_validation" -- the appartement stays
     * blocked in "maintenance" statut until the Manager validates it.
     */
    public function resoudre(Request $request, TicketMaintenance $ticketMaintenance): JsonResponse
    {
        $this->authorizeTicketAccess($request, $ticketMaintenance);

        if ($ticketMaintenance->statut !== TicketMaintenance::STATUT_ASSIGNE) {
            return response()->json([
                'message' => 'Ce ticket n\'est pas assigné.',
            ], 422);
        }

        $validated = $request->validate([
            'photo_apres' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
            'cout_reparation' => ['required', 'numeric', 'min:0'],
            'note' => ['nullable', 'string', 'max:1000'],
        ]);

        $photoApresUrl = $request->file('photo_apres')->store('tickets-maintenance', 'public');

        $ticketMaintenance->update([
            'photo_apres' => $photoApresUrl,
            'cout_reparation' => $validated['cout_reparation'],
            'note_resolution' => $validated['note'] ?? null,
            'statut' => TicketMaintenance::STATUT_RESOLU_EN_ATTENTE_VALIDATION,
        ]);

        return response()->json($ticketMaintenance->fresh(self::DETAIL_RELATIONS));
    }

    /**
     * Manager-only: validates a resolution the maintenance agent has
     * submitted, moving it from "resolu_en_attente_validation" to
     * "resolu". This is the precise moment the appartement can go back to
     * "disponible" (its statut is derived live from ticket statuts, see
     * Appartement::statutCalcule()).
     */
    public function validerResolution(TicketMaintenance $ticketMaintenance): JsonResponse
    {
        if ($ticketMaintenance->statut !== TicketMaintenance::STATUT_RESOLU_EN_ATTENTE_VALIDATION) {
            return response()->json([
                'message' => 'Cette résolution n\'est pas en attente de validation.',
            ], 422);
        }

        $ticketMaintenance->update(['statut' => TicketMaintenance::STATUT_RESOLU]);

        return response()->json($ticketMaintenance->fresh(self::DETAIL_RELATIONS));
    }
}
