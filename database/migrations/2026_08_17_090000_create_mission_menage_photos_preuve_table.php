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
        // A "photo de preuve de travail" is general evidence that the agent
        // did (or redid) the job -- distinct from a checklist item's own
        // photo_url (tied to one specific item), from a produits_signales
        // photo (a newly-spotted product, unrelated to work proof), and from
        // a mission_menage_refus motif_photo (the Manager's side of a
        // refusal). Multiple photos can be attached to the same mission,
        // typically to show the Manager the corrected work after a refus.
        Schema::create('mission_menage_photos_preuve', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mission_menage_id')->constrained('mission_menages')->cascadeOnDelete();
            $table->string('photo_url');
            $table->string('note')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('mission_menage_photos_preuve');
    }
};
