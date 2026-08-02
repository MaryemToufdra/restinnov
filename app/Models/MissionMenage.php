<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MissionMenage extends Model
{
    use HasFactory;

    public const STATUT_A_FAIRE = 'a_faire';
    public const STATUT_EN_COURS = 'en_cours';
    public const STATUT_CONFORME = 'conforme';
    public const STATUT_NON_CONFORME = 'non_conforme';

    protected $fillable = [
        'sejour_id',
        'agent_id',
        'statut',
    ];

    public function sejour(): BelongsTo
    {
        return $this->belongsTo(Sejour::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'agent_id');
    }
}
