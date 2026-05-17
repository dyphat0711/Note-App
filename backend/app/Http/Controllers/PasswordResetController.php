<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\ForgotPasswordRequest;
use App\Http\Requests\ResetPasswordRequest;
use App\Http\Requests\ResetPasswordWithOtpRequest;
use App\Http\Requests\VerifyOtpRequest;
use App\Mail\PasswordResetOtpMail;
use App\Models\PasswordResetOtp;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Password as PasswordFacade;
use Illuminate\Support\Str;

class PasswordResetController extends Controller
{
    private const OTP_TTL_MINUTES = 10;

    private const OTP_MAX_ATTEMPTS = 5;

    /**
     * Send a password reset link to the user's email (link flow).
     */
    public function sendResetLink(ForgotPasswordRequest $request): JsonResponse
    {
        $status = PasswordFacade::sendResetLink(
            $request->only('email')
        );

        if ($status === PasswordFacade::RESET_LINK_SENT) {
            return response()->json([
                'message' => 'Password reset link sent successfully.',
            ]);
        }

        return response()->json([
            'message' => 'Unable to send reset link.',
            'errors' => ['email' => [__($status)]],
        ], 422);
    }

    /**
     * Reset the user's password using the link/token flow.
     */
    public function reset(ResetPasswordRequest $request): JsonResponse
    {
        $status = PasswordFacade::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user) use ($request): void {
                $user->forceFill([
                    'password' => Hash::make($request->password),
                    'remember_token' => Str::random(60),
                ])->save();

                event(new PasswordReset($user));
            }
        );

        if ($status === PasswordFacade::PASSWORD_RESET) {
            return response()->json([
                'message' => 'Password reset successfully.',
            ]);
        }

        return response()->json([
            'message' => 'Unable to reset password.',
            'errors' => ['email' => [__($status)]],
        ], 422);
    }

    /**
     * Send a one-time password (6 digits) to the user's email (OTP flow).
     * Returns 200 even if the email doesn't exist to avoid user enumeration.
     */
    public function sendOtp(ForgotPasswordRequest $request): JsonResponse
    {
        $email = $request->validated()['email'];
        $user = User::where('email', $email)->first();

        if ($user !== null) {
            // Invalidate previous unused OTPs for this email.
            PasswordResetOtp::where('email', $email)->whereNull('used_at')->update(['used_at' => now()]);

            $otp = (string) random_int(100000, 999999);

            PasswordResetOtp::create([
                'email' => $email,
                'otp_hash' => Hash::make($otp),
                'attempts' => 0,
                'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
            ]);

            Mail::to($email)->send(new PasswordResetOtpMail($otp, self::OTP_TTL_MINUTES));
        }

        return response()->json([
            'message' => 'If the email exists, an OTP has been sent.',
        ]);
    }

    /**
     * Verify an OTP without consuming it. Useful for the FE to gate the new-password screen.
     */
    public function verifyOtp(VerifyOtpRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $record = $this->findValidOtp($validated['email']);

        if ($record === null) {
            return $this->otpInvalidResponse('OTP is invalid or has expired.');
        }

        if (! Hash::check($validated['otp'], $record->otp_hash)) {
            $record->increment('attempts');

            return $this->otpInvalidResponse('OTP is invalid.');
        }

        return response()->json([
            'message' => 'OTP verified.',
        ]);
    }

    /**
     * Reset the password using a valid OTP.
     */
    public function resetWithOtp(ResetPasswordWithOtpRequest $request): JsonResponse
    {
        $validated = $request->validated();

        $record = $this->findValidOtp($validated['email']);

        if ($record === null) {
            return $this->otpInvalidResponse('OTP is invalid or has expired.');
        }

        if (! Hash::check($validated['otp'], $record->otp_hash)) {
            $record->increment('attempts');

            return $this->otpInvalidResponse('OTP is invalid.');
        }

        $user = User::where('email', $validated['email'])->first();
        if ($user === null) {
            return $this->otpInvalidResponse('User not found.');
        }

        $user->forceFill([
            'password' => Hash::make($validated['password']),
            'remember_token' => Str::random(60),
        ])->save();

        $record->update(['used_at' => Carbon::now()]);

        event(new PasswordReset($user));

        return response()->json([
            'message' => 'Password reset successfully.',
        ]);
    }

    /**
     * Find a valid (unused, not expired, within attempt limit) OTP record for the email.
     */
    private function findValidOtp(string $email): ?PasswordResetOtp
    {
        $record = PasswordResetOtp::where('email', $email)
            ->whereNull('used_at')
            ->latest('id')
            ->first();

        if ($record === null) {
            return null;
        }

        if ($record->isExpired() || $record->attempts >= self::OTP_MAX_ATTEMPTS) {
            return null;
        }

        return $record;
    }

    private function otpInvalidResponse(string $message): JsonResponse
    {
        return response()->json([
            'message' => $message,
            'errors' => ['otp' => [$message]],
        ], 422);
    }
}
