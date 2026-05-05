<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Rubric coverage:
 * - #21 Password-protected notes (set/unlock)
 * - #22 "Better" lock flow: set, change, disable
 */
class PasswordLockTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_set_password_with_confirmation(): void
    {
        $user = User::factory()->create();
        $note = Note::factory()->for($user)->create();

        $response = $this->actingAs($user, 'sanctum')->patchJson("/api/notes/{$note->id}/password", [
            'action' => 'set',
            'password' => 'lockme',
            'password_confirmation' => 'lockme',
        ]);

        $response->assertOk()->assertJsonPath('data.has_password', true);
        $this->assertNotNull($note->fresh()->password);
    }

    public function test_set_requires_confirmed_password(): void
    {
        $user = User::factory()->create();
        $note = Note::factory()->for($user)->create();

        $response = $this->actingAs($user, 'sanctum')->patchJson("/api/notes/{$note->id}/password", [
            'action' => 'set',
            'password' => 'lockme',
            'password_confirmation' => 'mismatch',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_change_requires_current_password(): void
    {
        $user = User::factory()->create();
        $note = Note::factory()->for($user)->withPassword('old-pass')->create();

        $bad = $this->actingAs($user, 'sanctum')->patchJson("/api/notes/{$note->id}/password", [
            'action' => 'change',
            'current_password' => 'WRONG',
            'password' => 'new-pass',
            'password_confirmation' => 'new-pass',
        ]);
        $bad->assertStatus(422)->assertJsonValidationErrors(['current_password']);

        $good = $this->actingAs($user, 'sanctum')->patchJson("/api/notes/{$note->id}/password", [
            'action' => 'change',
            'current_password' => 'old-pass',
            'password' => 'new-pass',
            'password_confirmation' => 'new-pass',
        ]);
        $good->assertOk();
    }

    public function test_disable_requires_current_password_and_clears_field(): void
    {
        $user = User::factory()->create();
        $note = Note::factory()->for($user)->withPassword('hold')->create();

        $response = $this->actingAs($user, 'sanctum')->patchJson("/api/notes/{$note->id}/password", [
            'action' => 'disable',
            'current_password' => 'hold',
        ]);

        $response->assertOk()->assertJsonPath('data.has_password', false);
        $this->assertNull($note->fresh()->password);
    }

    public function test_unlock_returns_content_with_correct_password(): void
    {
        $user = User::factory()->create();
        $note = Note::factory()->for($user)->withPassword('opensesame')->create([
            'content' => 'Hidden body',
        ]);

        $bad = $this->actingAs($user, 'sanctum')->postJson("/api/notes/{$note->id}/unlock", [
            'password' => 'wrong',
        ]);
        $bad->assertStatus(403);

        $good = $this->actingAs($user, 'sanctum')->postJson("/api/notes/{$note->id}/unlock", [
            'password' => 'opensesame',
        ]);
        $good->assertOk()->assertJsonPath('content', 'Hidden body');
    }

    public function test_locked_note_hides_content_in_index(): void
    {
        $user = User::factory()->create();
        Note::factory()->for($user)->withPassword('x')->create([
            'content' => 'Secret',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/notes');

        $response->assertOk()
            ->assertJsonPath('data.0.has_password', true)
            ->assertJsonPath('data.0.content', null);
    }

    public function test_set_when_password_already_exists_returns_validation(): void
    {
        $user = User::factory()->create();
        $note = Note::factory()->for($user)->withPassword('exists')->create();

        $response = $this->actingAs($user, 'sanctum')->patchJson("/api/notes/{$note->id}/password", [
            'action' => 'set',
            'password' => 'newone',
            'password_confirmation' => 'newone',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['action']);
    }
}
