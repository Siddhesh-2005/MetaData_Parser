# PDF Metadata Parser

A full-stack web application that parses PDF file path lists into structured JSON metadata.

---

<img width="1912" height="911" alt="image" src="https://github.com/user-attachments/assets/a668acb9-f89d-462a-854f-71c76c4f38fe" />

---

<img width="1919" height="910" alt="image" src="https://github.com/user-attachments/assets/58c99d7b-1f6c-409a-9ab1-43f925f5850e" />

---

<img width="1919" height="908" alt="image" src="https://github.com/user-attachments/assets/682799dc-5dda-43ea-9c0a-19747e866452" />

---

## Folder Structure

```
pdf-parser/
├── backend/
│   ├── index.js        # Express server
│   ├── parser.js       # Filename parsing logic
│   └── package.json
└── frontend/
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── src/
        ├── main.jsx
        ├── App.jsx
        └── index.css
```

---

## Installation

### 1. Backend

```bash
cd backend
npm install
```

### 2. Frontend

```bash
cd frontend
npm install
```

---

## Running the Project

### Start the backend (Terminal 1)

```bash
cd backend
npm run dev
```

Server runs at: **http://localhost:3001**

### Start the frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

App opens at: **http://localhost:5173**

> The Vite dev server proxies `/papers/*` requests to the backend automatically.

---

## API Usage

### `POST /papers/parse`

**Request:**
```json
{
  "list": "/papers/btech-2-sem-engineering-mathematics-2-21n501-2024.pdf\n/papers/ba-1-sem-geography-24014-dec-2024.pdf"
}
```

**Response:**
```json
{
  "count": 2,
  "results": [
    {
      "url": "/papers/btech-2-sem-engineering-mathematics-2-21n501-2024.pdf",
      "fname": "btech-2-sem-engineering-mathematics-2-21n501-2024.pdf",
      "degree": "btech",
      "branch": null,
      "semester": 2,
      "subject_slug": "engineering-mathematics-2-21n501",
      "subject_name": "Engineering Mathematics 2 21n501",
      "subject_code": "21n501",
      "exam_month": null,
      "year": 2024
    }
  ]
}
```

---

## Filename Parsing Rules

Pattern: `{degree}-[{branch}-]{semester}-sem-{subject-words}-{code}-[{month}-]{year}.pdf`

| Field          | Rule                                                     |
|----------------|----------------------------------------------------------|
| `degree`       | First token (e.g. `btech`, `ba`, `mca`)                  |
| `branch`       | Tokens between degree and semester number (if present)   |
| `semester`     | Numeric token before `sem`                               |
| `subject_slug` | Tokens between `sem` and subject code (incl. code)       |
| `subject_name` | `subject_slug` converted to Title Case                   |
| `subject_code` | Token just before optional month and year                |
| `exam_month`   | `jan`–`dec` token before year (or `null`)                |
| `year`         | Last 4-digit numeric token                               |

Invalid filenames return: `{ "error": "Invalid filename format", "url": "..." }`
