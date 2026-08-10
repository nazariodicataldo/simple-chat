<?php

namespace App\Http\Controllers;

use App\Http\Requests\MessageRequest;
use App\Http\Resources\MessageResource;
use App\Models\Message;
use App\Traits\ApiResponse;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

class MessageController extends Controller
{
    use ApiResponse;

    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        $messages = Message::with('user')
            ->orderByDesc('id')
            ->cursorPaginate(20);

        return self::apiResponse(
            success: true,
            dataOrErrors: MessageResource::collection($messages),
            paginator: $messages,
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(MessageRequest $request): JsonResponse
    {
        $message = Message::create([
            'text' => $request->validated('text'),
            'user_id' => 1,
        ]);

        return self::apiResponse(
            success: true,
            dataOrErrors: new MessageResource($message),
            code: Response::HTTP_CREATED,
        );
    }

    /**
     * Display the specified resource.
     */
    public function show(Message $message): JsonResponse
    {
        return self::apiResponse(
            success: true,
            dataOrErrors: new MessageResource($message),
        );
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(MessageRequest $request, Message $message): JsonResponse
    {
        $message->update($request->validated());

        return self::apiResponse(
            success: true,
            dataOrErrors: new MessageResource($message),
        );
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Message $message): Response
    {
        $message->delete();

        return response()->noContent();
    }
}
