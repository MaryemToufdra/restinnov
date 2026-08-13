<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * mode_gestion defaults to "mandat" at the DB level so appartements
     * created before this migration (which have no owner info yet) don't
     * end up with an ambiguous/empty gestion mode -- taux_commission and
     * loyer_fixe_mensuel are left null since there is no reasonable
     * default rate/rent to backfill; the monthly releve treats a null
     * commission as 0% until a Manager sets one.
     */
    public function up(): void
    {
        Schema::table('appartements', function (Blueprint $table) {
            $table->foreignId('proprietaire_id')->nullable()->after('agent_habituel_id')->constrained('proprietaires')->nullOnDelete();
            $table->string('mode_gestion')->default('mandat')->after('proprietaire_id');
            $table->decimal('taux_commission', 5, 2)->nullable()->after('mode_gestion');
            $table->decimal('loyer_fixe_mensuel', 10, 2)->nullable()->after('taux_commission');
        });
    }

    public function down(): void
    {
        Schema::table('appartements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('proprietaire_id');
            $table->dropColumn(['mode_gestion', 'taux_commission', 'loyer_fixe_mensuel']);
        });
    }
};
