<?php

namespace Tests\Feature;

use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AgentsMenageActifsTest extends TestCase
{
    use RefreshDatabase;

    public function test_liste_les_agents_menage_actifs_sans_authentification(): void
    {
        Utilisateur::create(['nom' => 'Fatima Z.', 'role' => 'menage', 'telephone' => '0611111111', 'actif' => true]);

        $response = $this->getJson('/api/agents-menage-actifs');

        $response->assertOk();
        $response->assertJson([
            ['nom' => 'Fatima Z.', 'telephone' => '0611111111'],
        ]);
    }

    public function test_exclut_les_agents_menage_inactifs(): void
    {
        Utilisateur::create(['nom' => 'Fatima Z.', 'role' => 'menage', 'telephone' => '0611111111', 'actif' => false]);

        $response = $this->getJson('/api/agents-menage-actifs');

        $response->assertOk();
        $response->assertJsonCount(0);
    }

    public function test_exclut_les_comptes_manager_et_maintenance(): void
    {
        Utilisateur::create(['nom' => 'Nadia M.', 'role' => 'manager', 'telephone' => '0600000000', 'actif' => true]);
        Utilisateur::create(['nom' => 'Karim B.', 'role' => 'maintenance', 'telephone' => '0622222222', 'actif' => true]);

        $response = $this->getJson('/api/agents-menage-actifs');

        $response->assertOk();
        $response->assertJsonCount(0);
    }

    public function test_ne_retourne_que_id_nom_telephone(): void
    {
        Utilisateur::create([
            'nom' => 'Fatima Z.',
            'role' => 'menage',
            'telephone' => '0611111111',
            'adresse' => 'Rue de la Paix',
            'password' => 'secret123',
            'actif' => true,
        ]);

        $response = $this->getJson('/api/agents-menage-actifs');

        $response->assertOk();
        $agent = $response->json()[0];
        $this->assertEqualsCanonicalizing(['id', 'nom', 'telephone'], array_keys($agent));
    }
}
