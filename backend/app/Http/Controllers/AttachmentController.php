<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UploadAttachmentRequest;
use App\Http\Resources\AttachmentResource;
use App\Models\Attachment;
use App\Models\Note;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class AttachmentController extends Controller
{
    /**
     * Upload attachments to a note.
     */
    public function store(UploadAttachmentRequest $request, Note $note): JsonResponse
    {
        $this->authorize('update', $note);

        $attachments = [];

        foreach ($request->file('files') as $file) {
            $extension = $file->getClientOriginalExtension();
            $filename = Str::uuid() . '.' . $extension;

            $path = $file->storeAs(
                "attachments/{$note->id}",
                $filename,
                'public'
            );

            $attachment = Attachment::create([
                'note_id' => $note->id,
                'original_name' => $file->getClientOriginalName(),
                'stored_path' => $path,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);

            $attachments[] = $attachment;
        }

        return response()->json([
            'message' => 'Attachments uploaded successfully',
            'data' => AttachmentResource::collection($attachments),
        ], 201);
    }

    /**
     * List attachments for a note.
     */
    public function index(Note $note): JsonResponse
    {
        $this->authorize('view', $note);

        $attachments = $note->attachments()->latest()->get();

        return response()->json([
            'data' => AttachmentResource::collection($attachments),
        ]);
    }

    /**
     * Delete an attachment.
     */
    public function destroy(Note $note, Attachment $attachment): JsonResponse
    {
        $this->authorize('update', $note);

        if ($attachment->note_id !== $note->id) {
            abort(403, 'Attachment does not belong to this note.');
        }

        Storage::disk('public')->delete($attachment->stored_path);
        $attachment->delete();

        return response()->json([
            'message' => 'Attachment deleted successfully',
        ]);
    }

    /**
     * Serve an attachment for download.
     */
    public function download(Attachment $attachment)
    {
        $note = $attachment->note;
        $this->authorize('view', $note);

        if (!Storage::disk('public')->exists($attachment->stored_path)) {
            abort(404, 'File not found.');
        }

        return Storage::disk('public')->response(
            $attachment->stored_path
        );
    }
}
