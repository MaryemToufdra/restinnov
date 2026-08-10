<?php

namespace App\Http\Controllers;

use App\Models\Utilisateur;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Issue a Sanctum token for a telephone + password pair. The error
     * message is deliberately identical whether the telephone is unknown or
     * the password is wrong -- never reveal which one was incorrect.
     */
    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'telephone' => ['required', 'string'],
            'password' => ['required', 'string'],
        ]);

        $utilisateur = Utilisateur::where('telephone', $validated['telephone'])->first();

        if (! $utilisateur || ! $utilisateur->password || ! Hash::check($validated['password'], $utilisateur->password)) {
            return response()->json([
                'message' => 'Identifiants incorrects.',
            ], 401);
        }

        $token = $utilisateur->createToken('api')->plainTextToken;

        return response()->json([
            'token' => $token,
            'id' => $utilisateur->id,
            'nom' => $utilisateur->nom,
            'role' => $utilisateur->role,
        ]);
    }

    /**
     * Revoke the token used to authenticate the current request.
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Déconnecté.']);
    }
}
