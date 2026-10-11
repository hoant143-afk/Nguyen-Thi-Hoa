import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, Plugin } from 'vite';

function appsScriptDevProxyPlugin(): Plugin {
  return {
    name: 'apps-script-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/apps-script', async (req: any, res: any) => {
        try {
          const { default: handler } = await import('./api/apps-script');

          // Parse query if missing in connect middleware
          if (!req.query && req.url) {
            const parsedUrl = new URL(req.url, 'http://localhost:3000');
            req.query = Object.fromEntries(parsedUrl.searchParams.entries());
          }

          // Polyfill express-like res helpers if needed
          res.status = (statusCode: number) => {
            res.statusCode = statusCode;
            return res;
          };
          res.json = (data: any) => {
            res.setHeader('Content-Type', 'application/json;charset=utf-8');
            res.end(JSON.stringify(data));
            return res;
          };

          await handler(req, res);
        } catch (err: any) {
          console.error('Vite dev proxy error:', err);
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: 'DEV_PROXY_ERROR', message: err?.message }));
        }
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), appsScriptDevProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      strictPort: true,
      allowedHosts: true as const,
    },
  };
});
