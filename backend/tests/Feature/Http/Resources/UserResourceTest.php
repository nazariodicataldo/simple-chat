<?php

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

it('returns the public user payload in camel case', function () {
    $user = new User([
        'first_name' => 'Ada',
        'last_name' => 'Lovelace',
        'email' => 'ada@example.test',
        'username' => 'ada-lovelace',
        'password' => 'secret-password',
    ]);
    $user->id = 1;
    $user->email_verified_at = now()->setMicrosecond(0);
    $user->created_at = now()->subDay()->setMicrosecond(0);
    $user->updated_at = now()->setMicrosecond(0);

    expect((new UserResource($user))->toArray(Request::create('/')))
        ->toEqual([
            'id' => 1,
            'firstName' => 'Ada',
            'lastName' => 'Lovelace',
            'email' => 'ada@example.test',
            'username' => 'ada-lovelace',
            'emailVerifiedAt' => $user->email_verified_at,
            'createdAt' => $user->created_at,
            'updatedAt' => $user->updated_at,
        ])
        ->not->toHaveKey('password');
});

it('makes users with the chat identity attributes', function () {
    $user = User::factory()->make();

    expect($user->first_name)->toBeString()->not->toBeEmpty()
        ->and($user->last_name)->toBeString()->not->toBeEmpty()
        ->and($user->username)->toBeString()->not->toBeEmpty()
        ->and($user->getAttributes())->not->toHaveKey('name');
});
