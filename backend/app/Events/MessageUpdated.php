<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageUpdated implements ShouldBroadcast
{
    use Dispatchable, SerializesModels;

    public bool $afterCommit = true;

    public function __construct(
        public Message $message,
    ) {}

    public function broadcastOn(): PrivateChannel
    {
        return new PrivateChannel('chat');
    }

    /**
     * @return array{message: array{id: int, userId: int, text: string, createdAt: string|null, updatedAt: string|null, user: array{id: int, firstName: string, lastName: string, username: string}}}
     */
    public function broadcastWith(): array
    {
        return [
            'message' => [
                'id' => $this->message->id,
                'userId' => $this->message->user_id,
                'text' => $this->message->text,
                'createdAt' => $this->message->created_at?->toISOString(),
                'updatedAt' => $this->message->updated_at?->toISOString(),
                'user' => [
                    'id' => $this->message->user->id,
                    'firstName' => $this->message->user->first_name,
                    'lastName' => $this->message->user->last_name,
                    'username' => $this->message->user->username,
                ],
            ],
        ];
    }
}
