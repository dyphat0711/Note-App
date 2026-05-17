<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UpdatePreferencesRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class PreferencesController extends Controller
{
    /**
     * Get the authenticated user's preferences.
     */
    public function index(): UserResource
    {
        return new UserResource(Auth::user());
    }

    /**
     * Update the authenticated user's preferences.
     */
    public function update(UpdatePreferencesRequest $request): UserResource
    {
        $user = Auth::user();

        $existingPreferences = $user->preferences ?? [];
        $newPreferences = array_merge($existingPreferences, $request->validated()['preferences']);

        $user->update([
            'preferences' => $newPreferences,
        ]);

        return new UserResource($user->fresh());
    }

    /**
     * Reset preferences to defaults.
     */
    public function destroy(): JsonResponse
    {
        $user = Auth::user();
        $user->update(['preferences' => null]);

        return response()->json([
            'message' => 'Preferences reset to defaults',
        ]);
    }
}
