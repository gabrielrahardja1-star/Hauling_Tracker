import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import tripsRouter from './routes/trips.js';
import authRouter from './routes/auth.js';
import bargeLoadingsRouter from './routes/bargeLoadings.js';
import analyticsRouter from './routes/analytics.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.use('/trips', tripsRouter);
app.use('/auth', authRouter);
app.use('/barge-loadings', bargeLoadingsRouter);
app.use('/analytics', analyticsRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Hauling Tracker API running on port ${PORT}`);
});
