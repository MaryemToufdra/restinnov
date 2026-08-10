<?php

namespace Database\Seeders;

use App\Models\Utilisateur;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ManagerAccountSeeder extends Seeder
{
    /**
     * Create the default manager account so a fresh deployment is never
     * left with zero accounts to log in with. Credentials are
     * env-configurable (MANAGER_DEFAULT_TELEPHONE / MANAGER_DEFAULT_PASSWORD)
     * with placeholder fallbacks -- see README for the defaults and the
     * reminder to change the password after first login.
     */
    public function run(): void
    {
        $telephone = env('MANAGER_DEFAULT_TELEPHONE', '0600000000');

        if (Utilisateur::where('telephone', $telephone)->exists()) {
            return;
        }

        Utilisateur::create([
            'nom' => 'Manager',
            'role' => Utilisateur::ROLE_MANAGER,
            'telephone' => $telephone,
            'password' => Hash::make(env('MANAGER_DEFAULT_PASSWORD', 'ChangeMe123!')),
        ]);
    }
}
