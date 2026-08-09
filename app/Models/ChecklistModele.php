<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChecklistModele extends Model
{
    use HasFactory;

    protected $fillable = [
        'nom',
    ];

    public function appartements(): HasMany
    {
        return $this->hasMany(Appartement::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ChecklistModeleItem::class)->orderBy('ordre');
    }
}
