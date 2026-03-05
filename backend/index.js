// index.js — Express API server

const express = require('express');
const cors = require('cors');
const { parseList } = require('./parser');

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

  const results = parseList(list);

  return res.json({
    count: results.length,
    results,
  });
});

app.listen(PORT, () => {
  console.log(`\n🚀  PDF Parser API running at http://localhost:${PORT}`);
  console.log(`   POST /papers/parse  — parse PDF path list\n`);
});