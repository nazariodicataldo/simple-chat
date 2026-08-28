<?php

use App\Events\MessageCreated;
use App\Events\MessageDeleted;
use App\Events\MessageUpdated;
use App\Models\Message;
use App\Models\User;
use Illuminate\Broadcasting\BroadcastEvent;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    config([
        'queue.default' => 'database',
        'queue.connections.database.connection' => 'sqlite',
        'queue.connections.database.after_commit' => false,
    ]);

    $this->artisan('migrate:fresh')->run();
});

it('queues each Message broadcast only after the root transaction commits', function (Closure $dispatch) {
    $connection = DB::connection();
    $connection->beginTransaction();

    try {
        $dispatch();

        expect(DB::table('jobs')->count())->toBe(0);

        $connection->commit();

        $job = DB::table('jobs')->sole();
        $payload = json_decode($job->payload, true, flags: JSON_THROW_ON_ERROR);

        expect($payload['data']['commandName'])->toBe(BroadcastEvent::class);
    } finally {
        if ($connection->transactionLevel() > 0) {
            $connection->rollBack();
        }
    }
})->with('message broadcast dispatches');

it('does not queue each Message broadcast when the root transaction rolls back', function (Closure $dispatch) {
    $connection = DB::connection();
    $connection->beginTransaction();

    try {
        $dispatch();

        expect(DB::table('jobs')->count())->toBe(0);

        $connection->rollBack();

        expect(DB::table('jobs')->count())->toBe(0);
    } finally {
        if ($connection->transactionLevel() > 0) {
            $connection->rollBack();
        }
    }
})->with('message broadcast dispatches');

dataset('message broadcast dispatches', [
    'created' => function (): void {
        $message = Message::factory()->for(User::factory())->create();

        MessageCreated::dispatch($message);
    },
    'updated' => function (): void {
        $message = Message::factory()->for(User::factory())->create();
        $message->update(['text' => 'Updated inside transaction']);

        MessageUpdated::dispatch($message->fresh('user'));
    },
    'deleted' => function (): void {
        $message = Message::factory()->for(User::factory())->create();
        $message->delete();

        MessageDeleted::dispatch($message->id);
    },
]);
