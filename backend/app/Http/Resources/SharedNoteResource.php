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
            'id' => $this->id,
            'note_id' => $this->note_id,
            'owner_id' => $this->owner_id,
            'shared_with_email' => $this->shared_with_email,
            'permission' => $this->permission,
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
