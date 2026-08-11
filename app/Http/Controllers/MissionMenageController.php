<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\AuthorizesMissionAccess;
use App\Models\MissionMenage;
use App\Models\ProduitMenageSignale;
use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MissionMenageController extends Controller
{
    use AuthorizesMissionAccess;

    private const DETAIL_RELATIONS = ['sejour.appartement', 'agent', 'produits', 'checklistItems'];

    /**
     * "Mes missions du jour": missions assigned to a given menage agent
     * that are still on their plate (a_faire or en_cours). Powers the
     * agent workspace's mission list -- terminees/non_conformes never
     * belong there.
     *
     * A "menage" caller always gets their own missions, regardless of what
     * agent_id (if any) they pass -- there is no legitimate reason for one
     * agent to list another's missions. Only "manager" may query by an
     * arbitrary agent_id.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->role === Utilisateur::ROLE_MENAGE) {
            $agentId = $user->id;
        } else {
            $validated = $request->validate([
                'agent_id' => ['required', 'integer', 'exists:utilisateurs,id'],
            ]);
            $agentId = $validated['agent_id'];
        }

        $missions = MissionMenage::with(self::DETAIL_RELATIONS)
            ->where('agent_id', $agentId)
            ->whereIn('statut', [MissionMenage::STATUT_A_FAIRE, MissionMenage::STATUT_EN_COURS])
            ->orderBy('created_at')
            ->get();

        return response()->json($missions);
    }

    /**
     * Full detail of a single mission, including its checklist.
     */
    public function show(Request $request, MissionMenage $missionMenage): JsonResponse
    {
        $this->authorizeMissionAccess($request, $missionMenage);

        return response()->json($missionMenage->load(self::DETAIL_RELATIONS));
    }

    /**
     * The agent opening a mission's detail: dismisses its "Nouveau" badge
     * (vue -> true) and, the first time, starts the clock on it
     * (a_faire -> en_cours). Idempotent -- reopening an already-seen,
     * already-en_cours mission is a no-op beyond returning its detail.
     */
    public function ouvrir(Request $request, MissionMenage $missionMenage): JsonResponse
    {
        $this->authorizeMissionAccess($request, $missionMenage);

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
     * Marks a mission "en_attente_validation" once its whole checklist is
     * checked off -- the agent's part of the job is done, but the
     * appartement only becomes "disponible" again once a manager reviews
     * and validates it (see valider()). A mission with no checklist items
     * at all (no checklist_modele was assigned to the appartement) has
     * nothing to block on, so it can always be marked terminee.
     */
    public function terminer(Request $request, MissionMenage $missionMenage): JsonResponse
    {
        $this->authorizeMissionAccess($request, $missionMenage);

        $resteACocher = $missionMenage->checklistItems()->where('coche', false)->exists();

        if ($resteACocher) {
            return response()->json([
                'message' => 'Tous les éléments de la checklist doivent être cochés avant de marquer la mission terminée.',
            ], 422);
        }

        $missionMenage->update(['statut' => MissionMenage::STATUT_EN_ATTENTE_VALIDATION]);

        return response()->json($missionMenage->fresh(self::DETAIL_RELATIONS));
    }

    /**
     * Manager-only: validates a mission the agent has finished, moving it
     * from "en_attente_validation" to "conforme". This is the precise
     * moment the appartement flips back to "disponible" (its statut is
     * derived live from mission_menage statuts, see
     * Appartement::statutCalcule()).
     */
    public function valider(Request $request, MissionMenage $missionMenage): JsonResponse
    {
        $this->authorizeMissionAccess($request, $missionMenage);

        if ($missionMenage->statut !== MissionMenage::STATUT_EN_ATTENTE_VALIDATION) {
            return response()->json([
                'message' => 'Cette mission n\'est pas en attente de validation.',
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
        $this->authorizeMissionAccess($request, $missionMenage);

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
    public function marquerVue(Request $request, MissionMenage $missionMenage): JsonResponse
    {
        $this->authorizeMissionAccess($request, $missionMenage);

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
        $this->authorizeMissionAccess($request, $missionMenage);

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
