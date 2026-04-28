<?php

declare(strict_types=1);

namespace App\Http\Requests\Sharing;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ShareNoteRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
            ],
            'permission' => ['required', 'string', Rule::in(['read', 'edit'])],
        ];
    }
}
