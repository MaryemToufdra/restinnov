<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Utilisateur extends Model
{
    use HasFactory;

    public const ROLE_MANAGER = 'manager';
    public const ROLE_MENAGE = 'menage';
    public const ROLE_MAINTENANCE = 'maintenance';

    protected $fillable = [
        'nom',
        'role',
        'telephone',
        'adresse',
        'password',
    ];

    protected $hidden = [
        'password',
    ];

    public function missionMenages(): HasMany
    {
        return $this->hasMany(MissionMenage::class, 'agent_id');
    }

    public function appartementsHabituels(): HasMany
    {
        return $this->hasMany(Appartement::class, 'agent_habituel_id');
    }
}
