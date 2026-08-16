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
        // Traceability of every mission the Manager sends back for rework --
        // same shape/purpose as ticket_maintenance_refus, kept even across
        // several successive refusals on the same mission.
        Schema::create('mission_menage_refus', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mission_menage_id')->constrained('mission_menages')->cascadeOnDelete();
            $table->foreignId('manager_id')->nullable()->constrained('utilisateurs')->nullOnDelete();
            $table->text('motif')->nullable();
            $table->string('motif_audio_url')->nullable();
            $table->string('motif_photo_url')->nullable();
            $table->boolean('vu')->default(false);
            $table->timestamps();
        });

        // Bring the ticket side up to the same richness: a refus motif can
        // now be text, audio, and/or photo (any combination, at least one),
        // so `motif` becomes optional and gains audio/photo counterparts.
        // `vu` powers the "unread refusal" dot on the agent's Refusé(e)s tab.
        Schema::table('ticket_maintenance_refus', function (Blueprint $table) {
            $table->text('motif')->nullable()->change();
            $table->string('motif_audio_url')->nullable()->after('motif');
            $table->string('motif_photo_url')->nullable()->after('motif_audio_url');
            $table->boolean('vu')->default(false)->after('motif_photo_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mission_menage_refus');

        Schema::table('ticket_maintenance_refus', function (Blueprint $table) {
            $table->dropColumn(['motif_audio_url', 'motif_photo_url', 'vu']);
            $table->text('motif')->nullable(false)->change();
        });
    }
};
