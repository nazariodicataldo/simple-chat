<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('authorizes an authenticated Sanctum user for the private chat channel', function () {
    config([
        'broadcasting.default' => 'redis',
        'broadcasting.connections.redis' => ['driver' => 'redis'],
    ]);

    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->post('/broadcasting/auth', [
            'channel_name' => 'private-chat',
            'socket_id' => '1234.5678',
        ])
        ->assertOk()
        ->assertContent('true');
})->skip(
    'The Pusher/Reverb authorization response format is verified in M2-003 after configuring the real driver.',
);

it('rejects an authenticated Sanctum user from an unregistered private channel', function () {
    config([
        'broadcasting.default' => 'redis',
        'broadcasting.connections.redis' => ['driver' => 'redis'],
    ]);

    $user = User::factory()->create();

    $this->actingAs($user, 'sanctum')
        ->post('/broadcasting/auth', [
            'channel_name' => 'private-other-chat',
            'socket_id' => '1234.5678',
        ])
        ->assertForbidden();
});

it('rejects a guest from the private chat channel authorization endpoint', function () {
    $this->post('/broadcasting/auth', [
        'channel_name' => 'private-chat',
        'socket_id' => '1234.5678',
    ])->assertUnauthorized();
});

it('allows credentialed CORS preflight requests for channel authorization', function () {
    $this->withHeaders([
        'Origin' => 'http://app.simple-chat.test:3000',
        'Access-Control-Request-Method' => 'POST',
        'Access-Control-Request-Headers' => 'Content-Type, X-XSRF-TOKEN',
    ])->options('/broadcasting/auth')
        ->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', 'http://app.simple-chat.test:3000')
        ->assertHeader('Access-Control-Allow-Credentials', 'true')
        ->assertHeader('Access-Control-Allow-Methods', 'POST')
        ->assertHeader('Access-Control-Allow-Headers', 'Content-Type, X-XSRF-TOKEN');
});
