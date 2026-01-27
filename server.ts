import 'dotenv/config';
import { createServer as createHttpServer } from 'http';
import { createServer as createHttpsServer } from 'https';
import { parse } from 'url';
import next from 'next';
import fs from 'fs';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const httpPort = 80;
const httpsPort = 443;

// Environment variables for SSL paths
const sslKeyPath = process.env.SSL_KEY_PATH || '/data/certificates/key.pem';
const sslCertPath = process.env.SSL_CERT_PATH || '/data/certificates/cert.pem';

const app = next({ dev, hostname, port: httpPort });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  // HTTP Server (Port 80)
  createHttpServer(async (req, res) => {
    try {
      // @ts-ignore
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).listen(httpPort, () => {
    console.log(`> HTTP Ready on http://${hostname}:${httpPort}`);
  });

  // HTTPS Server (Port 443)
  if (fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)) {
    const httpsOptions = {
        key: fs.readFileSync(sslKeyPath),
        cert: fs.readFileSync(sslCertPath),
    };
    createHttpsServer(httpsOptions, async (req, res) => {
        try {
        // @ts-ignore
        const parsedUrl = parse(req.url, true);
        await handle(req, res, parsedUrl);
        } catch (err) {
        console.error('Error occurred handling', req.url, err);
        res.statusCode = 500;
        res.end('internal server error');
        }
    }).listen(httpsPort, () => {
        console.log(`> HTTPS Ready on https://${hostname}:${httpsPort}`);
    });
  } else {
    console.warn("SSL certificates not found, skipping HTTPS server.");
  }
});
