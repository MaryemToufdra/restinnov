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
        Schema::table('tickets_maintenance', function (Blueprint $table) {
            $table->string('reference')->nullable()->after('id');
            // A resolution the Manager rejects goes back to this statut
            // instead of being closed -- same agent, ticket stays active.
            $table->enum('statut', ['ouvert', 'assigne', 'resolu_en_attente_validation', 'resolu', 'a_refaire'])
                ->default('ouvert')
                ->change();
        });

        // Backfill any pre-existing rows in creation order, same convention
        // as sejours' SEJ-0001... reference.
        DB::table('tickets_maintenance')->orderBy('id')->select('id')->get()->each(function ($ticket, $index) {
            DB::table('tickets_maintenance')->where('id', $ticket->id)->update([
                'reference' => sprintf('MNT-%04d', $index + 1),
            ]);
        });

        Schema::table('tickets_maintenance', function (Blueprint $table) {
            $table->unique('reference');
        });

        // Traceability of every resolution the Manager sends back for
        // rework -- kept even across several successive refusals on the
        // same ticket.
        Schema::create('ticket_maintenance_refus', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ticket_maintenance_id')->constrained('tickets_maintenance')->cascadeOnDelete();
            $table->foreignId('manager_id')->nullable()->constrained('utilisateurs')->nullOnDelete();
            $table->text('motif');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('ticket_maintenance_refus');

        Schema::table('tickets_maintenance', function (Blueprint $table) {
            $table->dropUnique(['reference']);
            $table->dropColumn('reference');
            $table->enum('statut', ['ouvert', 'assigne', 'resolu_en_attente_validation', 'resolu'])
                ->default('ouvert')
                ->change();
        });
    }
};
