// index.js — Express API server

import express from 'express';
import cors from 'cors';
import { parseList, buildSubjects } from '../utils/parser.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'PDF Parser API is running' });
});

// POST /papers/parse
app.post('/papers/parse', (req, res) => {
  const { list } = req.body;

  if (!list || typeof list !== 'string') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Request body must contain a "list" string field',
    });
  }

  const papers = parseList(list);
  const subjects = buildSubjects(papers);
  const invalidPapers = papers.filter(p => p && p.error);

  if (invalidPapers.length > 0) {
    console.warn(`\n[parse] Invalid filenames: ${invalidPapers.length}`);
    invalidPapers.forEach((paper, idx) => {
      console.warn(`[parse][invalid:${idx + 1}] ${paper.url || 'unknown input'} :: ${paper.error}`);
    });
    console.warn('[parse] End invalid filename list\n');
  }

  return res.json({
    count: papers.length,
    invalid_count: invalidPapers.length,
    papers,
    subjects,
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀  PDF Parser API running at http://localhost:${PORT}`);
  console.log(`   POST /papers/parse  — parse PDF path list\n`);
});