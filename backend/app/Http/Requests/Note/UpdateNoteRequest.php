<?php

declare(strict_types=1);

namespace App\Http\Requests\Note;

use Illuminate\Foundation\Http\FormRequest;

class UpdateNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        // Auto-save sends partial payloads, so `sometimes` is required on each field.
        // Per-note password mutations go through PATCH /notes/{note}/password,
        // never through the generic update endpoint.
        return [
            'title' => ['sometimes', 'required', 'string', 'max:255'],
            'content' => ['sometimes', 'nullable', 'string'],
            'label_ids' => ['sometimes', 'nullable', 'array'],
            'label_ids.*' => ['integer', 'exists:labels,id'],
        ];
    }
}
