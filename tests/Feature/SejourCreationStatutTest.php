<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SejourCreationStatutTest extends TestCase
{
    use RefreshDatabase;

    private function appartement(): Appartement
    {
        return Appartement::create(['nom' => 'Loft Bastille', 'adresse' => '12 rue de la Roquette', 'statut' => 'disponible']);
    }

    private function agentMenage(): Utilisateur
    {
        return Utilisateur::create(['nom' => 'Fatima Z.', 'role' => 'menage']);
    }

    private function payload(Appartement $appartement, string $arrivee, string $depart): array
    {
        return [
            'appartement_id' => $appartement->id,
            'date_arrivee' => $arrivee,
            'date_depart' => $depart,
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'est_principal' => true, 'type' => 'adulte'],
            ],
        ];
    }

    public function test_creating_a_sejour_with_dates_entirely_in_the_past_is_checked_out_immediately(): void
    {
        $appartement = $this->appartement();
        $agent = $this->agentMenage();

        $response = $this->postJson('/api/sejours', $this->payload(
            $appartement,
            now()->subDays(5)->toDateString(),
            now()->subDays(2)->toDateString(),
        ));

        $response->assertCreated();
        $response->assertJsonPath('statut', 'termine');
        $response->assertJsonPath('mission_menage.statut', 'a_faire');
        $response->assertJsonPath('mission_menage.agent_id', $agent->id);

        $sejourId = $response->json('id');
        $this->assertDatabaseHas('sejours', ['id' => $sejourId, 'statut' => 'termine']);
        $this->assertDatabaseHas('mission_menages', [
            'sejour_id' => $sejourId,
            'agent_id' => $agent->id,
            'statut' => 'a_faire',
        ]);
    }

    public function test_creating_a_sejour_with_a_past_arrival_and_future_departure_is_en_cours(): void
    {
        $appartement = $this->appartement();

        $response = $this->postJson('/api/sejours', $this->payload(
            $appartement,
            now()->subDays(2)->toDateString(),
            now()->addDays(3)->toDateString(),
        ));

        $response->assertCreated();
        $response->assertJsonPath('statut', 'en_cours');

        $sejourId = $response->json('id');
        $this->assertDatabaseHas('sejours', ['id' => $sejourId, 'statut' => 'en_cours']);
        $this->assertDatabaseCount('mission_menages', 0);
    }

    public function test_creating_a_sejour_with_dates_entirely_in_the_future_stays_a_venir(): void
    {
        $appartement = $this->appartement();

        $response = $this->postJson('/api/sejours', $this->payload(
            $appartement,
            now()->addDays(5)->toDateString(),
            now()->addDays(9)->toDateString(),
        ));

        $response->assertCreated();
        $response->assertJsonPath('statut', 'a_venir');

        $sejourId = $response->json('id');
        $this->assertDatabaseHas('sejours', ['id' => $sejourId, 'statut' => 'a_venir']);
        $this->assertDatabaseCount('mission_menages', 0);
    }

    public function test_creating_a_sejour_whose_arrival_is_today_is_en_cours(): void
    {
        $appartement = $this->appartement();

        $response = $this->postJson('/api/sejours', $this->payload(
            $appartement,
            now()->toDateString(),
            now()->addDays(4)->toDateString(),
        ));

        $response->assertCreated();
        $response->assertJsonPath('statut', 'en_cours');
    }
}
