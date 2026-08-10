<?php

namespace Database\Factories;

use App\Models\Utilisateur;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;

/**
 * @extends Factory<Utilisateur>
 */
class UtilisateurFactory extends Factory
{
    protected $model = Utilisateur::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'nom' => fake()->name(),
            'role' => Utilisateur::ROLE_MANAGER,
            // Distinct leading digit from the '06########' numbers hardcoded
            // in various Feature tests, so factory-generated accounts (e.g.
            // via Tests\TestCase::actingAsManager()) never collide with them
            // under the unique index on telephone.
            'telephone' => fake()->unique()->numerify('07########'),
            'adresse' => null,
            'password' => Hash::make('password'),
        ];
    }

    public function manager(): static
    {
        return $this->state(['role' => Utilisateur::ROLE_MANAGER]);
    }

    public function menage(): static
    {
        return $this->state(['role' => Utilisateur::ROLE_MENAGE]);
    }

    public function maintenance(): static
    {
        return $this->state(['role' => Utilisateur::ROLE_MAINTENANCE]);
    }
}
