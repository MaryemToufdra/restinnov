<?php

namespace App\Http\Controllers\Concerns;

use App\Models\TicketMaintenance;
use App\Models\Utilisateur;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;

trait AuthorizesTicketAccess
{
    /**
     * A "manager" can act on any ticket. A "maintenance" agent may only act
     * on tickets assigned to themselves -- the role:maintenance,manager
     * route middleware alone doesn't stop one agent from reading or
     * mutating another agent's ticket by guessing its id.
     */
    private function authorizeTicketAccess(Request $request, TicketMaintenance $ticket): void
    {
        $user = $request->user();

        if ($user->role === Utilisateur::ROLE_MANAGER) {
            return;
        }

        if ($ticket->agent_id !== $user->id) {
            throw new AuthorizationException('Accès refusé.');
        }
    }
}
