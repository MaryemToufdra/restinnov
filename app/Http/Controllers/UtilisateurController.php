<?php

namespace App\Http\Controllers;

use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
     * Store a newly created utilisateur (agent account).
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'role' => ['required', 'in:menage,maintenance,manager'],
            'telephone' => ['nullable', 'string', 'max:255'],
        ]);

        $utilisateur = Utilisateur::create($validated);

        return response()->json($utilisateur, 201);
    }
}
