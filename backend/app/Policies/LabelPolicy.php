<?php

declare(strict_types=1);

namespace App\Policies;

use App\Models\Label;
use App\Models\User;

class LabelPolicy
{
    /**
     * Determine whether the user can view any labels.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the label.
     */
    public function view(User $user, Label $label): bool
    {
        return $user->id === $label->user_id;
    }

    /**
     * Determine whether the user can create labels.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the label.
     * Only the owner can update.
     */
    public function update(User $user, Label $label): bool
    {
        return $user->id === $label->user_id;
    }

    /**
     * Determine whether the user can delete the label.
     * Only the owner can delete (cascade removes note_label entries).
     */
    public function delete(User $user, Label $label): bool
    {
        return $user->id === $label->user_id;
    }
}
