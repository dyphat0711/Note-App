<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Note;
use App\Models\SharedNote;
use App\Models\User;
use App\Notifications\NoteSharedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Rubric coverage:
 * - #23 Sharing notes (read/edit) + recipient notification (in-app + email)
 * - Privacy: recipient must NOT see other recipients' share list
 */
class ShareTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_share_with_registered_user(): void
    {
        Notification::fake();
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $note = Note::factory()->for($alice)->create();

        $response = $this->actingAs($alice, 'sanctum')->postJson("/api/notes/{$note->id}/share", [
            'email' => $bob->email,
            'permission' => 'edit',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('shared_notes', [
            'note_id' => $note->id,
            'shared_with_email' => $bob->email,
            'permission' => 'edit',
        ]);
        Notification::assertSentTo($bob, NoteSharedNotification::class);
    }

    public function test_share_with_non_registered_email_is_rejected(): void
    {
        $alice = User::factory()->create();
        $note = Note::factory()->for($alice)->create();

        $response = $this->actingAs($alice, 'sanctum')->postJson("/api/notes/{$note->id}/share", [
            'email' => 'noone@nowhere.test',
            'permission' => 'read',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_user_cannot_share_with_themselves(): void
    {
        $alice = User::factory()->create();
        $note = Note::factory()->for($alice)->create();

        $response = $this->actingAs($alice, 'sanctum')->postJson("/api/notes/{$note->id}/share", [
            'email' => $alice->email,
            'permission' => 'edit',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_sharee_with_edit_can_update_note(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $note = Note::factory()->for($alice)->create();
        SharedNote::create([
            'note_id' => $note->id,
            'owner_id' => $alice->id,
            'shared_with_email' => $bob->email,
            'permission' => 'edit',
        ]);

        $response = $this->actingAs($bob, 'sanctum')->putJson("/api/notes/{$note->id}", [
            'title' => 'Edited by Bob',
        ]);

        $response->assertOk();
        $this->assertSame('Edited by Bob', $note->fresh()->title);
    }

    public function test_sharee_with_read_only_cannot_update(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $note = Note::factory()->for($alice)->create();
        SharedNote::create([
            'note_id' => $note->id,
            'owner_id' => $alice->id,
            'shared_with_email' => $bob->email,
            'permission' => 'read',
        ]);

        $response = $this->actingAs($bob, 'sanctum')->putJson("/api/notes/{$note->id}", [
            'title' => 'Should fail',
        ]);

        $response->assertStatus(403);
    }

    public function test_sharee_can_view_note_via_shared_with_me_endpoint(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $charlie = User::factory()->create();
        $note = Note::factory()->for($alice)->create();
        SharedNote::create([
            'note_id' => $note->id,
            'owner_id' => $alice->id,
            'shared_with_email' => $bob->email,
            'permission' => 'read',
        ]);
        SharedNote::create([
            'note_id' => $note->id,
            'owner_id' => $alice->id,
            'shared_with_email' => $charlie->email,
            'permission' => 'edit',
        ]);

        $response = $this->actingAs($bob, 'sanctum')->getJson('/api/notes/shared-with-me');

        $response->assertOk()->assertJsonCount(1, 'data');
        // Sharee must NOT see the full shares list (privacy).
        $response->assertJsonMissingPath('data.0.shares');
        $this->assertSame('read', $response->json('data.0.share_permission'));
    }

    public function test_owner_can_revoke_share(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $note = Note::factory()->for($alice)->create();
        $share = SharedNote::create([
            'note_id' => $note->id,
            'owner_id' => $alice->id,
            'shared_with_email' => $bob->email,
            'permission' => 'edit',
        ]);

        $response = $this->actingAs($alice, 'sanctum')
            ->deleteJson("/api/notes/{$note->id}/share/{$share->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('shared_notes', ['id' => $share->id]);
    }

    public function test_owner_can_update_share_permission(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $note = Note::factory()->for($alice)->create();
        $share = SharedNote::create([
            'note_id' => $note->id,
            'owner_id' => $alice->id,
            'shared_with_email' => $bob->email,
            'permission' => 'read',
        ]);

        $response = $this->actingAs($alice, 'sanctum')
            ->patchJson("/api/notes/{$note->id}/share/{$share->id}", [
                'permission' => 'edit',
            ]);

        $response->assertOk();
        $this->assertSame('edit', $share->fresh()->permission);
    }

    public function test_sharee_cannot_revoke_share(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $note = Note::factory()->for($alice)->create();
        $share = SharedNote::create([
            'note_id' => $note->id,
            'owner_id' => $alice->id,
            'shared_with_email' => $bob->email,
            'permission' => 'edit',
        ]);

        $response = $this->actingAs($bob, 'sanctum')
            ->deleteJson("/api/notes/{$note->id}/share/{$share->id}");

        $response->assertStatus(403);
    }
}
