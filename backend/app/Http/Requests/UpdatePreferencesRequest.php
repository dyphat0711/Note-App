<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePreferencesRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'preferences' => ['required', 'array'],
            'preferences.theme' => ['nullable', 'string', 'in:light,dark,system'],
            'preferences.font_size' => ['nullable', 'integer', 'min:12', 'max:24'],
            'preferences.default_label_color' => ['nullable', 'string', 'max:7'],
            'preferences.default_view' => ['nullable', 'string', 'in:grid,list'],
        ];
    }
}
