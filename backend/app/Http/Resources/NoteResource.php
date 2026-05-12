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

        // For recipients viewing a shared note, surface when the share was created.
        $sharePermission = null;
        $sharedAt = null;
        if (! $isOwner && $user !== null && $this->relationLoaded('shares')) {
            $share = $this->shares->firstWhere('shared_with_email', $user->email);
            $sharePermission = $share?->permission;
            $sharedAt = $share?->created_at?->toIso8601String();
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
            'is_shared' => $this->relationLoaded('shares') ? $this->shares->count() > 0 : false,
            'is_owner' => $isOwner,
            'share_permission' => $sharePermission,
            'shared_at' => $sharedAt,
            'owner' => $this->whenLoaded('user', fn () => $this->user ? [
                'id' => $this->user->id,
                'display_name' => $this->user->display_name,
                'email' => $this->user->email,
                'avatar_path' => $this->user->avatar_path,
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
