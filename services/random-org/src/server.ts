import express from 'express';
import dotenv from 'dotenv';
import routes from './routes/randomRoutes.ts';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8008;

app.use(express.json());
app.use('/random/roulette', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'random-org' });
});

app.listen(PORT, () => {
  console.log(`Random.org service listening on port ${PORT}`);
});