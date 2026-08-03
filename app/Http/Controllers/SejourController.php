<?php

namespace App\Http\Controllers;

use App\Models\MissionMenage;
use App\Models\Sejour;
use App\Models\Utilisateur;
use App\Models\Voyageur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class SejourController extends Controller
{
    /**
     * Display a listing of sejours.
     */
    public function index(): JsonResponse
    {
        $sejours = Sejour::with(['appartement', 'missionMenage.agent', 'missionMenage.produits', 'voyageurs', 'fraisMaintenance'])
            ->latest()
            ->get();

        return response()->json($sejours);
    }

    /**
     * Store a newly created sejour along with its voyageurs.
     */
    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'appartement_id' => ['required', 'exists:appartements,id'],
            'date_arrivee' => ['required', 'date'],
            'date_depart' => ['required', 'date', 'after:date_arrivee'],
            'plateforme_origine' => ['sometimes', 'in:airbnb,direct,autre,booking'],
            'montant_mad' => ['nullable', 'numeric', 'min:0'],
            'statut' => ['sometimes', 'in:a_venir,en_cours,termine'],
            'voyageurs' => ['required', 'array', 'min:1'],
            'voyageurs.*.nom' => ['required', 'string', 'max:255'],
            'voyageurs.*.numero_passeport' => ['nullable', 'string', 'max:255'],
            'voyageurs.*.est_principal' => ['required', 'boolean'],
            'voyageurs.*.type' => ['sometimes', 'in:adulte,enfant'],
        ]);

        $validator->after(function ($validator) use ($request) {
            $voyageurs = collect($request->input('voyageurs', []))->map(fn ($v) => [
                'est_principal' => filter_var($v['est_principal'] ?? false, FILTER_VALIDATE_BOOLEAN),
                'type' => $v['type'] ?? Voyageur::TYPE_ADULTE,
            ]);

            $principaux = $voyageurs->filter(fn ($v) => $v['est_principal']);

            if ($principaux->count() !== 1) {
                $validator->errors()->add('voyageurs', 'Exactement un voyageur doit être désigné comme voyageur principal.');
            } elseif ($principaux->first()['type'] !== Voyageur::TYPE_ADULTE) {
                $validator->errors()->add('voyageurs', 'Le voyageur principal doit être de type adulte.');
            }

            if ($voyageurs->where('type', Voyageur::TYPE_ADULTE)->isEmpty()) {
                $validator->errors()->add('voyageurs', 'Le séjour doit comporter au moins un voyageur adulte.');
            }
        });

        $validated = $validator->validate();

        $sejour = DB::transaction(function () use ($validated) {
            $principal = collect($validated['voyageurs'])
                ->first(fn ($v) => filter_var($v['est_principal'], FILTER_VALIDATE_BOOLEAN));

            $sejour = Sejour::create([
                'appartement_id' => $validated['appartement_id'],
                'date_arrivee' => $validated['date_arrivee'],
                'date_depart' => $validated['date_depart'],
                'nom_voyageur' => $principal['nom'],
                'statut' => $validated['statut'] ?? Sejour::STATUT_A_VENIR,
                'plateforme_origine' => $validated['plateforme_origine'] ?? Sejour::PLATEFORME_AIRBNB,
                'montant_mad' => $validated['montant_mad'] ?? 0,
            ]);

            foreach ($validated['voyageurs'] as $voyageur) {
                $sejour->voyageurs()->create([
                    'nom' => $voyageur['nom'],
                    'numero_passeport' => $voyageur['numero_passeport'] ?? null,
                    'est_principal' => filter_var($voyageur['est_principal'], FILTER_VALIDATE_BOOLEAN),
                    'type' => $voyageur['type'] ?? Voyageur::TYPE_ADULTE,
                ]);
            }

            return $sejour;
        });

        return response()->json($sejour->load(['appartement', 'voyageurs']), 201);
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
            'mission_menage' => $mission->fresh(['agent', 'produits']),
        ]);
    }
}
