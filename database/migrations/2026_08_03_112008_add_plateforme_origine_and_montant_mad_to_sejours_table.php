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
        Schema::table('sejours', function (Blueprint $table) {
            $table->enum('plateforme_origine', ['airbnb', 'direct', 'autre'])->default('airbnb');
            $table->decimal('montant_mad', 10, 2)->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sejours', function (Blueprint $table) {
            $table->dropColumn(['plateforme_origine', 'montant_mad']);
        });
    }
};
