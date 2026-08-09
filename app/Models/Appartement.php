<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Appartement extends Model
{
    use HasFactory;

    public const STATUT_DISPONIBLE = 'disponible';
    public const STATUT_OCCUPE = 'occupe';

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

    /**
     * Adds the `a_un_sejour_en_cours` boolean via an EXISTS subquery
     * (works alongside a custom select(), unlike an eager-loaded relation).
     * The stored `statut` column is only ever the default set at creation
     * -- it is never authoritative for "occupé", which must always be
     * derived from live sejours data at read time. See statutCalcule().
     */
    public function scopeAvecStatutCalcule(Builder $query): Builder
    {
        return $query->withExists([
            'sejours as a_un_sejour_en_cours' => fn ($q) => $q->where('statut', Sejour::STATUT_EN_COURS),
        ]);
    }

    /**
     * The appartement's real statut, derived from its sejours rather than
     * read from the (never-updated) `statut` column. Requires the model to
     * have been loaded via the avecStatutCalcule() scope.
     */
    public function statutCalcule(): string
    {
        return $this->a_un_sejour_en_cours ? self::STATUT_OCCUPE : self::STATUT_DISPONIBLE;
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
