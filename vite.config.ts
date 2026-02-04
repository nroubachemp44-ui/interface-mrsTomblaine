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

            // Auto-commit and push mechanism
            // We use 'git' commands directly. Note: This assumes git is available in PATH.
            exec('git add database.json && git commit -m "Auto-update database.json from Kiosk" && git push', (error, stdout, stderr) => {
              if (error) {
                console.warn('[Auto-Sync] Git commit/push failed (likely offline or no changes):', error.message);
                // We do NOT return an error to the client, because local save succeeded.
                // If the error is just "nothing to commit", it's fine.
                // If it's a network error, we just wait for the next save to try pushing again.
              } else {
                console.log('[Auto-Sync] Successfully committed and pushed changes.');
              }
            });

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

      if (req.url === '/api/db/version' && req.method === 'GET') {
        try {
          if (fs.existsSync(dbPath)) {
            const stats = fs.statSync(dbPath);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ version: stats.mtimeMs }));
          } else {
            res.statusCode = 200;
            res.end(JSON.stringify({ version: 0 }));
          }
        } catch (e) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: 'Failed to get version' }));
        }
        return;
      }

      next();
    });

    // Background Auto-Sync: Attempt to push every 60 seconds
    // This handles cases where the kiosk was offline during usage.
    setInterval(() => {
      exec('git push', (error, stdout, stderr) => {
        // Only log if it's not just "Everything up to date" to generate less noise
        // Note: 'git push' usually prints "Everything up to date" to stderr/stdout depending on version/config, but we can just ignore errors safely.
        if (!error && !stderr.includes('Everything up to date') && !stdout.includes('Everything up to date')) {
          // If meaningful output exists
          console.log('[Background Sync] Git push attempted.');
        }
      });
    }, 60000); // Check every 60 seconds
  }
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      host: '0.0.0.0',
      allowedHosts: true,
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
