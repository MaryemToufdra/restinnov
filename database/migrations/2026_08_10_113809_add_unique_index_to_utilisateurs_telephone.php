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
        // A unique telephone is what login (POST /api/login) authenticates
        // against -- NULL stays allowed (multiple NULLs are fine under a
        // unique index) for utilisateurs that don't have login enabled yet.
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->unique('telephone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('utilisateurs', function (Blueprint $table) {
            $table->dropUnique(['telephone']);
        });
    }
};
