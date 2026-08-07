<?php

use App\Http\Resources\MessageResource;
use App\Models\Message;
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

    expect((new MessageResource($message))->toArray(Request::create('/')))
        ->toEqual([
            'id' => 2,
            'userId' => 1,
            'text' => 'Hello, group!',
            'createdAt' => $message->created_at,
            'updatedAt' => $message->updated_at,
            'deletedAt' => $message->deleted_at,
        ]);
});
