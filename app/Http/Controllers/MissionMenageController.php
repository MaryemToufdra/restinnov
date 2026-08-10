<?php

namespace App\Http\Controllers;

use App\Models\MissionMenage;
use App\Models\ProduitMenageSignale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MissionMenageController extends Controller
{
    private const DETAIL_RELATIONS = ['sejour.appartement', 'agent', 'produits', 'checklistItems'];

    /**
     * "Mes missions du jour": missions assigned to a given menage agent
     * that are still on their plate (a_faire or en_cours). Powers the
     * agent workspace's mission list -- terminees/non_conformes never
     * belong there.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'agent_id' => ['required', 'integer', 'exists:utilisateurs,id'],
        ]);

        $missions = MissionMenage::with(self::DETAIL_RELATIONS)
            ->where('agent_id', $validated['agent_id'])
            ->whereIn('statut', [MissionMenage::STATUT_A_FAIRE, MissionMenage::STATUT_EN_COURS])
            ->orderBy('created_at')
            ->get();

        return response()->json($missions);
    }

    /**
     * Full detail of a single mission, including its checklist.
     */
    public function show(MissionMenage $missionMenage): JsonResponse
    {
        return response()->json($missionMenage->load(self::DETAIL_RELATIONS));
    }

    /**
     * The agent opening a mission's detail: dismisses its "Nouveau" badge
     * (vue -> true) and, the first time, starts the clock on it
     * (a_faire -> en_cours). Idempotent -- reopening an already-seen,
     * already-en_cours mission is a no-op beyond returning its detail.
     */
    public function ouvrir(MissionMenage $missionMenage): JsonResponse
    {
        $updates = [];

        if (! $missionMenage->vue) {
            $updates['vue'] = true;
        }

        if ($missionMenage->statut === MissionMenage::STATUT_A_FAIRE) {
            $updates['statut'] = MissionMenage::STATUT_EN_COURS;
        }

        if ($updates) {
            $missionMenage->update($updates);
        }

        return response()->json($missionMenage->fresh(self::DETAIL_RELATIONS));
    }

    /**
     * Marks a mission "conforme" once its whole checklist is checked off.
     * A mission with no checklist items at all (no checklist_modele was
     * assigned to the appartement) has nothing to block on, so it can
     * always be marked terminee.
     */
    public function terminer(MissionMenage $missionMenage): JsonResponse
    {
        $resteACocher = $missionMenage->checklistItems()->where('coche', false)->exists();

        if ($resteACocher) {
            return response()->json([
                'message' => 'Tous les éléments de la checklist doivent être cochés avant de marquer la mission terminée.',
            ], 422);
        }

        $missionMenage->update(['statut' => MissionMenage::STATUT_CONFORME]);

        return response()->json($missionMenage->fresh(self::DETAIL_RELATIONS));
    }

    /**
     * Update the forfait and the catalogue products checked for a mission.
     */
    public function updateProduits(Request $request, MissionMenage $missionMenage): JsonResponse
    {
        $validated = $request->validate([
            'frais_forfait' => ['sometimes', 'numeric', 'min:0'],
            'produit_ids' => ['sometimes', 'array'],
            'produit_ids.*' => ['integer', 'exists:produits_menage_catalogue,id'],
        ]);

        DB::transaction(function () use ($missionMenage, $validated) {
            if (array_key_exists('frais_forfait', $validated)) {
                $missionMenage->update(['frais_forfait' => $validated['frais_forfait']]);
            }

            if (array_key_exists('produit_ids', $validated)) {
                $missionMenage->produits()->sync($validated['produit_ids']);
            }
        });

        return response()->json($missionMenage->fresh(self::DETAIL_RELATIONS));
    }

    /**
     * Mark a mission as viewed by the cleaning agent (dismisses its
     * "Nouveau" badge). Idempotent.
     */
    public function marquerVue(MissionMenage $missionMenage): JsonResponse
    {
        if (! $missionMenage->vue) {
            $missionMenage->update(['vue' => true]);
        }

        return response()->json($missionMenage->fresh(self::DETAIL_RELATIONS));
    }

    /**
     * Report a cleaning product used in the field that is not in the catalogue yet.
     */
    public function signalerProduit(Request $request, MissionMenage $missionMenage): JsonResponse
    {
        $validated = $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $photoUrl = $request->file('photo')->store('produits-signales', 'public');

        $produitSignale = ProduitMenageSignale::create([
            'mission_menage_id' => $missionMenage->id,
            'photo_url' => $photoUrl,
            'note' => $validated['note'] ?? null,
            'statut' => ProduitMenageSignale::STATUT_EN_ATTENTE,
        ]);

        return response()->json($produitSignale, 201);
    }
}
