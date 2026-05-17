<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Attachment;
use App\Models\Note;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttachmentService
{
    /**
     * @param  array<int, UploadedFile>  $files
     * @return array<int, Attachment>
     */
    public function upload(Note $note, array $files): array
    {
        $attachments = [];

        foreach ($files as $file) {
            $path = $file->storeAs(
                "attachments/{$note->id}",
                Str::uuid().'.'.$file->getClientOriginalExtension(),
                'public',
            );

            $attachments[] = Attachment::create([
                'note_id' => $note->id,
                'original_name' => $file->getClientOriginalName(),
                'stored_path' => $path,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);
        }

        return $attachments;
    }

    public function delete(Attachment $attachment): void
    {
        Storage::disk('public')->delete($attachment->stored_path);
        $attachment->delete();
    }

    public function response(Attachment $attachment): StreamedResponse
    {
        abort_unless(
            Storage::disk('public')->exists($attachment->stored_path),
            404,
            'File not found.',
        );

        return Storage::disk('public')->response($attachment->stored_path);
    }
}
