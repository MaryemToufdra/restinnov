<?php

namespace App\Services;

use App\Models\MissionMenage;
use App\Models\Sejour;
use App\Models\Utilisateur;
use Illuminate\Support\Facades\DB;

class SejourCheckoutService
{
    /**
     * Mark a sejour as checked out and create its cleaning mission, assigned
     * to the currently least busy "menage" agent. Shared by the manual
     * checkout endpoint and the automatic checkout scheduled command so both
     * apply exactly the same logic.
     */
    public function checkout(Sejour $sejour): MissionMenage
    {
        return DB::transaction(function () use ($sejour) {
            $sejour->update(['statut' => Sejour::STATUT_TERMINE]);

            $agent = Utilisateur::where('role', Utilisateur::ROLE_MENAGE)
                ->withCount(['missionMenages' => function ($query) {
                    $query->whereIn('statut', [
                        MissionMenage::STATUT_A_FAIRE,
                        MissionMenage::STATUT_EN_COURS,
                    ]);
                }])
                ->orderBy('mission_menages_count')
                ->orderBy('id')
                ->lockForUpdate()
                ->first();

            return MissionMenage::create([
                'sejour_id' => $sejour->id,
                'agent_id' => $agent?->id,
                'statut' => MissionMenage::STATUT_A_FAIRE,
            ]);
        });
    }
}
