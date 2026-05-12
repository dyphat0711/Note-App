<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Note;
use App\Models\SharedNote;
use App\Models\User;
use App\Notifications\NoteSharedNotification;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;

class SharingService
{
    /**
     * Share a note with a registered user by email. Sends an in-app + email notification
     * unless `silent` is true (used internally to avoid double-notify on permission updates).
     */
    public function shareNote(Note $note, string $email, string $permission, bool $silent = false): SharedNote
    {
        return DB::transaction(function () use ($note, $email, $permission, $silent): SharedNote {
            /** @var SharedNote $sharedNote */
            $sharedNote = $note->shares()->updateOrCreate(
                ['shared_with_email' => $email],
                [
                    'owner_id' => $note->user_id,
                    'permission' => $permission,
                ],
            );

            if (! $silent) {
                $recipient = User::where('email', $email)->first();
                $owner = $note->user;
                if ($recipient !== null && $owner !== null) {
                    Notification::send($recipient, new NoteSharedNotification($note, $owner, $permission));
                }
            }

            return $sharedNote;
        });
    }

    /**
     * Update an existing share's permission.
     */
    public function updatePermission(Note $note, int $shareId, string $permission): SharedNote
    {
        return DB::transaction(function () use ($note, $shareId, $permission): SharedNote {
            /** @var SharedNote $share */
            $share = $note->shares()->findOrFail($shareId);
            $share->update(['permission' => $permission]);

            return $share;
        });
    }

    /**
     * Revoke a share by share ID.
     */
    public function revokeShare(Note $note, int $shareId): bool
    {
        return DB::transaction(function () use ($note, $shareId): bool {
            $share = $note->shares()->findOrFail($shareId);

            return (bool) $share->delete();
        });
    }

    /**
     * Get notes shared with a user. Eager-loads the owner so the recipient can see who
     * shared the note. Does NOT eager-load `shares` (privacy: recipients should not see
     * the full list of other recipients).
     *
     * @return Collection<int, Note>
     */
    public function getNotesSharedWithUser(User $user): Collection
    {
        return Note::whereHas('shares', function ($query) use ($user): void {
            $query->where('shared_with_email', $user->email);
        })
            ->with([
                'labels',
                'attachments',
                'user:id,display_name,email,avatar_path',
                // Only attach the share record relevant to this user, so they know
                // their own permission without leaking other recipients' details.
                // Eager-load sharedWithUser on each share to avoid N+1 in SharedNoteResource.
                'shares' => fn ($q) => $q
                    ->where('shared_with_email', $user->email)
                    ->with('sharedWithUser'),
            ])
            ->ordered()
            ->get();
    }

    /**
     * Check if a user has edit permission on a shared note.
     */
    public function hasEditPermission(Note $note, User $user): bool
    {
        $share = $note->shares()
            ->where('shared_with_email', $user->email)
            ->first();

        if ($share === null) {
            return false;
        }

        return $share->permission === 'edit';
    }
}
