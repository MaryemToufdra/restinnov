<?php

use App\Http\Controllers\AppartementController;
use App\Http\Controllers\SejourController;
use Illuminate\Support\Facades\Route;

Route::get('/appartements', [AppartementController::class, 'index']);

Route::get('/sejours', [SejourController::class, 'index']);
Route::post('/sejours', [SejourController::class, 'store']);
Route::patch('/sejours/{sejour}/checkout', [SejourController::class, 'checkout']);
