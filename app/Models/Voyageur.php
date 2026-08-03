<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Voyageur extends Model
{
    use HasFactory;

    protected $fillable = [
        'sejour_id',
        'nom',
        'numero_passeport',
        'est_principal',
    ];

    protected $casts = [
        'est_principal' => 'boolean',
    ];

    public function sejour(): BelongsTo
    {
        return $this->belongsTo(Sejour::class);
    }
}
