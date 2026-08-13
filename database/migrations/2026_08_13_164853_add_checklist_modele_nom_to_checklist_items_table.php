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
        // Denormalized snapshot of the origin checklist_modele's name at
        // generation time -- consistent with checklist_items already being a
        // one-time copy, not a live reference (see create_checklist_items_
        // table). Used only to group an agent's checklist by the model it
        // came from when an appartement has several assigned at once.
        Schema::table('checklist_items', function (Blueprint $table) {
            $table->string('checklist_modele_nom')->nullable()->after('libelle');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('checklist_items', function (Blueprint $table) {
            $table->dropColumn('checklist_modele_nom');
        });
    }
};
