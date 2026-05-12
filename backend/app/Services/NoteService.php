<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Label;
use App\Models\Note;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class NoteService
{
    /**
     * Get all notes for a user with eager-loaded relationships, optionally filtered by labels.
     *
     * @param array<int> $labelIds
     */
    public function getUserNotes(User $user, array $labelIds = []): Collection
    {
        // When filtering by labels, skip cache (low-traffic, varied keys).
        if (! empty($labelIds)) {
            return $this->buildUserNotesQuery($user, $labelIds)->get();
        }

        // Cache the full note list for 60 s (MySQL production path).
        // The cache key is invalidated on any create / update / delete.
        return Cache::remember(
            "notes.user.{$user->id}",
            60,
            fn () => $this->buildUserNotesQuery($user)->get(),
        );
    }

    /**
     * Build the base query for a user's notes with eager-loaded relationships.
     *
     * @param  array<int>  $labelIds
     * @return \Illuminate\Database\Eloquent\Builder<Note>
     */
    private function buildUserNotesQuery(User $user, array $labelIds = []): \Illuminate\Database\Eloquent\Builder
    {
        $query = $user->notes()
            ->with(['labels', 'shares.sharedWithUser', 'attachments']);

        if (! empty($labelIds)) {
            $query->whereHas('labels', fn ($q) => $q->whereIn('labels.id', $labelIds));
        }

        return $query->ordered();
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
                'title'     => $data['title'],
                'content'   => $data['content'] ?? null,
                'color'     => $data['color'] ?? null,
                'is_pinned' => false,
            ]);

            if (! empty($data['label_ids'])) {
                $this->attachLabels($note, $data['label_ids'], $user);
            }

            // Invalidate the cached note list so the new note appears immediately.
            Cache::forget("notes.user.{$user->id}");

            return $note->load(['labels', 'shares.sharedWithUser', 'attachments']);
        });
    }

    /**
     * Update an existing note. Only title, content and label_ids can be updated here.
     * Password changes go through a dedicated endpoint.
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

            if (array_key_exists('color', $data)) {
                $updateData['color'] = $data['color'];
            }

            if (! empty($updateData)) {
                $note->update($updateData);
            }

            $labelsChanged = array_key_exists('label_ids', $data);
            if ($labelsChanged) {
                $this->syncLabels($note, $data['label_ids'] ?? [], $note->user);
            }

            // Invalidate the cached note list for this user.
            Cache::forget("notes.user.{$note->user_id}");

            // Only reload relations that may have changed to avoid redundant queries.
            // shares and attachments are untouched by this operation so we
            // reuse what is already loaded (if available) and only reload labels
            // when the label set was actually modified.
            if ($labelsChanged) {
                return $note->load(['labels', 'shares.sharedWithUser', 'attachments']);
            }

            // Ensure relations are present on the model (they may already be loaded
            // from the controller's route-model binding or earlier eager load).
            if (! $note->relationLoaded('shares')) {
                $note->load('shares.sharedWithUser');
            }
            if (! $note->relationLoaded('labels')) {
                $note->load('labels');
            }
            if (! $note->relationLoaded('attachments')) {
                $note->load('attachments');
            }

            return $note;
        });
    }

    /**
     * Set, change, or remove the per-note password.
     */
    public function setNotePassword(Note $note, ?string $newPassword): Note
    {
        return DB::transaction(function () use ($note, $newPassword): Note {
            $note->update(['password' => $newPassword]);

            return $note->load(['labels', 'shares', 'attachments']);
        });
    }

    /**
     * Toggle the pinned status of a note.
     */
    public function togglePin(Note $note): Note
    {
        // Single-row UPDATE — no transaction needed.
        $note->update([
            'is_pinned' => ! $note->is_pinned,
            'pinned_at' => $note->is_pinned ? null : now(),
        ]);

        Cache::forget("notes.user.{$note->user_id}");

        return $note->refresh();
    }

    /**
     * Search notes by keyword for a user.
     */
    public function searchNotes(User $user, string $keyword): Collection
    {
        return $user->notes()
            ->with(['labels', 'shares.sharedWithUser', 'attachments'])
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

            // Invalidate the cached note list.
            Cache::forget("notes.user.{$note->user_id}");

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
