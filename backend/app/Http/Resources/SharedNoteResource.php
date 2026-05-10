<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\SharedNote;
use App\Models\User;
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
        // Look up the recipient user to get their display_name and avatar_path
        // so the frontend can render the correct recognizable icon per account.
        $recipient = User::where('email', $this->shared_with_email)
            ->select('id', 'display_name', 'avatar_path')
            ->first();

        return [
            'id' => $this->id,
            'note_id' => $this->note_id,
            'owner_id' => $this->owner_id,
            'shared_with_email' => $this->shared_with_email,
            'display_name' => $recipient?->display_name,
            'avatar_path' => $recipient?->avatar_path,
            'permission' => $this->permission,
            'shared_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
