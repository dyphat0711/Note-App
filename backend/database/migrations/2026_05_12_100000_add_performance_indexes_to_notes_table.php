<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add performance indexes:
     * 1. Composite index on (user_id, updated_at) for the default ordered listing.
     * 2. FULLTEXT index on (title, content) for faster keyword search (MySQL/MariaDB).
     */
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            // Covers ORDER BY updated_at DESC filtered by user_id
            $table->index(['user_id', 'updated_at'], 'notes_user_updated_idx');
        });

        // FULLTEXT indexes must be added via raw SQL for compatibility
        if (in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'])) {
            Schema::getConnection()->statement(
                'ALTER TABLE notes ADD FULLTEXT INDEX notes_fulltext_idx (title, content)'
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->dropIndex('notes_user_updated_idx');
        });

        if (in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'])) {
            Schema::getConnection()->statement(
                'ALTER TABLE notes DROP INDEX notes_fulltext_idx'
            );
        }
    }
};
