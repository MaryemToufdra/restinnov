<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('sejours', function (Blueprint $table) {
            $table->string('reference')->nullable()->after('id');
        });

        // Backfill any pre-existing rows in creation order before the unique
        // index is added below.
        DB::table('sejours')->orderBy('id')->select('id')->get()->each(function ($sejour, $index) {
            DB::table('sejours')->where('id', $sejour->id)->update([
                'reference' => sprintf('SEJ-%04d', $index + 1),
            ]);
        });

        Schema::table('sejours', function (Blueprint $table) {
            $table->unique('reference');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('sejours', function (Blueprint $table) {
            $table->dropUnique(['reference']);
            $table->dropColumn('reference');
        });
    }
};
