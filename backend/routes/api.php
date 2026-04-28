<?php

declare(strict_types=1);

use App\Http\Controllers\AuthController;
use App\Http\Controllers\FolderController;
use App\Http\Controllers\LabelController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\NoteSharingController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| All API routes are prefixed with /api/ automatically by Laravel.
| Auth routes are rate-limited to 10 requests per minute.
| Protected routes require auth:sanctum middleware.
|
*/

// Public auth routes (rate limited)
Route::middleware('throttle:10,1')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [\App\Http\Controllers\PasswordResetController::class, 'sendResetLink']);
    Route::post('/reset-password', [\App\Http\Controllers\PasswordResetController::class, 'reset']);
});

// Email verification routes (must be before authenticated routes)
Route::get('/email/verify/{id}/{hash}', [\App\Http\Controllers\EmailVerificationController::class, 'verify'])
    ->name('verification.verify');

// Authenticated routes
Route::middleware('auth:sanctum')->group(function (): void {
    // Logout
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/email/resend', [\App\Http\Controllers\EmailVerificationController::class, 'resend'])
        ->name('verification.resend');

    // User preferences
    Route::get('/preferences', [\App\Http\Controllers\PreferencesController::class, 'index'])->name('preferences.index');
    Route::put('/preferences', [\App\Http\Controllers\PreferencesController::class, 'update'])->name('preferences.update');
    Route::delete('/preferences', [\App\Http\Controllers\PreferencesController::class, 'destroy'])->name('preferences.destroy');

    // Named routes must be registered before apiResource to avoid {note} parameter capturing them
    Route::get('/notes/search', [NoteController::class, 'search'])->name('notes.search');
    Route::get('/notes/shared-with-me', [NoteSharingController::class, 'sharedWithMe'])->name('notes.shared-with-me');

    // Notes resource routes
    Route::apiResource('notes', NoteController::class);

    // Current user
    Route::get('/user', function (\Illuminate\Http\Request $request) {
        return new \App\Http\Resources\UserResource($request->user());
    })->name('user');

    // Note-specific actions
    Route::patch('/notes/{note}/pin', [NoteController::class, 'togglePin'])->name('notes.pin');
    Route::patch('/notes/{note}/password', [NoteController::class, 'setPassword'])->name('notes.password');
    Route::post('/notes/{note}/unlock', [NoteController::class, 'unlock'])->name('notes.unlock');
    Route::patch('/notes/{note}/move', [NoteController::class, 'moveToFolder'])->name('notes.move');

    // Note attachments
    Route::get('/notes/{note}/attachments', [\App\Http\Controllers\AttachmentController::class, 'index'])->name('notes.attachments.index');
    Route::post('/notes/{note}/attachments', [\App\Http\Controllers\AttachmentController::class, 'store'])->name('notes.attachments.store');
    Route::delete('/notes/{note}/attachments/{attachment}', [\App\Http\Controllers\AttachmentController::class, 'destroy'])->name('notes.attachments.destroy');

    // Labels resource routes
    Route::apiResource('labels', LabelController::class)->except(['show']);

    // Folders resource routes
    Route::apiResource('folders', FolderController::class)->except(['show']);

    // Sharing routes
    Route::post('/notes/{note}/share', [NoteSharingController::class, 'store'])->name('notes.share');
    Route::delete('/notes/{note}/share/{shareId}', [NoteSharingController::class, 'destroy'])->name('notes.share.destroy');
});

// Public attachment download
Route::get('/attachments/{attachment}/download', [\App\Http\Controllers\AttachmentController::class, 'download'])
    ->name('attachments.download');
