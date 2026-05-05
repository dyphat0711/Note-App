<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdatePreferencesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() !== null;
    }

    /**
     * Per spec section 2.1: "The User Preferences screen allows users to adjust specific
     * settings, such as the font size of their notes, note colors, or toggling between
     * light and dark themes."
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'preferences' => ['required', 'array'],
            'preferences.theme' => ['nullable', 'string', 'in:light,dark,system'],
            'preferences.font_size' => ['nullable', 'integer', 'min:12', 'max:24'],
            'preferences.default_note_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'preferences.default_label_color' => ['nullable', 'string', 'regex:/^#[0-9A-Fa-f]{6}$/'],
            'preferences.default_view' => ['nullable', 'string', 'in:grid,list'],
        ];
    }
}
