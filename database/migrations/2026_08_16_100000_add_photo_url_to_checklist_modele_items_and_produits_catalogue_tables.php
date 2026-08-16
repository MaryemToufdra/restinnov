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
        // A reference/example photo the Manager can attach when defining a
        // checklist item or a catalogue product, shown to the agent for
        // guidance.
        Schema::table('checklist_modele_items', function (Blueprint $table) {
            $table->string('photo_url')->nullable()->after('libelle');
        });

        Schema::table('produits_menage_catalogue', function (Blueprint $table) {
            $table->string('photo_url')->nullable()->after('nom');
        });

        // Snapshot copy of the checklist_modele_item's reference photo at
        // mission-generation time (see SejourCheckoutService) -- distinct
        // from photo_url above, which is the agent's own proof-of-work
        // photo taken while executing the mission.
        Schema::table('checklist_items', function (Blueprint $table) {
            $table->string('photo_reference_url')->nullable()->after('photo_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checklist_items', function (Blueprint $table) {
            $table->dropColumn('photo_reference_url');
        });

        Schema::table('produits_menage_catalogue', function (Blueprint $table) {
            $table->dropColumn('photo_url');
        });

        Schema::table('checklist_modele_items', function (Blueprint $table) {
            $table->dropColumn('photo_url');
        });
    }
};
