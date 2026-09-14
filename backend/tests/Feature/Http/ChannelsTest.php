<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Concerns\UsesReverbForChannelTests;

uses(RefreshDatabase::class, UsesReverbForChannelTests::class);

it('signs an authenticated Sanctum user for the private chat channel through Reverb', function () {
    $user = User::factory()->create();

    $response = $this->actingAs($user, 'sanctum')
        ->post('/broadcasting/auth', [
            'channel_name' => 'private-chat',
            'socket_id' => '1234.5678',
        ]);

    $response
        ->assertOk()
        ->assertJsonPath(
            'auth',
            'test-reverb-key:8ee48bf7ba4da3e15f5c50713bf391fb0039f178eeebde3cddfe522beb9d9986',
        );
});

it('rejects an authenticated Sanctum user from an unregistered private channel', function () {
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
        'Origin' => 'https://app.simple-chat.test:8443',
        'Access-Control-Request-Method' => 'POST',
        'Access-Control-Request-Headers' => 'Content-Type, X-XSRF-TOKEN',
    ])->options('/broadcasting/auth')
        ->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', 'https://app.simple-chat.test:8443')
        ->assertHeader('Access-Control-Allow-Credentials', 'true')
        ->assertHeader('Access-Control-Allow-Methods', 'POST')
        ->assertHeader('Access-Control-Allow-Headers', 'Content-Type, X-XSRF-TOKEN');
});
