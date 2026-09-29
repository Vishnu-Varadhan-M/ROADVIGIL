/**
 * DriveGuard AI — Fullstack Server
 * Express REST API + WebSocket Server + Vite Middleware
 */

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { apiRouter } from './src/server/api';
import { db } from './src/db/inMemoryDb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const PORT = process.env.PORT || 3000;

  // JSON Body Parser & CORS
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // Mount REST API
  app.use('/api', apiRouter);

  // WebSocket Server for Real-Time Telemetry & Fleet Escalation
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const fleetSockets = new Set<WebSocket>();

  wss.on('connection', (ws: WebSocket) => {
    ws.on('message', (rawMessage: string) => {
      try {
        const data = JSON.parse(rawMessage.toString());

        if (data.type === 'SUBSCRIBE_FLEET') {
          fleetSockets.add(ws);
          ws.send(JSON.stringify({ type: 'SUBSCRIBED', role: 'FLEET_ADMIN' }));
        } else if (data.type === 'DRIVER_TELEMETRY') {
          // Update in-memory active trip state
          const { tripId, metrics, riskResult } = data;
          if (tripId) {
            const trip = db.trips.find(t => t.id === tripId);
            if (trip) {
              trip.currentSafetyScore = riskResult.safetyScore;
              trip.currentRiskLevel = riskResult.riskLevel;
              trip.minSafetyScore = Math.min(trip.minSafetyScore, riskResult.safetyScore);
              trip.durationSeconds += 1;
            }
          }

          // Broadcast to connected fleet managers in real time
          const payload = JSON.stringify({
            type: 'FLEET_TELEMETRY_UPDATE',
            data
          });

          fleetSockets.forEach(client => {
            if (client.readyState === WebSocket.OPEN && client !== ws) {
              client.send(payload);
            }
          });
        } else if (data.type === 'CRITICAL_SAFETY_ALERT') {
          // Emergency alert pushed from vehicle
          const event = db.addSafetyEvent(data.event);
          const alertPayload = JSON.stringify({
            type: 'EMERGENCY_DISPATCH_ALERT',
            event
          });

          fleetSockets.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              client.send(alertPayload);
            }
          });
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      fleetSockets.delete(ws);
    });
  });

  // Mount Vite or Static Production build
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, () => {
    console.log(`[DriveGuard AI] Engine online at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start DriveGuard AI server:', err);
  process.exit(1);
});
