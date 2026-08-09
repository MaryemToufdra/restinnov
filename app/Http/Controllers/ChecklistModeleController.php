<?php

namespace App\Http\Controllers;

use App\Models\ChecklistModele;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChecklistModeleController extends Controller
{
    /**
     * Display a listing of checklist modeles.
     */
    public function index(): JsonResponse
    {
        return response()->json(ChecklistModele::with('items')->orderBy('nom')->get());
    }

    /**
     * Store a newly created checklist modele.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
        ]);

        $checklistModele = ChecklistModele::create($validated);

        return response()->json($checklistModele, 201);
    }
}
