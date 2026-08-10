<?php

use App\Http\Resources\MessageResource;
use App\Models\Message;
use App\Models\User;
use Illuminate\Http\Request;

it('returns the message payload in camel case', function () {
    $message = new Message([
        'user_id' => 1,
        'text' => 'Hello, group!',
    ]);
    $message->id = 2;
    $message->created_at = now()->subMinute()->setMicrosecond(0);
    $message->updated_at = now()->setMicrosecond(0);
    $message->deleted_at = now()->setMicrosecond(0);

    $payload = (new MessageResource($message))->resolve(Request::create('/'));

    expect($payload)
        ->toEqual([
            'id' => 2,
            'userId' => 1,
            'text' => 'Hello, group!',
            'createdAt' => $message->created_at,
            'updatedAt' => $message->updated_at,
            'deletedAt' => $message->deleted_at,
        ]);
});

it('includes the public user only when the relation is loaded', function () {
    $user = new User([
        'first_name' => 'Ada',
        'last_name' => 'Lovelace',
        'email' => 'ada@example.test',
        'username' => 'ada-lovelace',
    ]);
    $user->id = 1;

    $message = new Message([
        'user_id' => $user->id,
        'text' => 'Hello, group!',
    ]);
    $message->id = 2;
    $message->setRelation('user', $user);

    $response = (new MessageResource($message))
        ->response(Request::create('/'))
        ->getData(true);

    expect($response['data'])
        ->toMatchArray([
            'user' => [
                'id' => 1,
                'firstName' => 'Ada',
                'lastName' => 'Lovelace',
                'email' => 'ada@example.test',
                'username' => 'ada-lovelace',
                'emailVerifiedAt' => null,
                'createdAt' => null,
                'updatedAt' => null,
            ],
        ]);
});
