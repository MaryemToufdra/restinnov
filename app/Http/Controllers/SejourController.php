<?php

namespace App\Http\Controllers;

use App\Models\MissionMenage;
use App\Models\Sejour;
use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SejourController extends Controller
{
    /**
     * Store a newly created sejour.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'appartement_id' => ['required', 'exists:appartements,id'],
            'date_arrivee' => ['required', 'date'],
            'date_depart' => ['required', 'date', 'after_or_equal:date_arrivee'],
            'nom_voyageur' => ['required', 'string', 'max:255'],
            'statut' => ['sometimes', 'in:a_venir,en_cours,termine'],
        ]);

        $sejour = Sejour::create($validated);

        return response()->json($sejour, 201);
    }

    /**
     * Confirm the checkout of a sejour and automatically generate its
     * cleaning mission, assigned to an available "menage" agent.
     */
    public function checkout(Sejour $sejour): JsonResponse
    {
        if ($sejour->statut === Sejour::STATUT_TERMINE) {
            return response()->json([
                'message' => 'Ce séjour a déjà été checkouté.',
            ], 422);
        }

        $mission = DB::transaction(function () use ($sejour) {
            $sejour->update(['statut' => Sejour::STATUT_TERMINE]);

            $agent = Utilisateur::where('role', Utilisateur::ROLE_MENAGE)
                ->withCount(['missionMenages' => function ($query) {
                    $query->whereIn('statut', [
                        MissionMenage::STATUT_A_FAIRE,
                        MissionMenage::STATUT_EN_COURS,
                    ]);
                }])
                ->orderBy('mission_menages_count')
                ->orderBy('id')
                ->lockForUpdate()
                ->first();

            return MissionMenage::create([
                'sejour_id' => $sejour->id,
                'agent_id' => $agent?->id,
                'statut' => MissionMenage::STATUT_A_FAIRE,
            ]);
        });

        return response()->json([
            'sejour' => $sejour->fresh(),
            'mission_menage' => $mission->fresh('agent'),
        ]);
    }
}
