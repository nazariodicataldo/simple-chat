<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

function horizonConfigurationForAllowedEmails(?string $allowedEmails): array
{
    $originalEnvironmentValue = getenv('HORIZON_ALLOWED_EMAILS');
    $hadEnvironmentValue = array_key_exists('HORIZON_ALLOWED_EMAILS', $_ENV);
    $originalEnvValue = $_ENV['HORIZON_ALLOWED_EMAILS'] ?? null;
    $hadServerValue = array_key_exists('HORIZON_ALLOWED_EMAILS', $_SERVER);
    $originalServerValue = $_SERVER['HORIZON_ALLOWED_EMAILS'] ?? null;

    // Il file di configurazione deve leggere la variabile come durante il bootstrap.
    if ($allowedEmails === null) {
        putenv('HORIZON_ALLOWED_EMAILS');
        unset($_ENV['HORIZON_ALLOWED_EMAILS'], $_SERVER['HORIZON_ALLOWED_EMAILS']);
    } else {
        putenv("HORIZON_ALLOWED_EMAILS={$allowedEmails}");
        $_ENV['HORIZON_ALLOWED_EMAILS'] = $allowedEmails;
        $_SERVER['HORIZON_ALLOWED_EMAILS'] = $allowedEmails;
    }

    try {
        return require config_path('horizon.php');
    } finally {
        $originalEnvironmentValue === false
            ? putenv('HORIZON_ALLOWED_EMAILS')
            : putenv("HORIZON_ALLOWED_EMAILS={$originalEnvironmentValue}");

        if ($hadEnvironmentValue) {
            $_ENV['HORIZON_ALLOWED_EMAILS'] = $originalEnvValue;
        } else {
            unset($_ENV['HORIZON_ALLOWED_EMAILS']);
        }

        if ($hadServerValue) {
            $_SERVER['HORIZON_ALLOWED_EMAILS'] = $originalServerValue;
        } else {
            unset($_SERVER['HORIZON_ALLOWED_EMAILS']);
        }
    }
}

beforeEach(function () {
    $this->app['env'] = 'local';
});

it('rejects a guest from the Horizon dashboard in local', function () {
    config(['horizon.allowed_emails' => ['admin@admin.com']]);

    $this->get('/horizon')->assertForbidden();
});

it('rejects an authenticated user outside the Horizon allow list', function () {
    config(['horizon.allowed_emails' => ['admin@admin.com']]);

    $user = User::factory()->create(['email' => 'user@example.test']);

    $this->actingAs($user)
        ->get('/horizon')
        ->assertForbidden();
});

it('allows an authenticated user in the Horizon allow list', function () {
    $horizonConfiguration = horizonConfigurationForAllowedEmails(' , Admin@Admin.Com , ');

    expect($horizonConfiguration['allowed_emails'])->toBe(['admin@admin.com']);

    config(['horizon.allowed_emails' => $horizonConfiguration['allowed_emails']]);

    $user = User::factory()->create(['email' => ' Admin@Admin.Com ']);

    $this->actingAs($user)
        ->get('/horizon')
        ->assertOk();
});

it('rejects an authenticated user when Horizon allow emails are absent', function () {
    $horizonConfiguration = horizonConfigurationForAllowedEmails(null);

    expect($horizonConfiguration['allowed_emails'])->toBe([]);

    config(['horizon.allowed_emails' => $horizonConfiguration['allowed_emails']]);

    $user = User::factory()->create(['email' => 'admin@admin.com']);

    $this->actingAs($user)
        ->get('/horizon')
        ->assertForbidden();
});
