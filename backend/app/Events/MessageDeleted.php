<?php

namespace App\Events;

use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageDeleted implements ShouldBroadcastNow
{
    use Dispatchable, SerializesModels;

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
