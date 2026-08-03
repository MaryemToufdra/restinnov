<?php

namespace App\Http\Controllers;

use App\Models\FraisMaintenance;
use App\Models\Sejour;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FraisMaintenanceController extends Controller
{
    /**
     * Store a newly created frais de maintenance for a sejour.
     */
    public function store(Request $request, Sejour $sejour): JsonResponse
    {
        $validated = $request->validate([
            'description' => ['required', 'string', 'max:255'],
            'prix' => ['required', 'numeric', 'min:0'],
        ]);

        $fraisMaintenance = $sejour->fraisMaintenance()->create($validated);

        return response()->json($fraisMaintenance, 201);
    }

    /**
     * Remove the specified frais de maintenance.
     */
    public function destroy(FraisMaintenance $fraisMaintenance): JsonResponse
    {
        $fraisMaintenance->delete();

        return response()->json(null, 204);
    }
}
