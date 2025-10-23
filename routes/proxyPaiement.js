import express from 'express';
import axios from 'axios';

const router = express.Router();

// External API host (can be overridden via ENV)
const EXTERNAL_HOST = process.env.EXTERNAL_PAIEMENT_HOST || 'http://89.117.59.239:30082';

async function forward(req, res, path) {
  try {
    const url = `${EXTERNAL_HOST}${path}`;
    // Forward API-TOKEN header if present
  const headers = {};
  // Prefer API-TOKEN provided by client, else fall back to server-side partner token.
    const clientToken = req.headers['api-token'] || req.headers['API-TOKEN'] || req.headers['x-api-token'];
    if (clientToken) {
      headers['API-TOKEN'] = clientToken;
      console.info(`[proxyPaiement] using client-provided API-TOKEN for path=${path}`);
    } else if (process.env.PARTNER_API_TOKEN) {
      headers['API-TOKEN'] = process.env.PARTNER_API_TOKEN;
      console.info(`[proxyPaiement] using server PARTNER_API_TOKEN for path=${path}`);
    } else {
      console.info(`[proxyPaiement] no API-TOKEN available for path=${path}`);
    }
  // Also forward Authorization header if present
  if (req.headers['authorization']) headers['Authorization'] = req.headers['authorization'];

    const axiosRes = await axios.post(url, req.body || {}, { headers, timeout: 15000 });
    return res.status(axiosRes.status).json(axiosRes.data);
  } catch (err) {
    if (err.response) {
      // upstream returned an error - do not leak server tokens in the body
      const status = err.response.status || 500;
      const data = err.response.data || { error: 'Upstream error' };
      console.warn('[proxyPaiement] upstream error', { path, status, data });
      return res.status(status).json(data);
    }
    console.error('Proxy error:', err.message);
    return res.status(502).json({ error: 'Bad gateway', message: 'Impossible de contacter le service de paiement' });
  }
}

// Proxy info-caisse
router.post('/info-caisse/:id', async (req, res) => {
  const id = req.params.id;
  return forward(req, res, `/api/v1/info-caisse/${encodeURIComponent(id)}`);
});

// Proxy verif-caisse
router.post('/verif-caisse/:id', async (req, res) => {
  const id = req.params.id;
  return forward(req, res, `/api/v1/verif-caisse/${encodeURIComponent(id)}`);
});

export default router;
