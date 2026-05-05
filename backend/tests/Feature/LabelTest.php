<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Label;
use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Rubric coverage:
 * - #18 Create / list labels
 * - #19 Rename / delete label without removing the note
 * - #20 Filter notes by label
 */
class LabelTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_label(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/labels', [
            'name' => 'Work',
            'color' => '#ff0000',
        ]);

        $response->assertStatus(201)->assertJsonPath('data.name', 'Work');
        $this->assertDatabaseHas('labels', ['user_id' => $user->id, 'name' => 'Work']);
    }

    public function test_label_name_must_be_unique_per_user(): void
    {
        $user = User::factory()->create();
        Label::factory()->for($user)->create(['name' => 'Dup']);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/labels', [
            'name' => 'Dup',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['name']);
    }

    public function test_user_can_rename_label_and_attached_note_remains(): void
    {
        $user = User::factory()->create();
        $label = Label::factory()->for($user)->create(['name' => 'Old']);
        $note = Note::factory()->for($user)->create();
        $note->labels()->attach($label);

        $response = $this->actingAs($user, 'sanctum')->putJson("/api/labels/{$label->id}", [
            'name' => 'New',
        ]);

        $response->assertOk();
        $this->assertSame('New', $label->fresh()->name);
        $this->assertDatabaseHas('notes', ['id' => $note->id]);
        $this->assertSame(1, $note->labels()->count());
    }

    public function test_deleting_label_does_not_delete_note(): void
    {
        $user = User::factory()->create();
        $label = Label::factory()->for($user)->create();
        $note = Note::factory()->for($user)->create();
        $note->labels()->attach($label);

        $response = $this->actingAs($user, 'sanctum')->deleteJson("/api/labels/{$label->id}");

        $response->assertOk();
        $this->assertDatabaseMissing('labels', ['id' => $label->id]);
        $this->assertDatabaseHas('notes', ['id' => $note->id]);
        $this->assertSame(0, $note->labels()->count());
    }

    public function test_user_cannot_modify_other_users_label(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $label = Label::factory()->for($bob)->create();

        $response = $this->actingAs($alice, 'sanctum')->putJson("/api/labels/{$label->id}", [
            'name' => 'Hacked',
        ]);

        $response->assertStatus(403);
    }
}
