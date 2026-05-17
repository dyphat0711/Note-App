<?php

declare(strict_types=1);

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class AttachmentResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $exists = Storage::disk('public')->exists($this->stored_path);

        return [
            'id' => $this->id,
            'note_id' => $this->note_id,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'size' => $this->size,
            'size_formatted' => $this->formatBytes($this->size),
            'url' => $exists ? '/storage/'.$this->stored_path : null,
            'download_url' => $exists ? route('attachments.download', $this->id) : null,
            'exists' => $exists,
            'is_image' => str_starts_with($this->mime_type, 'image/'),
            'created_at' => $this->created_at->toISOString(),
        ];
    }

    /**
     * Format bytes into human-readable size.
     */
    private function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $i = 0;
        while ($bytes >= 1024 && $i < count($units) - 1) {
            $bytes /= 1024;
            $i++;
        }

        return round($bytes, 2).' '.$units[$i];
    }
}
