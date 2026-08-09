<?php

namespace App\Http\Controllers;

use App\Models\MissionMenage;
use App\Models\ProduitMenageSignale;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MissionMenageController extends Controller
{
    /**
     * Update the forfait and the catalogue products checked for a mission.
     */
    public function updateProduits(Request $request, MissionMenage $missionMenage): JsonResponse
    {
        $validated = $request->validate([
            'frais_forfait' => ['sometimes', 'numeric', 'min:0'],
            'produit_ids' => ['sometimes', 'array'],
            'produit_ids.*' => ['integer', 'exists:produits_menage_catalogue,id'],
        ]);

        DB::transaction(function () use ($missionMenage, $validated) {
            if (array_key_exists('frais_forfait', $validated)) {
                $missionMenage->update(['frais_forfait' => $validated['frais_forfait']]);
            }

            if (array_key_exists('produit_ids', $validated)) {
                $missionMenage->produits()->sync($validated['produit_ids']);
            }
        });

        return response()->json($missionMenage->fresh(['produits', 'agent']));
    }

    /**
     * Mark a mission as viewed by the cleaning agent (dismisses its
     * "Nouveau" badge). Idempotent.
     */
    public function marquerVue(MissionMenage $missionMenage): JsonResponse
    {
        if (! $missionMenage->vue) {
            $missionMenage->update(['vue' => true]);
        }

        return response()->json($missionMenage->fresh(['produits', 'agent']));
    }

    /**
     * Report a cleaning product used in the field that is not in the catalogue yet.
     */
    public function signalerProduit(Request $request, MissionMenage $missionMenage): JsonResponse
    {
        $validated = $request->validate([
            'photo' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $photoUrl = $request->file('photo')->store('produits-signales', 'public');

        $produitSignale = ProduitMenageSignale::create([
            'mission_menage_id' => $missionMenage->id,
            'photo_url' => $photoUrl,
            'note' => $validated['note'] ?? null,
            'statut' => ProduitMenageSignale::STATUT_EN_ATTENTE,
        ]);

        return response()->json($produitSignale, 201);
    }
}
