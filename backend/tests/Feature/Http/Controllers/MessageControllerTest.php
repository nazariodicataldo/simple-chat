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
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.userId', 1)
        ->assertJsonPath('data.text', 'Hello, group!')
        ->assertJsonPath('message', null)
        ->assertJsonPath('code', 201)
        ->assertJsonStructure(['timestamp']);

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

it('returns cursor-paginated recent messages with their public authors', function () {
    User::factory()->create(['id' => 1]);
    $author = User::factory()->create([
        'first_name' => 'Ada',
        'last_name' => 'Lovelace',
        'username' => 'ada-lovelace',
    ]);
    $messages = Message::factory()->count(21)->for($author)->create();

    $response = $this->getJson('/api/messages')
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonCount(20, 'data')
        ->assertJsonPath('data.0.id', $messages->last()->id)
        ->assertJsonPath('data.0.user.id', $author->id)
        ->assertJsonPath('data.0.user.firstName', 'Ada')
        ->assertJsonPath('pagination.perPage', 20)
        ->assertJsonPath('pagination.hasMorePages', true)
        ->assertJsonPath('code', 200);

    $nextCursor = $response->json('pagination.nextCursor');

    expect($nextCursor)->toBeString()->not->toBeEmpty();

    $this->getJson('/api/messages?cursor='.$nextCursor)
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $messages->first()->id)
        ->assertJsonPath('pagination.hasMorePages', false);
});

it('wraps show and update responses while keeping destroy empty', function () {
    User::factory()->create(['id' => 1]);
    $message = Message::factory()->create(['text' => 'Original text']);

    $this->getJson("/api/messages/{$message->id}")
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.text', 'Original text')
        ->assertJsonPath('code', 200);

    $this->putJson("/api/messages/{$message->id}", ['text' => 'Edited text'])
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.text', 'Edited text')
        ->assertJsonPath('code', 200);

    $this->deleteJson("/api/messages/{$message->id}")
        ->assertNoContent();

    $this->assertSoftDeleted('messages', ['id' => $message->id]);
});
