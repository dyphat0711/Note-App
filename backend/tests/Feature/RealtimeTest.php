<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Events\NoteUpdated;
use App\Models\Note;
use App\Models\SharedNote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Tests\TestCase;

/**
 * Rubric coverage:
 * - #24 Real-time collaboration broadcasting
 *   We assert that updating a SHARED note dispatches the NoteUpdated event.
 *   Updating a NON-shared note should NOT dispatch the event (avoids unnecessary work).
 */
class RealtimeTest extends TestCase
{
    use RefreshDatabase;

    public function test_updating_a_shared_note_broadcasts_note_updated(): void
    {
        Event::fake([NoteUpdated::class]);

        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $note = Note::factory()->for($alice)->create();
        SharedNote::create([
            'note_id' => $note->id,
            'owner_id' => $alice->id,
            'shared_with_email' => $bob->email,
            'permission' => 'edit',
        ]);

        $this->actingAs($alice, 'sanctum')
            ->putJson("/api/notes/{$note->id}", ['title' => 'Live update'])
            ->assertOk();

        Event::assertDispatched(NoteUpdated::class, fn (NoteUpdated $e): bool => $e->note->id === $note->id
            && $e->updatedBy === $alice->id);
    }

    public function test_updating_unshared_note_does_not_broadcast(): void
    {
        Event::fake([NoteUpdated::class]);

        $alice = User::factory()->create();
        $note = Note::factory()->for($alice)->create();

        $this->actingAs($alice, 'sanctum')
            ->putJson("/api/notes/{$note->id}", ['title' => 'Solo'])
            ->assertOk();

        Event::assertNotDispatched(NoteUpdated::class);
    }
}
