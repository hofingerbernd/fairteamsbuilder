(function initFairteamsAuthCloud(global) {
  const TABLE = 'fairteams_user_states';
  const USERNAME_EMAIL_DOMAIN = 'fairteamsbuilder.app';

  const authState = {
    client: null,
    user: null
  };
  const SIGNED_OUT_SCOPE = 'signed_out';
  let autoSaveTimer = null;
  let isApplyingRemoteState = false;
  let isHydratingCloudState = false;
  let isSaving = false;
  let pendingSave = false;

  function normalizeUsername(input) {
    return String(input || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '')
      .replace(/[^a-z0-9._-]/g, '');
  }

  function toSupabaseEmail(usernameOrEmail) {
    const raw = String(usernameOrEmail || '').trim().toLowerCase();
    if (!raw) return '';
    if (raw.includes('@')) return raw;
    const normalized = normalizeUsername(raw);
    return normalized ? `${normalized}@${USERNAME_EMAIL_DOMAIN}` : '';
  }

  function readCredentials() {
    const usernameOrEmail = String(document.getElementById('authEmail')?.value || '').trim();
    const password = String(document.getElementById('authPassword')?.value || '');
    const email = toSupabaseEmail(usernameOrEmail);
    return { usernameOrEmail, email, password };
  }

  function displayNameFromUser(user) {
    if (!user) return '';
    const metaUsername =
      user.user_metadata && typeof user.user_metadata.username === 'string'
        ? user.user_metadata.username.trim()
        : '';
    if (metaUsername) return metaUsername;
    const email = String(user.email || '').trim();
    if (email.endsWith(`@${USERNAME_EMAIL_DOMAIN}`)) {
      return email.replace(`@${USERNAME_EMAIL_DOMAIN}`, '');
    }
    return email || user.id;
  }

  function setAuthStatus(message, isError) {
    const el = document.getElementById('authStatus');
    if (el) {
      el.textContent = message || '';
      el.style.color = isError ? 'var(--danger)' : 'var(--text-muted)';
    }
    if (typeof global.setStatus === 'function' && message) {
      global.setStatus(message, isError ? 'error' : 'info', 3200);
    }
  }

  function setSyncStatus(message, type = 'info') {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    el.textContent = message || '';
    el.style.color =
      type === 'error'
        ? 'var(--danger)'
        : type === 'success'
          ? 'var(--success)'
          : 'var(--text-muted)';
  }

  function formatTime(ts) {
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function mapAuthErrorMessage(error) {
    const raw = String((error && error.message) || '').trim();
    const lower = raw.toLowerCase();

    if (!raw) return 'Unbekannter Fehler.';
    if (lower.includes('failed to fetch') || lower.includes('network')) {
      return 'Netzwerkfehler. Bitte Internetverbindung prüfen.';
    }
    if (lower.includes('email rate limit exceeded')) {
      return 'Zu viele Registrierungsversuche. Bitte kurz warten und erneut versuchen.';
    }
    if (lower.includes('invalid login credentials')) {
      return 'Benutzername oder Passwort ist falsch.';
    }
    if (lower.includes('user already registered')) {
      return 'Benutzername ist bereits registriert. Bitte anmelden.';
    }
    if (lower.includes('permission denied') || lower.includes('row-level security')) {
      return 'Zugriff verweigert (RLS). Bitte Supabase-Policies prüfen.';
    }
    return raw;
  }

  function formatLoadFailure(result) {
    if (!result) return 'Unbekannter Fehler.';
    if (result.reason === 'query_error' && result.error) {
      return mapAuthErrorMessage(result.error);
    }
    if (result.reason === 'invalid_data' && result.error) {
      return result.error.message || 'Cloud-Daten ungültig.';
    }
    if (result.reason === 'not_authenticated') {
      return 'Nicht angemeldet.';
    }
    return 'Unbekannter Fehler.';
  }

  function getCountsFromStateLike(stateLike) {
    const categories = Array.isArray(stateLike && stateLike.categories) ? stateLike.categories : [];
    let pools = 0;
    categories.forEach((cat) => {
      if (Array.isArray(cat && cat.pools)) pools += cat.pools.length;
    });
    return { categories: categories.length, pools };
  }

  function readConfig() {
    const url = String(global.FAIRTEAMS_SUPABASE_URL || '').trim();
    const key = String(global.FAIRTEAMS_SUPABASE_ANON_KEY || '').trim();
    return { url, key };
  }

  function refreshAppViews() {
    if (typeof global.renderMultiPoolList === 'function') global.renderMultiPoolList();
    if (typeof global.renderSessionList === 'function') global.renderSessionList();
    if (typeof global.newDistribution === 'function') global.newDistribution();
    if (typeof global.renderCategories === 'function') global.renderCategories();
    if (typeof global.renderOverview === 'function') global.renderOverview();
  }

  function switchStorageScopeForUser(user) {
    if (typeof global.setStorageScope !== 'function') return;
    const scope = user && user.id ? `user:${user.id}` : SIGNED_OUT_SCOPE;
    global.setStorageScope(scope);
    refreshAppViews();
  }

  function renderAuthState() {
    const userLabel = document.getElementById('authUserLabel');
    const tabLabel = document.getElementById('authTabLabel');
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const loadBtn = document.getElementById('cloudLoadBtn');
    const saveBtn = document.getElementById('cloudSaveBtn');

    const loggedIn = !!authState.user;
    const displayName = loggedIn ? displayNameFromUser(authState.user) : '';
    if (userLabel) {
      userLabel.textContent = loggedIn ? `Angemeldet: ${displayName}` : 'Nicht angemeldet.';
    }
    if (tabLabel) {
      tabLabel.textContent = loggedIn ? 'Angemeldet' : 'Bitte anmelden';
    }
    if (emailInput) emailInput.disabled = loggedIn;
    if (passwordInput) passwordInput.disabled = loggedIn;
    if (signInBtn) signInBtn.disabled = loggedIn;
    if (signUpBtn) signUpBtn.disabled = loggedIn;
    if (signOutBtn) signOutBtn.disabled = !loggedIn;
    if (loadBtn) loadBtn.disabled = !loggedIn; // Legacy fallback (if old UI is cached)
    if (saveBtn) saveBtn.disabled = !loggedIn; // Legacy fallback (if old UI is cached)

    if (!loggedIn) {
      setSyncStatus('Nicht verbunden', 'info');
    } else if (!navigator.onLine) {
      setSyncStatus('Offline - warte auf Verbindung', 'error');
    }
  }

  async function signIn() {
    if (!authState.client) {
      setAuthStatus('Supabase nicht konfiguriert.', true);
      return;
    }
    const { usernameOrEmail, email, password } = readCredentials();
    if (!usernameOrEmail || !password) {
      setAuthStatus('Bitte Benutzername und Passwort eingeben.', true);
      return;
    }
    if (!email) {
      setAuthStatus('Benutzername enthält ungültige Zeichen.', true);
      return;
    }

    const { error } = await authState.client.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthStatus(`Anmeldung fehlgeschlagen: ${mapAuthErrorMessage(error)}`, true);
      return;
    }

    let syncResult = null;
    try {
      isHydratingCloudState = true;
      const { data: userData } = await authState.client.auth.getUser();
      authState.user = userData && userData.user ? userData.user : authState.user;
      switchStorageScopeForUser(authState.user);
      renderAuthState();
      syncResult = await syncCloudStateWithRetry(false);
    } catch {
      // Fallback auf onAuthStateChange
    } finally {
      isHydratingCloudState = false;
    }

    const passwordInput = document.getElementById('authPassword');
    if (passwordInput) passwordInput.value = '';
    if (syncResult && syncResult.ok && syncResult.loaded) {
      setAuthStatus('Anmeldung erfolgreich. Cloud-Stand geladen.', false);
      setSyncStatus('Verbunden', 'success');
      return;
    }
    if (syncResult && syncResult.ok && syncResult.reason === 'empty') {
      setAuthStatus('Anmeldung erfolgreich. Noch kein Cloud-Stand vorhanden.', false);
      setSyncStatus('Verbunden', 'success');
      return;
    }
    if (syncResult && !syncResult.ok) {
      setAuthStatus(
        `Anmeldung erfolgreich, aber Cloud-Stand konnte nicht geladen werden: ${formatLoadFailure(syncResult)}`,
        true
      );
      return;
    }
    setAuthStatus('Anmeldung erfolgreich.', false);
    setSyncStatus('Verbunden', 'success');
  }

  async function signUp() {
    if (!authState.client) {
      setAuthStatus('Supabase nicht konfiguriert.', true);
      return;
    }
    const { usernameOrEmail, email, password } = readCredentials();
    if (!usernameOrEmail || !password) {
      setAuthStatus('Bitte einen Benutzernamen und ein Passwort anlegen.', true);
      return;
    }
    if (!email) {
      setAuthStatus('Benutzername enthält ungültige Zeichen.', true);
      return;
    }
    if (password.length < 6) {
      setAuthStatus('Passwort muss mindestens 6 Zeichen haben.', true);
      return;
    }

    const { data, error } = await authState.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: normalizeUsername(usernameOrEmail)
        }
      }
    });
    if (error) {
      setAuthStatus(`Registrierung fehlgeschlagen: ${mapAuthErrorMessage(error)}`, true);
      return;
    }

    if (data && data.session) {
      setAuthStatus('Registrierung erfolgreich. Du bist jetzt angemeldet.', false);
      return;
    }

    setAuthStatus(
      'Registrierung erfolgreich. Bitte E-Mail-Bestätigung in Supabase deaktivieren oder Mail bestätigen.',
      false
    );
  }

  async function signOut() {
    if (!authState.client) return;
    const { error } = await authState.client.auth.signOut();
    if (error) {
      setAuthStatus(`Abmeldung fehlgeschlagen: ${mapAuthErrorMessage(error)}`, true);
      return;
    }
    const passwordInput = document.getElementById('authPassword');
    if (passwordInput) passwordInput.value = '';
    setAuthStatus('Abgemeldet.', false);
    setSyncStatus('Nicht verbunden', 'info');
  }

  async function saveCloudState(options = {}) {
    const silent = !!options.silent;
    if (!authState.client || !authState.user) {
      if (!silent) setAuthStatus('Bitte zuerst anmelden.', true);
      return;
    }
    if (!navigator.onLine) {
      pendingSave = true;
      setSyncStatus('Offline - Änderungen werden später synchronisiert', 'error');
      return;
    }
    if (isSaving) {
      pendingSave = true;
      return;
    }

    const currentState =
      typeof global.getState === 'function'
        ? global.getState()
        : global.state && typeof global.state === 'object'
          ? global.state
          : null;

    if (!currentState) {
      if (!silent) setAuthStatus('Lokaler Zustand konnte nicht gelesen werden.', true);
      return;
    }

    const payload = {
      user_id: authState.user.id,
      app_state: currentState,
      updated_at: new Date().toISOString()
    };

    isSaving = true;
    setSyncStatus('Synchronisiere ...', 'info');
    const { error } = await authState.client.from(TABLE).upsert(payload, { onConflict: 'user_id' });
    isSaving = false;
    if (error) {
      pendingSave = true;
      setSyncStatus('Synchronisierung fehlgeschlagen', 'error');
      if (!silent) setAuthStatus(`Cloud speichern fehlgeschlagen: ${mapAuthErrorMessage(error)}`, true);
      return;
    }
    pendingSave = false;
    setSyncStatus(`Synchronisiert um ${formatTime(Date.now())}`, 'success');
    if (!silent) setAuthStatus('Cloud speichern erfolgreich.', false);

    if (pendingSave) {
      pendingSave = false;
      saveCloudState({ silent: true });
    }
  }

  let emailColumnAvailable = true;

  function isMissingEmailColumnError(error) {
    const raw = String((error && error.message) || '').toLowerCase();
    return raw.includes('fairteams_user_states.email') && raw.includes('does not exist');
  }

  async function fetchCloudStateRecord() {
    if (!authState.client || !authState.user) {
      return { data: null, error: null, source: null };
    }

    const byUserId = await authState.client
      .from(TABLE)
      .select('user_id, app_state')
      .eq('user_id', authState.user.id)
      .maybeSingle();
    if (byUserId.error) {
      return { data: null, error: byUserId.error, source: 'user_id' };
    }
    if (byUserId.data && byUserId.data.app_state) {
      return { data: byUserId.data, error: null, source: 'user_id' };
    }

    if (!emailColumnAvailable || !authState.user.email) {
      return { data: byUserId.data || null, error: null, source: 'user_id' };
    }

    const byEmail = await authState.client
      .from(TABLE)
      .select('user_id, app_state')
      .eq('email', authState.user.email)
      .maybeSingle();
    if (byEmail.error) {
      if (isMissingEmailColumnError(byEmail.error)) {
        emailColumnAvailable = false;
        return { data: byUserId.data || null, error: null, source: 'user_id' };
      }
      return { data: byUserId.data || null, error: null, source: 'user_id' };
    }
    if (byEmail.data && byEmail.data.app_state) {
      return { data: byEmail.data, error: null, source: 'email' };
    }

    return { data: byUserId.data || byEmail.data || null, error: null, source: null };
  }

  async function loadCloudState(options = {}) {
    const silent = !!options.silent;
    if (!authState.client || !authState.user) {
      if (!silent) setAuthStatus('Bitte zuerst anmelden.', true);
      return { ok: false, loaded: false, reason: 'not_authenticated' };
    }

    const { data, error, source } = await fetchCloudStateRecord();

    if (error) {
      if (!silent) setAuthStatus(`Cloud laden fehlgeschlagen: ${mapAuthErrorMessage(error)}`, true);
      const readable = mapAuthErrorMessage(error);
      setSyncStatus(`Cloud-Stand konnte nicht geladen werden (${readable})`, 'error');
      console.error('[fairteams] cloud load failed', error);
      return { ok: false, loaded: false, reason: 'query_error', error };
    }
    if (!data || !data.app_state) {
      if (!silent) setAuthStatus('Kein Cloud-Stand vorhanden.', false);
      setSyncStatus('Keine Cloud-Daten vorhanden', 'info');
      return { ok: true, loaded: false, reason: 'empty' };
    }

    try {
      const cloudCounts = getCountsFromStateLike(data.app_state);
      if (typeof global.applyImportedState !== 'function') {
        setSyncStatus(`Verbunden (${cloudCounts.categories}K/${cloudCounts.pools}P in Cloud)`, 'success');
        return { ok: true, loaded: false, reason: 'no_state_target' };
      }
      isApplyingRemoteState = true;
      global.applyImportedState(data.app_state);
      refreshAppViews();
      const appliedState =
        typeof global.getState === 'function'
          ? global.getState()
          : global.state && typeof global.state === 'object'
            ? global.state
            : null;
      const appliedCounts = getCountsFromStateLike(appliedState);
      setSyncStatus(
        `Synchronisiert ${cloudCounts.categories}K/${cloudCounts.pools}P -> ${appliedCounts.categories}K/${appliedCounts.pools}P um ${formatTime(Date.now())}`,
        'success'
      );
      if (!silent) setAuthStatus('Cloud-Stand geladen.', false);
      if (source === 'email' && authState.user && authState.user.id) {
        await authState.client.from(TABLE).upsert(
          {
            user_id: authState.user.id,
            app_state: data.app_state,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        );
      }
      return { ok: true, loaded: true, reason: 'loaded', source };
    } catch (e) {
      if (!silent) setAuthStatus(`Cloud-Daten ungültig: ${e.message}`, true);
      setSyncStatus('Cloud-Daten ungültig', 'error');
      return { ok: false, loaded: false, reason: 'invalid_data', error: e };
    } finally {
      isApplyingRemoteState = false;
    }
  }

  function scheduleAutoSave() {
    if (!authState.client || !authState.user || isApplyingRemoteState || isHydratingCloudState) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      saveCloudState({ silent: true });
    }, 700);
  }

  async function syncCloudStateWithRetry(silent = true, retries = 3, delayMs = 450) {
    let lastResult = { ok: false, loaded: false, reason: 'unknown' };
    for (let attempt = 0; attempt < retries; attempt++) {
      lastResult = await loadCloudState({ silent });
      if (lastResult && lastResult.ok && (lastResult.loaded || lastResult.reason === 'empty')) {
        return lastResult;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    if (!silent) {
      setAuthStatus(`Cloud-Stand konnte nicht geladen werden: ${formatLoadFailure(lastResult)}`, true);
    }
    return lastResult;
  }

  function bindAuthEvents() {
    document.getElementById('signInBtn')?.addEventListener('click', signIn);
    document.getElementById('signUpBtn')?.addEventListener('click', signUp);
    document.getElementById('signOutBtn')?.addEventListener('click', signOut);
    document.getElementById('cloudSaveBtn')?.addEventListener('click', saveCloudState);
    document.getElementById('cloudLoadBtn')?.addEventListener('click', loadCloudState);
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('fairteams:state-saved', scheduleAutoSave);
      window.addEventListener('online', () => {
        setSyncStatus('Online - synchronisiere ...', 'info');
        if (!isHydratingCloudState && (pendingSave || authState.user)) {
          saveCloudState({ silent: true });
        }
      });
      window.addEventListener('offline', () => {
        setSyncStatus('Offline - warte auf Verbindung', 'error');
      });
    }
  }

  async function bootstrap() {
    bindAuthEvents();
    switchStorageScopeForUser(null);

    const { url, key } = readConfig();
    if (!url || !key || !global.supabase || typeof global.supabase.createClient !== 'function') {
      setAuthStatus('Supabase nicht konfiguriert. Trage URL/Anon Key in supabase-config.js ein.', true);
      renderAuthState();
      return;
    }

    authState.client = global.supabase.createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    const { data, error } = await authState.client.auth.getSession();
    if (error) {
      setAuthStatus(`Session konnte nicht geladen werden: ${mapAuthErrorMessage(error)}`, true);
    }

    authState.user = data && data.session ? data.session.user : null;
    if (authState.user) {
      try {
        isHydratingCloudState = true;
        switchStorageScopeForUser(authState.user);
        renderAuthState();
        await syncCloudStateWithRetry(true);
      } finally {
        isHydratingCloudState = false;
      }
    } else {
      switchStorageScopeForUser(null);
      renderAuthState();
      setSyncStatus('Nicht verbunden', 'info');
    }

    authState.client.auth.onAuthStateChange(async (_event, session) => {
      authState.user = session ? session.user : null;
      if (authState.user) {
        try {
          isHydratingCloudState = true;
          switchStorageScopeForUser(authState.user);
          renderAuthState();
          await syncCloudStateWithRetry(true);
        } finally {
          isHydratingCloudState = false;
        }
      } else {
        switchStorageScopeForUser(null);
        renderAuthState();
        setSyncStatus('Nicht verbunden', 'info');
      }
    });
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})(window);
