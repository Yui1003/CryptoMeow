// Windows-compatible server for CryptoMeow
import express from 'express';
import { registerRoutes } from './server/routes.js';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add CORS for local development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Setup routes
const server = await registerRoutes(app);

// Serve static files for production
if (process.env.NODE_ENV !== 'development') {
  app.use(express.static('dist'));
  app.get('*', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  });
}

// Start server on localhost for Windows compatibility
const port = 5000;
server.listen(port, 'localhost', () => {
  console.log(`🎰 CryptoMeow Casino running on http://localhost:${port}`);
  console.log(`🐱 Admin login: username=admin, password=admin1234`);
});