<?php

namespace App\Console\Commands;

use App\Models\Sejour;
use App\Services\SejourStatutService;
use Illuminate\Console\Command;

class ActiverSejoursEnCours extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'sejours:activer-en-cours';

    /**
     * The console command description.
     */
    protected $description = 'Passe au statut "en_cours" tous les séjours "a_venir" dont la date d\'arrivée est aujourd\'hui ou passée';

    public function handle(SejourStatutService $statutService): int
    {
        $count = Sejour::where('statut', Sejour::STATUT_A_VENIR)
            ->whereDate('date_arrivee', '<=', now())
            ->get()
            ->filter(fn (Sejour $sejour) => $statutService->activerSiNecessaire($sejour))
            ->count();

        $this->info("{$count} séjour(s) passé(s) en \"en_cours\".");

        return self::SUCCESS;
    }
}
