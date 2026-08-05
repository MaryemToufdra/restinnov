<?php

namespace App\Http\Controllers;

use App\Models\Appartement;
use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UtilisateurController extends Controller
{
    /**
     * Display a listing of utilisateurs, optionally filtered by role.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Utilisateur::orderBy('nom');

        if ($request->filled('role')) {
            $query->where('role', $request->string('role'));
        }

        return response()->json($query->get());
    }

    /**
     * Store a newly created utilisateur (agent account), optionally assigning
     * it as the agent_habituel of a set of existing appartements.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'role' => ['required', 'in:menage,maintenance,manager'],
            'telephone' => ['nullable', 'string', 'max:255'],
            'adresse' => ['nullable', 'string', 'max:255'],
            'password' => ['nullable', 'string', 'min:6'],
            'appartement_ids' => ['sometimes', 'array'],
            'appartement_ids.*' => ['integer', 'exists:appartements,id'],
        ]);

        $appartementIds = $validated['appartement_ids'] ?? [];
        unset($validated['appartement_ids']);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $utilisateur = DB::transaction(function () use ($validated, $appartementIds) {
            $utilisateur = Utilisateur::create($validated);

            if (! empty($appartementIds)) {
                Appartement::whereIn('id', $appartementIds)->update([
                    'agent_habituel_id' => $utilisateur->id,
                ]);
            }

            return $utilisateur;
        });

        return response()->json($utilisateur, 201);
    }
}
