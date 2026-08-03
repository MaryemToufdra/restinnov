<?php

namespace App\Http\Controllers;

use App\Models\Appartement;
use Illuminate\Http\JsonResponse;

class AppartementController extends Controller
{
    /**
     * Display a listing of appartements.
     */
    public function index(): JsonResponse
    {
        return response()->json(Appartement::orderBy('nom')->get());
    }
}
