<?php

declare(strict_types=1);

namespace App\Http\Resources;

use App\Models\Note;
use Illuminate\Http\Request;
use App\Http\Resources\FolderResource;
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

        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'folder_id' => $this->folder_id,
            'title' => $this->title,
            'content' => $hasPassword ? null : $this->content,
            'is_pinned' => $this->is_pinned,
            'pinned_at' => $this->pinned_at?->toIso8601String(),
            'has_password' => $hasPassword,
            'labels' => LabelResource::collection($this->whenLoaded('labels')),
            'shares' => SharedNoteResource::collection($this->whenLoaded('shares')),
            'attachments' => AttachmentResource::collection($this->whenLoaded('attachments')),
            'folder' => new FolderResource($this->whenLoaded('folder')),
            'created_at' => $this->created_at->toIso8601String(),
            'updated_at' => $this->updated_at->toIso8601String(),
        ];
    }
}
