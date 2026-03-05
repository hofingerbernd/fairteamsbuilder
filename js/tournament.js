/* ============================================================
   TURNIER (mit Match-Erfassung + Tabelle)
   ============================================================*/
function initTournament() {
  const last = uiState.lastTeams;
  if (!last) {
    setStatus('Bitte zuerst Teams generieren.', 'error');
    return;
  }

  const namesCfg = last.namesConfig;
  const teams = last.teams.map((t, i) => ({
    id: i,
    name: namesCfg[i] || t.name,
    originalTeam: t
  }));

  // Round-Robin: alle Teams gegen alle (nur einmal)
  const matches = [];
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        id: matches.length,
        team1: teams[i],
        team2: teams[j],
        winner: null,
        goals1: 0,
        goals2: 0
      });
    }
  }

  uiState.tournament = {
    teams,
    matches,
    namesConfig: namesCfg
  };

  renderTournament();
}

function renderTournament() {
  const t = uiState.tournament;
  if (!t) return;

  const list = document.getElementById('tournamentList');
  list.innerHTML = '';

  // Matches
  const matchesContainer = document.createElement('div');
  matchesContainer.id = 'tournamentMatches';

  const h3 = document.createElement('h3');
  h3.textContent = 'Spiele';
  const hint = document.createElement('span');
  hint.className = 'muted';
  hint.style.fontSize = '.85rem';
  hint.style.marginLeft = '.6rem';
  hint.textContent =
    ' Um eine Tabelle zu erhalten, klicke das Ergebnis an. Wenn auch Tore/Punkte eingegeben werden, dann wird auch eine Tore/Punktedifferenz errechnet.';
  h3.appendChild(hint);
  matchesContainer.appendChild(h3);

  t.matches.forEach((m) => {
    const card = document.createElement('div');
    card.style.cssText =
      'border:1px solid var(--border);border-radius:.5rem;padding:.6rem;margin-bottom:.5rem;background:var(--card);';

    const top = document.createElement('div');
    top.style.display = 'flex';
    top.style.gap = '.3rem';
    top.style.alignItems = 'center';

    const t1Name = document.createElement('span');
    t1Name.textContent = m.team1.name;
    t1Name.style.flex = '1';
    t1Name.style.fontWeight = '600';

    const vs = document.createElement('span');
    vs.textContent = 'vs';
    vs.style.fontSize = '.75rem';
    vs.style.color = 'var(--text-muted)';

    const t2Name = document.createElement('span');
    t2Name.textContent = m.team2.name;
    t2Name.style.flex = '1';
    t2Name.style.fontWeight = '600';
    t2Name.style.textAlign = 'right';

    top.append(t1Name, vs, t2Name);
    card.appendChild(top);

    // Buttons für Sieger
    const buttons = document.createElement('div');
    buttons.style.display = 'flex';
    buttons.style.gap = '.3rem';
    buttons.style.marginTop = '.4rem';

    const btn1 = document.createElement('button');
    btn1.className = 'secondary small';
    btn1.textContent = m.team1.name + ' gewinnt';
    btn1.style.flex = '1';
    btn1.style.opacity = m.winner === 1 ? '1' : '0.6';
    btn1.addEventListener('click', () => {
      m.winner = 1;
      renderTournament();
    });
    buttons.appendChild(btn1);

    const btnDraw = document.createElement('button');
    btnDraw.className = 'secondary small';
    btnDraw.textContent = 'Unentschieden';
    btnDraw.style.opacity = m.winner === 0 ? '1' : '0.6';
    btnDraw.addEventListener('click', () => {
      m.winner = 0;
      renderTournament();
    });
    buttons.appendChild(btnDraw);

    const btn2 = document.createElement('button');
    btn2.className = 'secondary small';
    btn2.textContent = m.team2.name + ' gewinnt';
    btn2.style.flex = '1';
    btn2.style.opacity = m.winner === 2 ? '1' : '0.6';
    btn2.addEventListener('click', () => {
      m.winner = 2;
      renderTournament();
    });
    buttons.appendChild(btn2);

    card.appendChild(buttons);

    // Ergebnisse (optional)
    const goalsRow = document.createElement('div');
    goalsRow.style.cssText = 'display:flex;gap:.3rem;margin-top:.4rem;align-items:center;';

    const g1 = document.createElement('input');
    g1.type = 'number';
    g1.min = '0';
    g1.placeholder = '0';
    g1.value = m.goals1 ?? 0;
    g1.style.flex = '1';
    g1.style.maxWidth = '50px';
    g1.addEventListener('change', () => {
      m.goals1 = g1.value ? parseInt(g1.value, 10) : 0;
      renderTournament();
    });

    const goalsVs = document.createElement('span');
    goalsVs.textContent = ':';
    goalsVs.style.textAlign = 'center';

    const g2 = document.createElement('input');
    g2.type = 'number';
    g2.min = '0';
    g2.placeholder = '0';
    g2.value = m.goals2 ?? 0;
    g2.style.flex = '1';
    g2.style.maxWidth = '50px';
    g2.addEventListener('change', () => {
      m.goals2 = g2.value ? parseInt(g2.value, 10) : 0;
      renderTournament();
    });

    goalsRow.append(g1, goalsVs, g2);
    card.appendChild(goalsRow);

    matchesContainer.appendChild(card);
  });

  list.appendChild(matchesContainer);

  // Tabelle
  const table = computeRanking(t);
  const tableContainer = document.createElement('div');
  tableContainer.style.marginTop = '1.5rem';

  const h3Table = document.createElement('h3');
  h3Table.textContent = 'Tabelle';
  tableContainer.appendChild(h3Table);

  const tbl = document.createElement('table');
  tbl.style.cssText = 'width:100%;border-collapse:collapse;font-size:.85rem;';

  const thead = document.createElement('thead');
  const thRow = document.createElement('tr');
  ['Platz', 'Team', 'Spiele', 'Punkte', 'Tore', 'Diff.'].forEach((txt) => {
    const th = document.createElement('th');
    th.textContent = txt;
    th.style.cssText =
      'padding:.4rem;text-align:left;border-bottom:2px solid var(--border);font-weight:600;';
    thRow.appendChild(th);
  });
  thead.appendChild(thRow);
  tbl.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.forEach((row, idx) => {
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid var(--border)';

    const cells = [
      String(idx + 1),
      row.teamName,
      String(row.games),
      String(row.points),
      `${row.goalsFor}:${row.goalsAgainst}`,
      String(row.goalDiff)
    ];

    cells.forEach((txt) => {
      const td = document.createElement('td');
      td.textContent = txt;
      td.style.cssText = 'padding:.4rem;';
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  tbl.appendChild(tbody);
  tableContainer.appendChild(tbl);
  list.appendChild(tableContainer);

  list.style.display = 'block';
}

function computeRanking(tournament) {
  const { teams, matches, namesConfig } = tournament;

  // Punkte pro Team
  const stats = {};
  teams.forEach((t) => {
    stats[t.id] = {
      teamId: t.id,
      teamName: t.name,
      games: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      headToHeadMatches: []
    };
  });

  matches.forEach((m) => {
    if (m.winner === null) return;

    const g1 = m.goals1 ?? 0;
    const g2 = m.goals2 ?? 0;

    const s1 = stats[m.team1.id];
    const s2 = stats[m.team2.id];

    s1.games++;
    s2.games++;
    s1.goalsFor += g1;
    s1.goalsAgainst += g2;
    s2.goalsFor += g2;
    s2.goalsAgainst += g1;

    s1.headToHeadMatches.push({
      opponentId: m.team2.id,
      opponentName: m.team2.name,
      goals: g1,
      goalsAgainst: g2,
      result: m.winner
    });
    s2.headToHeadMatches.push({
      opponentId: m.team1.id,
      opponentName: m.team1.name,
      goals: g2,
      goalsAgainst: g1,
      result: m.winner === 1 ? 2 : m.winner === 2 ? 1 : 0
    });

    if (m.winner === 1) {
      s1.wins++;
      s1.points += 3;
      s2.losses++;
    } else if (m.winner === 2) {
      s2.wins++;
      s2.points += 3;
      s1.losses++;
    } else if (m.winner === 0) {
      s1.draws++;
      s1.points += 1;
      s2.draws++;
      s2.points += 1;
    }
  });

  // goalDiff berechnen
  Object.values(stats).forEach((s) => {
    s.goalDiff = s.goalsFor - s.goalsAgainst;
  });

  // Sortieren: Punkte → Tordifferenz → Direkter Vergleich
  const ranking = Object.values(stats).sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.goalDiff !== b.goalDiff) return b.goalDiff - a.goalDiff;

    // Direkter Vergleich
    return compareHeadToHead(a, b);
  });

  return ranking;
}

function compareHeadToHead(teamA, teamB) {
  let directMatch = null;
  for (const m of teamA.headToHeadMatches) {
    if (m.opponentId === teamB.teamId) {
      directMatch = m;
      break;
    }
  }

  if (!directMatch) return 0;

  let hh_A_points = 0;
  let hh_B_points = 0;

  if (directMatch.result === 1) hh_A_points = 3;
  else if (directMatch.result === 0) hh_A_points = 1;

  if (directMatch.result === 2) hh_B_points = 3;
  else if (directMatch.result === 0) hh_B_points = 1;

  if (hh_A_points !== hh_B_points) return hh_B_points - hh_A_points;

  const hh_A_diff = directMatch.goals - directMatch.goalsAgainst;
  const hh_B_diff = directMatch.goalsAgainst - directMatch.goals;
  if (hh_A_diff !== hh_B_diff) return hh_B_diff - hh_A_diff;

  return 0;
}

function generateTournament() {
  initTournament();
  if (uiState.tournament) {
    setStatus('Turnier wurde erstellt.', 'success');
  }
}
