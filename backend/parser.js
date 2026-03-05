// parser.js — extracts metadata from a PDF filename path

const MONTHS = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];

/**
 * Attempt to detect the subject code token.
 * Subject codes match patterns like: 21n501, 7e1711, 5e1821, 24014, uhn-24014 (the numeric part)
 * Rules: token that appears just before an optional month token and the year token.
 */
function isSubjectCode(token) {
  // Matches: all-digit codes (e.g. 24014) or alphanumeric codes (e.g. 21n501, 7e1711)
  return /^[0-9]+[a-z]*[0-9]*$|^[0-9]+[a-z][0-9]+$/i.test(token) && token.length >= 4;
}

function toTitleCase(slug) {
  return slug
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/**
 * Parse a single pdf path like:
 *   /papers/btech-ag-7-sem-environmental-engineering-7e1711-mar-2021.pdf
 */
function parsePdfPath(rawPath) {
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

  if (tokens.length < 4) {
    return { error: 'Invalid filename format', url: rawUrl };
  }

  // --- YEAR: last numeric token of 4 digits ---
  let year = null;
  let yearIdx = -1;
  for (let i = tokens.length - 1; i >= 0; i--) {
    if (/^\d{4}$/.test(tokens[i])) {
      year = parseInt(tokens[i], 10);
      yearIdx = i;
      break;
    }
  }

  if (year === null) {
    return { error: 'Invalid filename format', url: rawUrl };
  }

  // --- EXAM MONTH: token just before year (if it's a month) ---
  let exam_month = null;
  let monthIdx = -1;
  if (yearIdx > 0 && MONTHS.includes(tokens[yearIdx - 1].toLowerCase())) {
    exam_month = tokens[yearIdx - 1].toLowerCase();
    monthIdx = yearIdx - 1;
  }

  // End of "tail" (month + year suffix)
  const tailStart = monthIdx !== -1 ? monthIdx : yearIdx;

  // --- SUBJECT CODE: token just before tail ---
  const codeIdx = tailStart - 1;
  if (codeIdx < 1) {
    return { error: 'Invalid filename format', url: rawUrl };
  }
  const potentialCode = tokens[codeIdx];

  // Validate code token
  if (!/^[a-z0-9]+$/i.test(potentialCode)) {
    return { error: 'Invalid filename format', url: rawUrl };
  }
  const subject_code = potentialCode;

  // --- DEGREE: first token ---
  const degree = tokens[0].toLowerCase();

  // --- SEMESTER: find "sem" token; the token before it is the semester number ---
  let semester = null;
  let semIdx = -1;
  for (let i = 1; i < tokens.length; i++) {
    if (tokens[i].toLowerCase() === 'sem') {
      const prev = tokens[i - 1];
      if (/^\d+$/.test(prev)) {
        semester = parseInt(prev, 10);
        semIdx = i; // semIdx points to "sem"
        break;
      }
    }
  }

  if (semIdx === -1) {
    return { error: 'Invalid filename format', url: rawUrl };
  }

  // --- BRANCH: tokens between degree and semester number ---
  // semNumIdx = semIdx - 1 (the number token)
  const semNumIdx = semIdx - 1; // index of the semester number token
  // Branch is tokens[1 .. semNumIdx - 1]
  const branchTokens = tokens.slice(1, semNumIdx);
  let branch = null;
  if (branchTokens.length > 0) {
    // If branchTokens are all non-numeric words, it's the branch
    const allWords = branchTokens.every(t => /^[a-z]+$/i.test(t));
    if (allWords) {
      branch = branchTokens.join('-').toLowerCase();
    }
  }

  // --- SUBJECT SLUG: tokens between "sem" and subject_code ---
  // i.e. tokens[semIdx+1 .. codeIdx-1]
  const slugTokens = tokens.slice(semIdx + 1, codeIdx);
  if (slugTokens.length === 0) {
    return { error: 'Invalid filename format', url: rawUrl };
  }

  // Subject slug includes the code appended (as per example output)
  const subject_slug = [...slugTokens, subject_code].join('-');
  const subject_name = toTitleCase([...slugTokens, subject_code].join('-'));

  return {
    url: rawUrl,
    fname,
    degree,
    branch: branch || null,
    semester,
    subject_slug,
    subject_name,
    subject_code,
    exam_month,
    year,
  };
}

function parseList(listStr) {
  const lines = listStr
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);

  return lines.map(parsePdfPath).filter(Boolean);
}

module.exports = { parsePdfPath, parseList };