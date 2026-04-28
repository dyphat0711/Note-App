<?php

declare(strict_types=1);

namespace App\Http\Requests\Folder;

use App\Models\Folder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateFolderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique(Folder::class)
                    ->where('user_id', $this->user()->id)
                    ->ignore($this->route('folder')),
            ],
        ];
    }
}
