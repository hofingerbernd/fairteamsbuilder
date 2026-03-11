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
  const teamStrength = Array(teamCount).fill(0);

  let unassigned = [];
  const normalizeSkill = (skill) => {
    const n = Number(skill);
    return Number.isFinite(n) && n >= 1 && n <= 4 ? n : 4;
  };
  const getStrengthPoints = (player) => 5 - normalizeSkill(player.skill);

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
        teamStrength[tIdx] += getStrengthPoints(p);
      } else {
        unassigned.push(p);
      }
    }
  } else {
    // fairer Modus: keine manuellen Teamzuweisungen, alles in unassigned
    unassigned = activePlayers.slice();
  }

  if (mode === 'fair') {
    // Stärke-basiert verteilen:
    // 1er zuerst, dann 2er usw.; jeweils auf aktuell schwächere Teams.
    const groups = { 1: [], 2: [], 3: [], 4: [] };
    unassigned.forEach((p) => {
      const s = normalizeSkill(p.skill);
      groups[s].push(p);
    });

    for (let s = 1; s <= 4; s++) {
      const playersBySkill = shuffle(groups[s]);
      for (const p of playersBySkill) {
        const candidates = [];
        for (let i = 0; i < teamCount; i++) {
          if (sizes[i] < desiredSizes[i]) candidates.push(i);
        }
        if (!candidates.length) {
          setStatus('Interner Fehler bei der Teamverteilung.', 'error');
          return;
        }

        let minStrength = Infinity;
        candidates.forEach((i) => {
          if (teamStrength[i] < minStrength) minStrength = teamStrength[i];
        });
        let best = candidates.filter((i) => teamStrength[i] === minStrength);

        let minSize = Infinity;
        best.forEach((i) => {
          if (sizes[i] < minSize) minSize = sizes[i];
        });
        best = best.filter((i) => sizes[i] === minSize);

        const tIdx = best[Math.floor(Math.random() * best.length)];
        teams[tIdx].players.push(p);
        sizes[tIdx]++;
        teamStrength[tIdx] += getStrengthPoints(p);
      }
    }
  } else {
    // Modus B: Rest reiner Zufall
    const autoList = shuffle(unassigned);
    for (const p of autoList) {
      const candidates = [];
      for (let i = 0; i < teamCount; i++) {
        if (sizes[i] < desiredSizes[i]) candidates.push(i);
      }
      if (!candidates.length) {
        setStatus('Interner Fehler bei der Teamverteilung.', 'error');
        return;
      }

      let minSize = Infinity;
      candidates.forEach((i) => {
        if (sizes[i] < minSize) minSize = sizes[i];
      });
      const minCandidates = candidates.filter((i) => sizes[i] === minSize);
      const tIdx = minCandidates[Math.floor(Math.random() * minCandidates.length)];

      teams[tIdx].players.push(p);
      sizes[tIdx]++;
      teamStrength[tIdx] += getStrengthPoints(p);
    }
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

    const strengthPoints = t.players.reduce((sum, p) => {
      const skill = Number(p.skill);
      const normalized = Number.isFinite(skill) && skill >= 1 && skill <= 4 ? skill : 4;
      return sum + (5 - normalized);
    }, 0);
    const strengthBadge = document.createElement('span');
    strengthBadge.className = 'badge';
    strengthBadge.style.marginLeft = '0.35rem';
    strengthBadge.textContent = `Stärke ${strengthPoints}`;
    title.appendChild(strengthBadge);

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
}
