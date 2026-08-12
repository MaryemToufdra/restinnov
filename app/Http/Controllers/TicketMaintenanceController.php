<?php

namespace App\Http\Controllers;

use App\Models\TicketMaintenance;
use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TicketMaintenanceController extends Controller
{
    private const DETAIL_RELATIONS = ['appartement', 'missionOrigine.sejour', 'agent'];

    /**
     * Display a listing of maintenance tickets for the Manager, optionally
     * filtered by statut. Regardless of the filter, open/unassigned tickets
     * always sort first, then by urgence (haute first), then most recent.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'statut' => ['sometimes', 'in:ouvert,assigne,resolu'],
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
        ]);

        $ticketMaintenance->update([
            'agent_id' => $validated['agent_id'],
            'statut' => TicketMaintenance::STATUT_ASSIGNE,
        ]);

        return response()->json($ticketMaintenance->fresh(self::DETAIL_RELATIONS));
    }
}
