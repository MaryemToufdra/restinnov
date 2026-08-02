<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Appartement extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
        'adresse',
        'statut',
    ];

    public function sejours(): HasMany
    {
        return $this->hasMany(Sejour::class);
    }
}
