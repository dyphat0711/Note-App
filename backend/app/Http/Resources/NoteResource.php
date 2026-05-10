<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Note
 */
class NoteResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $hasPassword = $this->password !== null;
        $user = $request->user();
        $isOwner = $user !== null && $user->id === $this->user_id;

        $sharePermission = null;
        if (! $isOwner && $user !== null && $this->relationLoaded('shares')) {
            $share = $this->shares->firstWhere('shared_with_email', $user->email);
            $sharePermission = $share?->permission;
        }

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'title' => $this->title,
            'content' => $hasPassword ? null : $this->content,
            'color' => $this->color,
            'is_pinned' => $this->is_pinned,
            'pinned_at' => $this->pinned_at?->toIso8601String(),
            'has_password' => $hasPassword,
            'is_shared' => $this->relationLoaded('shares') ? $this->shares->isNotEmpty() : false,
            'is_owner' => $isOwner,
            'share_permission' => $sharePermission,
            'owner' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'display_name' => $this->user->display_name,
                'email' => $this->user->email,
            ] : null),
            'labels' => LabelResource::collection($this->whenLoaded('labels')),
            'shares' => $this->when(
                $isOwner,
                fn () => SharedNoteResource::collection($this->whenLoaded('shares')),
            ),
            'attachments' => AttachmentResource::collection($this->whenLoaded('attachments')),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
