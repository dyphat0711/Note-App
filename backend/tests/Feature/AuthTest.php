<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\PasswordResetOtp;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * Rubric coverage:
 * - #1 Sign-up + auto login + activation email
 * - #2 Email verification (signed URL)
 * - #3 Login (basic + token)
 * - #4 Password reset (link + OTP)
 * - #7 Change password (covered in ProfileTest)
 */
class AuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_and_receives_token_and_verify_email_event(): void
    {
        Event::fake([Registered::class]);

        $response = $this->postJson('/api/register', [
            'display_name' => 'Alice',
            'email' => 'alice@example.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Password123!',
        ]);

        $response->assertStatus(201)
            ->assertJsonStructure([
                'message',
                'user' => ['id', 'display_name', 'email', 'is_verified'],
                'access_token',
                'token_type',
            ])
            ->assertJsonPath('user.is_verified', false);

        $this->assertDatabaseHas('users', [
            'email' => 'alice@example.test',
            'display_name' => 'Alice',
            'email_verified_at' => null,
        ]);

        Event::assertDispatched(Registered::class);
    }

    public function test_register_validation_requires_password_confirmation(): void
    {
        $response = $this->postJson('/api/register', [
            'display_name' => 'Bob',
            'email' => 'bob@example.test',
            'password' => 'Password123!',
            'password_confirmation' => 'Mismatch!',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['password']);
    }

    public function test_email_verification_link_marks_user_verified(): void
    {
        $user = User::factory()->unverified()->create();

        $verifyUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->getEmailForVerification())],
        );

        $response = $this->getJson($verifyUrl);

        $response->assertOk();
        $this->assertNotNull($user->fresh()->email_verified_at);
    }

    public function test_email_verification_with_invalid_hash_is_rejected(): void
    {
        $user = User::factory()->unverified()->create();

        $url = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            ['id' => $user->id, 'hash' => 'wrong-hash'],
        );

        $response = $this->getJson($url);

        $response->assertStatus(403);
        $this->assertNull($user->fresh()->email_verified_at);
    }

    public function test_authenticated_user_can_request_resend_verification(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();

        $response = $this->actingAs($user, 'sanctum')->postJson('/api/email/resend');

        $response->assertOk();
        Notification::assertSentTo($user, VerifyEmail::class);
    }

    public function test_user_can_login_and_receive_token(): void
    {
        $user = User::factory()->create([
            'email' => 'login@example.test',
            'password' => Hash::make('mypassword'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'login@example.test',
            'password' => 'mypassword',
        ]);

        $response->assertOk()
            ->assertJsonStructure(['user' => ['id', 'email'], 'access_token', 'token_type'])
            ->assertJsonPath('user.id', $user->id);
    }

    public function test_login_with_wrong_password_returns_validation_error(): void
    {
        User::factory()->create([
            'email' => 'fail@example.test',
            'password' => Hash::make('correct-password'),
        ]);

        $response = $this->postJson('/api/login', [
            'email' => 'fail@example.test',
            'password' => 'wrong-password',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['email']);
    }

    public function test_logout_revokes_current_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('test')->plainTextToken;

        $response = $this->withHeader('Authorization', "Bearer {$token}")
            ->postJson('/api/logout');

        $response->assertOk();
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_password_reset_link_can_be_requested(): void
    {
        Notification::fake();

        $user = User::factory()->create(['email' => 'reset@example.test']);

        $response = $this->postJson('/api/forgot-password', [
            'email' => 'reset@example.test',
        ]);

        $response->assertOk();
        Notification::assertSentTo($user, \Illuminate\Auth\Notifications\ResetPassword::class);
    }

    public function test_password_reset_otp_flow_full(): void
    {
        $user = User::factory()->create([
            'email' => 'otp@example.test',
            'password' => Hash::make('OldPass123!'),
        ]);

        // Request OTP
        $sendResponse = $this->postJson('/api/forgot-password-otp', [
            'email' => 'otp@example.test',
        ]);
        $sendResponse->assertOk();

        $otpRecord = PasswordResetOtp::where('email', 'otp@example.test')->latest('id')->first();
        $this->assertNotNull($otpRecord);

        // Find the raw OTP via brute force loop on hashed value (since we hash it)
        // Trick: directly mutate the stored hash to a known value to keep test deterministic.
        $knownOtp = '654321';
        $otpRecord->update(['otp_hash' => Hash::make($knownOtp)]);

        // Verify OTP
        $verify = $this->postJson('/api/verify-otp', [
            'email' => 'otp@example.test',
            'otp' => $knownOtp,
        ]);
        $verify->assertOk();

        // Reset password
        $reset = $this->postJson('/api/reset-password-otp', [
            'email' => 'otp@example.test',
            'otp' => $knownOtp,
            'password' => 'NewPass123!',
            'password_confirmation' => 'NewPass123!',
        ]);
        $reset->assertOk();

        $this->assertTrue(Hash::check('NewPass123!', $user->fresh()->password));
        $this->assertNotNull($otpRecord->fresh()->used_at);
    }

    public function test_password_reset_otp_with_wrong_code_fails(): void
    {
        $user = User::factory()->create(['email' => 'otpfail@example.test']);

        $this->postJson('/api/forgot-password-otp', ['email' => 'otpfail@example.test']);
        $record = PasswordResetOtp::where('email', 'otpfail@example.test')->latest('id')->firstOrFail();
        $record->update(['otp_hash' => Hash::make('111111')]);

        $resp = $this->postJson('/api/verify-otp', [
            'email' => 'otpfail@example.test',
            'otp' => '999999',
        ]);

        $resp->assertStatus(422);
        $this->assertSame(1, $record->fresh()->attempts);
    }
}
