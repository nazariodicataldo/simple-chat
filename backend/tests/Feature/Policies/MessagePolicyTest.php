<?php

use App\Models\Message;
use App\Models\User;
use App\Policies\MessagePolicy;

it('allows a user to create a message', function () {
    expect((new MessagePolicy)->create(User::factory()->make()))->toBeTrue();
});

it('allows only the message owner to update or delete it', function () {
    $owner = User::factory()->make(['id' => 1]);
    $otherUser = User::factory()->make(['id' => 2]);
    $message = Message::factory()->make(['user_id' => $owner->id]);
    $policy = new MessagePolicy;

    expect($policy->update($owner, $message))->toBeTrue()
        ->and($policy->delete($owner, $message))->toBeTrue()
        ->and($policy->update($otherUser, $message))->toBeFalse()
        ->and($policy->delete($otherUser, $message))->toBeFalse();
});
