import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import { exec } from 'child_process';

// Custom plugin to handle local persistence and remote updates
const persistencePlugin = () => ({
  name: 'persistence-plugin',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const dbPath = path.resolve(__dirname, 'database.json');

      if (req.url === '/api/db/save' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            fs.writeFileSync(dbPath, body);
            res.statusCode = 200;
            res.end(JSON.stringify({ success: true }));
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: 'Failed to save data' }));
          }
        });
        return;
      }

      if (req.url === '/api/db/load' && req.method === 'GET') {
        try {
          if (fs.existsSync(dbPath)) {
            const data = fs.readFileSync(dbPath, 'utf-8');
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(data);
          } else {
            res.statusCode = 404;
            res.end(JSON.stringify({ error: 'Database not found' }));
          }
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to load data' }));
        }
        return;
      }

      // Handle remote git update
      if (req.url === '/api/update-code' && req.method === 'POST') {
        console.log('Starting remote update...');
        // Execute git pull origin main followed by npm install
        exec('git pull origin main && npm install', (error, stdout, stderr) => {
          if (error) {
            console.error(`Update error: ${error}`);
            res.statusCode = 500;
            res.end(JSON.stringify({ error: error.message, details: stderr }));
            return;
          }
          console.log(`Update success: ${stdout}`);
          res.statusCode = 200;
          res.end(JSON.stringify({ success: true, output: stdout }));

          // Trigger a server restart/reload hint if needed - 
          // Vite HMR will pick up changes, but for full reload:
          setTimeout(() => {
            console.log('Update complete. Changes should be live via HMR.');
          }, 1000);
        });
        return;
      }

      next();
    });
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react(), persistencePlugin()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
