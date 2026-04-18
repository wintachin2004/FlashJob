// import express from 'express';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import path from 'path';
// import routes from './routes/indexR';

// dotenv.config();

// const app = express();
// const PORT = process.env.PORT || 3000;

// // ── Middleware ─────────────────────────────────────────────
// app.use(cors({
//   origin: process.env.NODE_ENV === 'production'
//     ? ['https://yourapp.com']          // ← เปลี่ยนเป็น domain จริง
//     : ['http://localhost:8081', 'http://localhost:19006', 'exp://localhost:8081'],
//   credentials: true,
// }));

// app.use(express.json({ limit: '10mb' }));
// app.use(express.urlencoded({ extended: true }));

// // Static file serving for uploads
// app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// // ── Routes ─────────────────────────────────────────────────
// app.use('/api', routes);

// // ── Health check ───────────────────────────────────────────
// app.get('/health', (_req, res) => {
//   res.json({ status: 'ok', timestamp: new Date().toISOString() });
// });

// // ── 404 handler ────────────────────────────────────────────
// app.use((_req, res) => {
//   res.status(404).json({ message: 'Route not found' });
// });

// // ── Global error handler ───────────────────────────────────
// app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
//   console.error('Unhandled error:', err);
//   res.status(500).json({ message: 'Internal server error' });
// });

// app.listen(PORT, () => {
//   console.log(`🚀 FlashJob API running on http://localhost:${PORT}`);
//   console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
// });

// export default app;
