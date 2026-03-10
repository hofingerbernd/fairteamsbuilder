/* ============================================================
   TEAMS GENERIEREN (Modus A & B)
   ============================================================*/
function generateTeams() {
  const teamCount = parseInt(document.getElementById('teamCount').value, 10);
  if (!teamCount || teamCount < 2) {
    setStatus('Bitte mindestens 2 Teams angeben.', 'error');
    return;
  }
  if (!uiState.currentGenerationPlayers.length) {
    setStatus('Bitte zuerst Spieler laden.', 'error');
    return;
  }

  const mode = getDistMode();
  const assignState = getCurrentAssignmentState();

  // aktive Spieler
  const activePlayers = uiState.currentGenerationPlayers.filter((p) => {
    const st = assignState[p.id];
    return !st || st.active !== false;
  });

  if (activePlayers.length < teamCount) {
    setStatus('Zu wenige aktive Spieler: mindestens 1 Spieler pro Team.', 'error');
    return;
  }

  const total = activePlayers.length;

  // gewünschte Größen so verteilen, dass die Differenz ≤ 1 ist
  const base = Math.floor(total / teamCount);
  const remainder = total % teamCount;
  const desiredSizes = Array.from({ length: teamCount }, (_, i) => base + (i < remainder ? 1 : 0));

  // Teams + aktuelle Größen
  const teams = Array.from({ length: teamCount }, (_, i) => ({
    name: `Team ${i + 1}`,
    players: []
  }));
  const sizes = Array(teamCount).fill(0);

  let unassigned = [];

  if (mode === 'manual') {
    // manuelle Zuweisungen auswerten
    for (const p of activePlayers) {
      const st = assignState[p.id];
      if (st && st.teamIndex !== null && st.teamIndex !== undefined && st.teamIndex < teamCount) {
        const tIdx = st.teamIndex;
        if (sizes[tIdx] >= desiredSizes[tIdx]) {
          setStatus(
            `Zu viele manuelle Zuweisungen in Team ${tIdx + 1} (max. ${desiredSizes[tIdx]}).`,
            'error'
          );
          return;
        }
        teams[tIdx].players.push(p);
        sizes[tIdx]++;
      } else {
        unassigned.push(p);
      }
    }
  } else {
    // fairer Modus: keine manuellen Teamzuweisungen, alles in unassigned
    unassigned = activePlayers.slice();
  }

  // Reihenfolge der restlichen Spieler
  let autoList = [];
  if (mode === 'fair') {
    // Spielstärken fair über Teams verteilen: nach Skill gruppieren, jede Gruppe mischen
    const groups = { 1: [], 2: [], 3: [], 4: [] };
    unassigned.forEach((p) => {
      if (!groups[p.skill]) groups[4].push(p);
      else groups[p.skill].push(p);
    });
    for (let s = 1; s <= 4; s++) {
      groups[s] = shuffle(groups[s]);
    }
    autoList = [...groups[1], ...groups[2], ...groups[3], ...groups[4]];
  } else {
    // Modus B: Rest reiner Zufall
    autoList = shuffle(unassigned);
  }

  // Rest verteilen: immer bevorzugt an Teams mit aktuell geringster Größe,
  // aber niemals über die gewünschte Größe hinaus.
  for (const p of autoList) {
    const candidates = [];
    for (let i = 0; i < teamCount; i++) {
      if (sizes[i] < desiredSizes[i]) candidates.push(i);
    }
    if (!candidates.length) {
      setStatus('Interner Fehler bei der Teamverteilung.', 'error');
      return;
    }

    // Wähle unter den Kandidaten eines mit der momentan kleinsten Teamgröße (Balancer)
    let minSize = Infinity;
    candidates.forEach((i) => {
      if (sizes[i] < minSize) minSize = sizes[i];
    });
    const minCandidates = candidates.filter((i) => sizes[i] === minSize);
    const tIdx = minCandidates[Math.floor(Math.random() * minCandidates.length)];

    teams[tIdx].players.push(p);
    sizes[tIdx]++;
  }

  const cfg = getTeamNameConfig();
  uiState.lastTeams = {
    teams,
    namesConfig: cfg.names,
    colorsConfig: cfg.colors,
    generatedAt: Date.now()
  };

  renderTeamsResult(teams, cfg);
  setStatus('Teams erfolgreich generiert.', 'success');
}

/* ============================================================
   ERGEBNIS RENDERING
   ============================================================*/
function renderTeamsResult(teams, cfg) {
  const grid = document.getElementById('teamsGrid');
  const sum = document.getElementById('teamsSummary');

  sum.textContent = '';
  grid.innerHTML = '';

  teams.forEach((t, i) => {
    const card = document.createElement('div');
    card.className = 'team-card';
    const col = cfg.colors[i] || '#2563eb';
    card.style.borderLeft = `6px solid ${col}`;

    const title = document.createElement('h4');
    title.textContent = cfg.names[i] || `Team ${i + 1}`;

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = t.players.length;
    title.appendChild(badge);

    const ul = document.createElement('ul');
    ul.style.margin = '0';
    ul.style.padding = '0';

    // Shuffled display: Spieler in zufälliger Reihenfolge anzeigen
    const shuffledPlayers = shuffle(t.players);
    shuffledPlayers.forEach((p) => {
      const li = document.createElement('li');
      li.style.listStyle = 'none';
      li.textContent = `${p.name} (St.${p.skill})`;
      ul.appendChild(li);
    });

    card.append(title, ul);
    grid.appendChild(card);
  });

  document.getElementById('teamsResult').style.display = 'block';
  const resultHint = document.getElementById('builderResultHint');
  if (resultHint) resultHint.style.display = 'none';

  if (typeof window.setBuilderFormPage === 'function') {
    window.setBuilderFormPage(3);
  }
}
