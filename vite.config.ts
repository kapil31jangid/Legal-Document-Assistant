/// <reference types="vitest" />
import { defineConfig, Plugin } from 'vite';

function viteApiDevPlugin(): Plugin {
  return {
    name: 'vite-api-dev-middleware',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url && req.url.startsWith('/api/')) {
          const apiName = req.url.replace('/api/', '').split('?')[0];
          try {
            const module = await import(`./api/${apiName}.ts`);
            if (module && module.default) {
              let body = {};
              if (req.method === 'POST') {
                const buffers: Uint8Array[] = [];
                for await (const chunk of req) {
                  buffers.push(chunk);
                }
                const raw = Buffer.concat(buffers).toString('utf-8');
                try {
                  body = JSON.parse(raw);
                } catch {}
              }

              const origSetHeader = res.setHeader.bind(res);
              const vercelReq: any = Object.assign(req, { body });
              const vercelRes: any = Object.assign(res, {
                status(code: number) {
                  res.statusCode = code;
                  return vercelRes;
                },
                setHeader(name: string, value: string) {
                  origSetHeader(name, value);
                  return vercelRes;
                },
                json(data: any) {
                  origSetHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify(data));
                  return vercelRes;
                },
                send(data: any) {
                  res.end(data);
                  return vercelRes;
                },
              });

              await module.default(vercelReq, vercelRes);
              return;
            }
          } catch (err: any) {
            console.error(`Local dev API middleware error on /api/${apiName}:`, err);
          }
        }
        next();
      });
    },
  };
}

export default defineConfig({
  server: {
    hmr: {
      overlay: false,
    },
  },
  plugins: [viteApiDevPlugin()],
  test: {
    globals: true,
    environment: 'node',
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/pdfjs-dist')) {
            return 'pdfjs-vendor';
          }
          if (id.includes('node_modules/mammoth')) {
            return 'mammoth-vendor';
          }
          if (id.includes('node_modules/@google/generative-ai')) {
            return 'genai-vendor';
          }
        },
      },
    },
  },
});
