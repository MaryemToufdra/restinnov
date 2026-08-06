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
use Illuminate\Validation\Validator as ValidatorContract;

class SejourController extends Controller
{
    /**
     * Display a listing of sejours, with optional search/filtering, sorting
     * and pagination for the "Liste des séjours" screen.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'string'],
            'statut' => ['sometimes', 'in:a_venir,en_cours,termine'],
            'appartement_id' => ['sometimes', 'integer', 'exists:appartements,id'],
            'date_debut' => ['sometimes', 'date'],
            'date_fin' => ['sometimes', 'date'],
            'sort_by' => ['sometimes', 'in:date_arrivee,date_depart'],
            'sort_dir' => ['sometimes', 'in:asc,desc'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $query = Sejour::with(['appartement', 'missionMenage.agent', 'missionMenage.produits', 'voyageurs', 'fraisMaintenance'])
            ->withCount('voyageurs');

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('nom_voyageur', 'like', "%{$search}%")
                    ->orWhereHas('appartement', function ($q2) use ($search) {
                        $q2->where('nom', 'like', "%{$search}%");
                    });
            });
        }

        if (! empty($validated['statut'])) {
            $query->where('statut', $validated['statut']);
        }

        if (! empty($validated['appartement_id'])) {
            $query->where('appartement_id', $validated['appartement_id']);
        }

        if (! empty($validated['date_debut'])) {
            $query->whereDate('date_arrivee', '>=', $validated['date_debut']);
        }

        if (! empty($validated['date_fin'])) {
            $query->whereDate('date_arrivee', '<=', $validated['date_fin']);
        }

        $sortBy = $validated['sort_by'] ?? 'date_arrivee';
        $sortDir = $validated['sort_dir'] ?? 'desc';
        $query->orderBy($sortBy, $sortDir)->orderBy('id', $sortDir);

        $perPage = $validated['per_page'] ?? 10;

        return response()->json($query->paginate($perPage)->withQueryString());
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

        $this->validateVoyageurs($validator, $request);

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

            $this->syncVoyageurs($sejour, $validated['voyageurs']);

            return $sejour;
        });

        return response()->json($sejour->load(['appartement', 'voyageurs']), 201);
    }

    /**
     * Update an existing sejour and replace its voyageurs. Not allowed once
     * the sejour is "termine" (its cleaning mission already exists).
     */
    public function update(Request $request, Sejour $sejour): JsonResponse
    {
        if ($sejour->statut === Sejour::STATUT_TERMINE) {
            return response()->json([
                'message' => 'Ce séjour est déjà terminé et ne peut plus être modifié.',
            ], 422);
        }

        $validator = Validator::make($request->all(), [
            'appartement_id' => ['required', 'exists:appartements,id'],
            'date_arrivee' => ['required', 'date'],
            'date_depart' => ['required', 'date', 'after:date_arrivee'],
            'plateforme_origine' => ['sometimes', 'in:airbnb,direct,autre,booking'],
            'montant_mad' => ['nullable', 'numeric', 'min:0'],
            'voyageurs' => ['required', 'array', 'min:1'],
            'voyageurs.*.nom' => ['required', 'string', 'max:255'],
            'voyageurs.*.numero_passeport' => ['nullable', 'string', 'max:255'],
            'voyageurs.*.est_principal' => ['required', 'boolean'],
            'voyageurs.*.type' => ['sometimes', 'in:adulte,enfant'],
        ]);

        $this->validateVoyageurs($validator, $request);

        $validated = $validator->validate();

        $sejour = DB::transaction(function () use ($validated, $sejour) {
            $principal = collect($validated['voyageurs'])
                ->first(fn ($v) => filter_var($v['est_principal'], FILTER_VALIDATE_BOOLEAN));

            $sejour->update([
                'appartement_id' => $validated['appartement_id'],
                'date_arrivee' => $validated['date_arrivee'],
                'date_depart' => $validated['date_depart'],
                'nom_voyageur' => $principal['nom'],
                'plateforme_origine' => $validated['plateforme_origine'] ?? $sejour->plateforme_origine,
                'montant_mad' => $validated['montant_mad'] ?? 0,
            ]);

            $sejour->voyageurs()->delete();
            $this->syncVoyageurs($sejour, $validated['voyageurs']);

            return $sejour;
        });

        return response()->json($sejour->fresh()->load(['appartement', 'voyageurs']));
    }

    /**
     * Shared "exactement un principal, principal adulte, au moins un adulte"
     * validation for the voyageurs payload, used by store() and update().
     */
    private function validateVoyageurs(ValidatorContract $validator, Request $request): void
    {
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
    }

    /**
     * Create the voyageurs rows for a sejour from a validated payload.
     */
    private function syncVoyageurs(Sejour $sejour, array $voyageurs): void
    {
        foreach ($voyageurs as $voyageur) {
            $sejour->voyageurs()->create([
                'nom' => $voyageur['nom'],
                'numero_passeport' => $voyageur['numero_passeport'] ?? null,
                'est_principal' => filter_var($voyageur['est_principal'], FILTER_VALIDATE_BOOLEAN),
                'type' => $voyageur['type'] ?? Voyageur::TYPE_ADULTE,
            ]);
        }
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
