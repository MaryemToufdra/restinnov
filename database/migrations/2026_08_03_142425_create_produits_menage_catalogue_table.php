<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('produits_menage_catalogue', function (Blueprint $table) {
            $table->id();
            $table->string('nom');
            $table->decimal('prix', 10, 2)->default(0);
            $table->boolean('actif')->default(true);
            $table->timestamps();
        });

        $now = now();
        DB::table('produits_menage_catalogue')->insert(collect([
            'Nettoyant de sol',
            'Javel',
            'Sac poubelle',
            'ONI liquide vaisselle',
            'Savon pour les mains',
            'Liquide machine à laver',
            'Air fraîcheur',
        ])->map(fn (string $nom) => [
            'nom' => $nom,
            'prix' => 0,
            'actif' => true,
            'created_at' => $now,
            'updated_at' => $now,
        ])->all());
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('produits_menage_catalogue');
    }
};
