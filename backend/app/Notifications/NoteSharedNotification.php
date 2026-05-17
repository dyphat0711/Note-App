<?php

declare(strict_types=1);

namespace App\Notifications;

use App\Models\Note;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NoteSharedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public Note $note,
        public User $owner,
        public string $permission,
    ) {}

    /**
     * Channels: in-app database notification + email notification.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $permissionLabel = $this->permission === 'edit' ? 'edit' : 'read-only';

        return (new MailMessage)
            ->subject("{$this->owner->display_name} shared a note with you")
            ->greeting("Hello {$notifiable->display_name},")
            ->line("**{$this->owner->display_name}** ({$this->owner->email}) shared the note ")
            ->line("**\"{$this->note->title}\"** with you ({$permissionLabel}).")
            ->action('Open shared notes', url('/shared-with-me'))
            ->line('You can manage shared notes from the "Shared with me" section.');
    }

    /**
     * In-app payload (stored in `notifications` table).
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'note.shared',
            'note_id' => $this->note->id,
            'note_title' => $this->note->title,
            'owner_id' => $this->owner->id,
            'owner_email' => $this->owner->email,
            'owner_display_name' => $this->owner->display_name,
            'permission' => $this->permission,
        ];
    }
}
