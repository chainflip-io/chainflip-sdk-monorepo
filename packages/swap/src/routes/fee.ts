import express from 'express';
import { supportedAsset } from '@/shared/enums';

const router = express.Router();

router.get('/', (req, res) => {
  const { USDC, ...rest } = supportedAsset.enum;
  const assets = Object.fromEntries(
    Object.values(rest).map((asset) => [asset, '0.0015']),
  );

  res.json({ assets, network: '0.001' });
});

export default router;
