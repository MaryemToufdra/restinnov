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
        Schema::table('appartements', function (Blueprint $table) {
            $table->string('photo_principale')->nullable();
            $table->foreignId('checklist_modele_id')->nullable()->constrained('checklist_modeles')->nullOnDelete();
            $table->foreignId('agent_habituel_id')->nullable()->constrained('utilisateurs')->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appartements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('checklist_modele_id');
            $table->dropConstrainedForeignId('agent_habituel_id');
            $table->dropColumn('photo_principale');
        });
    }
};
