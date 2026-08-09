<?php

namespace App\Services;

use App\Models\Sejour;

class SejourStatutService
{
    /**
     * Passe un séjour "a_venir" à "en_cours" si sa date d'arrivée est
     * aujourd'hui ou déjà passée. Seule et unique implémentation de cette
     * règle -- utilisée à la fois par la commande planifiée
     * `sejours:activer-en-cours` et par la mise à jour manuelle d'un séjour
     * (SejourController::update), pour qu'un changement de date d'arrivée
     * prenne effet immédiatement sans attendre le prochain passage du job.
     */
    public function activerSiNecessaire(Sejour $sejour): bool
    {
        if ($sejour->statut !== Sejour::STATUT_A_VENIR) {
            return false;
        }

        if ($sejour->date_arrivee->gt(now()->startOfDay())) {
            return false;
        }

        $sejour->update(['statut' => Sejour::STATUT_EN_COURS]);

        return true;
    }
}
