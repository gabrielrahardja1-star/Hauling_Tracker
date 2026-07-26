import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import tripsRouter from './routes/trips.js';
import authRouter from './routes/auth.js';
import bargeLoadingsRouter from './routes/bargeLoadings.js';
import analyticsRouter from './routes/analytics.js';
import sessionsRouter from './routes/sessions.js';
import auditRouter from './routes/audit.js';
import stationRouter from './routes/station.js';
import errorsRouter from './routes/errors.js';
import { logError } from './lib/errorLog.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

app.use('/trips', tripsRouter);
app.use('/auth', authRouter);
app.use('/barge-loadings', bargeLoadingsRouter);
app.use('/analytics', analyticsRouter);
app.use('/sessions', sessionsRouter);
app.use('/audit', auditRouter);
app.use('/station', stationRouter);
app.use('/errors', errorsRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use((err, req, res, _next) => {
  console.error(err);
  logError({ source: 'backend', message: err.message, context: { stack: err.stack, path: req.path, method: req.method } });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Hauling Tracker API running on port ${PORT}`);
});
