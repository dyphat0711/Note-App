<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\UploadAttachmentRequest;
use App\Http\Resources\AttachmentResource;
use App\Models\Attachment;
use App\Models\Note;
use App\Services\AttachmentService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AttachmentController extends Controller
{
    public function __construct(
        private readonly AttachmentService $attachments,
    ) {}

    /**
     * Upload attachments to a note.
     */
    public function store(UploadAttachmentRequest $request, Note $note): JsonResponse
    {
        $this->authorize('update', $note);

        $attachments = $this->attachments->upload($note, $request->file('files'));

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

        $this->attachments->delete($attachment);

        return response()->json([
            'message' => 'Attachment deleted successfully',
        ]);
    }

    /**
     * Serve an attachment for download.
     */
    public function download(Attachment $attachment): StreamedResponse
    {
        $note = $attachment->note;
        $this->authorize('view', $note);

        return $this->attachments->response($attachment);
    }
}
