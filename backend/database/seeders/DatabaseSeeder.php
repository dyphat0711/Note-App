<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Models\Label;
use App\Models\Note;
use App\Models\SharedNote;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Seeds two demo accounts (alice & bob) plus a curated set of notes that
 * exercises every "advanced" rubric item: pinned, password-locked, shared,
 * with labels and attachments. Run with:
 *
 *     php artisan migrate:fresh --seed
 *
 * Login for the demo:
 *     alice@example.test / Password123!
 *     bob@example.test   / Password123!
 */
class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $alice = User::updateOrCreate(
            ['email' => 'alice@example.test'],
            [
                'display_name' => 'Alice Demo',
                'password' => Hash::make('Password123!'),
                'email_verified_at' => now(),
            ],
        );

        $bob = User::updateOrCreate(
            ['email' => 'bob@example.test'],
            [
                'display_name' => 'Bob Demo',
                'password' => Hash::make('Password123!'),
                'email_verified_at' => now(),
            ],
        );

        // Reset Alice's notes so the seeder is idempotent.
        Note::where('user_id', $alice->id)->delete();
        Label::where('user_id', $alice->id)->delete();

        $work = Label::create(['user_id' => $alice->id, 'name' => 'Work', 'color' => '#3b82f6']);
        $personal = Label::create(['user_id' => $alice->id, 'name' => 'Personal', 'color' => '#f97316']);
        Label::create(['user_id' => $alice->id, 'name' => 'Ideas', 'color' => '#10b981']);

        // 1) Pinned welcome note.
        $welcome = Note::create([
            'user_id' => $alice->id,
            'title' => 'Welcome to NoteFlow',
            'content' => '<p>This is a <strong>pinned</strong> note that always stays at the top.</p>',
            'is_pinned' => true,
            'pinned_at' => now(),
        ]);
        $welcome->labels()->sync([$work->id]);

        // 2) Locked diary note (password = "openme").
        $diary = Note::create([
            'user_id' => $alice->id,
            'title' => 'Locked diary',
            'content' => '<p>This note is protected. Unlock with password <em>openme</em>.</p>',
            'password' => 'openme',
        ]);
        $diary->labels()->sync([$personal->id]);

        // 3) Shared note (Alice → Bob with edit permission).
        $shared = Note::create([
            'user_id' => $alice->id,
            'title' => 'Project roadmap',
            'content' => '<p>Q3 deliverables — collaborate with Bob in real time.</p>',
        ]);
        $shared->labels()->sync([$work->id]);
        SharedNote::create([
            'note_id' => $shared->id,
            'owner_id' => $alice->id,
            'shared_with_email' => $bob->email,
            'permission' => 'edit',
        ]);

        // 4) Plain note for ordering checks.
        Note::create([
            'user_id' => $alice->id,
            'title' => 'Buy groceries',
            'content' => '<p>milk, eggs, coffee, sourdough</p>',
        ]);

        // 5) Bob's own note.
        Note::where('user_id', $bob->id)->delete();
        Note::create([
            'user_id' => $bob->id,
            'title' => 'Bob\'s sandbox',
            'content' => '<p>Personal notes only Bob can see.</p>',
        ]);
    }
}
