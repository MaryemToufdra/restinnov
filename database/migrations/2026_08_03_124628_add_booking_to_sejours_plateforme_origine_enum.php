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
            $table->enum('plateforme_origine', ['airbnb', 'direct', 'autre', 'booking'])->default('airbnb')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sejours', function (Blueprint $table) {
            $table->enum('plateforme_origine', ['airbnb', 'direct', 'autre'])->default('airbnb')->change();
        });
    }
};
