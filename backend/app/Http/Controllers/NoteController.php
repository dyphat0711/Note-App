<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Events\NoteUpdated;
use App\Http\Requests\Note\SetNotePasswordRequest;
use App\Http\Requests\Note\StoreNoteRequest;
use App\Http\Requests\Note\UpdateNoteRequest;
use App\Http\Resources\NoteResource;
use App\Models\Note;
use App\Models\User;
use App\Services\NoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class NoteController extends Controller
{
    public function __construct(
        protected NoteService $noteService,
    ) {}

    /**
     * Display a listing of the user's notes, optionally filtered by labels.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $labelIds = $this->parseLabelIds($request->query('label_ids'));

        $notes = $this->noteService->getUserNotes($user, $labelIds);

        return NoteResource::collection($notes)->response();
    }

    /**
     * Display the specified note.
     */
    public function show(Request $request, Note $note): JsonResponse
    {
        $this->authorize('view', $note);

        return response()->json([
            'data' => new NoteResource($note->load(['labels', 'shares', 'attachments', 'user'])),
        ]);
    }

    /**
     * Store a newly created note.
     */
    public function store(StoreNoteRequest $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $note = $this->noteService->createNote($user, $request->validated());

        return response()->json([
            'message' => 'Note created successfully',
            'data' => new NoteResource($note),
        ], 201);
    }

    /**
     * Update the specified note.
     * Allowed for the owner OR a sharee with edit permission.
     */
    public function update(UpdateNoteRequest $request, Note $note): JsonResponse
    {
        $this->authorize('update', $note);

        $note = $this->noteService->updateNote($note, $request->validated());

        // Broadcast change to collaborators when the note is shared.
        // Use the already-loaded `shares` collection (no extra DB query).
        if ($note->shares->isNotEmpty()) {
            event(new NoteUpdated($note, (int) $request->user()->id));
        }

        return response()->json([
            'message' => 'Note updated successfully',
            'data' => new NoteResource($note),
        ]);
    }

    /**
     * Toggle the pinned status of the note.
     */
    public function togglePin(Request $request, Note $note): JsonResponse
    {
        $this->authorize('pin', $note);

        $note = $this->noteService->togglePin($note);

        return response()->json([
            'message' => 'Note pin toggled successfully',
            'data' => new NoteResource($note->load(['labels', 'shares', 'attachments'])),
        ]);
    }

    /**
     * Set, change, or remove the note password.
     */
    public function setPassword(SetNotePasswordRequest $request, Note $note): JsonResponse
    {
        $this->authorize('setPassword', $note);

        $validated = $request->validated();
        $action = $validated['action'];

        if ($action === 'disable') {
            $note = $this->noteService->setNotePassword($note, null);
            $message = 'Note password disabled successfully';
        } else {
            $note = $this->noteService->setNotePassword($note, $validated['password']);
            $message = $action === 'set'
                ? 'Note password set successfully'
                : 'Note password changed successfully';
        }

        // Broadcast to shared users so their clients update the lock state immediately.
        // This prevents a race where a shared user still has the content cached while
        // the owner has since locked the note.
        if ($note->shares()->exists()) {
            event(new NoteUpdated($note, (int) $request->user()->id));
        }

        return response()->json([
            'message' => $message,
            'data' => new NoteResource($note),
        ]);
    }

    /**
     * Remove the specified note.
     */
    public function destroy(Request $request, Note $note): JsonResponse
    {
        $this->authorize('delete', $note);

        $this->noteService->deleteNote($note);

        return response()->json([
            'message' => 'Note deleted successfully',
        ], 200);
    }

    /**
     * Unlock a password-protected note and return its content.
     */
    public function unlock(Request $request, Note $note): JsonResponse
    {
        $this->authorize('view', $note);

        $request->validate([
            'password' => ['required', 'string'],
        ]);

        if ($note->password === null) {
            abort(400, 'Note is not password protected.');
        }

        if (! Hash::check($request->input('password'), $note->password)) {
            abort(403, 'Incorrect password.');
        }

        return response()->json([
            'content' => $note->content,
        ]);
    }

    /**
     * Search notes by keyword.
     */
    public function search(Request $request): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'max:255'],
        ]);

        /** @var User $user */
        $user = $request->user();

        $notes = $this->noteService->searchNotes($user, $request->input('q'));

        return NoteResource::collection($notes)->response();
    }

    /**
     * Parse a comma-separated label_ids query string into an array of ints.
     *
     * @return array<int, int>
     */
    private function parseLabelIds(?string $raw): array
    {
        if ($raw === null || $raw === '') {
            return [];
        }

        return array_values(array_filter(
            array_map('intval', explode(',', $raw)),
            fn (int $id): bool => $id > 0,
        ));
    }
}
