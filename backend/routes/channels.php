<?php

use App\Models\User;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('chat', fn (User $user): bool => true, ['guards' => ['sanctum']]);
