<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Label;
use App\Models\Note;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class NoteService
{
    /**
     * Get all notes for a user with eager-loaded relationships.
     */
    public function getUserNotes(User $user): Collection
    {
        return $user->notes()
            ->with(['labels', 'shares', 'attachments', 'folder'])
            ->ordered()
            ->get();
    }

    /**
     * Get a single note by ID with eager-loaded relationships.
     */
    public function findNoteById(int $noteId, User $user): ?Note
    {
        return Note::with(['labels', 'shares', 'attachments'])
            ->ownedBy($user->id)
            ->find($noteId);
    }

    /**
     * Create a new note for the user with optional labels.
     */
    public function createNote(User $user, array $data): Note
    {
        return DB::transaction(function () use ($user, $data): Note {
            $note = $user->notes()->create([
                'title' => $data['title'],
                'content' => $data['content'] ?? null,
                'password' => $data['password'] ?? null,
                'folder_id' => $data['folder_id'] ?? null,
                'is_pinned' => false,
            ]);

            if (! empty($data['label_ids'])) {
                $this->attachLabels($note, $data['label_ids'], $user);
            }

            return $note->load(['labels', 'shares', 'attachments', 'folder']);
        });
    }

    /**
     * Update an existing note.
     */
    public function updateNote(Note $note, array $data): Note
    {
        return DB::transaction(function () use ($note, $data): Note {
            $updateData = [];

            if (array_key_exists('title', $data)) {
                $updateData['title'] = $data['title'];
            }

            if (array_key_exists('content', $data)) {
                $updateData['content'] = $data['content'];
            }

            if (array_key_exists('password', $data)) {
                $updateData['password'] = $data['password'];
            }

            if (! empty($updateData)) {
                $note->update($updateData);
            }

            if (array_key_exists('label_ids', $data)) {
                $this->syncLabels($note, $data['label_ids'] ?? [], $note->user);
            }

            return $note->load(['labels', 'shares', 'attachments', 'folder']);
        });
    }

    /**
     * Toggle the pinned status of a note.
     */
    public function togglePin(Note $note): Note
    {
        return DB::transaction(function () use ($note): Note {
            $note->update([
                'is_pinned' => ! $note->is_pinned,
                'pinned_at' => $note->is_pinned ? null : now(),
            ]);

            return $note->refresh();
        });
    }

    /**
     * Search notes by keyword for a user.
     */
    public function searchNotes(User $user, string $keyword): Collection
    {
        return $user->notes()
            ->with(['labels', 'shares', 'attachments'])
            ->search($keyword)
            ->ordered()
            ->get();
    }

    /**
     * Delete a note and its associated relationships.
     */
    public function deleteNote(Note $note): bool
    {
        return DB::transaction(function () use ($note): bool {
            // Delete attachment files from storage
            foreach ($note->attachments as $attachment) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($attachment->stored_path);
            }

            // Detach labels (pivot records will cascade via foreign key)
            $note->labels()->detach();

            // Delete shares (will cascade via foreign key)
            $note->shares()->delete();

            return $note->delete();
        });
    }

    /**
     * Attach labels to a note, ensuring they belong to the user.
     *
     * @param array<int> $labelIds
     */
    private function attachLabels(Note $note, array $labelIds, User $user): void
    {
        $validLabelIds = Label::ownedBy($user->id)
            ->whereIn('id', $labelIds)
            ->pluck('id')
            ->toArray();

        $note->labels()->attach($validLabelIds);
    }

    /**
     * Sync labels on a note, ensuring they belong to the user.
     *
     * @param array<int> $labelIds
     */
    private function syncLabels(Note $note, array $labelIds, User $user): void
    {
        $validLabelIds = Label::ownedBy($user->id)
            ->whereIn('id', $labelIds)
            ->pluck('id')
            ->toArray();

        $note->labels()->sync($validLabelIds);
    }
}
