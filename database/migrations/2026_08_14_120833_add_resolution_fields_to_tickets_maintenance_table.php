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
        Schema::table('tickets_maintenance', function (Blueprint $table) {
            $table->enum('statut', ['ouvert', 'assigne', 'resolu_en_attente_validation', 'resolu'])
                ->default('ouvert')
                ->change();

            // Written by the Manager at assignment time -- the instruction
            // the maintenance agent actually sees. Deliberately separate
            // from the menage agent's own `description`/`photo_url`/
            // `audio_url` signalement fields, which stay Manager-only (see
            // TicketMaintenanceController).
            $table->text('description_manager')->nullable()->after('description');
            // Filled in by the maintenance agent when marking the ticket
            // resolved -- proof of the fix, its cost, and an optional note,
            // for the Manager's final validation.
            $table->string('photo_apres')->nullable()->after('photo_url');
            $table->decimal('cout_reparation', 10, 2)->nullable()->after('photo_apres');
            $table->text('note_resolution')->nullable()->after('cout_reparation');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets_maintenance', function (Blueprint $table) {
            $table->dropColumn(['description_manager', 'photo_apres', 'cout_reparation', 'note_resolution']);
            $table->enum('statut', ['ouvert', 'assigne', 'resolu'])->default('ouvert')->change();
        });
    }
};
