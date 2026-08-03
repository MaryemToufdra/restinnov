<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Sejour extends Model
{
    use HasFactory;

    public const STATUT_A_VENIR = 'a_venir';
    public const STATUT_EN_COURS = 'en_cours';
    public const STATUT_TERMINE = 'termine';

    public const PLATEFORME_AIRBNB = 'airbnb';
    public const PLATEFORME_DIRECT = 'direct';
    public const PLATEFORME_AUTRE = 'autre';
    public const PLATEFORME_BOOKING = 'booking';

    protected $fillable = [
        'appartement_id',
        'date_arrivee',
        'date_depart',
        'nom_voyageur',
        'statut',
        'plateforme_origine',
        'montant_mad',
    ];

    protected $casts = [
        'date_arrivee' => 'date:Y-m-d',
        'date_depart' => 'date:Y-m-d',
        'montant_mad' => 'decimal:2',
    ];

    public function appartement(): BelongsTo
    {
        return $this->belongsTo(Appartement::class);
    }

    public function missionMenage(): HasOne
    {
        return $this->hasOne(MissionMenage::class);
    }

    public function voyageurs(): HasMany
    {
        return $this->hasMany(Voyageur::class);
    }

    public function fraisMaintenance(): HasMany
    {
        return $this->hasMany(FraisMaintenance::class);
    }
}
