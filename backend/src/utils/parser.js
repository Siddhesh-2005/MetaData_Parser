// parser.js — extracts metadata from a PDF filename path

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
const DEGREE_TOKENS = new Set([
  'ba', 'bsc', 'bcom', 'bba', 'bca', 'btech', 'be', 'bed', 'b.ed',
  'ma', 'msc', 'mcom', 'mba', 'mca',
]);

/**
 * Attempt to detect the subject code token.
 * Subject codes match patterns like: 21n501, 7e1711, 5e1821, 24014, uhn-24014 (the numeric part)
 * Rules: token that appears just before an optional month token and the year token.
 */
function isSubjectCode(token) {
  // Matches: all-digit codes (e.g. 24014) or alphanumeric codes (e.g. 21n501, 7e1711)
  return /^[0-9]+[a-z]*[0-9]*$|^[0-9]+[a-z][0-9]+$/i.test(token) && token.length >= 4;
}

function isYearToken(token) {
  if (!/^\d{4}$/.test(token)) return false;
  const y = parseInt(token, 10);
  return y >= 2000 && y <= 2030;
}

function toTitleCase(slug) {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getFilenameTokens(rawPath) {
  const fname = rawPath.split('/').pop();
  if (!fname || !fname.endsWith('.pdf')) return null;
  return fname.slice(0, -4).split('-');
}

function findSemIndex(tokens) {
  for (let i = 1; i < tokens.length; i++) {
    const marker = tokens[i].toLowerCase();
    if ((marker === 'sem' || marker === 'sm') && /^\d+$/.test(tokens[i - 1])) {
      return i;
    }
  }
  return -1;
}

function expandParsedRecord(rawPath, parsed) {
  if (!parsed || parsed.error) return [parsed];

  const tokens = getFilenameTokens(rawPath);
  if (!tokens) return [parsed];

  const semIdx = findSemIndex(tokens);
  if (semIdx === -1) return [parsed];

  const semNumIdx = semIdx - 1;
  const prefixTokens = tokens.slice(0, semNumIdx).map(t => t.toLowerCase());
  if (prefixTokens.length === 0) return [parsed];

  // Case 1: multiple degrees encoded before semester, e.g. ba-bsc-bba-bca-1-sem-...
  const allDegrees = prefixTokens.every(t => DEGREE_TOKENS.has(t));
  if (allDegrees && prefixTokens.length > 1) {
    return prefixTokens.map(deg => ({
      ...parsed,
      degree: deg,
      branch: 'COMMON',
    }));
  }

  // Case 2: multiple branch codes encoded before semester, e.g. btech-aid-cai-cds-5-sem-...
  const branchTokens = prefixTokens.slice(1);
  const looksLikeBranchCodes =
    branchTokens.length > 1 &&
    branchTokens.every(t => /^[a-z]+$/i.test(t) && t.length <= 4 && !DEGREE_TOKENS.has(t));

  if (looksLikeBranchCodes) {
    return branchTokens.map(branch => ({
      ...parsed,
      branch,
    }));
  }

  return [parsed];
}

/**
 * Parse a single pdf path like:
 *   /papers/btech-ag-7-sem-environmental-engineering-7e1711-mar-2021.pdf
 */
export function parsePdfPath(rawPath) {
  const rawUrl = rawPath.trim();

  if (!rawUrl) return null;

  // Extract just the filename (last segment after /)
  const fname = rawUrl.split('/').pop();

  if (!fname.endsWith('.pdf')) {
    return { error: 'Invalid filename format', url: rawUrl };
  }

  // Remove .pdf
  const base = fname.slice(0, -4);
  const tokens = base.split('-');

  if (tokens.length < 2) {
    return { error: 'Invalid filename format', url: rawUrl };
  }

  // --- YEAR: valid only when in [2000..2030], otherwise fallback 99999 ---
  let year = 99999;
  let yearIdx = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (isYearToken(tokens[i])) {
      year = parseInt(tokens[i], 10);
      yearIdx = i;
      break;
    }
  }

  // --- EXAM MONTH: token before year when present; else fallback annual ---
  let exam_month = 'annual';
  let monthIdx = -1;
  if (yearIdx > 0 && MONTHS.includes(tokens[yearIdx - 1].toLowerCase())) {
    exam_month = tokens[yearIdx - 1].toLowerCase();
    monthIdx = yearIdx - 1;
  } else if (yearIdx === -1 && MONTHS.includes(tokens[tokens.length - 1].toLowerCase())) {
    monthIdx = tokens.length - 1;
    exam_month = tokens[monthIdx].toLowerCase();
  }

  // End of "tail" (month + optional year suffix)
  const tailStart = monthIdx !== -1 ? monthIdx : (yearIdx !== -1 ? yearIdx : tokens.length);

  // --- SUBJECT CODE: prefer token before tail; fallback to latest code-like token ---
  let codeIdx = tailStart - 1;
  let subject_code = '99999';
  if (codeIdx >= 0) {
    const candidate = tokens[codeIdx];
    if (/^[a-z0-9]+$/i.test(candidate) && !isYearToken(candidate) && isSubjectCode(candidate)) {
      subject_code = candidate.toLowerCase();
    } else {
      for (let i = tailStart - 1; i >= 0; i--) {
        const t = tokens[i];
        if (!/^[a-z0-9]+$/i.test(t)) continue;
        if (isYearToken(t)) continue;
        if (isSubjectCode(t) || /^\d+$/.test(t)) {
          codeIdx = i;
          subject_code = t.toLowerCase();
          break;
        }
      }
    }
  }

  // --- DEGREE: first token ---
  const degree = tokens[0].toLowerCase();

  // --- SEMESTER: default "00" when sem marker is missing ---
  let semester = '00';
  const semIdx = findSemIndex(tokens);
  if (semIdx !== -1) {
    semester = parseInt(tokens[semIdx - 1], 10);
  }

  // --- BRANCH: tokens between degree and semester number ---
  let branch = 'COMMON';
  if (semIdx !== -1) {
    const semNumIdx = semIdx - 1;
    const branchTokens = tokens.slice(1, semNumIdx);
    if (branchTokens.length > 0) {
      const allWords = branchTokens.every(t => /^[a-z]+$/i.test(t));
      if (allWords) {
        branch = branchTokens.join('-').toLowerCase();
      }
    }
  }

  // --- SUBJECT SLUG: words after sem marker (or degree) up to subject_code ---
  const slugStart = semIdx !== -1 ? semIdx + 1 : 1;
  const slugEnd = codeIdx !== -1 ? codeIdx : tailStart;
  let slugTokens = tokens.slice(slugStart, slugEnd).filter(Boolean);
  if (slugTokens.length === 0) {
    slugTokens = ['unknown-subject'];
  }

  // Subject slug and name are derived from subject words only.
  const subject_slug = slugTokens.join('-');
  const subject_name = toTitleCase(subject_slug);

  return {
    url: rawUrl,
    fname,
    degree,
    branch,
    semester,
    subject_slug,
    subject_name,
    subject_code,
    exam_month,
    year,
  };
}

export function parseList(listStr) {
  const lines = listStr
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  const expanded = [];
  for (const line of lines) {
    const parsed = parsePdfPath(line);
    const items = expandParsedRecord(line, parsed).filter(Boolean);
    expanded.push(...items);
  }

  return expanded;
}

export function buildSubjects(papers) {
  const map = new Map();

  for (const paper of papers) {
    if (!paper || paper.error) continue;

    const branch = paper.branch || 'COMMON';
    const key = [
      paper.degree,
      branch,
      paper.semester,
      paper.subject_slug,
      paper.subject_code,
      paper.subject_name,
    ].join('|');

    if (!map.has(key)) {
      map.set(key, {
        degree: paper.degree,
        branch,
        semester: paper.semester,
        subject_slug: paper.subject_slug,
        subject_code: paper.subject_code,
        subject_name: paper.subject_name,
        paper_count: 0,
        year: 0,
        exam_month: 'annual',
      });
    }

    map.get(key).paper_count += 1;
  }

  return Array.from(map.values());
}

