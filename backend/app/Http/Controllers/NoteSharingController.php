<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\Sharing\ShareNoteRequest;
use App\Http\Resources\NoteResource;
use App\Http\Resources\SharedNoteResource;
use App\Models\Note;
use App\Models\User;
use App\Services\SharingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NoteSharingController extends Controller
{
    public function __construct(
        protected SharingService $sharingService,
    ) {
    }

    /**
     * Share a note with a user by email.
     */
    public function store(ShareNoteRequest $request, Note $note): JsonResponse
    {
        $this->authorize('share', $note);

        $validated = $request->validated();

        $sharedNote = $this->sharingService->shareNote(
            $note,
            $validated['email'],
            $validated['permission'],
        );

        return response()->json([
            'message' => 'Note shared successfully',
            'data' => new SharedNoteResource($sharedNote),
        ], 201);
    }

    /**
     * Revoke a share permission.
     */
    public function destroy(Request $request, Note $note, int $shareId): JsonResponse
    {
        $this->authorize('share', $note);

        $this->sharingService->revokeShare($note, $shareId);

        return response()->json([
            'message' => 'Share revoked successfully',
        ]);
    }

    /**
     * Get notes shared with the current user.
     */
    public function sharedWithMe(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $notes = $this->sharingService->getNotesSharedWithUser($user);

        return response()->json([
            'data' => NoteResource::collection($notes),
        ]);
    }
}
