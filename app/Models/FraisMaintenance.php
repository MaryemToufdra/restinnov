<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FraisMaintenance extends Model
{
    use HasFactory;

    protected $table = 'frais_maintenance';

    protected $fillable = [
        'sejour_id',
        'description',
        'prix',
    ];

    protected $casts = [
        'prix' => 'decimal:2',
    ];

    public function sejour(): BelongsTo
    {
        return $this->belongsTo(Sejour::class);
    }
}
