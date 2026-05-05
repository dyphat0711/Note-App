<?php

declare(strict_types=1);

namespace Database\Factories;

use App\Models\Note;
use App\Models\SharedNote;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<SharedNote>
 */
class SharedNoteFactory extends Factory
{
    protected $model = SharedNote::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'note_id' => Note::factory(),
            'owner_id' => User::factory(),
            'shared_with_email' => $this->faker->unique()->safeEmail(),
            'permission' => 'edit',
        ];
    }

    public function readonly(): static
    {
        return $this->state(fn (): array => ['permission' => 'read']);
    }
}
