<?php

namespace App\Http\Controllers;

use App\Models\Appartement;
use App\Models\Sejour;
use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AppartementController extends Controller
{
    /**
     * Display a listing of appartements, with optional search/filtering,
     * sorting and pagination for the "Liste des appartements" screen.
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'search' => ['sometimes', 'string'],
            'statut' => ['sometimes', 'string'],
            'sort_by' => ['sometimes', 'in:nom'],
            'sort_dir' => ['sometimes', 'in:asc,desc'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $query = Appartement::with(['checklistModele', 'agentHabituel'])
            ->withCount('sejours')
            ->withMax('sejours', 'date_depart')
            ->avecStatutCalcule();

        if (! empty($validated['search'])) {
            $search = $validated['search'];
            $query->where(function ($q) use ($search) {
                $q->where('nom', 'like', "%{$search}%")
                    ->orWhere('adresse', 'like', "%{$search}%");
            });
        }

        if (! empty($validated['statut'])) {
            // "occupé" is only ever true while a sejour is actually
            // en_cours on this appartement -- the stored `statut` column is
            // never authoritative, so filtering has to match the same
            // live computation used for display (see statutCalcule()).
            if ($validated['statut'] === Appartement::STATUT_OCCUPE) {
                $query->whereHas('sejours', fn ($q) => $q->where('statut', Sejour::STATUT_EN_COURS));
            } else {
                $query->whereDoesntHave('sejours', fn ($q) => $q->where('statut', Sejour::STATUT_EN_COURS));
            }
        }

        $sortBy = $validated['sort_by'] ?? 'nom';
        $sortDir = $validated['sort_dir'] ?? 'asc';
        $query->orderBy($sortBy, $sortDir);

        $withComputedAttributes = fn (Appartement $appartement) => $appartement
            ->setAttribute('dernier_sejour', $appartement->sejours_max_date_depart)
            ->setAttribute('statut', $appartement->statutCalcule());

        // Pagination only kicks in when explicitly requested (the "Liste des
        // appartements" screen). Every other consumer (dropdowns, checkbox
        // lists, ...) keeps getting the full flat array it always has.
        if (array_key_exists('page', $validated) || array_key_exists('per_page', $validated)) {
            $perPage = $validated['per_page'] ?? 10;
            $paginated = $query->paginate($perPage)->withQueryString();
            $paginated->getCollection()->each($withComputedAttributes);

            return response()->json($paginated);
        }

        return response()->json($query->get()->each($withComputedAttributes));
    }

    /**
     * Store a newly created appartement.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'adresse' => ['required', 'string', 'max:255'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
            'checklist_modele_id' => ['nullable', 'exists:checklist_modeles,id'],
            'agent_habituel_id' => [
                'nullable',
                Rule::exists('utilisateurs', 'id')->where('role', Utilisateur::ROLE_MENAGE),
            ],
        ]);

        if ($request->hasFile('photo')) {
            $validated['photo_principale'] = $request->file('photo')->store('appartements', 'public');
        }
        unset($validated['photo']);

        $validated['statut'] = Appartement::STATUT_DISPONIBLE;

        $appartement = Appartement::create($validated);

        return response()->json($appartement->load(['checklistModele', 'agentHabituel']), 201);
    }

    /**
     * Update an existing appartement. The "statut" field is always managed
     * automatically by the checkout/mission workflow and is never
     * accepted here, even implicitly.
     */
    public function update(Request $request, Appartement $appartement): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'adresse' => ['required', 'string', 'max:255'],
            'photo' => ['nullable', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
            'checklist_modele_id' => ['nullable', 'exists:checklist_modeles,id'],
            'agent_habituel_id' => [
                'nullable',
                Rule::exists('utilisateurs', 'id')->where('role', Utilisateur::ROLE_MENAGE),
            ],
        ]);

        if ($request->hasFile('photo')) {
            $validated['photo_principale'] = $request->file('photo')->store('appartements', 'public');
        }
        unset($validated['photo']);

        $appartement->update($validated);

        return response()->json($appartement->fresh()->load(['checklistModele', 'agentHabituel']));
    }
}
