<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProduitCatalogueTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_lists_the_seeded_catalogue_products(): void
    {
        $response = $this->getJson('/api/produits-catalogue');

        $response->assertOk();
        $response->assertJsonCount(7);
        $noms = collect($response->json())->pluck('nom');
        foreach ([
            'Nettoyant de sol',
            'Javel',
            'Sac poubelle',
            'ONI liquide vaisselle',
            'Savon pour les mains',
            'Liquide machine à laver',
            'Air fraîcheur',
        ] as $nom) {
            $this->assertTrue($noms->contains($nom), "Missing seeded product: {$nom}");
        }
    }

    public function test_seeded_products_default_to_price_zero_and_active(): void
    {
        $this->assertDatabaseHas('produits_menage_catalogue', [
            'nom' => 'Javel',
            'prix' => 0,
            'actif' => true,
        ]);
    }

    public function test_it_creates_a_catalogue_product(): void
    {
        $response = $this->postJson('/api/produits-catalogue', [
            'nom' => 'Éponge magique',
            'prix' => 15,
        ]);

        $response->assertCreated();
        $response->assertJsonPath('nom', 'Éponge magique');
        $response->assertJsonPath('actif', true);
        $this->assertDatabaseHas('produits_menage_catalogue', [
            'nom' => 'Éponge magique',
            'prix' => 15,
            'actif' => true,
        ]);
    }

    public function test_nom_and_prix_are_required(): void
    {
        $response = $this->postJson('/api/produits-catalogue', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['nom', 'prix']);
    }
}
