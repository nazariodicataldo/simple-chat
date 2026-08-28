<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageDeleted implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public bool $afterCommit = true;

    public function __construct(
        public int $messageId,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('chat');
    }

    /**
     * @return array{messageId: int}
     */
    public function broadcastWith(): array
    {
        return ['messageId' => $this->messageId];
    }
}
