<?php

namespace App\Http\Controllers;

use App\Models\MissionMenage;
use App\Models\TicketMaintenance;
use Illuminate\Http\JsonResponse;

class NotificationController extends Controller
{
    /**
     * Lightweight feed for the Manager header's notification bell -- kept
     * separate from GET /api/dashboard (which also computes revenue/cost
     * aggregates) so every screen can poll it cheaply, not just the
     * Dashboard tab. Same "ménages à valider" / "problèmes signalés" shapes
     * as the dashboard endpoint, for a consistent nom+adresse per item.
     */
    public function index(): JsonResponse
    {
        $problemesSignales = TicketMaintenance::query()
            ->select('id', 'appartement_id', 'urgence', 'statut')
            ->whereIn('statut', [TicketMaintenance::STATUT_OUVERT, TicketMaintenance::STATUT_ASSIGNE])
            ->with('appartement:id,nom,adresse')
            ->latest()
            ->latest('id')
            ->get();

        $menagesAValider = MissionMenage::query()
            ->select('id', 'sejour_id')
            ->where('statut', MissionMenage::STATUT_EN_ATTENTE_VALIDATION)
            ->with('sejour:id,appartement_id,nom_voyageur', 'sejour.appartement:id,nom,adresse')
            ->latest()
            ->latest('id')
            ->get()
            ->map(fn (MissionMenage $mission) => [
                'id' => $mission->id,
                'sejour_id' => $mission->sejour_id,
                'nom_voyageur' => $mission->sejour?->nom_voyageur,
                'appartement' => $mission->sejour?->appartement,
            ]);

        return response()->json([
            'problemes_signales_count' => $problemesSignales->count(),
            'menages_a_valider_count' => $menagesAValider->count(),
            'problemes_signales' => $problemesSignales,
            'menages_a_valider' => $menagesAValider,
        ]);
    }
}
