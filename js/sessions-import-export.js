/* ============================================================
   SESSIONS / EXPORT
   ============================================================*/
function saveSessionUI() {
  if (!uiState.lastTeams) {
    setStatus('Erst Teams generieren.', 'error');
    return;
  }
  const name = prompt("Name der Speicherung (z.B. 'Training Montag'):");
  if (!name) {
    setStatus('Speichern abgebrochen.', 'info');
    return;
  }

  saveSession(name, uiState.lastTeams);
  renderSessionList();
  setStatus('Session gespeichert.', 'success');
}

function renderSessionList() {
  const area = document.getElementById('savedSessions');
  if (!area) return;
  area.innerHTML = '';

  if (!state.sessions.length) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Noch keine gespeicherten Teamsets.';
    area.appendChild(p);
    return;
  }

  state.sessions.forEach((sess) => {
    const card = document.createElement('div');
    card.style.cssText =
      'border:1px solid var(--border);border-radius:.5rem;padding:.5rem;margin-bottom:.6rem;background:var(--card);';

    const title = document.createElement('div');
    title.style.fontWeight = '600';
    title.textContent = sess.name;

    const time = document.createElement('div');
    time.className = 'muted';
    time.style.fontSize = '.75rem';
    time.textContent = ts(sess.timestamp);

    const btn = document.createElement('button');
    btn.className = 'primary small';
    btn.textContent = 'Laden';
    btn.addEventListener('click', () => {
      uiState.lastTeams = sess.data;
      renderTeamsResult(sess.data.teams, {
        names: sess.data.namesConfig,
        colors: sess.data.colorsConfig
      });
    });

    card.append(title, time, btn);
    area.appendChild(card);
  });
}

function exportTeamsAsText() {
  if (!uiState.lastTeams) {
    setStatus('Bitte zuerst Teams generieren.', 'error');
    return;
  }
  const last = uiState.lastTeams;
  let out = 'Teamverteilung:\n\n';
  last.teams.forEach((t, i) => {
    out += (last.namesConfig[i] || t.name) + ':\n';
    t.players.forEach((p) => {
      out += ` - ${p.name} (St.${p.skill})\n`;
    });
    out += '\n';
  });
  navigator.clipboard
    .writeText(out)
    .then(() => {
      setStatus('Teams in die Zwischenablage kopiert.', 'success');
    })
    .catch(() => {
      setStatus('Kopieren fehlgeschlagen. Bitte Browser-Berechtigung prüfen.', 'error');
    });
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mannschaften_export.json';
  a.click();
}

function importJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(String(e.target.result || ''));
        applyImportedState(imported);

        uiState.currentCategoryId = state.categories.length ? state.categories[0].id : null;
        uiState.currentPoolId = null;
        renderMultiPoolList();
        renderSessionList();
        newDistribution();
        setStatus('JSON-Import erfolgreich.', 'success');
      } catch (err) {
        const msg = err && err.message ? err.message : 'Ungültige JSON-Datei.';
        setStatus('Import fehlgeschlagen: ' + msg, 'error', 5000);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

/* ============================================================
   KATEGORIEN & POOLS EXPORT/IMPORT (JSON + CSV)
   ============================================================*/
function exportCategoriesJSON() {
  const data = getCategoriesExportObject();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kategorien_export.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importCategoriesJSON() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const obj = JSON.parse(e.target.result);

        if (!obj || !Array.isArray(obj.categories)) {
          setStatus("Ungültige JSON-Datei: Keine 'categories'-Liste gefunden.", 'error', 5000);
          return;
        }
        applyImportedCategories(obj.categories);

        // UI aktualisieren
        uiState.currentCategoryId = state.categories.length ? state.categories[0].id : null;
        uiState.currentPoolId = null;
        renderMultiPoolList();
        renderSessionList();
        setStatus('Kategorien importiert (aktuelle Kategorien wurden ersetzt).', 'success');
      } catch {
        setStatus('Ungültige JSON-Datei.', 'error');
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function exportCategoriesCSV() {
  const csv = exportCategoriesAsCSV();
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kategorien_export.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function importCategoriesCSV() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,text/csv';
  input.onchange = () => {
    const file = input.files && input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        let text = String(e.target.result || '');
        importCategoriesFromCSV(text);

        // UI aktualisieren
        uiState.currentCategoryId = state.categories.length ? state.categories[0].id : null;
        uiState.currentPoolId = null;
        renderMultiPoolList();
        renderSessionList();
        setStatus('CSV-Import erfolgreich.', 'success');
      } catch (err) {
        setStatus('CSV konnte nicht importiert werden: ' + err.message, 'error', 5000);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}
