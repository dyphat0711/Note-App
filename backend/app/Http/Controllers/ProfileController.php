<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Profile\ChangePasswordRequest;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Http\Requests\Profile\UploadAvatarRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProfileController extends Controller
{
    /**
     * Show the authenticated user.
     */
    public function show(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    /**
     * Update the authenticated user's display name / email.
     */
    public function update(UpdateProfileRequest $request): UserResource
    {
        $user = $request->user();

        $data = $request->validated();

        // Changing email re-triggers verification.
        if (isset($data['email']) && $data['email'] !== $user->email) {
            $user->forceFill(['email_verified_at' => null]);
        }

        $user->fill($data);
        $user->save();

        if ($user->wasChanged('email')) {
            $user->sendEmailVerificationNotification();
        }

        return new UserResource($user->fresh());
    }

    /**
     * Upload a new avatar image (JPEG/PNG/WebP, max 2MB).
     */
    public function uploadAvatar(UploadAvatarRequest $request): UserResource
    {
        $user = $request->user();
        $file = $request->file('avatar');

        // Cleanup any existing avatar on disk.
        if ($user->avatar_path !== null) {
            Storage::disk('public')->delete($user->avatar_path);
        }

        $extension = $file->getClientOriginalExtension();
        $filename = Str::uuid().'.'.$extension;
        $path = $file->storeAs("avatars/{$user->id}", $filename, 'public');

        $user->update(['avatar_path' => $path]);

        return new UserResource($user->fresh());
    }

    /**
     * Remove the user's avatar.
     */
    public function deleteAvatar(Request $request): UserResource
    {
        $user = $request->user();

        if ($user->avatar_path !== null) {
            Storage::disk('public')->delete($user->avatar_path);
            $user->update(['avatar_path' => null]);
        }

        return new UserResource($user->fresh());
    }

    /**
     * Change the authenticated user's account password.
     */
    public function changePassword(ChangePasswordRequest $request): JsonResponse
    {
        $user = $request->user();

        $user->update([
            'password' => Hash::make($request->validated()['password']),
        ]);

        // Optional security hardening: invalidate all other tokens after a password change.
        $current = $user->currentAccessToken();
        if ($current !== null) {
            $user->tokens()->where('id', '!=', $current->id)->delete();
        }

        return response()->json([
            'message' => 'Password changed successfully.',
        ]);
    }
}
