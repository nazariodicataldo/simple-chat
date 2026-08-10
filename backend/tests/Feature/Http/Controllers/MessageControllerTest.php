<?php

use App\Models\Message;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('creates a message for the authenticated user and ignores a client user id', function () {
    $user = User::factory()->create();
    $otherUser = User::factory()->create();

    $response = $this->actingAs($user, 'sanctum')->postJson('/api/messages', [
        'text' => 'Hello, group!',
        'user_id' => $otherUser->id,
    ]);

    $response->assertCreated()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.userId', $user->id)
        ->assertJsonPath('data.text', 'Hello, group!')
        ->assertJsonPath('message', null)
        ->assertJsonPath('code', 201)
        ->assertJsonStructure(['timestamp']);

    $this->assertDatabaseHas('messages', [
        'user_id' => $user->id,
        'text' => 'Hello, group!',
    ]);
});

it('validates message text when creating and updating', function () {
    $user = User::factory()->create();
    $message = Message::factory()->for($user)->create();

    $this->actingAs($user, 'sanctum')->postJson('/api/messages', ['text' => str_repeat('a', 301)])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('text');

    $this->actingAs($user, 'sanctum')->putJson("/api/messages/{$message->id}", ['text' => ''])
        ->assertUnprocessable()
        ->assertJsonValidationErrors('text');
});

it('returns cursor-paginated messages in chronological order with public authors', function () {
    $user = User::factory()->create();
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

    $response = $this->actingAs($user, 'sanctum')->getJson('/api/messages')
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

    $nextResponse = $this->actingAs($user, 'sanctum')->getJson('/api/messages?cursor='.$nextCursor)
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $newerMessages->last()->id)
        ->assertJsonPath('pagination.hasMorePages', false);

    $previousCursor = $nextResponse->json('pagination.previousCursor');

    expect($previousCursor)->toBeString()->not->toBeEmpty();

    $this->actingAs($user, 'sanctum')->getJson('/api/messages?cursor='.$previousCursor)
        ->assertOk()
        ->assertJsonCount(20, 'data')
        ->assertJsonPath('data.0.id', $olderMessages->first()->id);
});

it('allows the owner to view, update, and delete a message', function () {
    $user = User::factory()->create();
    $message = Message::factory()->for($user)->create(['text' => 'Original text']);

    $this->actingAs($user, 'sanctum')->getJson("/api/messages/{$message->id}")
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.text', 'Original text')
        ->assertJsonPath('message', null)
        ->assertJsonPath('code', 200)
        ->assertJsonStructure(['timestamp']);

    $this->actingAs($user, 'sanctum')->putJson("/api/messages/{$message->id}", ['text' => 'Edited text'])
        ->assertOk()
        ->assertJsonPath('success', true)
        ->assertJsonPath('data.text', 'Edited text')
        ->assertJsonPath('message', null)
        ->assertJsonPath('code', 200)
        ->assertJsonStructure(['timestamp']);

    $this->actingAs($user, 'sanctum')->deleteJson("/api/messages/{$message->id}")
        ->assertNoContent();

    $this->assertSoftDeleted('messages', ['id' => $message->id]);
});

it('forbids a user from updating or deleting another users message', function () {
    $owner = User::factory()->create();
    $otherUser = User::factory()->create();
    $message = Message::factory()->for($owner)->create();

    $this->actingAs($otherUser, 'sanctum')->putJson("/api/messages/{$message->id}", ['text' => 'Edited text'])
        ->assertForbidden();

    $this->actingAs($otherUser, 'sanctum')->deleteJson("/api/messages/{$message->id}")
        ->assertForbidden();
});
