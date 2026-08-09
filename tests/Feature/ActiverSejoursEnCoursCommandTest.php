<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\Sejour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ActiverSejoursEnCoursCommandTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_activates_a_venir_sejours_whose_arrival_date_has_passed(): void
    {
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);

        $sejourPasse = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => now()->subDay()->toDateString(),
            'date_depart' => now()->addDays(3)->toDateString(),
            'nom_voyageur' => 'Jean Dupont',
            'statut' => Sejour::STATUT_A_VENIR,
        ]);

        $sejourAujourdhui = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => now()->toDateString(),
            'date_depart' => now()->addDays(3)->toDateString(),
            'nom_voyageur' => 'Marie Curie',
            'statut' => Sejour::STATUT_A_VENIR,
        ]);

        $sejourFutur = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => now()->addDays(2)->toDateString(),
            'date_depart' => now()->addDays(5)->toDateString(),
            'nom_voyageur' => 'Ada Lovelace',
            'statut' => Sejour::STATUT_A_VENIR,
        ]);

        $this->artisan('sejours:activer-en-cours')->assertSuccessful();

        $this->assertSame(Sejour::STATUT_EN_COURS, $sejourPasse->fresh()->statut);
        $this->assertSame(Sejour::STATUT_EN_COURS, $sejourAujourdhui->fresh()->statut);
        $this->assertSame(Sejour::STATUT_A_VENIR, $sejourFutur->fresh()->statut);
    }

    public function test_it_leaves_non_a_venir_sejours_untouched(): void
    {
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);

        $sejourEnCours = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => now()->subDay()->toDateString(),
            'date_depart' => now()->addDays(3)->toDateString(),
            'nom_voyageur' => 'Jean Dupont',
            'statut' => Sejour::STATUT_EN_COURS,
        ]);

        $sejourTermine = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => now()->subDays(5)->toDateString(),
            'date_depart' => now()->subDay()->toDateString(),
            'nom_voyageur' => 'Marie Curie',
            'statut' => Sejour::STATUT_TERMINE,
        ]);

        $this->artisan('sejours:activer-en-cours')->assertSuccessful();

        $this->assertSame(Sejour::STATUT_EN_COURS, $sejourEnCours->fresh()->statut);
        $this->assertSame(Sejour::STATUT_TERMINE, $sejourTermine->fresh()->statut);
    }
}
