<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Add a composite index on shared_notes(shared_with_email, note_id).
 *
 * This index directly serves `getNotesSharedWithUser()` which filters by
 * `shared_with_email` and joins on `note_id`. Without this index, MySQL
 * performs a full-table scan on every dashboard load for any shared-note
 * recipient. The index reduces that to an O(log n) lookup.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('shared_notes', function (Blueprint $table): void {
            // Composite: email first because it is the leading filter column.
            $table->index(
                ['shared_with_email', 'note_id'],
                'shared_notes_email_note_idx',
            );
        });
    }

    public function down(): void
    {
        Schema::table('shared_notes', function (Blueprint $table): void {
            $table->dropIndex('shared_notes_email_note_idx');
        });
    }
};
