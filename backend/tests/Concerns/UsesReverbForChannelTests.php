<?php

namespace Tests\Concerns;

use Illuminate\Foundation\Application;

trait UsesReverbForChannelTests
{
    /**
     * @var array<string, string>
     */
    private const REVERB_TEST_ENVIRONMENT = [
        'BROADCAST_CONNECTION' => 'reverb',
        'REVERB_APP_ID' => 'test-reverb-app-id',
        'REVERB_APP_KEY' => 'test-reverb-key',
        'REVERB_APP_SECRET' => 'test-reverb-secret',
        'REVERB_HOST' => 'localhost',
        'REVERB_PORT' => '8080',
        'REVERB_SCHEME' => 'http',
    ];

    public function createApplication(): Application
    {
        $originalEnvironment = $this->setReverbTestEnvironment();

        try {
            return parent::createApplication();
        } finally {
            $this->restoreEnvironment($originalEnvironment);
        }
    }

    /**
     * @return array<string, array{environment: string|false, server: mixed, env: mixed}>
     */
    private function setReverbTestEnvironment(): array
    {
        $originalEnvironment = [];

        foreach (self::REVERB_TEST_ENVIRONMENT as $name => $value) {
            $originalEnvironment[$name] = [
                'environment' => getenv($name),
                'server' => $_SERVER[$name] ?? null,
                'env' => $_ENV[$name] ?? null,
            ];

            putenv("{$name}={$value}");
            $_SERVER[$name] = $value;
            $_ENV[$name] = $value;
        }

        return $originalEnvironment;
    }

    /**
     * @param  array<string, array{environment: string|false, server: mixed, env: mixed}>  $originalEnvironment
     */
    private function restoreEnvironment(array $originalEnvironment): void
    {
        foreach ($originalEnvironment as $name => $value) {
            if ($value['environment'] === false) {
                putenv($name);
            } else {
                putenv("{$name}={$value['environment']}");
            }

            if ($value['server'] === null) {
                unset($_SERVER[$name]);
            } else {
                $_SERVER[$name] = $value['server'];
            }

            if ($value['env'] === null) {
                unset($_ENV[$name]);
            } else {
                $_ENV[$name] = $value['env'];
            }
        }
    }
}
