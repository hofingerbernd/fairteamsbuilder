/* ============================================================
   NEUE VERTEILUNG
   ============================================================*/
function newDistribution() {
  uiState.currentGenerationPlayers = [];
  uiState.lastTeams = null;

  // Deselektiere alle Pools
  document.querySelectorAll('#multiPoolList input[type=checkbox]').forEach((cb) => {
    cb.checked = false;
  });

  document.getElementById('assignmentArea').style.display = 'none';
  document.getElementById('teamsResult').style.display = 'none';
  document.getElementById('tournamentList').style.display = 'none';
  const point3Hint = document.getElementById('builderPoint3Hint');
  const resultHint = document.getElementById('builderResultHint');
  if (point3Hint) point3Hint.style.display = 'block';
  if (resultHint) resultHint.style.display = 'block';

  document.getElementById('generateTeamsBtn').disabled = true;
  document.getElementById('resetAssignmentsBtn').disabled = true;

  if (typeof window.setBuilderFormPage === 'function') {
    window.setBuilderFormPage(0);
  }
}

/* ============================================================
   BUILDER FORM NAVIGATION
   ============================================================*/
function initBuilderFormPages() {
  const pages = [
    document.getElementById('builderPage1'),
    document.getElementById('builderPage2'),
    document.getElementById('builderPage3'),
    document.getElementById('builderPage4')
  ].filter(Boolean);
  const pageNames = ['Punkt 1', 'Punkt 2', 'Punkt 3', 'Ergebnis'];

  const backBtn = document.getElementById('builderBackBtn');
  const nextBtn = document.getElementById('builderNextBtn');

  if (!pages.length || !backBtn || !nextBtn) return;

  let currentPage = 0;

  function renderPage() {
    pages.forEach((page, idx) => page.classList.toggle('active', idx === currentPage));
    backBtn.style.visibility = currentPage === 0 ? 'hidden' : 'visible';
    nextBtn.style.visibility = currentPage === pages.length - 1 ? 'hidden' : 'visible';

    if (currentPage > 0) {
      backBtn.textContent = `← Zurück zu ${pageNames[currentPage - 1]}`;
    }
    if (currentPage < pages.length - 1) {
      nextBtn.textContent = `Weiter zu ${pageNames[currentPage + 1]} →`;
    }
  }

  backBtn.addEventListener('click', () => {
    if (currentPage > 0) {
      currentPage -= 1;
      renderPage();
    }
  });

  nextBtn.addEventListener('click', () => {
    if (currentPage < pages.length - 1) {
      currentPage += 1;
      renderPage();
    }
  });

  window.setBuilderFormPage = function setBuilderFormPage(pageIndex) {
    if (!Number.isInteger(pageIndex)) return;
    currentPage = Math.max(0, Math.min(pageIndex, pages.length - 1));
    renderPage();
  };

  renderPage();
}

/* ============================================================
   INIT
   ============================================================*/
document.addEventListener('DOMContentLoaded', () => {
  loadState();

  renderMultiPoolList();
  renderSessionList();

  // Spieler laden
  document.getElementById('prepareAssignmentBtn')?.addEventListener('click', prepareAssignment);

  // Teams generieren
  document.getElementById('generateTeamsBtn')?.addEventListener('click', generateTeams);

  // Reset
  document.getElementById('resetAssignmentsBtn')?.addEventListener('click', resetAssignments);

  // Teamanzahl geändert
  document.getElementById('teamCount')?.addEventListener('change', handleTeamCountChange);

  // Verteilungsmodus umschalten
  document.querySelectorAll('input[name="distMode"]').forEach((rb) => {
    rb.addEventListener('change', handleDistModeChange);
  });

  // Turnier
  document.getElementById('generateTournamentBtn')?.addEventListener('click', generateTournament);

  // Sessions
  document.getElementById('saveSessionBtn')?.addEventListener('click', saveSessionUI);

  // Teams kopieren
  document.getElementById('exportTextBtn')?.addEventListener('click', exportTeamsAsText);

  // JSON (kompletter State)
  document.getElementById('exportJSONBtn')?.addEventListener('click', exportJSON);
  document.getElementById('importJSONBtn')?.addEventListener('click', importJSON);

  // Neue Verteilung
  document.getElementById('newDistributionBtn')?.addEventListener('click', newDistribution);

  // Formularseiten (Punkt 1 / Punkt 2 / Punkt 3 / Ergebnis)
  initBuilderFormPages();
});
