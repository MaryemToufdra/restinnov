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
    protected $description = 'Checkoute automatiquement tous les séjours "en_cours" dont la date de départ est aujourd\'hui ou passée';

    public function handle(SejourCheckoutService $checkoutService): int
    {
        // "<=" rather than strict equality: same catch-up logic as
        // sejours:activer-en-cours. If the job misses a day (e.g. the
        // scheduler container was down), a sejour whose date_depart is
        // already in the past must still get checked out on the next run,
        // not silently skipped forever.
        $sejours = Sejour::where('statut', Sejour::STATUT_EN_COURS)
            ->whereDate('date_depart', '<=', now())
            ->get();

        foreach ($sejours as $sejour) {
            $checkoutService->checkout($sejour);
        }

        $this->info("{$sejours->count()} séjour(s) checkouté(s) automatiquement.");

        return self::SUCCESS;
    }
}
