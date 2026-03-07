/**
 * POOL MANAGER MODULE
 * Zentrale Verwaltung von Kategorien, Pools und Spielern
 * Für Fairteamsbuilder und andere Apps
 */

const STORAGE_KEY_BASE = 'mannschaften_premium_state_v3_categories';
let storageScope = 'signed_out';

let state = {
  categories: [],
  nextCategoryId: 1,
  nextPoolId: 1,
  nextPlayerId: 1,
  sessions: [],
  nextSessionId: 1
};

function createEmptyState() {
  return {
    categories: [],
    nextCategoryId: 1,
    nextPoolId: 1,
    nextPlayerId: 1,
    sessions: [],
    nextSessionId: 1
  };
}

function getStorageKey() {
  return `${STORAGE_KEY_BASE}__${storageScope}`;
}

function setStorageScope(scope) {
  const nextScope = String(scope || '').trim();
  storageScope = nextScope || 'signed_out';
  loadState();
}

/* ============================================================
   STATE & STORAGE
   ============================================================*/
function loadState() {
  try {
    const raw = localStorage.getItem(getStorageKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      state = normalizeImportedState(parsed);
      saveState();
    } else {
      state = createEmptyState();

      if (storageScope === 'signed_out') {
        // Versuche alte Struktur zu migrieren (pools -> default category)
        const oldKey = 'mannschaften_premium_state_v2_modeAB';
        const oldRaw = localStorage.getItem(oldKey);
        if (oldRaw) {
          const oldState = JSON.parse(oldRaw);
          if (oldState.pools && oldState.pools.length > 0) {
            const defaultCategory = {
              id: state.nextCategoryId++,
              name: 'Ungeteilt',
              pools: oldState.pools
            };
            state.categories.push(defaultCategory);
            state.nextPoolId = oldState.nextPoolId || 1;
            state.nextPlayerId = oldState.nextPlayerId || 1;
            state.sessions = oldState.sessions || [];
            state.nextSessionId = oldState.nextSessionId || 1;
            saveState();
          }
        }
      }
    }
  } catch (e) {
    console.warn('Konnte Zustand nicht laden:', e);
  }
}

function saveState() {
  try {
    localStorage.setItem(getStorageKey(), JSON.stringify(state));
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('fairteams:state-saved'));
    }
  } catch (e) {
    console.warn('Konnte Zustand nicht speichern:', e);
  }
}

/* ============================================================
   HELPERS
   ============================================================*/
function getCategoryById(id) {
  return state.categories.find((c) => c.id === id) || null;
}

function getPoolById(id, categoryId = null) {
  if (categoryId !== null) {
    const cat = getCategoryById(categoryId);
    return cat ? cat.pools.find((p) => p.id === id) : null;
  }
  for (const cat of state.categories) {
    const pool = cat.pools.find((p) => p.id === id);
    if (pool) return pool;
  }
  return null;
}

function findPoolCategory(poolId) {
  for (const cat of state.categories) {
    if (cat.pools.find((p) => p.id === poolId)) return cat;
  }
  return null;
}

function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ============================================================
   CATEGORIES & POOLS
   ============================================================*/
function createCategory(name) {
  const cat = {
    id: state.nextCategoryId++,
    name: name.trim(),
    pools: []
  };
  state.categories.push(cat);
  saveState();
  return cat;
}

function deleteCategory(id) {
  state.categories = state.categories.filter((c) => c.id !== id);
  saveState();
}

function editCategoryName(id, newName) {
  const cat = getCategoryById(id);
  if (cat) {
    cat.name = newName.trim();
    saveState();
  }
}

function createPool(categoryId, name) {
  const cat = getCategoryById(categoryId);
  if (!cat) return null;
  const pool = {
    id: state.nextPoolId++,
    name: name.trim(),
    players: []
  };
  cat.pools.push(pool);
  saveState();
  return pool;
}

function deletePool(categoryId, poolId) {
  const cat = getCategoryById(categoryId);
  if (!cat) return;
  cat.pools = cat.pools.filter((p) => p.id !== poolId);
  saveState();
}

function editPoolName(categoryId, poolId, newName) {
  const cat = getCategoryById(categoryId);
  if (!cat) return;
  const pool = cat.pools.find((p) => p.id === poolId);
  if (pool) {
    pool.name = newName.trim();
    saveState();
  }
}

function movePoolToCategory(poolId, fromCategoryId, toCategoryId) {
  const fromCat = getCategoryById(fromCategoryId);
  const toCat = getCategoryById(toCategoryId);
  if (!fromCat || !toCat) return;

  const pool = fromCat.pools.find((p) => p.id === poolId);
  if (!pool) return;

  fromCat.pools = fromCat.pools.filter((p) => p.id !== poolId);
  toCat.pools.push(pool);
  saveState();
}

function addPlayerToPool(categoryId, poolId, name, skill) {
  const cat = getCategoryById(categoryId);
  if (!cat) return;
  const pool = cat.pools.find((p) => p.id === poolId);
  if (!pool) return;
  pool.players.push({
    id: state.nextPlayerId++,
    name: name.trim(),
    skill: skill
  });
  saveState();
}

function removePlayerFromPool(categoryId, poolId, playerId) {
  const cat = getCategoryById(categoryId);
  if (!cat) return;
  const pool = cat.pools.find((p) => p.id === poolId);
  if (!pool) return;
  pool.players = pool.players.filter((p) => p.id !== playerId);
  saveState();
}

function updatePlayerInPool(categoryId, poolId, playerId, newName, newSkill) {
  const cat = getCategoryById(categoryId);
  if (!cat) return;
  const pool = cat.pools.find((p) => p.id === poolId);
  if (!pool) return;
  const player = pool.players.find((p) => p.id === playerId);
  if (player) {
    player.name = newName.trim();
    player.skill = newSkill;
    saveState();
  }
}

/* ============================================================
   EXPORT / IMPORT HELPERS
   ============================================================*/
function getCategoriesExportObject() {
  return {
    exportedAt: new Date().toISOString(),
    categories: (state.categories || []).map((cat) => ({
      id: cat.id,
      name: cat.name,
      pools: (cat.pools || []).map((pool) => ({
        id: pool.id,
        name: pool.name,
        players: (pool.players || []).map((p) => ({
          id: p.id,
          name: p.name,
          skill: p.skill
        }))
      }))
    }))
  };
}

function applyImportedCategories(categoriesArr) {
  if (!Array.isArray(categoriesArr)) throw new Error('categories is not an array');
  const normalized = normalizeCategories(categoriesArr);

  state.categories = normalized.categories;
  state.nextCategoryId = normalized.nextCategoryId;
  state.nextPoolId = normalized.nextPoolId;
  state.nextPlayerId = normalized.nextPlayerId;

  saveState();
}

function isValidPositiveInt(v) {
  return Number.isInteger(v) && v > 0;
}

function normalizeSkill(v) {
  const n = parseInt(v, 10);
  return n >= 1 && n <= 4 ? n : 3;
}

function normalizeCategories(categoriesArr) {
  let nextCategoryId = 1;
  let nextPoolId = 1;
  let nextPlayerId = 1;

  const rawCategories = Array.isArray(categoriesArr) ? categoriesArr : [];

  const categories = rawCategories.map((cat, idx) => {
    const fallbackCatId = nextCategoryId;
    const catId = cat && isValidPositiveInt(cat.id) ? cat.id : fallbackCatId;
    nextCategoryId = Math.max(nextCategoryId, catId + 1);

    const rawName = cat && typeof cat.name === 'string' ? cat.name.trim() : '';
    const catName = rawName || `Kategorie ${catId}`;
    const poolsRaw = Array.isArray(cat && cat.pools) ? cat.pools : [];

    const pools = poolsRaw.map((pool) => {
      const fallbackPoolId = nextPoolId;
      const poolId = pool && isValidPositiveInt(pool.id) ? pool.id : fallbackPoolId;
      nextPoolId = Math.max(nextPoolId, poolId + 1);

      const rawPoolName = pool && typeof pool.name === 'string' ? pool.name.trim() : '';
      const poolName = rawPoolName || `Pool ${poolId}`;
      const playersRaw = Array.isArray(pool && pool.players) ? pool.players : [];

      const players = playersRaw.map((p) => {
        const fallbackPlayerId = nextPlayerId;
        const playerId = p && isValidPositiveInt(p.id) ? p.id : fallbackPlayerId;
        nextPlayerId = Math.max(nextPlayerId, playerId + 1);

        const rawPlayerName = p && typeof p.name === 'string' ? p.name.trim() : '';
        const playerName = rawPlayerName || `Spieler ${playerId}`;

        return {
          id: playerId,
          name: playerName,
          skill: normalizeSkill(p && p.skill)
        };
      });

      return {
        id: poolId,
        name: poolName,
        players
      };
    });

    return {
      id: catId,
      name: catName,
      pools
    };
  });

  return {
    categories,
    nextCategoryId,
    nextPoolId,
    nextPlayerId
  };
}

function normalizeSessionData(rawData) {
  if (!rawData || typeof rawData !== 'object') return null;

  const teamsRaw = Array.isArray(rawData.teams) ? rawData.teams : [];
  if (!teamsRaw.length) return null;

  const teams = teamsRaw.map((team, idx) => {
    const rawTeamName = team && typeof team.name === 'string' ? team.name.trim() : '';
    const teamName = rawTeamName || `Team ${idx + 1}`;
    const playersRaw = Array.isArray(team && team.players) ? team.players : [];

    const players = playersRaw.map((p, pIdx) => {
      const fallbackName = `Spieler ${pIdx + 1}`;
      const rawPlayerName = p && typeof p.name === 'string' ? p.name.trim() : '';
      const playerName = rawPlayerName || fallbackName;
      const playerId = p && isValidPositiveInt(p.id) ? p.id : pIdx + 1;
      return {
        id: playerId,
        name: playerName,
        skill: normalizeSkill(p && p.skill)
      };
    });

    return {
      name: teamName,
      players
    };
  });

  const namesConfig = {};
  const rawNames =
    rawData.namesConfig && typeof rawData.namesConfig === 'object' ? rawData.namesConfig : {};
  Object.keys(rawNames).forEach((k) => {
    const v = rawNames[k];
    if (typeof v === 'string' && v.trim()) namesConfig[k] = v.trim();
  });

  const colorsConfig = {};
  const rawColors =
    rawData.colorsConfig && typeof rawData.colorsConfig === 'object' ? rawData.colorsConfig : {};
  Object.keys(rawColors).forEach((k) => {
    const v = rawColors[k];
    if (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) colorsConfig[k] = v;
  });

  const generatedAt = Number.isFinite(rawData.generatedAt) ? rawData.generatedAt : Date.now();

  return {
    teams,
    namesConfig,
    colorsConfig,
    generatedAt
  };
}

function normalizeSessions(sessionsArr) {
  let nextSessionId = 1;
  const rawSessions = Array.isArray(sessionsArr) ? sessionsArr : [];
  const sessions = [];

  rawSessions.forEach((sess, idx) => {
    const data = normalizeSessionData(sess && sess.data);
    if (!data) return;

    const fallbackSessionId = nextSessionId;
    const id = sess && isValidPositiveInt(sess.id) ? sess.id : fallbackSessionId;
    nextSessionId = Math.max(nextSessionId, id + 1);

    const rawName = sess && typeof sess.name === 'string' ? sess.name.trim() : '';
    const name = rawName || `Session ${id}`;
    const timestamp = sess && Number.isFinite(sess.timestamp) ? sess.timestamp : Date.now();

    sessions.push({
      id,
      name,
      timestamp,
      data
    });
  });

  return { sessions, nextSessionId };
}

function normalizeImportedState(rawState) {
  if (!rawState || typeof rawState !== 'object') {
    throw new Error('Ungültiger State: Objekt erwartet.');
  }

  const base = createEmptyState();
  const catNorm = normalizeCategories(rawState.categories);
  const sessNorm = normalizeSessions(rawState.sessions);

  return {
    categories: catNorm.categories,
    nextCategoryId: Math.max(base.nextCategoryId, catNorm.nextCategoryId),
    nextPoolId: Math.max(base.nextPoolId, catNorm.nextPoolId),
    nextPlayerId: Math.max(base.nextPlayerId, catNorm.nextPlayerId),
    sessions: sessNorm.sessions,
    nextSessionId: Math.max(base.nextSessionId, sessNorm.nextSessionId)
  };
}

function applyImportedState(rawState) {
  state = normalizeImportedState(rawState);
  saveState();
}

function csvEscape(value, sep) {
  const s = String(value ?? '');
  if (s.includes('"') || s.includes('\n') || s.includes('\r') || s.includes(sep)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function detectCsvSeparator(firstLine) {
  const semis = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  if (tabs >= semis && tabs >= commas) return '\t';
  if (semis >= commas) return ';';
  return ',';
}

function parseCsvLine(line, sep) {
  const out = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQ = true;
      else if (ch === sep) {
        out.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
  }
  out.push(cur.trim());
  return out;
}

function exportCategoriesAsCSV() {
  const sep = ';';
  const lines = [];
  lines.push(['Kategorie', 'Pool', 'Spieler', 'Stärke'].join(sep));

  (state.categories || []).forEach((cat) => {
    (cat.pools || []).forEach((pool) => {
      (pool.players || []).forEach((p) => {
        lines.push(
          [
            csvEscape(cat.name, sep),
            csvEscape(pool.name, sep),
            csvEscape(p.name, sep),
            csvEscape(p.skill, sep)
          ].join(sep)
        );
      });

      if (!pool.players || !pool.players.length) {
        lines.push([csvEscape(cat.name, sep), csvEscape(pool.name, sep), '', ''].join(sep));
      }
    });

    if (!cat.pools || !cat.pools.length) {
      lines.push([csvEscape(cat.name, sep), '', '', ''].join(sep));
    }
  });

  return '\ufeff' + lines.join('\r\n');
}

function importCategoriesFromCSV(text) {
  // BOM entfernen
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rawLines = text.split(/\r?\n/).map((l) => l.trimEnd());
  const lines = rawLines.filter((l) => l.trim().length > 0);
  if (!lines.length) {
    throw new Error('CSV ist leer.');
  }

  const sep = detectCsvSeparator(lines[0]);
  let startIdx = 0;

  const header = lines[0].toLowerCase();
  if (header.includes('kategorie')) {
    startIdx = 1;
  }

  const categoryMap = new Map();
  for (let i = startIdx; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i], sep);
    const categoryName = (cols[0] || '').trim();
    const poolName = (cols[1] || '').trim();
    const playerName = (cols[2] || '').trim();
    const skillRaw = (cols[3] || '').trim();

    if (!categoryName) continue;

    if (!categoryMap.has(categoryName)) {
      categoryMap.set(categoryName, new Map());
    }

    const poolsMap = categoryMap.get(categoryName);

    if (poolName) {
      if (!poolsMap.has(poolName)) {
        poolsMap.set(poolName, []);
      }

      if (playerName) {
        const skillNum = parseInt(skillRaw, 10);
        const safeSkill = skillNum >= 1 && skillNum <= 4 ? skillNum : 3;
        poolsMap.get(poolName).push({ name: playerName, skill: safeSkill });
      }
    }
  }

  const categories = [];
  let catId = 1;
  let poolId = 1;
  let playerId = 1;

  for (const [catName, poolsMap] of categoryMap.entries()) {
    const cat = { id: catId++, name: catName, pools: [] };

    for (const [poolName, players] of poolsMap.entries()) {
      const pool = { id: poolId++, name: poolName, players: [] };
      players.forEach((p) => {
        pool.players.push({ id: playerId++, name: p.name, skill: p.skill });
      });
      cat.pools.push(pool);
    }

    categories.push(cat);
  }

  applyImportedCategories(categories);
}

/* ============================================================
   SESSIONS
   ============================================================*/
function saveSession(name, teamsData) {
  state.sessions.push({
    id: state.nextSessionId++,
    name,
    timestamp: Date.now(),
    data: teamsData
  });
  saveState();
}

function getState() {
  return state;
}

// Initialisiere State beim Laden
loadState();
