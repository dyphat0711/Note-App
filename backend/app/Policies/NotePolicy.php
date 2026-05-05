<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Note;
use App\Models\User;

class NotePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Owner or any sharee can view (subject to per-note password).
     */
    public function view(User $user, Note $note): bool
    {
        if ($user->id === $note->user_id) {
            return true;
        }

        return $note->shares()
            ->where('shared_with_email', $user->email)
            ->exists();
    }

    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Owner can always update. Sharees with `edit` permission can update title/content.
     */
    public function update(User $user, Note $note): bool
    {
        if ($user->id === $note->user_id) {
            return true;
        }

        return $note->shares()
            ->where('shared_with_email', $user->email)
            ->where('permission', 'edit')
            ->exists();
    }

    /**
     * Only the owner can delete.
     */
    public function delete(User $user, Note $note): bool
    {
        return $user->id === $note->user_id;
    }

    /**
     * Only the owner can share.
     */
    public function share(User $user, Note $note): bool
    {
        return $user->id === $note->user_id;
    }

    /**
     * Only the owner can pin.
     */
    public function pin(User $user, Note $note): bool
    {
        return $user->id === $note->user_id;
    }

    /**
     * Only the owner can manage the password.
     */
    public function setPassword(User $user, Note $note): bool
    {
        return $user->id === $note->user_id;
    }
}
