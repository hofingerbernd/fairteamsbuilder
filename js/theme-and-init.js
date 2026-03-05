/* ============================================================
   DARK MODE & NEUE VERTEILUNG
   ============================================================*/
function toggleDark() {
  document.body.classList.toggle('dark');
  localStorage.setItem(
    'mannschaften_darkmode',
    document.body.classList.contains('dark') ? '1' : '0'
  );
}
function loadDark() {
  if (localStorage.getItem('mannschaften_darkmode') === '1') {
    document.body.classList.add('dark');
  }
}

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

  document.getElementById('generateTeamsBtn').disabled = true;
  document.getElementById('resetAssignmentsBtn').disabled = true;
}

/* ============================================================
   INIT
   ============================================================*/
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  loadDark();

  renderMultiPoolList();
  renderSessionList();

  // Spieler laden
  document.getElementById('prepareAssignmentBtn').addEventListener('click', prepareAssignment);

  // Teams generieren
  document.getElementById('generateTeamsBtn').addEventListener('click', generateTeams);

  // Reset
  document.getElementById('resetAssignmentsBtn').addEventListener('click', resetAssignments);

  // Teamanzahl geändert
  document.getElementById('teamCount').addEventListener('change', handleTeamCountChange);

  // Verteilungsmodus umschalten
  document.querySelectorAll('input[name="distMode"]').forEach((rb) => {
    rb.addEventListener('change', handleDistModeChange);
  });

  // Turnier
  document.getElementById('generateTournamentBtn').addEventListener('click', generateTournament);

  // Sessions
  document.getElementById('saveSessionBtn').addEventListener('click', saveSessionUI);

  // Teams kopieren
  document.getElementById('exportTextBtn').addEventListener('click', exportTeamsAsText);

  // JSON (kompletter State)
  document.getElementById('exportJSONBtn').addEventListener('click', exportJSON);
  document.getElementById('importJSONBtn').addEventListener('click', importJSON);

  // Dark
  document.getElementById('darkModeToggle').addEventListener('click', toggleDark);

  // Neue Verteilung
  document.getElementById('newDistributionBtn').addEventListener('click', newDistribution);
});
