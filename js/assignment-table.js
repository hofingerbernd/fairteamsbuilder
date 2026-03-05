/* ============================================================
   ASSIGNMENT-TABELLE (Checkbox „dabei?" + Team-Dropdown)
   ============================================================*/
function renderAssignmentTable(teamCount, prevState) {
  const table = document.getElementById('assignmentTable');
  const mode = getDistMode();
  table.innerHTML = '';

  const head = `
    <thead>
      <tr>
        <th>Dabei?</th>
        <th>Spieler</th>
        <th>Stärke</th>
        <th>Pool</th>
        <th id="teamHeaderCell">Team (nur Modus b)</th>
      </tr>
    </thead>`;
  table.insertAdjacentHTML('beforeend', head);

  const tbody = document.createElement('tbody');

  uiState.currentGenerationPlayers.forEach((p) => {
    const tr = document.createElement('tr');

    const st = prevState ? prevState[p.id] : null;

    // Checkbox
    const tdCheck = document.createElement('td');
    const check = document.createElement('input');
    check.type = 'checkbox';
    check.dataset.pid = p.id;
    check.checked = st ? st.active !== false : true;
    tdCheck.appendChild(check);
    tr.appendChild(tdCheck);

    // Name / Skill / Pool
    tr.insertAdjacentHTML(
      'beforeend',
      `
      <td>${p.name}</td>
      <td>${p.skill}</td>
      <td>${p.poolName}</td>
    `
    );

    // Team-Auswahl
    const tdTeam = document.createElement('td');
    const sel = document.createElement('select');
    sel.dataset.pid = p.id;
    sel.innerHTML =
      `<option value="">---</option>` +
      Array.from(
        { length: teamCount },
        (_, i) => `<option value="${i}">Team ${i + 1}</option>`
      ).join('');

    const prevIdx = st ? st.teamIndex : null;
    if (prevIdx !== null && prevIdx !== undefined && prevIdx < teamCount) {
      sel.value = String(prevIdx);
    }

    sel.disabled = mode !== 'manual';

    tdTeam.appendChild(sel);
    tr.appendChild(tdTeam);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
}

function getCurrentAssignmentState() {
  const map = {};

  document.querySelectorAll('#assignmentTable input[type=checkbox]').forEach((ch) => {
    const pid = parseInt(ch.dataset.pid, 10);
    if (!map[pid]) map[pid] = {};
    map[pid].active = ch.checked;
  });

  document.querySelectorAll('#assignmentTable select').forEach((sel) => {
    const pid = parseInt(sel.dataset.pid, 10);
    if (!map[pid]) map[pid] = {};
    map[pid].teamIndex = sel.value === '' ? null : parseInt(sel.value, 10);
  });

  return map;
}
