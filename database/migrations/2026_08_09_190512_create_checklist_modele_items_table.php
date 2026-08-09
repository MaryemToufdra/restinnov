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
        Schema::create('checklist_modele_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checklist_modele_id')->constrained('checklist_modeles')->cascadeOnDelete();
            $table->string('libelle');
            $table->unsignedInteger('ordre')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('checklist_modele_items');
    }
};
