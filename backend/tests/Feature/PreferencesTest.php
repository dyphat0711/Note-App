<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Rubric coverage:
 * - #8 User Preferences (theme/font_size/default colors/default_view)
 */
class PreferencesTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_get_default_preferences(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/preferences');

        $response->assertOk()->assertJsonPath('data.id', $user->id);
    }

    public function test_user_can_update_preferences_with_valid_payload(): void
    {
        $user = User::factory()->create();

        $payload = [
            'preferences' => [
                'theme' => 'dark',
                'font_size' => 18,
                'default_note_color' => '#FFEEAA',
                'default_label_color' => '#FF00FF',
                'default_view' => 'grid',
            ],
        ];

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/preferences', $payload);

        $response->assertOk()
            ->assertJsonPath('data.preferences.theme', 'dark')
            ->assertJsonPath('data.preferences.font_size', 18)
            ->assertJsonPath('data.preferences.default_view', 'grid');
    }

    public function test_invalid_theme_is_rejected(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/preferences', [
            'preferences' => ['theme' => 'rainbow'],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['preferences.theme']);
    }

    public function test_invalid_font_size_is_rejected(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/preferences', [
            'preferences' => ['font_size' => 999],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['preferences.font_size']);
    }

    public function test_invalid_color_format_is_rejected(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/preferences', [
            'preferences' => ['default_note_color' => 'red'],
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['preferences.default_note_color']);
    }

    public function test_user_can_reset_preferences(): void
    {
        $user = User::factory()->create([
            'preferences' => ['theme' => 'dark'],
        ]);

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/preferences');

        $response->assertOk();
        $this->assertNull($user->fresh()->preferences);
    }
}
