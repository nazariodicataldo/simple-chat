<?php

namespace Tests\Fixtures;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use RuntimeException;

class M3FailureTestJob implements ShouldQueue
{
    use Queueable;

    public string $marker;

    public function __construct()
    {
        $this->onConnection('redis');
        $this->onQueue('m3-failure-test');
        $this->marker = 'm3-failure-test-'.fake()->uuid();
    }

    public function handle(): never
    {
        throw new RuntimeException("M3 failure test job failed: {$this->marker}");
    }
}
