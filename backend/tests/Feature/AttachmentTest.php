<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Rubric coverage:
 * - #15 Image attachments (single + multiple)
 */
class AttachmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_upload_image_attachments(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $note = Note::factory()->for($user)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/notes/{$note->id}/attachments", [
            'files' => [
                UploadedFile::fake()->create('a.jpg', 100, 'image/jpeg'),
                UploadedFile::fake()->create('b.png', 100, 'image/png'),
            ],
        ]);

        $response->assertStatus(201)->assertJsonCount(2, 'data');
        $this->assertSame(2, $note->attachments()->count());
    }

    public function test_attachment_rejects_non_image_files(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $note = Note::factory()->for($user)->create();

        $response = $this->actingAs($user, 'sanctum')->postJson("/api/notes/{$note->id}/attachments", [
            'files' => [UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf')],
        ]);

        $response->assertStatus(422);
    }

    public function test_attachment_rejects_oversized_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $note = Note::factory()->for($user)->create();

        // 6MB > 5MB limit
        $response = $this->actingAs($user, 'sanctum')->postJson("/api/notes/{$note->id}/attachments", [
            'files' => [UploadedFile::fake()->create('big.jpg', 6144, 'image/jpeg')],
        ]);

        $response->assertStatus(422);
    }

    public function test_user_cannot_upload_to_other_users_note(): void
    {
        Storage::fake('public');
        $alice = User::factory()->create();
        $bob = User::factory()->create();
        $note = Note::factory()->for($bob)->create();

        $response = $this->actingAs($alice, 'sanctum')->postJson("/api/notes/{$note->id}/attachments", [
            'files' => [UploadedFile::fake()->create('a.jpg', 100, 'image/jpeg')],
        ]);

        $response->assertStatus(403);
    }

    public function test_user_can_list_and_delete_attachments(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();
        $note = Note::factory()->for($user)->create();

        $upload = $this->actingAs($user, 'sanctum')->postJson("/api/notes/{$note->id}/attachments", [
            'files' => [UploadedFile::fake()->create('a.jpg', 100, 'image/jpeg')],
        ])->assertStatus(201);

        $attachmentId = $upload->json('data.0.id');

        $list = $this->actingAs($user, 'sanctum')->getJson("/api/notes/{$note->id}/attachments");
        $list->assertOk()->assertJsonCount(1, 'data');

        $delete = $this->actingAs($user, 'sanctum')
            ->deleteJson("/api/notes/{$note->id}/attachments/{$attachmentId}");
        $delete->assertOk();
        $this->assertSame(0, $note->attachments()->count());
    }
}
