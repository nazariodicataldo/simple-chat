<?php

use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a message for the placeholder user and ignores a client user id', function () {
    User::factory()->create(['id' => 1]);
    $otherUser = User::factory()->create();

    $response = $this->postJson('/api/messages', [
        'text' => 'Hello, group!',
        'user_id' => $otherUser->id,
    ]);

    $response->assertCreated()
        ->assertJsonPath('data.userId', 1)
        ->assertJsonPath('data.text', 'Hello, group!');

    $this->assertDatabaseHas('messages', [
        'user_id' => 1,
        'text' => 'Hello, group!',
    ]);
});

it('validates message text when creating and updating', function () {
    User::factory()->create(['id' => 1]);
    $message = Message::factory()->create();

    $this->postJson('/api/messages', ['text' => str_repeat('a', 301)])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('text');

    $this->putJson("/api/messages/{$message->id}", ['text' => ''])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('text');
});

it('lists, shows, updates, and soft deletes messages', function () {
    User::factory()->create(['id' => 1]);
    $message = Message::factory()->create(['text' => 'Original text']);
    $deletedMessage = Message::factory()->create();
    $deletedMessage->delete();

    $this->getJson('/api/messages')
        ->assertOk()
        ->assertJsonPath('data.0.id', $message->id)
        ->assertJsonMissing(['id' => $deletedMessage->id]);

    $this->getJson("/api/messages/{$message->id}")
        ->assertOk()
        ->assertJsonPath('data.text', 'Original text');

    $this->putJson("/api/messages/{$message->id}", ['text' => 'Edited text'])
        ->assertOk()
        ->assertJsonPath('data.text', 'Edited text');

    $this->deleteJson("/api/messages/{$message->id}")
        ->assertNoContent();

    $this->assertSoftDeleted('messages', ['id' => $message->id]);
});
