<?php

declare(strict_types=1);

namespace App\Providers;

use App\Models\Label;
use App\Models\Note;
use App\Policies\LabelPolicy;
use App\Policies\NotePolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Explicitly register policies for auto-discovery clarity
        Gate::policy(Note::class, NotePolicy::class);
        Gate::policy(Label::class, LabelPolicy::class);
    }
}
