<?php

namespace App\Console\Commands;

use App\Models\Sejour;
use App\Services\SejourCheckoutService;
use Illuminate\Console\Command;

class CheckoutAutomatique extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'sejours:checkout-automatique';

    /**
     * The console command description.
     */
    protected $description = 'Checkoute automatiquement tous les séjours "en_cours" dont la date de départ est aujourd\'hui';

    public function handle(SejourCheckoutService $checkoutService): int
    {
        $sejours = Sejour::where('statut', Sejour::STATUT_EN_COURS)
            ->whereDate('date_depart', now())
            ->get();

        foreach ($sejours as $sejour) {
            $checkoutService->checkout($sejour);
        }

        $this->info("{$sejours->count()} séjour(s) checkouté(s) automatiquement.");

        return self::SUCCESS;
    }
}
