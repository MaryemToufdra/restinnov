<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Appartement extends Model
{
    use HasFactory;

    public const STATUT_DISPONIBLE = 'disponible';

    protected $fillable = [
        'nom',
        'adresse',
        'statut',
        'photo_principale',
        'checklist_modele_id',
        'agent_habituel_id',
    ];

    public function sejours(): HasMany
    {
        return $this->hasMany(Sejour::class);
    }

    public function checklistModele(): BelongsTo
    {
        return $this->belongsTo(ChecklistModele::class);
    }

    public function agentHabituel(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'agent_habituel_id');
    }
}
