<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Sejour extends Model
{
    use HasFactory;

    public const STATUT_A_VENIR = 'a_venir';
    public const STATUT_EN_COURS = 'en_cours';
    public const STATUT_TERMINE = 'termine';

    protected $fillable = [
        'appartement_id',
        'date_arrivee',
        'date_depart',
        'nom_voyageur',
        'statut',
    ];

    protected $casts = [
        'date_arrivee' => 'date:Y-m-d',
        'date_depart' => 'date:Y-m-d',
    ];

    public function appartement(): BelongsTo
    {
        return $this->belongsTo(Appartement::class);
    }

    public function missionMenage(): HasOne
    {
        return $this->hasOne(MissionMenage::class);
    }
}
