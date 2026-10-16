import vinext from 'vinext';
import { defineConfig } from 'vite';
import hosting from './.openai/hosting.json';
import { sites } from './hosting/build/sites-vite-plugin';

export default defineConfig(async () => {
  process.env.CLOUDFLARE_CF_FETCH_ENABLED ??= 'false';
  process.env.WRANGLER_SEND_METRICS ??= 'false';
  process.env.WRANGLER_WRITE_LOGS ??= 'false';
  const { cloudflare } = await import('@cloudflare/vite-plugin');
  return {
    publicDir: 'sites-public',
    plugins: [
      vinext(),
      sites({ mockAuth: false }),
      cloudflare({
        viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] },
        inspectorPort: false,
        config: {
          main: './hosting/worker.ts',
          compatibility_date: '2026-05-15',
          compatibility_flags: ['nodejs_compat'],
          assets: { binding: 'ASSETS', run_worker_first: true },
          d1_databases: [{ binding: hosting.d1, database_name: 'itsme-preview', database_id: '00000000-0000-4000-8000-000000000000' }],
        },
      }),
    ],
  };
});
