<?php

declare(strict_types=1);

namespace App\Http\Controllers;

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
    ) {
    }

    /**
     * Display a listing of the user's notes.
     */
    public function index(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();

        $notes = $this->noteService->getUserNotes($user);

        return response()->json([
            'data' => NoteResource::collection($notes),
        ]);
    }

    /**
     * Display the specified note.
     */
    public function show(Request $request, Note $note): JsonResponse
    {
        $this->authorize('view', $note);

        return response()->json([
            'data' => new NoteResource($note->load(['labels', 'shares'])),
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
     */
    public function update(UpdateNoteRequest $request, Note $note): JsonResponse
    {
        $this->authorize('update', $note);

        $note = $this->noteService->updateNote($note, $request->validated());

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
            'data' => new NoteResource($note),
        ]);
    }

    /**
     * Set or remove the note password.
     */
    public function setPassword(SetNotePasswordRequest $request, Note $note): JsonResponse
    {
        $this->authorize('setPassword', $note);

        $note = $this->noteService->updateNote($note, $request->validated());

        return response()->json([
            'message' => 'Note password updated successfully',
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
     * Move a note to a different folder.
     */
    public function moveToFolder(Request $request, Note $note): JsonResponse
    {
        $this->authorize('update', $note);

        $request->validate([
            'folder_id' => ['nullable', 'integer', 'exists:folders,id'],
        ]);

        $note->update(['folder_id' => $request->input('folder_id')]);

        return response()->json([
            'message' => 'Note moved successfully',
            'data' => new NoteResource($note->load(['labels', 'shares', 'attachments', 'folder'])),
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

        return response()->json([
            'data' => NoteResource::collection($notes),
        ]);
    }
}
