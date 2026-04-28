<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Note;
use App\Models\SharedNote;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class SharingService
{
    /**
     * Share a note with a user by email.
     */
    public function shareNote(Note $note, string $email, string $permission): SharedNote
    {
        return DB::transaction(function () use ($note, $email, $permission): SharedNote {
            $sharedNote = $note->shares()->updateOrCreate(
                ['shared_with_email' => $email],
                [
                    'owner_id' => $note->user_id,
                    'permission' => $permission,
                ],
            );

            return $sharedNote->load('note');
        });
    }

    /**
     * Revoke a share by share ID.
     */
    public function revokeShare(Note $note, int $shareId): bool
    {
        return DB::transaction(function () use ($note, $shareId): bool {
            $share = $note->shares()->findOrFail($shareId);

            return $share->delete();
        });
    }

    /**
     * Get notes shared with a user.
     *
     * @return Collection<int, Note>
     */
    public function getNotesSharedWithUser(User $user): Collection
    {
        return Note::whereHas('shares', function ($query) use ($user): void {
            $query->where('shared_with_email', $user->email);
        })
            ->with(['labels', 'shares'])
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

        return $share->can_edit;
    }
}
