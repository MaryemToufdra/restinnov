<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\MissionMenage;
use App\Models\Sejour;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MissionMenageVueTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_newly_created_mission_is_not_vue(): void
    {
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);
        Utilisateur::create(['nom' => 'Fatima Z.', 'role' => Utilisateur::ROLE_MENAGE]);

        $sejour = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Jean Dupont',
        ]);

        $response = $this->patchJson("/api/sejours/{$sejour->id}/checkout");

        $response->assertOk();
        $response->assertJsonPath('mission_menage.vue', false);
    }

    public function test_marking_a_mission_as_vue_sets_the_flag(): void
    {
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);

        $sejour = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Jean Dupont',
            'statut' => Sejour::STATUT_TERMINE,
        ]);

        $mission = MissionMenage::create([
            'sejour_id' => $sejour->id,
            'statut' => MissionMenage::STATUT_A_FAIRE,
        ]);

        $this->assertFalse($mission->fresh()->vue);

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/vue");

        $response->assertOk();
        $response->assertJsonPath('vue', true);
        $this->assertDatabaseHas('mission_menages', ['id' => $mission->id, 'vue' => true]);
    }
}
