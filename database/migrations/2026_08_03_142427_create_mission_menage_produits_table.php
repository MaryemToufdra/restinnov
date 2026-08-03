<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('mission_menage_produits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mission_menage_id')->constrained('mission_menages')->cascadeOnDelete();
            $table->foreignId('produit_catalogue_id')->constrained('produits_menage_catalogue')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['mission_menage_id', 'produit_catalogue_id'], 'mmp_mission_produit_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mission_menage_produits');
    }
};
