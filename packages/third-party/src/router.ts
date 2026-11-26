import express from 'express';
import { maintenanceMode } from './middlewares/maintenanceMode.js';

// placeholder routes so the service can be deployed to mainnet first. the provider
// integrations (SwapKit) land in follow-up PRs.
const router = express.Router();

router.post('/quote', maintenanceMode, (_req, res) => {
  res.send('ok');
});

router.post('/swap', maintenanceMode, (_req, res) => {
  res.send('ok');
});

router.get('/status/:id', (_req, res) => {
  res.send('ok');
});

export default router;
