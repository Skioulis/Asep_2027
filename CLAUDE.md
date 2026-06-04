# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A static question-bank site for ASEP (Ανώτατο Συμβούλιο Επιλογής Προσωπικού — Greece's Supreme Civil Service Council) exam preparation, modeled after [skioulis.github.io/Asep-G-2025](https://skioulis.github.io/Asep-G-2025/). Users can browse all questions or take a random quiz, filtered by category.

## Running

```bash
# Extract questions from .docx source files → data/questions.json
python main.py
```

## Key Files

- `main.py` — parses all `.docx` files in `questions/` and writes `data/questions.json`
- `questions/` — source `.docx` files, one per subject area (each file = one category)
- `data/questions.json` — generated question bank (do not edit manually)

## Data Pipeline

`main.py` → `data/questions.json` → static site (HTML/JS)

**Extraction logic (`main.py`)**:
- Category name is read from the `Γνωστικό Αντικείμενο: X` header inside each `.docx`
- The correct answer is the one whose text runs have a red color (hex: FF0000, EE0000, C00000, DA0000, or similar red variants)
- Blue-colored paragraphs (002060 / 001F5F) are document headers — skipped
- Some paragraphs merge all 4 answer options with embedded `\n` separators; `_expand_paragraph()` splits these into individual items before grouping
- Questions are grouped in blocks of 5 consecutive items: [question, answer_a, answer_b, answer_c, answer_d]
- Blocks where the question text is red or none of the answers is red are discarded (formatting noise)

**Question JSON schema** (`data/questions.json`):
```json
{
  "id": "1",
  "question": "...",
  "answers": [
    { "option": "a", "text": "..." },
    { "option": "b", "text": "..." },
    { "option": "c", "text": "..." },
    { "option": "d", "text": "..." }
  ],
  "correctAnswer": "a",
  "category": "Διοικητικό Δίκαιο"
}
```

## Categories (11 total, ~1989 questions)

| Category | Questions |
|---|---|
| Οικονομικές Επιστήμες | 335 |
| Διοικητικό Δίκαιο | 303 |
| Συνταγματικό Δίκαιο | 265 |
| Πληροφορική και Ψηφιακή Διακυβέρνηση | 257 |
| Ευρωπαϊκοί Θεσμοί και Δίκαιο | 189 |
| Διοίκηση Ανθρώπινου Δυναμικού | 151 |
| Σύγχρονη Ιστορία της Ελλάδος | 144 |
| Κώδικας Κατάστασης Πολιτικών Διοικητικών Υπαλλήλων | 121 |
| Διοίκηση Επιχειρήσεων και Οργανισμών | 108 |
| Κώδικας συμπεριφοράς δημοσίων Υπαλλήλων | 86 |
| Γενικός Κανονισμός για την Προστασία των Δεδομένων (GDPR) | 30 |

## Frontend (to be built)

Tech stack from the reference site: HTML + Bootstrap 5 + vanilla JS. Features:
- Category selector (filter by subject or "All")
- Random quiz mode (25 questions)
- Full browser mode (all questions)
