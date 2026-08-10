<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureRole
{
    /**
     * Restrict a route to one or more roles, e.g. `role:manager` or
     * `role:menage,manager`. Must run after auth:sanctum.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $user = $request->user();

        if (! $user || ! in_array($user->role, $roles, true)) {
            throw new AuthorizationException('Accès refusé.');
        }

        return $next($request);
    }
}
