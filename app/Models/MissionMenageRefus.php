<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MissionMenageRefus extends Model
{
    use HasFactory;

    protected $table = 'mission_menage_refus';

    protected $fillable = [
        'mission_menage_id',
        'manager_id',
        'motif',
        'motif_audio_url',
        'motif_photo_url',
        'vu',
    ];

    protected $casts = [
        'vu' => 'boolean',
    ];

    public function missionMenage(): BelongsTo
    {
        return $this->belongsTo(MissionMenage::class);
    }

    public function manager(): BelongsTo
    {
        return $this->belongsTo(Utilisateur::class, 'manager_id');
    }
}
