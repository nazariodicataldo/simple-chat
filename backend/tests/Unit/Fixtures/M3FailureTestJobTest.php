<?php

use Illuminate\Contracts\Queue\ShouldQueue;
use RuntimeException;
use Tests\Fixtures\M3FailureTestJob;

test('the M3 failure fixture is a dedicated Redis queued job and always fails with its marker', function () {
    $job = new M3FailureTestJob;

    expect($job)
        ->toBeInstanceOf(ShouldQueue::class)
        ->and($job->connection)->toBe('redis')
        ->and($job->queue)->toBe('m3-failure-test')
        ->and($job->marker)->toMatch('/^m3-failure-test-[0-9a-f-]{36}$/');

    expect(fn () => $job->handle())
        ->toThrow(RuntimeException::class, "M3 failure test job failed: {$job->marker}");
});
