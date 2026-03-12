let uiState = {
  currentCategoryId: null,
  currentPoolId: null
};

let statusTimer = null;

function setStatus(message, type = 'info', timeoutMs = 3500) {
  const box = document.getElementById('statusMessage');
  if (!box) return;
  box.textContent = message;
  box.classList.remove('info', 'success', 'error');
  box.classList.add('show', type);
  if (statusTimer) clearTimeout(statusTimer);
  if (timeoutMs > 0) {
    statusTimer = setTimeout(() => {
      box.classList.remove('show', 'info', 'success', 'error');
      box.textContent = '';
    }, timeoutMs);
  }
}

function renderOverview() {
  const categories = state.categories || [];
  let pools = 0;
  let players = 0;
  categories.forEach((cat) => {
    pools += (cat.pools || []).length;
    (cat.pools || []).forEach((pool) => {
      players += (pool.players || []).length;
    });
  });

  document.getElementById('statCategories').textContent = String(categories.length);
  document.getElementById('statPools').textContent = String(pools);
  document.getElementById('statPlayers').textContent = String(players);
}

function disablePoolInputs() {
  document.getElementById('poolInput').disabled = true;
  document.getElementById('addPoolBtn').disabled = true;
  document.getElementById('poolHint').textContent = 'Wähle zuerst eine Kategorie.';
  document.getElementById('poolList').innerHTML = '<li class="muted">Keine Pools vorhanden.</li>';
  disablePlayerInputs();
}

function disablePlayerInputs() {
  document.getElementById('playerBulkInput').disabled = true;
  document.getElementById('skillSelect').disabled = true;
  document.getElementById('addPlayersBtn').disabled = true;
  document.getElementById('playerHint').textContent = 'Wähle zuerst einen Pool.';
  document.getElementById('playerList').innerHTML = '<li class="muted">Keine Spieler im Pool.</li>';
}

function renderCategories() {
  const list = document.getElementById('categoryList');
  list.innerHTML = '';

  if (!state.categories.length) {
    list.innerHTML = '<li class="muted">Keine Kategorien vorhanden.</li>';
    uiState.currentCategoryId = null;
    uiState.currentPoolId = null;
    disablePoolInputs();
    renderOverview();
    return;
  }

  state.categories.forEach((cat) => {
    const li = document.createElement('li');

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'category';
    radio.value = cat.id;
    radio.checked = cat.id === uiState.currentCategoryId;
    radio.addEventListener('change', () => {
      uiState.currentCategoryId = cat.id;
      uiState.currentPoolId = null;
      renderPools();
    });

    const label = document.createElement('span');
    label.className = 'item-label';
    label.textContent = cat.name;

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = `${(cat.pools || []).length} Pools`;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'secondary small';
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = prompt('Neuer Kategoriename:', cat.name);
      if (next === null) return;
      const trimmed = next.trim();
      if (!trimmed) {
        setStatus('Name darf nicht leer sein.', 'error');
        return;
      }
      editCategoryName(cat.id, trimmed);
      renderCategories();
      setStatus('Kategorie aktualisiert.', 'success');
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger small';
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`Kategorie "${cat.name}" wirklich löschen?`)) return;
      deleteCategory(cat.id);
      if (uiState.currentCategoryId === cat.id) {
        uiState.currentCategoryId = null;
        uiState.currentPoolId = null;
      }
      renderCategories();
      setStatus('Kategorie gelöscht.', 'info');
    });

    actions.append(editBtn, deleteBtn);
    li.append(radio, label, badge, actions);
    list.appendChild(li);
  });

  if (!uiState.currentCategoryId) {
    uiState.currentCategoryId = state.categories[0].id;
  }

  renderPools();
  renderOverview();
}

function renderPools() {
  const list = document.getElementById('poolList');
  list.innerHTML = '';

  const category = getCategoryById(uiState.currentCategoryId);
  if (!category) {
    disablePoolInputs();
    renderOverview();
    return;
  }

  document.getElementById('poolInput').disabled = false;
  document.getElementById('addPoolBtn').disabled = false;
  document.getElementById('poolHint').textContent = `Pools in: ${category.name}`;

  const pools = category.pools || [];
  if (!pools.length) {
    list.innerHTML = '<li class="muted">Keine Pools in dieser Kategorie.</li>';
    uiState.currentPoolId = null;
    disablePlayerInputs();
    renderOverview();
    return;
  }

  pools.forEach((pool) => {
    const li = document.createElement('li');

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'pool';
    radio.value = pool.id;
    radio.checked = pool.id === uiState.currentPoolId;
    radio.addEventListener('change', () => {
      uiState.currentPoolId = pool.id;
      renderPlayers();
    });

    const label = document.createElement('span');
    label.className = 'item-label';
    label.textContent = pool.name;

    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = `${(pool.players || []).length} Spieler`;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'secondary small';
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const next = prompt('Neuer Pool-Name:', pool.name);
      if (next === null) return;
      const trimmed = next.trim();
      if (!trimmed) {
        setStatus('Name darf nicht leer sein.', 'error');
        return;
      }
      editPoolName(uiState.currentCategoryId, pool.id, trimmed);
      renderPools();
      setStatus('Pool aktualisiert.', 'success');
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger small';
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`Pool "${pool.name}" wirklich löschen?`)) return;
      deletePool(uiState.currentCategoryId, pool.id);
      if (uiState.currentPoolId === pool.id) {
        uiState.currentPoolId = null;
      }
      renderPools();
      setStatus('Pool gelöscht.', 'info');
    });

    actions.append(editBtn, deleteBtn);
    li.append(radio, label, badge, actions);
    list.appendChild(li);
  });

  if (!uiState.currentPoolId) {
    uiState.currentPoolId = pools[0].id;
  }

  renderPlayers();
  renderOverview();
}

function renderPlayers() {
  const list = document.getElementById('playerList');
  list.innerHTML = '';

  const category = getCategoryById(uiState.currentCategoryId);
  const pool = category ? (category.pools || []).find((p) => p.id === uiState.currentPoolId) : null;

  if (!pool) {
    disablePlayerInputs();
    renderOverview();
    return;
  }

  document.getElementById('playerBulkInput').disabled = false;
  document.getElementById('skillSelect').disabled = false;
  document.getElementById('addPlayersBtn').disabled = false;
  document.getElementById('playerHint').textContent = `Spieler im Pool: ${pool.name}`;

  const players = pool.players || [];
  if (!players.length) {
    list.innerHTML = '<li class="muted">Keine Spieler im Pool.</li>';
    renderOverview();
    return;
  }

  players.forEach((player) => {
    const li = document.createElement('li');

    const label = document.createElement('span');
    label.className = 'item-label';
    label.textContent = `${player.name} (Stärke ${player.skill})`;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'secondary small';
    editBtn.textContent = '✎';
    editBtn.addEventListener('click', () => {
      const nextName = prompt('Neuer Spielername:', player.name);
      if (nextName === null) return;
      const trimmed = nextName.trim();
      if (!trimmed) {
        setStatus('Name darf nicht leer sein.', 'error');
        return;
      }

      const nextSkillRaw = prompt('Neue Stärke (1-5):', String(player.skill));
      if (nextSkillRaw === null) return;
      const nextSkill = parseInt(nextSkillRaw, 10);
      if (![1, 2, 3, 4, 5].includes(nextSkill)) {
        setStatus('Stärke muss zwischen 1 und 5 liegen.', 'error');
        return;
      }

      updatePlayerInPool(uiState.currentCategoryId, uiState.currentPoolId, player.id, trimmed, nextSkill);
      renderPlayers();
      setStatus('Spieler aktualisiert.', 'success');
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'danger small';
    deleteBtn.textContent = '✕';
    deleteBtn.addEventListener('click', () => {
      if (!confirm(`Spieler "${player.name}" wirklich löschen?`)) return;
      removePlayerFromPool(uiState.currentCategoryId, uiState.currentPoolId, player.id);
      renderPlayers();
      setStatus('Spieler gelöscht.', 'info');
    });

    actions.append(editBtn, deleteBtn);
    li.append(label, actions);
    list.appendChild(li);
  });

  renderOverview();
}

function bindEvents() {
  document.getElementById('addCategoryBtn').addEventListener('click', () => {
    const input = document.getElementById('categoryInput');
    const name = input.value.trim();
    if (!name) {
      setStatus('Bitte einen Kategorienamen eingeben.', 'error');
      return;
    }
    createCategory(name);
    input.value = '';
    if (!uiState.currentCategoryId) uiState.currentCategoryId = state.categories[0].id;
    renderCategories();
    setStatus('Kategorie erstellt.', 'success');
  });

  document.getElementById('addPoolBtn').addEventListener('click', () => {
    const input = document.getElementById('poolInput');
    const name = input.value.trim();
    if (!name) {
      setStatus('Bitte einen Pool-Namen eingeben.', 'error');
      return;
    }
    if (!uiState.currentCategoryId) {
      setStatus('Bitte zuerst eine Kategorie wählen.', 'error');
      return;
    }
    createPool(uiState.currentCategoryId, name);
    input.value = '';
    renderPools();
    setStatus('Pool erstellt.', 'success');
  });

  document.getElementById('addPlayersBtn').addEventListener('click', () => {
    const bulkInput = document.getElementById('playerBulkInput');
    const skillSelect = document.getElementById('skillSelect');
    const lines = String(bulkInput.value || '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const skill = parseInt(skillSelect.value, 10);

    if (!lines.length) {
      setStatus('Bitte mindestens einen Spielernamen eingeben (eine Zeile pro Name).', 'error');
      return;
    }
    if (!uiState.currentCategoryId || !uiState.currentPoolId) {
      setStatus('Bitte zuerst Kategorie und Pool wählen.', 'error');
      return;
    }

    lines.forEach((name) => {
      addPlayerToPool(uiState.currentCategoryId, uiState.currentPoolId, name, skill);
    });
    bulkInput.value = '';
    renderPlayers();
    setStatus(`${lines.length} Spieler übernommen.`, 'success');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadState();
  bindEvents();
  renderCategories();
});
