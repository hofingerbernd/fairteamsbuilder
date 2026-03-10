/* ============================================================
   SPIELER LADEN
   ============================================================*/
function prepareAssignment() {
  const selectedPoolIds = getSelectedPoolIds();
  const teamCount = parseInt(document.getElementById('teamCount').value, 10);

  if (!selectedPoolIds.length) {
    setStatus('Bitte mindestens einen Pool auswählen.', 'error');
    return false;
  }
  if (!teamCount || teamCount < 2) {
    setStatus('Bitte mindestens 2 Teams einstellen.', 'error');
    return false;
  }

  const players = [];
  selectedPoolIds.forEach((id) => {
    const pool = getPoolById(id);
    if (!pool) return;
    pool.players.forEach((p) => {
      players.push({
        id: p.id,
        name: p.name,
        skill: p.skill,
        poolName: pool.name
      });
    });
  });

  uiState.currentGenerationPlayers = players;

  renderAssignmentTable(teamCount, null);
  const prevConfig = getTeamNameConfig();
  renderTeamNameEditor(teamCount);
  applyPrevTeamConfig(prevConfig);

  document.getElementById('assignmentArea').style.display = 'block';
  const point3Hint = document.getElementById('builderPoint3Hint');
  if (point3Hint) point3Hint.style.display = 'none';
  document.getElementById('generateTeamsBtn').disabled = false;
  document.getElementById('resetAssignmentsBtn').disabled = false;

  document.getElementById('teamsResult').style.display = 'none';
  const resultHint = document.getElementById('builderResultHint');
  if (resultHint) resultHint.style.display = 'block';
  document.getElementById('tournamentList').style.display = 'none';

  document.getElementById('assignmentInfo').textContent = '';
  setStatus(`${players.length} Spieler wurden geladen.`, 'success');
  return true;
}

/* ============================================================
   RESET / TEAMCOUNT CHANGE / MODUS CHANGE
   ============================================================*/
function resetAssignments() {
  document.querySelectorAll('#assignmentTable select').forEach((sel) => (sel.value = ''));
  document.getElementById('teamsResult').style.display = 'none';
  document.getElementById('tournamentList').style.display = 'none';
}

function handleTeamCountChange() {
  const teamCount = parseInt(document.getElementById('teamCount').value, 10);
  if (!uiState.currentGenerationPlayers.length || teamCount < 2) return;
  const prev = getCurrentAssignmentState();
  const prevCfg = getTeamNameConfig();

  renderAssignmentTable(teamCount, prev);
  renderTeamNameEditor(teamCount);
  applyPrevTeamConfig(prevCfg);

  document.getElementById('teamsResult').style.display = 'none';
  document.getElementById('tournamentList').style.display = 'none';
}

function handleDistModeChange() {
  if (!uiState.currentGenerationPlayers.length) return;
  const teamCount = parseInt(document.getElementById('teamCount').value, 10);
  if (!teamCount || teamCount < 2) return;
  const prev = getCurrentAssignmentState();
  renderAssignmentTable(teamCount, prev);
}
