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

it('returns cursor-paginated messages in chronological order with public authors', function () {
    User::factory()->create(['id' => 1]);
    $olderAuthor = User::factory()->create([
        'first_name' => 'Ada',
        'last_name' => 'Lovelace',
        'username' => 'ada-lovelace',
    ]);
    $newerAuthor = User::factory()->create([
        'first_name' => 'Grace',
        'last_name' => 'Hopper',
        'username' => 'grace-hopper',
    ]);
    $olderMessages = Message::factory()->count(10)->for($olderAuthor)->create();
    $newerMessages = Message::factory()->count(11)->for($newerAuthor)->create();

    $response = $this->getJson('/api/messages')
        ->assertOk()
        ->assertJsonStructure([
            'success',
            'data',
            'timestamp',
            'message',
            'code',
            'pagination' => [
                'nextCursor',
                'previousCursor',
                'hasMorePages',
                'perPage',
            ],
        ])
        ->assertJsonPath('success', true)
        ->assertJsonCount(20, 'data')
        ->assertJsonPath('data.0.id', $olderMessages->first()->id)
        ->assertJsonPath('data.0.user.id', $olderAuthor->id)
        ->assertJsonPath('data.0.user.firstName', 'Ada')
        ->assertJsonPath('data.10.user.id', $newerAuthor->id)
        ->assertJsonPath('data.10.user.firstName', 'Grace')
        ->assertJsonMissing(['email' => $olderAuthor->email])
        ->assertJsonMissing(['email' => $newerAuthor->email])
        ->assertJsonPath('message', null)
        ->assertJsonPath('pagination.perPage', 20)
        ->assertJsonPath('pagination.previousCursor', null)
        ->assertJsonPath('pagination.hasMorePages', true)
        ->assertJsonPath('code', 200);

    $nextCursor = $response->json('pagination.nextCursor');

    expect($nextCursor)->toBeString()->not->toBeEmpty();

    $nextResponse = $this->getJson('/api/messages?cursor='.$nextCursor)
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $newerMessages->last()->id)
        ->assertJsonPath('pagination.hasMorePages', false);

    $previousCursor = $nextResponse->json('pagination.previousCursor');

    expect($previousCursor)->toBeString()->not->toBeEmpty();

    $this->getJson('/api/messages?cursor='.$previousCursor)
        ->assertOk()
        ->assertJsonCount(20, 'data')
        ->assertJsonPath('data.0.id', $olderMessages->first()->id);
});

it('wraps show and update responses while keeping destroy empty', function () {
    User::factory()->create(['id' => 1]);
    $message = Message::factory()->create(['text' => 'Original text']);

    $this->getJson("/api/messages/{$message->id}")
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.text', 'Original text')
        ->assertJsonPath('message', null)
        ->assertJsonPath('code', 200)
        ->assertJsonStructure(['timestamp']);

    $this->putJson("/api/messages/{$message->id}", ['text' => 'Edited text'])
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.text', 'Edited text')
        ->assertJsonPath('message', null)
        ->assertJsonPath('code', 200)
        ->assertJsonStructure(['timestamp']);

    $this->deleteJson("/api/messages/{$message->id}")
        ->assertNoContent();

    $this->assertSoftDeleted('messages', ['id' => $message->id]);
});
