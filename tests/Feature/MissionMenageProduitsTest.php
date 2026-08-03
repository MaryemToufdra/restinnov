<?php

namespace Tests\Feature;

use App\Models\Appartement;
use App\Models\MissionMenage;
use App\Models\ProduitMenageCatalogue;
use App\Models\Sejour;
use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MissionMenageProduitsTest extends TestCase
{
    use RefreshDatabase;

    private function missionMenage(): MissionMenage
    {
        $appartement = Appartement::create(['nom' => 'Loft', 'adresse' => 'A', 'statut' => 'disponible']);
        $sejour = Sejour::create([
            'appartement_id' => $appartement->id,
            'date_arrivee' => '2026-01-01',
            'date_depart' => '2026-01-02',
            'nom_voyageur' => 'X',
        ]);

        return MissionMenage::create([
            'sejour_id' => $sejour->id,
            'statut' => 'a_faire',
        ]);
    }

    public function test_mission_menage_defaults_frais_forfait_to_80(): void
    {
        $mission = $this->missionMenage();

        $this->assertEquals(80, $mission->fresh()->frais_forfait);
    }

    public function test_it_updates_frais_forfait_and_syncs_produits(): void
    {
        $mission = $this->missionMenage();
        $produit1 = ProduitMenageCatalogue::first();
        $produit2 = ProduitMenageCatalogue::skip(1)->first();

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/produits", [
            'frais_forfait' => 100,
            'produit_ids' => [$produit1->id, $produit2->id],
        ]);

        $response->assertOk();
        $response->assertJsonPath('frais_forfait', '100.00');
        $response->assertJsonCount(2, 'produits');

        $this->assertDatabaseHas('mission_menages', [
            'id' => $mission->id,
            'frais_forfait' => 100,
        ]);
        $this->assertDatabaseHas('mission_menage_produits', [
            'mission_menage_id' => $mission->id,
            'produit_catalogue_id' => $produit1->id,
        ]);
        $this->assertDatabaseHas('mission_menage_produits', [
            'mission_menage_id' => $mission->id,
            'produit_catalogue_id' => $produit2->id,
        ]);
    }

    public function test_produits_sync_replaces_the_previous_selection(): void
    {
        $mission = $this->missionMenage();
        $produit1 = ProduitMenageCatalogue::first();
        $produit2 = ProduitMenageCatalogue::skip(1)->first();

        $mission->produits()->attach($produit1->id);

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/produits", [
            'produit_ids' => [$produit2->id],
        ]);

        $response->assertOk();
        $this->assertDatabaseMissing('mission_menage_produits', [
            'mission_menage_id' => $mission->id,
            'produit_catalogue_id' => $produit1->id,
        ]);
        $this->assertDatabaseHas('mission_menage_produits', [
            'mission_menage_id' => $mission->id,
            'produit_catalogue_id' => $produit2->id,
        ]);
    }

    public function test_produit_ids_must_exist_in_catalogue(): void
    {
        $mission = $this->missionMenage();

        $response = $this->patchJson("/api/mission-menages/{$mission->id}/produits", [
            'produit_ids' => [999],
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('produit_ids.0');
    }

    public function test_it_signals_a_product_with_photo_and_note(): void
    {
        Storage::fake('public');
        $mission = $this->missionMenage();
        $photo = UploadedFile::fake()->image('produit.jpg');

        $response = $this->post("/api/mission-menages/{$mission->id}/produits-signales", [
            'photo' => $photo,
            'note' => 'Trouvé sur le terrain',
        ], ['Accept' => 'application/json']);

        $response->assertCreated();
        $response->assertJsonPath('statut', 'en_attente');
        $response->assertJsonPath('note', 'Trouvé sur le terrain');

        $photoUrl = $response->json('photo_url');
        $this->assertNotNull($photoUrl);
        Storage::disk('public')->assertExists($photoUrl);

        $this->assertDatabaseHas('produits_menage_signales', [
            'mission_menage_id' => $mission->id,
            'statut' => 'en_attente',
            'note' => 'Trouvé sur le terrain',
        ]);
    }

    public function test_it_signals_a_product_without_note(): void
    {
        Storage::fake('public');
        $mission = $this->missionMenage();
        $photo = UploadedFile::fake()->image('produit.jpg');

        $response = $this->post("/api/mission-menages/{$mission->id}/produits-signales", [
            'photo' => $photo,
        ], ['Accept' => 'application/json']);

        $response->assertCreated();
        $response->assertJsonPath('note', null);
    }

    public function test_photo_is_required_to_signal_a_product(): void
    {
        $mission = $this->missionMenage();

        $response = $this->postJson("/api/mission-menages/{$mission->id}/produits-signales", [
            'note' => 'Sans photo',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors('photo');
    }
}
