<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Note;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Note>
 */
class NoteFactory extends Factory
{
    protected $model = Note::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => $this->faker->sentence(4),
            'content' => $this->faker->paragraph(),
            'is_pinned' => false,
            'pinned_at' => null,
            'password' => null,
        ];
    }

    public function pinned(): static
    {
        return $this->state(fn (): array => [
            'is_pinned' => true,
            'pinned_at' => now(),
        ]);
    }

    public function withPassword(string $plain = 'secret'): static
    {
        return $this->state(fn (): array => [
            'password' => $plain, // model casts auto-hash via 'hashed'
        ]);
    }
}
