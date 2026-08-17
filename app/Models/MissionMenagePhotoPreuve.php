<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MissionMenagePhotoPreuve extends Model
{
    use HasFactory;

    protected $table = 'mission_menage_photos_preuve';

    protected $fillable = [
        'mission_menage_id',
        'photo_url',
        'note',
    ];

    public function missionMenage(): BelongsTo
    {
        return $this->belongsTo(MissionMenage::class);
    }
}
