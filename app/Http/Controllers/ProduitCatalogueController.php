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
     * Store a newly created catalogue product. The reference photo is
     * optional -- shown to the agent alongside the product name when
     * picking products used during a mission.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nom' => ['required', 'string', 'max:255'],
            'prix' => ['required', 'numeric', 'min:0'],
            'photo' => ['sometimes', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
            'actif' => ['sometimes', 'boolean'],
        ]);

        $produit = ProduitMenageCatalogue::create([
            'nom' => $validated['nom'],
            'prix' => $validated['prix'],
            'photo_url' => $request->hasFile('photo') ? $request->file('photo')->store('produits-catalogue', 'public') : null,
            'actif' => $validated['actif'] ?? true,
        ]);

        return response()->json($produit, 201);
    }
}
