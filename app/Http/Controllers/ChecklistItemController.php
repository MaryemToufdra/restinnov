<?php

namespace App\Http\Controllers;

use App\Models\ChecklistItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChecklistItemController extends Controller
{
    /**
     * Toggle a checklist item and/or attach a photo to it.
     */
    public function update(Request $request, ChecklistItem $checklistItem): JsonResponse
    {
        // "coche" is validated loosely (not Laravel's `boolean` rule) because
        // this endpoint accepts multipart/form-data when a photo is attached
        // (consistent with AppartementController's POST + _method=PATCH
        // pattern for file uploads), and form-encoded booleans arrive as the
        // strings "true"/"false" -- which the `boolean` rule rejects outright.
        $validated = $request->validate([
            'coche' => ['sometimes'],
            'photo' => ['sometimes', 'image', 'mimes:jpg,jpeg,png', 'max:5120'],
        ]);

        $updates = [];
        if (array_key_exists('coche', $validated)) {
            $updates['coche'] = filter_var($validated['coche'], FILTER_VALIDATE_BOOLEAN);
        }
        if ($request->hasFile('photo')) {
            $updates['photo_url'] = $request->file('photo')->store('checklist-items', 'public');
        }

        if ($updates) {
            $checklistItem->update($updates);
        }

        return response()->json($checklistItem->fresh());
    }
}
