<?php

namespace App\Traits;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Pagination\CursorPaginator;

trait ApiResponse
{
    /**
     * Return the standard API response payload.
     */
    public static function apiResponse(
        bool $success,
        mixed $dataOrErrors = null,
        int $code = 200,
        ?string $message = null,
        ?CursorPaginator $paginator = null,
    ): JsonResponse {
        $data = $dataOrErrors instanceof JsonResource
            ? $dataOrErrors->resolve()
            : $dataOrErrors;

        $payload = [
            'success' => $success,
            $success ? 'data' : 'errors' => $data,
            'timestamp' => now()->format('Y-m-d H:i:s'),
            'message' => $message,
            'code' => $code,
        ];

        if ($success && $paginator instanceof CursorPaginator) {
            $payload['pagination'] = [
                'nextCursor' => $paginator->nextCursor()?->encode(),
                'previousCursor' => $paginator->previousCursor()?->encode(),
                'hasMorePages' => $paginator->hasMorePages(),
                'perPage' => $paginator->perPage(),
            ];
        }

        return response()->json($payload, $code);
    }
}
