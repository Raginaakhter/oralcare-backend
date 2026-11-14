import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';
import { ENV, isProd } from './config/env';

const app: Application = express();

const allowedOrigins = Array.from(
  new Set([ENV.CLIENT_URL, 'http://localhost:3000'].filter(Boolean))
);

app.disable('x-powered-by');
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS: origin not allowed: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(morgan(isProd ? 'combined' : 'dev'));

app.get('/', (_req, res) => {
  res.json({
    message: 'Welcome to OralCare API',
    docs: '/api/v1/health',
  });
});

app.use('/api/v1', routes);

app.use(notFound);
app.use(errorHandler);

export default app;
