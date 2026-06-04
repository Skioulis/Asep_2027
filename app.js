'use strict';

// ── Category colour map ───────────────────────────────────────────────────────
const CATEGORY_COLORS = {
  'Διοικητικό Δίκαιο':                                                      'bg-success',
  'Συνταγματικό Δίκαιο':                                                    'bg-primary',
  'Οικονομικές Επιστήμες':                                                  'bg-warning text-dark',
  'Πληροφορική και Ψηφιακή Διακυβέρνηση':                                   'bg-dark',
  'Ευρωπαϊκοί Θεσμοί και Δίκαιο':                                          'bg-danger',
  'Διοίκηση Ανθρώπινου Δυναμικού':                                          'bg-info text-dark',
  'Σύγχρονη Ιστορία της Ελλάδος (1875-σήμερα)':                            'bg-secondary',
  'Κώδικας Κατάστασης Πολιτικών Διοικητικών Υπαλλήλων και Υπαλλήλων Ν.Π.Δ.Δ.': 'bg-secondary',
  'Διοίκηση Επιχειρήσεων και Οργανισμών':                                   'bg-primary',
  'Κώδικας συμπεριφοράς δημοσίων Υπαλλήλων':                               'bg-success',
  'Γενικός Κανονισμός για την Προστασία των Δεδομένων (GDPR)':              'bg-danger',
};

function categoryBadge(cat) {
  const cls = CATEGORY_COLORS[cat] || 'bg-secondary';
  return `<span class="badge badge-category ${cls} me-1">${cat}</span>`;
}

// ── State ─────────────────────────────────────────────────────────────────────
let allQuestions = [];
let filteredQuestions = [];

// Quiz state
let quizSet = [];
let quizIndex = 0;
let quizAnswers = {};   // questionId → chosen option letter

// Browse state
let browsePage = 1;
const PAGE_SIZE = 10;
let revealedAnswers = new Set();  // question ids whose answer is shown

// ── DOM refs ──────────────────────────────────────────────────────────────────
const elLoading       = document.getElementById('loading');
const elWelcome       = document.getElementById('welcome');
const elQuiz          = document.getElementById('quizContainer');
const elBrowse        = document.getElementById('browseContainer');
const elBrowseQ       = document.getElementById('browseQuestions');
const elPagination    = document.getElementById('pagination');
const elCategoryFilter= document.getElementById('categoryFilter');
const btnQuiz         = document.getElementById('btnQuiz');
const btnBrowse       = document.getElementById('btnBrowse');

// ── Boot ──────────────────────────────────────────────────────────────────────
async function init() {
  showSection('loading');
  try {
    const res = await fetch('./data/questions.json');
    allQuestions = await res.json();
  } catch (e) {
    showSection('welcome');
    elWelcome.innerHTML = `<div class="alert alert-danger"><i class="fas fa-exclamation-triangle me-2"></i>
      Αδυναμία φόρτωσης ερωτήσεων. Βεβαιωθείτε ότι έχετε τρέξει <code>python main.py</code> και ότι
      ανοίγετε τη σελίδα μέσω HTTP server (π.χ. <code>python -m http.server</code>).</div>`;
    return;
  }

  populateCategoryFilter();
  applyFilter();
  showSection('welcome');
}

function populateCategoryFilter() {
  const cats = [...new Set(allQuestions.map(q => q.category))].sort();
  cats.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.textContent = cat;
    elCategoryFilter.appendChild(opt);
  });
}

function applyFilter() {
  const cat = elCategoryFilter.value;
  filteredQuestions = cat ? allQuestions.filter(q => q.category === cat) : [...allQuestions];
}

// ── Section visibility ────────────────────────────────────────────────────────
function showSection(name) {
  elLoading.classList.add('d-none');
  elWelcome.classList.add('d-none');
  elQuiz.classList.add('d-none');
  elBrowse.classList.add('d-none');

  if (name === 'loading') elLoading.classList.remove('d-none');
  else if (name === 'welcome') elWelcome.classList.remove('d-none');
  else if (name === 'quiz') elQuiz.classList.remove('d-none');
  else if (name === 'browse') elBrowse.classList.remove('d-none');
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickRandom(arr, n) {
  return shuffle(arr).slice(0, Math.min(n, arr.length));
}

// ── QUIZ MODE ─────────────────────────────────────────────────────────────────
function startQuiz() {
  applyFilter();
  if (filteredQuestions.length === 0) { alert('Δεν βρέθηκαν ερωτήσεις για αυτή την κατηγορία.'); return; }
  quizSet = pickRandom(filteredQuestions, 25);
  quizIndex = 0;
  quizAnswers = {};
  showSection('quiz');
  renderQuizQuestion();
}

function renderQuizQuestion() {
  const total = quizSet.length;
  const q = quizSet[quizIndex];
  const chosen = quizAnswers[q.id];
  const answered = chosen !== undefined;

  const pct = Math.round(((quizIndex + (answered ? 1 : 0)) / total) * 100);

  let optionsHtml = q.answers.map(a => {
    let cls = 'quiz-option';
    if (answered) {
      if (a.option === q.correctAnswer)   cls += ' correct';
      else if (a.option === chosen)        cls += ' wrong';
    } else if (a.option === chosen) {
      cls += ' selected';
    }
    const disabled = answered ? 'disabled' : '';
    return `<button class="${cls}" ${disabled} onclick="chooseAnswer('${a.option}')">
      <strong>${a.option.toUpperCase()}.</strong> ${escHtml(a.text)}
    </button>`;
  }).join('');

  let feedbackHtml = '';
  if (answered) {
    const correct = chosen === q.correctAnswer;
    feedbackHtml = `<div class="alert ${correct ? 'alert-success' : 'alert-danger'} mt-3 mb-0">
      ${correct
        ? '<i class="fas fa-check-circle me-2"></i>Σωστά!'
        : `<i class="fas fa-times-circle me-2"></i>Λάθος! Σωστή απάντηση: <strong>${q.correctAnswer.toUpperCase()}</strong>`}
    </div>`;
  }

  const isLast = quizIndex === total - 1;
  const navHtml = `
    <div class="d-flex justify-content-between mt-4">
      <button class="btn btn-outline-secondary" onclick="quizNav(-1)" ${quizIndex === 0 ? 'disabled' : ''}>
        <i class="fas fa-arrow-left me-1"></i>Προηγούμενο
      </button>
      <button class="btn btn-primary" onclick="quizNav(1)">
        ${isLast
          ? 'Αποτελέσματα <i class="fas fa-flag-checkered ms-1"></i>'
          : 'Επόμενο <i class="fas fa-arrow-right ms-1"></i>'}
      </button>
    </div>`;

  elQuiz.innerHTML = `
    <div class="mb-3">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <small class="text-muted">Ερώτηση ${quizIndex + 1} / ${total}</small>
        <small class="text-muted">${pct}%</small>
      </div>
      <div class="progress progress-bar-quiz">
        <div class="progress-bar" style="width:${pct}%"></div>
      </div>
    </div>
    <div class="card question-card">
      <div class="card-header">${categoryBadge(q.category)}
        <span class="badge bg-secondary ms-1">#${q.id}</span>
      </div>
      <div class="card-body">
        <h5 class="card-title mb-4">${escHtml(q.question)}</h5>
        ${optionsHtml}
        ${feedbackHtml}
        ${navHtml}
      </div>
    </div>`;
}

function chooseAnswer(option) {
  const q = quizSet[quizIndex];
  if (quizAnswers[q.id] !== undefined) return;
  quizAnswers[q.id] = option;
  renderQuizQuestion();
}

function quizNav(dir) {
  const next = quizIndex + dir;
  if (next < 0) return;
  if (next >= quizSet.length) { renderQuizResults(); return; }
  quizIndex = next;
  renderQuizQuestion();
}

function renderQuizResults() {
  const total = quizSet.length;
  const correct = quizSet.filter(q => quizAnswers[q.id] === q.correctAnswer).length;
  const pct = Math.round((correct / total) * 100);

  let circleColor = pct >= 80 ? '#198754' : pct >= 60 ? '#0d6efd' : pct >= 40 ? '#fd7e14' : '#dc3545';

  const reviewRows = quizSet.map((q, i) => {
    const chosen = quizAnswers[q.id];
    const ok = chosen === q.correctAnswer;
    const icon = chosen === undefined
      ? '<i class="fas fa-minus text-muted"></i>'
      : ok
        ? '<i class="fas fa-check text-success"></i>'
        : '<i class="fas fa-times text-danger"></i>';
    return `<tr>
      <td>${i + 1}</td>
      <td>${escHtml(q.question.substring(0, 70))}${q.question.length > 70 ? '…' : ''}</td>
      <td>${chosen ? chosen.toUpperCase() : '—'}</td>
      <td>${q.correctAnswer.toUpperCase()}</td>
      <td class="text-center">${icon}</td>
    </tr>`;
  }).join('');

  elQuiz.innerHTML = `
    <div class="card mb-4">
      <div class="card-header bg-primary text-white">
        <h5 class="mb-0"><i class="fas fa-trophy me-2"></i>Αποτελέσματα Quiz</h5>
      </div>
      <div class="card-body text-center py-4">
        <div class="score-circle" style="border-color:${circleColor}; color:${circleColor};">
          <div>${correct}/${total}</div>
          <div style="font-size:1rem;font-weight:400">${pct}%</div>
        </div>
        <div class="progress mb-4" style="height:14px; max-width:400px; margin:0 auto;">
          <div class="progress-bar" style="width:${pct}%; background:${circleColor}"></div>
        </div>
        <div class="d-flex gap-2 justify-content-center flex-wrap">
          <button class="btn btn-primary" onclick="startQuiz()">
            <i class="fas fa-redo me-2"></i>Νέο Quiz
          </button>
          <button class="btn btn-outline-secondary" onclick="renderReview()">
            <i class="fas fa-search me-2"></i>Ανασκόπηση Απαντήσεων
          </button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-header"><strong>Σύνοψη</strong></div>
      <div class="table-responsive">
        <table class="table table-sm table-hover mb-0">
          <thead class="table-light">
            <tr><th>#</th><th>Ερώτηση</th><th>Απάντησα</th><th>Σωστή</th><th></th></tr>
          </thead>
          <tbody>${reviewRows}</tbody>
        </table>
      </div>
    </div>`;
}

function renderReview() {
  const html = quizSet.map((q, i) => {
    const chosen = quizAnswers[q.id];
    const opts = q.answers.map(a => {
      let cls = 'list-group-item';
      if (a.option === q.correctAnswer) cls += ' list-group-item-success';
      else if (a.option === chosen)      cls += ' list-group-item-danger';
      return `<div class="${cls}">
        <strong>${a.option.toUpperCase()}.</strong> ${escHtml(a.text)}
        ${a.option === q.correctAnswer ? '<i class="fas fa-check ms-2 text-success"></i>' : ''}
        ${a.option === chosen && a.option !== q.correctAnswer ? '<i class="fas fa-times ms-2 text-danger"></i>' : ''}
      </div>`;
    }).join('');

    const badge = chosen === q.correctAnswer
      ? '<span class="badge bg-success ms-2">Σωστή</span>'
      : chosen === undefined
        ? '<span class="badge bg-secondary ms-2">Αναπάντητη</span>'
        : '<span class="badge bg-danger ms-2">Λάθος</span>';

    return `<div class="card question-card mb-3">
      <div class="card-header d-flex align-items-center flex-wrap gap-1">
        ${categoryBadge(q.category)}
        <span class="badge bg-secondary">#${q.id}</span>
        <span class="badge bg-light text-dark">Ερ. ${i + 1}</span>
        ${badge}
      </div>
      <div class="card-body">
        <h6 class="card-title">${escHtml(q.question)}</h6>
        <div class="list-group mt-2">${opts}</div>
      </div>
    </div>`;
  }).join('');

  elQuiz.innerHTML = `
    <div class="d-flex justify-content-between align-items-center mb-3">
      <h5 class="mb-0">Ανασκόπηση Απαντήσεων</h5>
      <div class="d-flex gap-2">
        <button class="btn btn-sm btn-outline-secondary" onclick="renderQuizResults()">
          <i class="fas fa-arrow-left me-1"></i>Πίσω στα Αποτελέσματα
        </button>
        <button class="btn btn-sm btn-primary" onclick="startQuiz()">
          <i class="fas fa-redo me-1"></i>Νέο Quiz
        </button>
      </div>
    </div>
    ${html}`;
}

// ── BROWSE MODE ───────────────────────────────────────────────────────────────
function startBrowse() {
  applyFilter();
  if (filteredQuestions.length === 0) { alert('Δεν βρέθηκαν ερωτήσεις για αυτή την κατηγορία.'); return; }
  browsePage = 1;
  revealedAnswers.clear();
  showSection('browse');
  renderBrowsePage();
}

function renderBrowsePage() {
  const total = filteredQuestions.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const start = (browsePage - 1) * PAGE_SIZE;
  const pageQ = filteredQuestions.slice(start, start + PAGE_SIZE);

  elBrowseQ.innerHTML = pageQ.map(q => {
    const revealed = revealedAnswers.has(q.id);
    const opts = q.answers.map(a => {
      let cls = 'answer-btn btn w-100 mb-1 text-start';
      if (revealed && a.option === q.correctAnswer) cls += ' revealed';
      return `<button class="${cls}" onclick="revealAnswer('${q.id}')">
        <strong>${a.option.toUpperCase()}.</strong> ${escHtml(a.text)}
      </button>`;
    }).join('');

    return `<div class="card question-card" id="bq-${q.id}">
      <div class="card-header d-flex align-items-center flex-wrap gap-1">
        ${categoryBadge(q.category)}
        <span class="badge bg-secondary">#${q.id}</span>
        ${revealed ? '<span class="badge bg-success ms-auto"><i class="fas fa-check me-1"></i>Αποκαλύφθηκε</span>' : ''}
      </div>
      <div class="card-body">
        <h6 class="card-title mb-3">${escHtml(q.question)}</h6>
        <div>${opts}</div>
        ${!revealed
          ? `<button class="btn btn-sm btn-outline-primary mt-2" onclick="revealAnswer('${q.id}')">
               <i class="fas fa-eye me-1"></i>Εμφάνιση σωστής απάντησης
             </button>`
          : ''}
      </div>
    </div>`;
  }).join('');

  renderPagination(totalPages);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function revealAnswer(qId) {
  revealedAnswers.add(qId);
  // Re-render only this card to avoid full page flicker
  const q = filteredQuestions.find(x => x.id === qId);
  if (!q) return;
  const card = document.getElementById(`bq-${qId}`);
  if (!card) return;

  const opts = q.answers.map(a => {
    const cls = 'answer-btn btn w-100 mb-1 text-start' + (a.option === q.correctAnswer ? ' revealed' : '');
    return `<button class="${cls}" disabled>
      <strong>${a.option.toUpperCase()}.</strong> ${escHtml(a.text)}
      ${a.option === q.correctAnswer ? '<i class="fas fa-check ms-2"></i>' : ''}
    </button>`;
  }).join('');

  card.querySelector('.card-body').innerHTML = `
    <h6 class="card-title mb-3">${escHtml(q.question)}</h6>
    <div>${opts}</div>`;
  card.querySelector('.card-header').innerHTML = `
    ${categoryBadge(q.category)}
    <span class="badge bg-secondary">#${q.id}</span>
    <span class="badge bg-success ms-auto"><i class="fas fa-check me-1"></i>Αποκαλύφθηκε</span>`;
}

function renderPagination(totalPages) {
  if (totalPages <= 1) { elPagination.innerHTML = ''; return; }

  const maxVisible = 5;
  let start = Math.max(1, browsePage - Math.floor(maxVisible / 2));
  let end   = Math.min(totalPages, start + maxVisible - 1);
  if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);

  let html = '<ul class="pagination">';
  html += pageItem('&laquo;', browsePage - 1, browsePage === 1);
  if (start > 1) {
    html += pageItem('1', 1);
    if (start > 2) html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
  }
  for (let i = start; i <= end; i++) html += pageItem(i, i, false, i === browsePage);
  if (end < totalPages) {
    if (end < totalPages - 1) html += '<li class="page-item disabled"><span class="page-link">…</span></li>';
    html += pageItem(totalPages, totalPages);
  }
  html += pageItem('&raquo;', browsePage + 1, browsePage === totalPages);
  html += '</ul>';

  elPagination.innerHTML = html;
  elPagination.querySelectorAll('.page-link[data-page]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      const p = parseInt(el.dataset.page);
      if (!isNaN(p) && p >= 1 && p <= totalPages) {
        browsePage = p;
        renderBrowsePage();
      }
    });
  });
}

function pageItem(label, page, disabled = false, active = false) {
  const cls = `page-item${disabled ? ' disabled' : ''}${active ? ' active' : ''}`;
  return `<li class="${cls}"><a class="page-link" href="#" data-page="${page}">${label}</a></li>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Event listeners ───────────────────────────────────────────────────────────
btnQuiz.addEventListener('click', startQuiz);
btnBrowse.addEventListener('click', startBrowse);
elCategoryFilter.addEventListener('change', () => {
  // If a mode is already active, restart it with new filter
  if (!elQuiz.classList.contains('d-none')) startQuiz();
  else if (!elBrowse.classList.contains('d-none')) startBrowse();
});

// Expose for inline onclick handlers
window.chooseAnswer   = chooseAnswer;
window.quizNav        = quizNav;
window.startQuiz      = startQuiz;
window.renderReview   = renderReview;
window.renderQuizResults = renderQuizResults;
window.revealAnswer   = revealAnswer;

init();
