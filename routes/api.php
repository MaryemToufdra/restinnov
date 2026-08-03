<?php

use App\Http\Controllers\AppartementController;
use App\Http\Controllers\ChecklistModeleController;
use App\Http\Controllers\SejourController;
use App\Http\Controllers\UtilisateurController;
use Illuminate\Support\Facades\Route;

Route::get('/appartements', [AppartementController::class, 'index']);
Route::post('/appartements', [AppartementController::class, 'store']);

Route::get('/checklist-modeles', [ChecklistModeleController::class, 'index']);
Route::post('/checklist-modeles', [ChecklistModeleController::class, 'store']);

Route::get('/utilisateurs', [UtilisateurController::class, 'index']);
Route::post('/utilisateurs', [UtilisateurController::class, 'store']);

Route::get('/sejours', [SejourController::class, 'index']);
Route::post('/sejours', [SejourController::class, 'store']);
Route::patch('/sejours/{sejour}/checkout', [SejourController::class, 'checkout']);
