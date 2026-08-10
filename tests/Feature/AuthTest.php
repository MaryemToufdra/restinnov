<?php

namespace Tests\Feature;

use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_it_logs_in_with_correct_telephone_and_password(): void
    {
        Utilisateur::where('id', '!=', 0)->delete();
        $utilisateur = Utilisateur::create([
            'nom' => 'Fatima Z.',
            'role' => 'menage',
            'telephone' => '0611111111',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/login', [
            'telephone' => '0611111111',
            'password' => 'secret123',
        ]);

        $response->assertOk();
        $response->assertJsonPath('id', $utilisateur->id);
        $response->assertJsonPath('nom', 'Fatima Z.');
        $response->assertJsonPath('role', 'menage');
        $this->assertNotEmpty($response->json('token'));
    }

    public function test_it_rejects_an_unknown_telephone_with_a_generic_message(): void
    {
        $response = $this->postJson('/api/login', [
            'telephone' => '0699999999',
            'password' => 'whatever',
        ]);

        $response->assertStatus(401);
        $response->assertJsonPath('message', 'Identifiants incorrects.');
    }

    public function test_it_rejects_a_wrong_password_with_the_same_generic_message(): void
    {
        Utilisateur::create([
            'nom' => 'Fatima Z.',
            'role' => 'menage',
            'telephone' => '0611111111',
            'password' => Hash::make('secret123'),
        ]);

        $response = $this->postJson('/api/login', [
            'telephone' => '0611111111',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(401);
        $response->assertJsonPath('message', 'Identifiants incorrects.');
    }

    public function test_it_rejects_login_for_an_account_with_no_password_set(): void
    {
        Utilisateur::create([
            'nom' => 'Karim B.',
            'role' => 'menage',
            'telephone' => '0622222222',
        ]);

        $response = $this->postJson('/api/login', [
            'telephone' => '0622222222',
            'password' => 'anything',
        ]);

        $response->assertStatus(401);
        $response->assertJsonPath('message', 'Identifiants incorrects.');
    }

    public function test_telephone_and_password_are_required(): void
    {
        $response = $this->postJson('/api/login', []);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['telephone', 'password']);
    }

    public function test_it_logs_out_and_revokes_the_current_token(): void
    {
        $utilisateur = Utilisateur::create([
            'nom' => 'Fatima Z.',
            'role' => 'menage',
            'telephone' => '0611111111',
            'password' => Hash::make('secret123'),
        ]);
        $token = $utilisateur->createToken('api')->plainTextToken;

        // Bypass Sanctum::actingAs() from setUp() so this request really
        // authenticates via the Authorization header, like a real client.
        $this->app['auth']->forgetGuards();

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout');

        $response->assertOk();
        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_an_unauthenticated_request_is_rejected(): void
    {
        // Deliberately bypasses Sanctum::actingAs() from TestCase::setUp().
        $this->app['auth']->forgetGuards();

        $response = $this->getJson('/api/dashboard');

        $response->assertStatus(401);
    }

    public function test_an_invalid_bearer_token_is_rejected(): void
    {
        $this->app['auth']->forgetGuards();

        $response = $this->withHeader('Authorization', 'Bearer nonexistent-token-value')
            ->getJson('/api/dashboard');

        $response->assertStatus(401);
    }

    public function test_a_menage_account_is_denied_access_to_manager_only_routes(): void
    {
        $this->actingAsMenage();

        $response = $this->getJson('/api/dashboard');

        $response->assertStatus(403);
    }

    public function test_a_manager_account_can_access_manager_only_routes(): void
    {
        $this->actingAsManager();

        $response = $this->getJson('/api/dashboard');

        $response->assertOk();
    }

    public function test_a_menage_account_can_access_the_mission_workspace_routes(): void
    {
        $this->actingAsMenage();

        $response = $this->getJson('/api/produits-catalogue');

        $response->assertOk();
    }

    public function test_a_manager_account_can_also_access_the_mission_workspace_routes(): void
    {
        $this->actingAsManager();

        $response = $this->getJson('/api/produits-catalogue');

        $response->assertOk();
    }

    public function test_a_maintenance_account_is_denied_access_to_manager_only_routes(): void
    {
        $this->actingAsMaintenance();

        $response = $this->getJson('/api/dashboard');

        $response->assertStatus(403);
    }

    public function test_a_maintenance_account_is_denied_access_to_the_mission_workspace_routes(): void
    {
        $this->actingAsMaintenance();

        $response = $this->getJson('/api/produits-catalogue');

        $response->assertStatus(403);
    }
}
