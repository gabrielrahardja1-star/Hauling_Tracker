export function requireStationKey(req, res, next) {
  const key = req.headers['x-station-key'];
  if (!key || key !== process.env.WEIGHBRIDGE_STATION_KEY) {
    return res.status(401).json({ error: 'Invalid or missing station key' });
  }
  req.user = { user_id: null, email: 'weighbridge-station', role: 'station' };
  next();
}
