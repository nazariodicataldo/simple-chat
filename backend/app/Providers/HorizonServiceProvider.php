<?php

namespace App\Providers;

use Laravel\Horizon\Horizon;
use Laravel\Horizon\HorizonApplicationServiceProvider;

class HorizonServiceProvider extends HorizonApplicationServiceProvider
{
    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        parent::boot();

        // Horizon::routeSmsNotificationsTo('15556667777');
        // Horizon::routeMailNotificationsTo('example@example.com');
        // Horizon::routeSlackNotificationsTo('slack-webhook-url', '#channel');

        // Sostituisce il fallback locale di Horizon con la regola esplicita del progetto.
        Horizon::auth(function ($request): bool {
            $user = $request->user();

            if (! $user) {
                return false;
            }

            $email = strtolower(trim((string) $user->email));

            return in_array($email, config('horizon.allowed_emails', []), true);
        });
    }
}
