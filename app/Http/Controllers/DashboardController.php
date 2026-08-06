<?php

namespace App\Http\Controllers;

use App\Models\Appartement;
use App\Models\FraisMaintenance;
use App\Models\MissionMenage;
use App\Models\Sejour;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Aggregate revenue, cleaning/maintenance costs, appartement statuses,
     * and sejour counts by statut, all computed from existing data.
     */
    public function index(): JsonResponse
    {
        $revenusTotaux = (float) Sejour::sum('montant_mad');

        $fraisForfaitTotal = (float) MissionMenage::sum('frais_forfait');
        $fraisProduitsTotal = (float) DB::table('mission_menage_produits')
            ->join('produits_menage_catalogue', 'produits_menage_catalogue.id', '=', 'mission_menage_produits.produit_catalogue_id')
            ->sum('produits_menage_catalogue.prix');
        $fraisMenageTotaux = $fraisForfaitTotal + $fraisProduitsTotal;

        $fraisMaintenanceTotaux = (float) FraisMaintenance::sum('prix');

        $resultatNet = $revenusTotaux - $fraisMenageTotaux - $fraisMaintenanceTotaux;

        $appartements = Appartement::query()
            ->select('id', 'nom', 'statut')
            ->withCount('sejours')
            ->withMax('sejours', 'date_depart')
            ->orderBy('nom')
            ->get()
            ->map(fn (Appartement $appartement) => [
                'id' => $appartement->id,
                'nom' => $appartement->nom,
                'statut' => $appartement->statut,
                'sejours_count' => $appartement->sejours_count,
                'dernier_sejour' => $appartement->sejours_max_date_depart,
            ]);

        $sejoursParStatut = [
            Sejour::STATUT_A_VENIR => Sejour::where('statut', Sejour::STATUT_A_VENIR)->count(),
            Sejour::STATUT_EN_COURS => Sejour::where('statut', Sejour::STATUT_EN_COURS)->count(),
            Sejour::STATUT_TERMINE => Sejour::where('statut', Sejour::STATUT_TERMINE)->count(),
        ];

        return response()->json([
            'revenus_totaux' => $revenusTotaux,
            'frais_menage_totaux' => $fraisMenageTotaux,
            'frais_maintenance_totaux' => $fraisMaintenanceTotaux,
            'resultat_net' => $resultatNet,
            'appartements' => $appartements,
            'sejours_par_statut' => $sejoursParStatut,
        ]);
    }
}
