<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketMaintenance extends Model
{
    use HasFactory;

    protected $table = 'tickets_maintenance';

    public const URGENCE_BASSE = 'basse';

    public const URGENCE_NORMALE = 'normale';

    public const URGENCE_HAUTE = 'haute';

    public const STATUT_OUVERT = 'ouvert';

    public const STATUT_ASSIGNE = 'assigne';

    public const STATUT_RESOLU = 'resolu';

    protected $fillable = [
        'appartement_id',
        'mission_origine_id',
        'agent_id',
        'description',
        'photo_url',
        'audio_url',
        'urgence',
        'statut',
    ];

    public function appartement(): BelongsTo
    {
        return $this->belongsTo(Appartement::class);
    }

    public function missionOrigine(): BelongsTo
    {
        return $this->belongsTo(MissionMenage::class, 'mission_origine_id');
    }

    public function agent(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'agent_id');
    }
}
