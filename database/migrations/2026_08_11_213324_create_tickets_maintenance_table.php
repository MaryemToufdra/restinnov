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
        Schema::create('tickets_maintenance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appartement_id')->constrained()->cascadeOnDelete();
            // Nullable: the mission that triggered the report may later be
            // deleted without taking the maintenance ticket down with it.
            $table->foreignId('mission_origine_id')->nullable()->constrained('mission_menages')->nullOnDelete();
            // Nullable: not yet assigned to a maintenance agent at creation.
            $table->foreignId('agent_id')->nullable()->constrained('utilisateurs')->nullOnDelete();
            $table->text('description')->nullable();
            $table->string('photo_url')->nullable();
            $table->string('audio_url')->nullable();
            $table->enum('urgence', ['basse', 'normale', 'haute'])->default('normale');
            $table->enum('statut', ['ouvert', 'assigne', 'resolu'])->default('ouvert');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('tickets_maintenance');
    }
};
