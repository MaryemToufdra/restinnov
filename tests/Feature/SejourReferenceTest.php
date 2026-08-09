<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\Sejour;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SejourReferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_a_reference_is_generated_automatically_on_creation(): void
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
        ]);

        $this->assertSame('SEJ-0001', $sejour->reference);
    }

    public function test_references_increment_sequentially(): void
    {
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);

        $premier = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'nom_voyageur' => 'Jean Dupont',
        ]);

        $second = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-09-01',
            'date_depart' => '2026-09-05',
            'nom_voyageur' => 'Marie Curie',
        ]);

        $this->assertSame('SEJ-0001', $premier->reference);
        $this->assertSame('SEJ-0002', $second->reference);
    }

    public function test_the_reference_is_included_in_the_api_responses(): void
    {
        $appartement = Appartement::create([
            'nom' => 'Loft Bastille',
            'adresse' => '12 rue de la Roquette, Paris',
            'statut' => 'disponible',
        ]);

        $response = $this->postJson('/api/sejours', [
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-08-01',
            'date_depart' => '2026-08-05',
            'voyageurs' => [
                ['nom' => 'Jean Dupont', 'numero_passeport' => null, 'est_principal' => true],
            ],
        ]);

        $response->assertCreated();
        $response->assertJsonPath('reference', 'SEJ-0001');

        $sejourId = $response->json('id');

        $this->getJson('/api/sejours')->assertJsonPath('data.0.reference', 'SEJ-0001');
        $this->getJson("/api/sejours/{$sejourId}")->assertJsonPath('reference', 'SEJ-0001');
    }
}
