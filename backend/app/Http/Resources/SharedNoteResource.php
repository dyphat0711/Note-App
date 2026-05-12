<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\SharedNote;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin SharedNote
 */
class SharedNoteResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id'                => $this->id,
            'note_id'           => $this->note_id,
            'owner_id'          => $this->owner_id,
            'shared_with_email' => $this->shared_with_email,
            // Use the eager-loaded sharedWithUser relation when available (eliminates N+1).
            // Falls back to null if the relation was not loaded by the caller.
            'display_name' => $this->whenLoaded(
                'sharedWithUser',
                fn () => $this->sharedWithUser?->display_name,
            ),
            'avatar_path' => $this->whenLoaded(
                'sharedWithUser',
                fn () => $this->sharedWithUser?->avatar_path,
            ),
            'permission' => $this->permission,
            'shared_at'  => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
