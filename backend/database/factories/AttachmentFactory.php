<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Attachment;
use App\Models\Note;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Attachment>
 */
class AttachmentFactory extends Factory
{
    protected $model = Attachment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'note_id' => Note::factory(),
            'original_name' => $this->faker->word().'.png',
            'stored_path' => 'attachments/test/'.$this->faker->uuid().'.png',
            'mime_type' => 'image/png',
            'size' => $this->faker->numberBetween(1024, 1024 * 100),
        ];
    }
}
