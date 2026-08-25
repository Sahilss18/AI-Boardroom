import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { router } from './routes.js';
import { registerWebSocketConnection } from './websocket-gateway.js';
import { checkConnection } from '@reflection-ai/database';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import fs from 'fs';

// Load .env from root workspace
let envPath = path.resolve(__dirname, '../../../.env');
if (!fs.existsSync(envPath)) {
  envPath = path.resolve(__dirname, '../../../../.env');
}
dotenv.config({ path: envPath });

export async function buildApp() {
  const fastify = Fastify({
    logger: true,
    bodyLimit: 1048576 * 100, // 100MB limit for PDF / PPTX base64 uploads
  });

  // Register CORS
  await fastify.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  });

  // Register Websockets
  await fastify.register(websocket);

  // Register REST endpoints
  await fastify.register(router);

  // Register WebSocket Gateway
  fastify.get('/ws/sessions/:sessionId', { websocket: true }, (connection, req) => {
    registerWebSocketConnection(connection, req);
  });

  // Diagnostic route
  fastify.get('/health', async () => {
    const isDbConnected = await checkConnection();
    return {
      status: 'OK',
      database: isDbConnected ? 'connected' : 'disconnected',
      time: new Date().toISOString(),
    };
  });

  return fastify;
}
