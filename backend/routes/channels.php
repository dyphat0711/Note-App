<?php

declare(strict_types=1);

use App\Models\Note;
use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Channels for real-time note collaboration. Authorization callbacks are
| invoked when a user attempts to subscribe via /broadcasting/auth.
|
*/

Broadcast::channel('App.Models.User.{id}', function (User $user, int $id): bool {
    return $user->id === $id;
});

/**
 * Private channel for collaborative note edits (broadcast NoteUpdated payload).
 * Joinable by the owner OR any sharee with read/edit permission.
 */
Broadcast::channel('note.{noteId}', function (User $user, int $noteId): bool {
    $note = Note::find($noteId);
    if ($note === null) {
        return false;
    }

    if ($note->user_id === $user->id) {
        return true;
    }

    return $note->shares()
        ->where('shared_with_email', $user->email)
        ->exists();
});

/**
 * Presence channel for "who is editing" indicators on a note.
 * Returns the user payload visible to all members.
 */
Broadcast::channel('presence-note.{noteId}', function (User $user, int $noteId) {
    $note = Note::find($noteId);
    if ($note === null) {
        return false;
    }

    $authorized = $note->user_id === $user->id
        || $note->shares()
            ->where('shared_with_email', $user->email)
            ->exists();

    if (! $authorized) {
        return false;
    }

    return [
        'id' => $user->id,
        'display_name' => $user->display_name,
        'email' => $user->email,
    ];
});
