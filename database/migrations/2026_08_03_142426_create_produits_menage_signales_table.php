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
        Schema::create('produits_menage_signales', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mission_menage_id')->constrained('mission_menages')->cascadeOnDelete();
            $table->string('photo_url');
            $table->string('note')->nullable();
            $table->enum('statut', ['en_attente', 'valide', 'rejete'])->default('en_attente');
            $table->foreignId('produit_catalogue_id')->nullable()->constrained('produits_menage_catalogue')->nullOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('produits_menage_signales');
    }
};
