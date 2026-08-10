<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('registers a user, starts a session, and returns the current user', function () {
    $csrfResponse = $this->withHeader('Origin', 'http://localhost:3000')
        ->get('/sanctum/csrf-cookie')
        ->assertNoContent();

    $response = $this->withUnencryptedCookies([
        config('session.cookie') => $csrfResponse->getCookie(config('session.cookie'))->getValue(),
        'XSRF-TOKEN' => $csrfResponse->getCookie('XSRF-TOKEN')->getValue(),
    ])->withCredentials()->withHeader('X-XSRF-TOKEN', urldecode($csrfResponse->getCookie('XSRF-TOKEN')->getValue()))->postJson('/api/register', [
        'first_name' => 'Ada',
        'last_name' => 'Lovelace',
        'email' => 'ada@example.test',
        'username' => 'ada',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.id', 1)
        ->assertJsonPath('data.firstName', 'Ada')
        ->assertJsonPath('data.email', 'ada@example.test')
        ->assertJsonMissingPath('password')
        ->assertJsonPath('message', null)
        ->assertJsonPath('code', 201)
        ->assertJsonStructure(['timestamp']);

    app('auth')->forgetGuards();

    $this->withUnencryptedCookie(config('session.cookie'), $response->getCookie(config('session.cookie'))->getValue())
        ->getJson('/api/user')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.id', 1)
        ->assertJsonPath('data.username', 'ada')
        ->assertJsonPath('message', null)
        ->assertJsonPath('code', 200)
        ->assertJsonStructure(['timestamp']);

    $this->assertDatabaseHas('users', [
        'email' => 'ada@example.test',
        'username' => 'ada',
    ]);
});

it('logs in, logs out, and prevents access after the session ends', function () {
    $user = User::factory()->create([
        'email' => 'ada@example.test',
        'password' => Hash::make('password'),
    ]);

    $csrfResponse = $this->withHeader('Origin', 'http://localhost:3000')
        ->get('/sanctum/csrf-cookie')
        ->assertNoContent();

    $loginResponse = $this->withUnencryptedCookies([
        config('session.cookie') => $csrfResponse->getCookie(config('session.cookie'))->getValue(),
        'XSRF-TOKEN' => $csrfResponse->getCookie('XSRF-TOKEN')->getValue(),
    ])->withCredentials()->withHeader('X-XSRF-TOKEN', urldecode($csrfResponse->getCookie('XSRF-TOKEN')->getValue()))->postJson('/api/login', [
        'email' => $user->email,
        'password' => 'password',
    ])
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('data.email', $user->email)
        ->assertJsonPath('message', null)
        ->assertJsonPath('code', 200)
        ->assertJsonStructure(['timestamp']);

    app('auth')->forgetGuards();

    $this->withUnencryptedCookie(config('session.cookie'), $loginResponse->getCookie(config('session.cookie'))->getValue())
        ->getJson('/api/user')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.id', $user->id)
        ->assertJsonPath('message', null)
        ->assertJsonPath('code', 200)
        ->assertJsonStructure(['timestamp']);

    $this->postJson('/api/logout')
        ->assertNoContent();

    app('auth')->forgetGuards();

    $this->getJson('/api/user')->assertUnauthorized();
});

it('issues the CSRF cookie for the configured SPA origin', function () {
    $this->withHeader('Origin', 'http://localhost:3000')
        ->get('/sanctum/csrf-cookie')
        ->assertNoContent()
        ->assertCookie('XSRF-TOKEN');
});

it('rejects a stateful request that does not include a CSRF token', function () {
    $this->app['env'] = 'local';

    $this->withMiddleware()->withHeader('Origin', 'http://localhost:3000')
        ->postJson('/api/register', [
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'email' => 'ada@example.test',
            'username' => 'ada',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])
        ->assertStatus(419);
});

it('allows credentialed CORS requests from the configured SPA origin', function () {
    $this->withHeaders([
        'Origin' => 'http://localhost:3000',
        'Access-Control-Request-Method' => 'POST',
    ])->options('/api/login')
        ->assertNoContent()
        ->assertHeader('Access-Control-Allow-Origin', 'http://localhost:3000')
        ->assertHeader('Access-Control-Allow-Credentials', 'true');
});

it('rejects unauthenticated auth user and message requests', function () {
    $this->getJson('/api/user')->assertUnauthorized();
    $this->postJson('/api/logout')->assertUnauthorized();
    $this->getJson('/api/messages')->assertUnauthorized();
    $this->postJson('/api/messages', ['text' => 'Hello, group!'])->assertUnauthorized();
});
