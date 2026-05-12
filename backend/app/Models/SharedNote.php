<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\SharedNoteFactory;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $note_id
 * @property int $owner_id
 * @property string $shared_with_email
 * @property string $permission
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 * @property-read Note $note
 * @property-read User $owner
 * @property-read User|null $sharedWithUser
 * @property-read bool $can_edit
 */
class SharedNote extends Model
{
    /** @use HasFactory<SharedNoteFactory> */
    use HasFactory;

    protected $fillable = [
        'note_id',
        'owner_id',
        'shared_with_email',
        'permission',
    ];

    /**
     * @return BelongsTo<Note, $this>
     */
    public function note(): BelongsTo
    {
        return $this->belongsTo(Note::class);
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * The user account that this note was shared with.
     * Uses `shared_with_email` as the foreign key matched against `users.email`.
     * Eager-loading via `shares.sharedWithUser` eliminates the N+1 query that
     * `SharedNoteResource` previously issued per share record.
     *
     * @return BelongsTo<User, $this>
     */
    public function sharedWithUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shared_with_email', 'email')
            ->select(['id', 'display_name', 'avatar_path', 'email']);
    }

    /**
     * Determine if this share grants edit permission.
     *
     * @return Attribute<bool, never>
     */
    protected function canEdit(): Attribute
    {
        return Attribute::make(
            get: fn (): bool => $this->permission === 'edit',
        );
    }
}
