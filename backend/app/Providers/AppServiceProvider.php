<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Label;
use App\Models\Note;
use App\Policies\LabelPolicy;
use App\Policies\NotePolicy;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Explicit policy registration (avoids reliance on convention discovery).
        Gate::policy(Note::class, NotePolicy::class);
        Gate::policy(Label::class, LabelPolicy::class);

        // Customize email verification URL to point to the frontend SPA
        VerifyEmail::createUrlUsing(function ($notifiable) {
            $frontendUrl = env('APP_FRONTEND_URL', 'http://localhost:5173').'/email-verified';

            $verifyUrl = URL::temporarySignedRoute(
                'verification.verify',
                Carbon::now()->addMinutes(Config::get('auth.verification.expire', 60)),
                [
                    'id' => $notifiable->getKey(),
                    'hash' => sha1($notifiable->getEmailForVerification()),
                ]
            );

            $query = parse_url($verifyUrl, PHP_URL_QUERY);

            return $frontendUrl.'?id='.$notifiable->getKey().'&hash='.sha1($notifiable->getEmailForVerification()).'&'.$query;
        });
    }
}
