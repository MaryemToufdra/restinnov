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
        // Carry over each appartement's single checklist_modele_id (if any)
        // as its first assignment in the new many-to-many pivot, before the
        // column disappears -- an appartement can now have several models,
        // but none of the existing data should be lost in the switch.
        $now = now();
        $appartements = DB::table('appartements')->whereNotNull('checklist_modele_id')->get(['id', 'checklist_modele_id']);

        if ($appartements->isNotEmpty()) {
            DB::table('appartement_checklist_modele')->insert($appartements->map(fn ($appartement) => [
                'appartement_id' => $appartement->id,
                'checklist_modele_id' => $appartement->checklist_modele_id,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all());
        }

        Schema::table('appartements', function (Blueprint $table) {
            $table->dropConstrainedForeignId('checklist_modele_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('appartements', function (Blueprint $table) {
            $table->foreignId('checklist_modele_id')->nullable()->after('photo_principale')->constrained('checklist_modeles')->nullOnDelete();
        });

        // Best-effort restore: an appartement with several assigned models
        // can only keep one back in the single-column shape, so it gets its
        // earliest assignment.
        $firstAssignments = DB::table('appartement_checklist_modele')
            ->orderBy('id')
            ->get(['appartement_id', 'checklist_modele_id'])
            ->unique('appartement_id');

        foreach ($firstAssignments as $assignment) {
            DB::table('appartements')
                ->where('id', $assignment->appartement_id)
                ->update(['checklist_modele_id' => $assignment->checklist_modele_id]);
        }
    }
};
