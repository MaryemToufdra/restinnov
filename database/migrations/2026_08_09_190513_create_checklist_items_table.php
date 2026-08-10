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
        // Rows here are a snapshot copy of the checklist_modele's items at
        // the time the mission is created (see SejourCheckoutService) --
        // deliberately not a foreign key to checklist_modele_items, so
        // editing a template later never rewrites an in-progress mission's
        // checklist.
        Schema::create('checklist_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mission_menage_id')->constrained('mission_menages')->cascadeOnDelete();
            $table->string('libelle');
            $table->boolean('coche')->default(false);
            $table->string('photo_url')->nullable();
            $table->unsignedInteger('ordre')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('checklist_items');
    }
};
