<?php

declare(strict_types=1);

namespace App\Http\Requests\Sharing;

use App\Models\Note;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ShareNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Per spec section 2.5 "better" approach: validate that the email belongs to a
     * registered user.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::exists('users', 'email'),
            ],
            'permission' => ['required', 'string', Rule::in(['read', 'edit'])],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var Note|null $note */
            $note = $this->route('note');
            $email = (string) $this->input('email', '');
            $owner = $note?->user;

            if ($owner !== null && strcasecmp($owner->email, $email) === 0) {
                $validator->errors()->add('email', 'You cannot share a note with yourself.');
            }
        });
    }
}
