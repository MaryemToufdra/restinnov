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
            // The Manager's spoken instruction, an alternative (or
            // complement) to the written description_manager -- same
            // Manager-only-authored, maintenance-agent-visible field, just
            // recorded instead of typed.
            $table->string('description_manager_audio_url')->nullable()->after('description_manager');
            // Whether the Manager chose, at assignment time, to also hand
            // the ménage agent's original signalement photo down to the
            // maintenance agent. Defaults to false: transferring it is an
            // explicit Manager decision, never automatic.
            $table->boolean('photo_transferee')->default(false)->after('photo_url');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('tickets_maintenance', function (Blueprint $table) {
            $table->dropColumn(['description_manager_audio_url', 'photo_transferee']);
        });
    }
};
