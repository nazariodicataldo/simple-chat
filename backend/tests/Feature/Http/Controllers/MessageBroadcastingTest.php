<?php

use App\Events\MessageCreated;
use App\Events\MessageDeleted;
use App\Events\MessageUpdated;
use App\Models\Message;
use App\Models\User;
use Illuminate\Broadcasting\BroadcastEvent;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Queue;

uses(RefreshDatabase::class);

it('declares Message events for queued broadcasting after commit', function () {
    $message = Message::factory()->make();

    expect(new MessageCreated($message))
        ->toBeInstanceOf(ShouldBroadcast::class)
        ->and(new MessageCreated($message)->afterCommit)
        ->toBeTrue()
        ->and(new MessageUpdated($message))
        ->toBeInstanceOf(ShouldBroadcast::class)
        ->and(new MessageUpdated($message)->afterCommit)
        ->toBeTrue()
        ->and(new MessageDeleted(1))
        ->toBeInstanceOf(ShouldBroadcast::class)
        ->and(new MessageDeleted(1)->afterCommit)
        ->toBeTrue();
});

it(
    'queues exactly one created message broadcast with its complete public payload',
    function () {
        $user = User::factory()->create([
            'first_name' => 'Ada',
            'last_name' => 'Lovelace',
            'username' => 'ada-lovelace',
        ]);

        Queue::fake();

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/messages', [
                'text' => 'Hello, group!',
            ])
            ->assertCreated();

        $message = Message::firstOrFail();

        Queue::assertPushed(BroadcastEvent::class, 1);

        Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) use ($message, $user): bool {
            $event = $job->event;
            $channels = $event->broadcastOn();

            return get_class($event) === MessageCreated::class &&
                $job->afterCommit === true &&
                $channels instanceof PrivateChannel &&
                $channels->name === 'private-chat' &&
                $event->broadcastWith()['message'] === [
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
                ];
        });
    },
);

it(
    'queues exactly one updated message broadcast with its complete public payload',
    function () {
        $user = User::factory()->create([
            'first_name' => 'Grace',
            'last_name' => 'Hopper',
            'username' => 'grace-hopper',
        ]);
        $message = Message::factory()
            ->for($user)
            ->create(['text' => 'Original text']);

        Queue::fake();

        $this->actingAs($user, 'sanctum')
            ->putJson("/api/messages/{$message->id}", [
                'text' => 'Edited text',
            ])
            ->assertOk();

        $message = Message::findOrFail($message->id);

        Queue::assertPushed(BroadcastEvent::class, 1);

        Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) use ($message, $user): bool {
            $event = $job->event;
            $channels = $event->broadcastOn();

            return get_class($event) === MessageUpdated::class &&
                $job->afterCommit === true &&
                $channels instanceof PrivateChannel &&
                $channels->name === 'private-chat' &&
                $event->broadcastWith()['message'] === [
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
                ];
        });
    },
);

it('queues exactly one deleted message broadcast with its identifier', function () {
    $user = User::factory()->create();
    $message = Message::factory()->for($user)->create();

    Queue::fake();

    $this->actingAs($user, 'sanctum')
        ->deleteJson("/api/messages/{$message->id}")
        ->assertNoContent();

    Queue::assertPushed(BroadcastEvent::class, 1);

    Queue::assertPushed(BroadcastEvent::class, function (BroadcastEvent $job) use ($message): bool {
        $event = $job->event;
        $channels = $event->broadcastOn();

        return get_class($event) === MessageDeleted::class &&
            $job->afterCommit === true &&
            $channels instanceof PrivateChannel &&
            $channels->name === 'private-chat' &&
            $event->broadcastWith() === ['messageId' => $message->id];
    });
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
