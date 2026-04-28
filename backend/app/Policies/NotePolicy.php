<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Note;
use App\Models\User;

class NotePolicy
{
    /**
     * Determine whether the user can view any notes.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the note.
     * Users can view their own notes or notes shared with them.
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

    /**
     * Determine whether the user can create notes.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the note.
     * Only the owner can update.
     */
    public function update(User $user, Note $note): bool
    {
        return $user->id === $note->user_id;
    }

    /**
     * Determine whether the user can delete the note.
     * Only the owner can delete.
     */
    public function delete(User $user, Note $note): bool
    {
        return $user->id === $note->user_id;
    }

    /**
     * Determine whether the user can share the note.
     * Only the owner can share.
     */
    public function share(User $user, Note $note): bool
    {
        return $user->id === $note->user_id;
    }

    /**
     * Determine whether the user can pin/unpin the note.
     * Only the owner can pin.
     */
    public function pin(User $user, Note $note): bool
    {
        return $user->id === $note->user_id;
    }

    /**
     * Determine whether the user can set/remove the note password.
     * Only the owner can set password.
     */
    public function setPassword(User $user, Note $note): bool
    {
        return $user->id === $note->user_id;
    }
}
