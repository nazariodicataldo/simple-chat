<?php

use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('belongs to its user and is included in the user messages', function () {
    $message = Message::factory()->create();

    expect($message->user)->toBeInstanceOf(User::class)
        ->and($message->user->messages->modelKeys())->toContain($message->id);
});

it('soft deletes messages', function () {
    $message = Message::factory()->create();

    $message->delete();

    $this->assertSoftDeleted('messages', ['id' => $message->id]);
});
