import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import boardsRouter from './routes/boards.js';
import tasksRouter from './routes/tasks.js';
import projectsRouter from './routes/projects.js';
import columnsRouter from './routes/columns.js';
import tagCategoriesRouter from './routes/tagCategories'
import tagsRouter from './routes/tags'
import stickersRouter from './routes/stickers.js';



const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/projects', projectsRouter);
app.use('/api/boards', boardsRouter);
app.use('/api/columns', columnsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/tag-categories', tagCategoriesRouter)
app.use('/api/stickers', stickersRouter);
app.use('/api/tags', tagsRouter)
// Global error handler — не даём процессу упасть
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: unknown, _req: any, res: any, _next: any) => {
  console.error('Unhandled error:', err)
  res.status(500).json({ error: 'Internal Server Error' })
})

const port = Number(process.env.PORT || 3000);
app.listen(port, () => console.log(`API running on http://localhost:${port}`));
