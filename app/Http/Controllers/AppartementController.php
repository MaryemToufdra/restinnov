<?php

namespace App\Http\Controllers;

use App\Models\Appartement;
use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AppartementController extends Controller
{
    /**
     * Display a listing of appartements.
     */
    public function index(): JsonResponse
    {
        return response()->json(
            Appartement::with(['checklistModele', 'agentHabituel'])->orderBy('nom')->get()
        );
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
}
