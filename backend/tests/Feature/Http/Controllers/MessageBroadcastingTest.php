<?php

use App\Events\MessageCreated;
use App\Events\MessageDeleted;
use App\Events\MessageUpdated;
use App\Models\Message;
use App\Models\User;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\Broadcaster;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Broadcast;
use Illuminate\Support\Facades\Event;

uses(RefreshDatabase::class);

it('declares Message events for immediate broadcasting', function () {
    $message = Message::factory()->make();

    expect(new MessageCreated($message))
        ->toBeInstanceOf(ShouldBroadcastNow::class)
        ->and(new MessageUpdated($message))
        ->toBeInstanceOf(ShouldBroadcastNow::class)
        ->and(new MessageDeleted(1))
        ->toBeInstanceOf(ShouldBroadcastNow::class);
});

it(
    'broadcasts a created message synchronously with its complete public payload',
    function () {
        $user = User::factory()->create([
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'username' => 'ada-lovelace',
        ]);

        $broadcastPayload = null;
        $broadcaster = Mockery::mock(Broadcaster::class);
        $broadcaster
            ->shouldReceive('broadcast')
            ->once()
            ->withArgs(function (
                array $channels,
                string $eventName,
                array $payload,
            ) use (&$broadcastPayload): bool {
                $broadcastPayload = $payload;

                return $channels[0] instanceof PrivateChannel &&
                    $channels[0]->name === 'private-chat' &&
                    $eventName === MessageCreated::class;
            });

        Broadcast::extend('recording', fn() => $broadcaster);
        config([
            'broadcasting.default' => 'recording',
            'broadcasting.connections.recording' => ['driver' => 'recording'],
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/messages', [
                'text' => 'Hello, group!',
            ])
            ->assertCreated();

        $message = Message::findOrFail($broadcastPayload['message']['id']);

        expect($broadcastPayload['message'])->toBe([
            'id' => $message->id,
            'userId' => $user->id,
            'text' => 'Hello, group!',
            'createdAt' => $message->created_at?->toISOString(),
            'updatedAt' => $message->updated_at?->toISOString(),
            'user' => [
                'id' => $user->id,
                'firstName' => 'Ada',
                'lastName' => 'Lovelace',
                'username' => 'ada-lovelace',
            ],
        ]);
    },
);

it(
    'broadcasts an updated message synchronously with its complete public payload',
    function () {
        $user = User::factory()->create([
            'first_name' => 'Grace',
            'last_name' => 'Hopper',
            'username' => 'grace-hopper',
        ]);
        $message = Message::factory()
            ->for($user)
            ->create(['text' => 'Original text']);

        $broadcastPayload = null;
        $broadcaster = Mockery::mock(Broadcaster::class);
        $broadcaster
            ->shouldReceive('broadcast')
            ->once()
            ->withArgs(function (
                array $channels,
                string $eventName,
                array $payload,
            ) use (&$broadcastPayload): bool {
                $broadcastPayload = $payload;

                return $channels[0] instanceof PrivateChannel &&
                    $channels[0]->name === 'private-chat' &&
                    $eventName === MessageUpdated::class;
            });

        Broadcast::extend('recording', fn() => $broadcaster);
        config([
            'broadcasting.default' => 'recording',
            'broadcasting.connections.recording' => ['driver' => 'recording'],
        ]);

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/messages/{$message->id}", [
                'text' => 'Edited text',
            ])
            ->assertOk();

        $message = Message::findOrFail($message->id);

        expect($broadcastPayload['message'])->toBe([
            'id' => $message->id,
            'userId' => $user->id,
            'text' => 'Edited text',
            'createdAt' => $message->created_at?->toISOString(),
            'updatedAt' => $message->updated_at?->toISOString(),
            'user' => [
                'id' => $user->id,
                'firstName' => 'Grace',
                'lastName' => 'Hopper',
                'username' => 'grace-hopper',
            ],
        ]);
    },
);

it('broadcasts the identifier of a deleted message', function () {
    $user = User::factory()->create();
    $message = Message::factory()->for($user)->create();

    $broadcaster = Mockery::mock(Broadcaster::class);
    $broadcaster
        ->shouldReceive('broadcast')
        ->once()
        ->withArgs(function (
            array $channels,
            string $eventName,
            array $payload,
        ) use ($message): bool {
            return $channels[0] instanceof PrivateChannel &&
                $channels[0]->name === 'private-chat' &&
                $eventName === MessageDeleted::class &&
                $payload['messageId'] === $message->id;
        });

    Broadcast::extend('recording', fn() => $broadcaster);
    config([
        'broadcasting.default' => 'recording',
        'broadcasting.connections.recording' => ['driver' => 'recording'],
    ]);

    $this->actingAs($user, 'sanctum')
        ->deleteJson("/api/messages/{$message->id}")
        ->assertNoContent();
});

it(
    'does not broadcast failed validation or forbidden message mutations',
    function () {
        Event::fake([
            MessageCreated::class,
            MessageUpdated::class,
            MessageDeleted::class,
        ]);

        $owner = User::factory()->create();
        $otherUser = User::factory()->create();
        $message = Message::factory()->for($owner)->create();

        $this->actingAs($otherUser, 'sanctum')
            ->postJson('/api/messages', [
                'text' => '',
            ])
            ->assertUnprocessable();

        $this->actingAs($otherUser, 'sanctum')
            ->putJson("/api/messages/{$message->id}", [
                'text' => 'Edited text',
            ])
            ->assertForbidden();

        $this->actingAs($otherUser, 'sanctum')
            ->deleteJson("/api/messages/{$message->id}")
            ->assertForbidden();

        Event::assertNotDispatched(MessageCreated::class);
        Event::assertNotDispatched(MessageUpdated::class);
        Event::assertNotDispatched(MessageDeleted::class);
    },
);
