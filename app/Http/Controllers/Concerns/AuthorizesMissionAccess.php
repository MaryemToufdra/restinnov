<?php

namespace App\Http\Controllers\Concerns;

use App\Models\MissionMenage;
use App\Models\Utilisateur;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;

trait AuthorizesMissionAccess
{
    /**
     * A "manager" can act on any mission. A "menage" agent may only act on
     * missions assigned to themselves -- the role:menage,manager route
     * middleware alone doesn't stop one agent from reading or mutating
     * another agent's mission by guessing its id.
     */
    private function authorizeMissionAccess(Request $request, MissionMenage $mission): void
    {
        $user = $request->user();

        if ($user->role === Utilisateur::ROLE_MANAGER) {
            return;
        }

        if ($mission->agent_id !== $user->id) {
            throw new AuthorizationException('Accès refusé.');
        }
    }
}
