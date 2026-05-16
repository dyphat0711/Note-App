<?php

declare(strict_types=1);

namespace App\Events;

use App\Models\Note;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class NoteUpdated implements ShouldBroadcastNow
{
    use Dispatchable;
    use InteractsWithSockets;
    use SerializesModels;

    public function __construct(
        public Note $note,
        public int $updatedBy,
    ) {
    }

    /**
     * @return array<int, PrivateChannel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('note.' . $this->note->id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'NoteUpdated';
    }

    /**
     * @return array<string, mixed>
     */
    public function broadcastWith(): array
    {
        $updater = \App\Models\User::find($this->updatedBy);
        $hasPassword = $this->note->password !== null;

        return [
            'note_id' => $this->note->id,
            'title' => $this->note->title,
            'content' => $hasPassword ? null : $this->note->content,
            'color' => $this->note->color,
            'has_password' => $hasPassword,
            'updated_by' => $this->updatedBy,
            'updated_by_name' => $updater?->display_name ?? $updater?->email,
            'updated_at' => $this->note->updated_at?->toIso8601String(),
        ];
    }
}
