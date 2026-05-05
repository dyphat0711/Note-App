<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Label;
use App\Models\Note;
use App\Policies\LabelPolicy;
use App\Policies\NotePolicy;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Gate;
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

        // Register broadcasting auth route under Sanctum so SPA tokens authenticate
        // private/presence channel subscriptions.
        Broadcast::routes(['middleware' => ['auth:sanctum']]);
    }
}
