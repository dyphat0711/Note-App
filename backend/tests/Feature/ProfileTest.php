<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Rubric coverage:
 * - #5 Edit display_name
 * - #6 Avatar upload / delete
 * - #7 Change password (authenticated, requires current password)
 */
class ProfileTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_view_own_profile(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/user');

        $response->assertOk()
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_user_can_update_display_name(): void
    {
        $user = User::factory()->create(['display_name' => 'Old']);

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/user', [
            'display_name' => 'New Name',
        ]);

        $response->assertOk()->assertJsonPath('data.display_name', 'New Name');
        $this->assertSame('New Name', $user->fresh()->display_name);
    }

    public function test_changing_email_resets_verification_and_notifies(): void
    {
        Notification::fake();

        $user = User::factory()->create([
            'email' => 'before@example.test',
            'email_verified_at' => now(),
        ]);

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/user', [
            'email' => 'after@example.test',
        ]);

        $response->assertOk();
        $this->assertSame('after@example.test', $user->fresh()->email);
        $this->assertNull($user->fresh()->email_verified_at);
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_user_can_upload_avatar(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $file = UploadedFile::fake()->create('me.png', 100, 'image/png');

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/avatar', [
            'avatar' => $file,
        ]);

        $response->assertOk();
        $this->assertNotNull($user->fresh()->avatar_path);
        Storage::disk('public')->assertExists($user->fresh()->avatar_path);
    }

    public function test_avatar_upload_rejects_non_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $file = UploadedFile::fake()->create('document.pdf', 200, 'application/pdf');

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/avatar', [
            'avatar' => $file,
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['avatar']);
    }

    public function test_user_can_delete_avatar(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum')->postJson('/api/user/avatar', [
            'avatar' => UploadedFile::fake()->create('me.png', 100, 'image/png'),
        ])->assertOk();

        $response = $this->actingAs($user->fresh(), 'sanctum')->deleteJson('/api/user/avatar');
        $response->assertOk();
        $this->assertNull($user->fresh()->avatar_path);
    }

    public function test_change_password_requires_current_password(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('CurrentPass1!'),
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/password', [
            'current_password' => 'WrongPass',
            'password' => 'NewPass123!',
            'password_confirmation' => 'NewPass123!',
        ]);

        $response->assertStatus(422);
        $this->assertTrue(Hash::check('CurrentPass1!', $user->fresh()->password));
    }

    public function test_change_password_succeeds_with_valid_current(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('CurrentPass1!'),
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/password', [
            'current_password' => 'CurrentPass1!',
            'password' => 'NewPass123!',
            'password_confirmation' => 'NewPass123!',
        ]);

        $response->assertOk();
        $this->assertTrue(Hash::check('NewPass123!', $user->fresh()->password));
    }

    public function test_change_password_must_differ_from_current(): void
    {
        $user = User::factory()->create([
            'password' => Hash::make('SamePass1!'),
        ]);

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/user/password', [
            'current_password' => 'SamePass1!',
            'password' => 'SamePass1!',
            'password_confirmation' => 'SamePass1!',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
    }
}
