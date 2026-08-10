<?php

namespace Tests;

use App\Models\Utilisateur;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Laravel\Sanctum\Sanctum;

abstract class TestCase extends BaseTestCase
{
    /**
     * Every protected route now requires auth:sanctum. Defaulting every
     * test to an authenticated manager keeps the huge majority of existing
     * Feature tests (which exercise manager-only routes) working unchanged;
     * tests that need a different role or an unauthenticated request call
     * actingAsMenage()/actingAsMaintenance() or Sanctum's actingAs(null)
     * equivalent explicitly to override this default.
     */
    protected function setUp(): void
    {
        parent::setUp();

        $this->actingAsManager();
    }

    protected function actingAsManager(): Utilisateur
    {
        $manager = Utilisateur::factory()->manager()->create();
        Sanctum::actingAs($manager, ['*']);

        return $manager;
    }

    protected function actingAsMenage(): Utilisateur
    {
        $menage = Utilisateur::factory()->menage()->create();
        Sanctum::actingAs($menage, ['*']);

        return $menage;
    }

    protected function actingAsMaintenance(): Utilisateur
    {
        $maintenance = Utilisateur::factory()->maintenance()->create();
        Sanctum::actingAs($maintenance, ['*']);

        return $maintenance;
    }
}
