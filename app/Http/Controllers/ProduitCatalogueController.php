<?php

namespace App\Http\Controllers;

use App\Models\ProduitMenageCatalogue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProduitCatalogueController extends Controller
{
    /**
     * Display a listing of the cleaning products catalogue.
     */
    public function index(): JsonResponse
    {
        return response()->json(ProduitMenageCatalogue::orderBy('nom')->get());
    }

    /**
     * Store a newly created catalogue product.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'prix' => ['required', 'numeric', 'min:0'],
            'actif' => ['sometimes', 'boolean'],
        ]);

        $validated['actif'] = $validated['actif'] ?? true;

        $produit = ProduitMenageCatalogue::create($validated);

        return response()->json($produit, 201);
    }
}
