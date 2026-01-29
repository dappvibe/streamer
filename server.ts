import 'dotenv/config';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { telegramBotModule } from './src/services/telegram';
import { parse } from 'url';
import next from 'next';
import fs from 'fs';

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const httpPort = 80;
const httpsPort = 443;

// Environment variables for SSL paths
const sslKeyPath = process.env.SSL_KEY_PATH || '/app/data/certificates/key.pem';
const sslCertPath = process.env.SSL_CERT_PATH || '/app/data/certificates/cert.pem';

const app = next({ dev, hostname, port: httpPort });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const requestHandler = async (req: any, res: any) => {
    try {
      const parsedUrl = parse(req.url!, true);
      const { pathname } = parsedUrl;

      // Bot Routes (available on both HTTP and HTTPS)
      if (pathname === '/bot/telegramUpdate' && req.method === 'POST') {
        await telegramBotModule.webhookHandler.handleRequest(req, res);
        return;
      }
      if (pathname === '/bot/chatlog' && req.method === 'GET') {
        telegramBotModule.chatRelay.handleChatRequest(req, res);
        return;
      }

      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  };

  // HTTP Server (Port 80)
  createHttpServer(requestHandler).listen(httpPort, () => {
    console.log(`> HTTP Ready on http://${hostname}:${httpPort}`);
  });

  // HTTPS Server (Port 443)
  if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    const httpsOptions = {
      key: fs.readFileSync(sslKeyPath),
      cert: fs.readFileSync(sslCertPath),
    };
    createHttpsServer(httpsOptions, requestHandler).listen(httpsPort, () => {
      console.log(`> HTTPS Ready on https://${hostname}:${httpsPort}`);
    });
  } else {
    console.warn("SSL certificates not found, skipping HTTPS server.");
  }
});
