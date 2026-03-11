/* ============================================================
   TEAMNAMEN & FARBEN
   ============================================================*/
function renderTeamNameEditor(teamCount) {
  const editor = document.getElementById('teamNameEditor');
  const list = document.getElementById('teamNameList');
  editor.style.display = 'block';
  list.innerHTML = '';
  list.style.cssText =
    'display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.5rem;';

  for (let i = 0; i < teamCount; i++) {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:.5rem;align-items:center;';

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.value = `Team ${i + 1}`;
    nameInput.dataset.idx = i;
    nameInput.addEventListener('input', (e) => {
      syncTeamNamesToAssignmentTable();
    });

    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.dataset.idx = i;
    colorInput.value =
      '#' +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, '0');
    colorInput.style.maxWidth = '60px';

    row.append(nameInput, colorInput);
    list.appendChild(row);
  }

  syncTeamNamesToAssignmentTable();
}

function syncTeamNamesToAssignmentTable() {
  const names = {};
  document.querySelectorAll('#teamNameList input[type=text]').forEach((inp) => {
    const i = inp.dataset.idx;
    const fallback = `Team ${parseInt(i, 10) + 1}`;
    names[i] = inp.value.trim() || fallback;
  });

  document.querySelectorAll('#assignmentTable select').forEach((sel) => {
    sel.querySelectorAll('option').forEach((opt) => {
      if (opt.value === '') return;
      const name = names[opt.value] || `Team ${parseInt(opt.value, 10) + 1}`;
      opt.textContent = name;
    });
  });
}

function getTeamNameConfig() {
  const names = {};
  const colors = {};

  document.querySelectorAll('#teamNameList input[type=text]').forEach((inp) => {
    const i = inp.dataset.idx;
    names[i] = inp.value.trim() || `Team ${parseInt(i, 10) + 1}`;
  });

  document.querySelectorAll('#teamNameList input[type=color]').forEach((inp) => {
    const i = inp.dataset.idx;
    colors[i] = inp.value;
  });

  return { names, colors };
}

function applyPrevTeamConfig(prev) {
  if (!prev) return;
  document.querySelectorAll('#teamNameList input[type=text]').forEach((inp) => {
    const i = inp.dataset.idx;
    if (prev.names && prev.names[i]) inp.value = prev.names[i];
  });
  document.querySelectorAll('#teamNameList input[type=color]').forEach((inp) => {
    const i = inp.dataset.idx;
    if (prev.colors && prev.colors[i]) inp.value = prev.colors[i];
  });

  syncTeamNamesToAssignmentTable();
}
