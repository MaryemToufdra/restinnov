<?php

use App\Http\Controllers\AppartementController;
use App\Http\Controllers\ChecklistModeleController;
use App\Http\Controllers\FraisMaintenanceController;
use App\Http\Controllers\MissionMenageController;
use App\Http\Controllers\ProduitCatalogueController;
use App\Http\Controllers\ProduitSignaleController;
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

Route::post('/sejours/{sejour}/frais-maintenance', [FraisMaintenanceController::class, 'store']);
Route::delete('/frais-maintenance/{fraisMaintenance}', [FraisMaintenanceController::class, 'destroy']);

Route::get('/produits-catalogue', [ProduitCatalogueController::class, 'index']);
Route::post('/produits-catalogue', [ProduitCatalogueController::class, 'store']);

Route::patch('/mission-menages/{missionMenage}/produits', [MissionMenageController::class, 'updateProduits']);
Route::post('/mission-menages/{missionMenage}/produits-signales', [MissionMenageController::class, 'signalerProduit']);

Route::get('/produits-signales', [ProduitSignaleController::class, 'index']);
Route::patch('/produits-signales/{produitSignale}/valider', [ProduitSignaleController::class, 'valider']);
Route::patch('/produits-signales/{produitSignale}/rejeter', [ProduitSignaleController::class, 'rejeter']);
