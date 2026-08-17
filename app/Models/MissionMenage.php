<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MissionMenage extends Model
{
    use HasFactory;

    public const STATUT_A_FAIRE = 'a_faire';

    public const STATUT_EN_COURS = 'en_cours';

    public const STATUT_EN_ATTENTE_VALIDATION = 'en_attente_validation';

    public const STATUT_CONFORME = 'conforme';

    public const STATUT_NON_CONFORME = 'non_conforme';

    protected $fillable = [
        'sejour_id',
        'agent_id',
        'statut',
        'frais_forfait',
        'vue',
    ];

    protected $casts = [
        'frais_forfait' => 'decimal:2',
        'vue' => 'boolean',
    ];

    public function sejour(): BelongsTo
    {
        return $this->belongsTo(Sejour::class);
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'agent_id');
    }

    public function produits(): BelongsToMany
    {
        return $this->belongsToMany(
            ProduitMenageCatalogue::class,
            'mission_menage_produits',
            'mission_menage_id',
            'produit_catalogue_id',
        );
    }

    public function produitsSignales(): HasMany
    {
        return $this->hasMany(ProduitMenageSignale::class);
    }

    public function photosPreuve(): HasMany
    {
        return $this->hasMany(MissionMenagePhotoPreuve::class)->latest();
    }

    public function checklistItems(): HasMany
    {
        return $this->hasMany(ChecklistItem::class)->orderBy('ordre');
    }

    public function refus(): HasMany
    {
        return $this->hasMany(MissionMenageRefus::class)->latest();
    }
}
