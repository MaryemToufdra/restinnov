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
}
