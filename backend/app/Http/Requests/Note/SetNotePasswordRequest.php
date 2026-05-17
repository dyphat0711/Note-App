<?php

declare(strict_types=1);

namespace App\Http\Requests\Note;

use App\Models\Note;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class SetNotePasswordRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Three explicit actions per spec "better" approach (section 2.5):
     *  - set: requires password + password_confirmation (entered twice).
     *  - change: requires current_password verification, plus new password + confirmation.
     *  - disable: requires current_password verification.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'action' => ['required', 'string', Rule::in(['set', 'change', 'disable'])],
            'current_password' => ['required_if:action,change,disable', 'nullable', 'string'],
            'password' => [
                'required_if:action,set,change',
                'nullable',
                'string',
                'min:4',
                'max:255',
                'confirmed',
            ],
        ];
    }

    /**
     * Cross-field rules that depend on the underlying note state.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            /** @var Note|null $note */
            $note = $this->route('note');
            $action = $this->input('action');

            if ($note === null) {
                return;
            }

            // Reject "set" if the note already has a password (must use "change").
            if ($action === 'set' && $note->password !== null) {
                $validator->errors()->add('action', 'Note already has a password. Use action=change instead.');

                return;
            }

            // Reject "change"/"disable" if note has no password (must use "set").
            if (in_array($action, ['change', 'disable'], true) && $note->password === null) {
                $validator->errors()->add('action', 'Note has no password yet. Use action=set instead.');

                return;
            }

            // Verify current password for change/disable actions.
            if (in_array($action, ['change', 'disable'], true)) {
                $current = (string) $this->input('current_password', '');
                if (! Hash::check($current, $note->password)) {
                    $validator->errors()->add('current_password', 'Current password is incorrect.');
                }
            }
        });
    }
}
