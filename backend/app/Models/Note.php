<?php

declare(strict_types=1);

namespace App\Models;

use Database\Factories\NoteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $user_id
 * @property string $title
 * @property string|null $content
 * @property string|null $password
 * @property bool $is_pinned
 * @property \Illuminate\Support\Carbon|null $pinned_at
 * @property \Illuminate\Support\Carbon $created_at
 * @property \Illuminate\Support\Carbon $updated_at
 * @property-read User $user
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Label> $labels
 * @property-read \Illuminate\Database\Eloquent\Collection<int, SharedNote> $shares
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Attachment> $attachments
 */
class Note extends Model
{
    /** @use HasFactory<NoteFactory> */
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'content',
        'color',
        'password',
        'is_pinned',
        'pinned_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'pinned_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * @return BelongsToMany<Label, $this>
     */
    public function labels(): BelongsToMany
    {
        return $this->belongsToMany(Label::class, 'note_label')->withTimestamps();
    }

    /**
     * @return HasMany<SharedNote, $this>
     */
    public function shares(): HasMany
    {
        return $this->hasMany(SharedNote::class);
    }

    /**
     * @return HasMany<Attachment, $this>
     */
    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }

    /**
     * Scope a query to only include notes owned by the given user.
     *
     * @param \Illuminate\Database\Eloquent\Builder<self> $query
     * @return \Illuminate\Database\Eloquent\Builder<self>
     */
    public function scopeOwnedBy($query, int $userId): mixed
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope a query to search notes by keyword.
     *
     * Uses FULLTEXT MATCH AGAINST on MySQL/MariaDB for indexed performance.
     * Falls back to LIKE for other drivers (e.g. SQLite in tests).
     *
     * @param \Illuminate\Database\Eloquent\Builder<self> $query
     * @return \Illuminate\Database\Eloquent\Builder<self>
     */
    public function scopeSearch($query, string $keyword): mixed
    {
        $driver = $query->getConnection()->getDriverName();

        if (in_array($driver, ['mysql', 'mariadb'])) {
            // FULLTEXT search — uses the notes_fulltext_idx index.
            // Boolean mode allows partial matching and is more lenient.
            $escaped = addcslashes($keyword, '+-<>()~*"@');

            return $query->whereRaw(
                'MATCH(title, content) AGAINST(? IN BOOLEAN MODE)',
                [$escaped . '*'],
            );
        }

        // Fallback for SQLite / PostgreSQL
        return $query->where(function ($q) use ($keyword): void {
            $q->where('title', 'like', "%{$keyword}%")
                ->orWhere('content', 'like', "%{$keyword}%");
        });
    }

    /**
     * Scope a query to order by pinned first, then by updated_at descending.
     *
     * @param \Illuminate\Database\Eloquent\Builder<self> $query
     * @return \Illuminate\Database\Eloquent\Builder<self>
     */
    public function scopeOrdered($query): mixed
    {
        return $query->orderByDesc('is_pinned')
            ->orderByDesc('pinned_at')
            ->orderByDesc('updated_at');
    }
}
