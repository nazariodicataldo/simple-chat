<?php

namespace Tests\Concerns;

use Illuminate\Broadcasting\BroadcastManager;

trait UsesReverbForChannelTests
{
    /**
     * @var array<string, mixed>
     */
    private const REVERB_TEST_CONFIGURATION = [
        'broadcasting.default' => 'reverb',
        'broadcasting.connections.reverb.key' => 'test-reverb-key',
        'broadcasting.connections.reverb.secret' => 'test-reverb-secret',
        'broadcasting.connections.reverb.app_id' => 'test-reverb-app-id',
        'broadcasting.connections.reverb.options.host' => 'localhost',
        'broadcasting.connections.reverb.options.port' => '8080',
        'broadcasting.connections.reverb.options.scheme' => 'http',
        'broadcasting.connections.reverb.options.useTLS' => false,
    ];

    /**
     * @var array<string, mixed>
     */
    private array $originalReverbTestConfiguration = [];

    protected function setUpUsesReverbForChannelTests(): void
    {
        // Il bootstrap puo' avere gia' letto l'ambiente: il fixture fissa la
        // connessione Reverb dell'istanza di test appena creata.
        foreach (self::REVERB_TEST_CONFIGURATION as $name => $value) {
            $this->originalReverbTestConfiguration[$name] = $this->app['config']->get($name);
            $this->app['config']->set($name, $value);
        }

        // Il bootstrap registra il canale sul driver precedente: lo rigenera
        // con la configurazione fittizia e riusa la dichiarazione applicativa.
        $this->app->make(BroadcastManager::class)->purge('reverb');

        require $this->app->basePath('routes/channels.php');
    }

    protected function tearDownUsesReverbForChannelTests(): void
    {
        // Il ripristino evita che il fixture lasci configurazione condivisa
        // nel ciclo di vita del test corrente.
        foreach ($this->originalReverbTestConfiguration as $name => $value) {
            $this->app['config']->set($name, $value);
        }

        $this->app->make(BroadcastManager::class)->purge('reverb');
        $this->originalReverbTestConfiguration = [];
    }
}
