<?php

declare(strict_types=1);

use App\Http\Controllers\AttachmentController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\LabelController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\NoteSharingController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\PreferencesController;
use App\Http\Controllers\ProfileController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| All API routes are prefixed with /api/ automatically by Laravel.
| Auth-sensitive routes are throttled.
| Protected routes require auth:sanctum middleware.
|
*/

// Lightweight connectivity probe used by the PWA offline detector (no auth, no rate limit overhead).
Route::get('/ping', fn () => response()->json(['ok' => true]))->name('ping');

// Public auth routes (rate limited)
Route::middleware('throttle:10,1')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    // Link-based password reset
    Route::post('/forgot-password', [PasswordResetController::class, 'sendResetLink']);
    Route::post('/reset-password', [PasswordResetController::class, 'reset']);

    // OTP-based password reset (alternative flow per spec)
    Route::post('/forgot-password-otp', [PasswordResetController::class, 'sendOtp']);
    Route::post('/verify-otp', [PasswordResetController::class, 'verifyOtp']);
    Route::post('/reset-password-otp', [PasswordResetController::class, 'resetWithOtp']);
});

// Email verification (signed URL with throttle)
Route::get('/email/verify/{id}/{hash}', [EmailVerificationController::class, 'verify'])
    ->middleware(['signed', 'throttle:6,1'])
    ->name('verification.verify');

// Public attachment download (auth checked inside controller via policy)
Route::get('/attachments/{attachment}/download', [AttachmentController::class, 'download'])
    ->name('attachments.download');

// Authenticated routes
Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);

    // Email verification resend
    Route::post('/email/resend', [EmailVerificationController::class, 'resend'])
        ->middleware('throttle:6,1')
        ->name('verification.resend');

    // Current user
    Route::get('/user', [ProfileController::class, 'show'])->name('user.show');
    Route::put('/user', [ProfileController::class, 'update'])->name('user.update');
    Route::post('/user/avatar', [ProfileController::class, 'uploadAvatar'])->name('user.avatar');
    Route::delete('/user/avatar', [ProfileController::class, 'deleteAvatar'])->name('user.avatar.delete');
    Route::post('/user/password', [ProfileController::class, 'changePassword'])
        ->middleware('throttle:5,1')
        ->name('user.password');

    // Preferences
    Route::get('/preferences', [PreferencesController::class, 'index'])->name('preferences.index');
    Route::put('/preferences', [PreferencesController::class, 'update'])->name('preferences.update');
    Route::delete('/preferences', [PreferencesController::class, 'destroy'])->name('preferences.destroy');

    // Notes - named routes must come before apiResource to avoid {note} parameter capture
    Route::get('/notes/search', [NoteController::class, 'search'])->name('notes.search');
    Route::get('/notes/shared-with-me', [NoteSharingController::class, 'sharedWithMe'])->name('notes.shared-with-me');

    Route::apiResource('notes', NoteController::class);

    // Note-specific actions
    Route::patch('/notes/{note}/pin', [NoteController::class, 'togglePin'])->name('notes.pin');
    Route::patch('/notes/{note}/password', [NoteController::class, 'setPassword'])->name('notes.password');
    Route::post('/notes/{note}/unlock', [NoteController::class, 'unlock'])->name('notes.unlock');

    // Note attachments
    Route::get('/notes/{note}/attachments', [AttachmentController::class, 'index'])->name('notes.attachments.index');
    Route::post('/notes/{note}/attachments', [AttachmentController::class, 'store'])->name('notes.attachments.store');
    Route::delete('/notes/{note}/attachments/{attachment}', [AttachmentController::class, 'destroy'])->name('notes.attachments.destroy');

    // Labels
    Route::apiResource('labels', LabelController::class)->except(['show']);

    // Sharing
    Route::post('/notes/{note}/share', [NoteSharingController::class, 'store'])->name('notes.share');
    Route::patch('/notes/{note}/share/{shareId}', [NoteSharingController::class, 'update'])->name('notes.share.update');
    Route::delete('/notes/{note}/share/{shareId}', [NoteSharingController::class, 'destroy'])->name('notes.share.destroy');

    // Realtime presence (typing indicator) - lightweight broadcast, see Phase 3
    Route::post('/notes/{note}/typing', [NoteSharingController::class, 'typing'])->name('notes.typing');

    // In-app notifications
    Route::get('/notifications', [NotificationController::class, 'index'])->name('notifications.index');
    Route::patch('/notifications/{id}/read', [NotificationController::class, 'markRead'])->name('notifications.read');
    Route::patch('/notifications/read-all', [NotificationController::class, 'markAllRead'])->name('notifications.read-all');
});
