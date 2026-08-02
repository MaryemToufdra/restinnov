<?php

use App\Http\Controllers\SejourController;
use Illuminate\Support\Facades\Route;

Route::post('/sejours', [SejourController::class, 'store']);
Route::patch('/sejours/{sejour}/checkout', [SejourController::class, 'checkout']);
