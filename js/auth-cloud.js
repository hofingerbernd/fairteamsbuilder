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

  function mapAuthErrorMessage(error) {
    const raw = String((error && error.message) || '').trim();
    const lower = raw.toLowerCase();

    if (!raw) return 'Unbekannter Fehler.';
    if (lower.includes('email rate limit exceeded')) {
      return 'Zu viele Registrierungsversuche. Bitte kurz warten und erneut versuchen.';
    }
    if (lower.includes('invalid login credentials')) {
      return 'Benutzername oder Passwort ist falsch.';
    }
    if (lower.includes('user already registered')) {
      return 'Benutzername ist bereits registriert. Bitte anmelden.';
    }
    return raw;
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
    const emailInput = document.getElementById('authEmail');
    const passwordInput = document.getElementById('authPassword');
    const signInBtn = document.getElementById('signInBtn');
    const signUpBtn = document.getElementById('signUpBtn');
    const signOutBtn = document.getElementById('signOutBtn');
    const loadBtn = document.getElementById('cloudLoadBtn');
    const saveBtn = document.getElementById('cloudSaveBtn');

    const loggedIn = !!authState.user;
    if (userLabel) {
      userLabel.textContent = loggedIn ? `Angemeldet: ${displayNameFromUser(authState.user)}` : 'Nicht angemeldet.';
    }
    if (emailInput) emailInput.disabled = loggedIn;
    if (passwordInput) passwordInput.disabled = loggedIn;
    if (signInBtn) signInBtn.disabled = loggedIn;
    if (signUpBtn) signUpBtn.disabled = loggedIn;
    if (signOutBtn) signOutBtn.disabled = !loggedIn;
    if (loadBtn) loadBtn.disabled = !loggedIn;
    if (saveBtn) saveBtn.disabled = !loggedIn;
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
    const passwordInput = document.getElementById('authPassword');
    if (passwordInput) passwordInput.value = '';
    setAuthStatus('Anmeldung erfolgreich.', false);
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
  }

  async function saveCloudState(options = {}) {
    const silent = !!options.silent;
    if (!authState.client || !authState.user) {
      if (!silent) setAuthStatus('Bitte zuerst anmelden.', true);
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

    const { error } = await authState.client.from(TABLE).upsert(payload, { onConflict: 'user_id' });
    if (error) {
      if (!silent) setAuthStatus(`Cloud speichern fehlgeschlagen: ${mapAuthErrorMessage(error)}`, true);
      return;
    }
    if (!silent) setAuthStatus('Cloud speichern erfolgreich.', false);
  }

  async function loadCloudState(options = {}) {
    const silent = !!options.silent;
    if (!authState.client || !authState.user) {
      if (!silent) setAuthStatus('Bitte zuerst anmelden.', true);
      return;
    }

    const { data, error } = await authState.client
      .from(TABLE)
      .select('app_state')
      .eq('user_id', authState.user.id)
      .maybeSingle();

    if (error) {
      if (!silent) setAuthStatus(`Cloud laden fehlgeschlagen: ${mapAuthErrorMessage(error)}`, true);
      return;
    }
    if (!data || !data.app_state) {
      if (!silent) setAuthStatus('Kein Cloud-Stand vorhanden.', false);
      return;
    }

    try {
      if (typeof global.applyImportedState !== 'function') {
        throw new Error('applyImportedState ist nicht verfügbar.');
      }
      isApplyingRemoteState = true;
      global.applyImportedState(data.app_state);
      refreshAppViews();
      if (!silent) setAuthStatus('Cloud-Stand geladen.', false);
    } catch (e) {
      if (!silent) setAuthStatus(`Cloud-Daten ungültig: ${e.message}`, true);
    } finally {
      isApplyingRemoteState = false;
    }
  }

  function scheduleAutoSave() {
    if (!authState.client || !authState.user || isApplyingRemoteState) return;
    if (autoSaveTimer) clearTimeout(autoSaveTimer);
    autoSaveTimer = setTimeout(() => {
      saveCloudState({ silent: true });
    }, 700);
  }

  function bindAuthEvents() {
    document.getElementById('signInBtn')?.addEventListener('click', signIn);
    document.getElementById('signUpBtn')?.addEventListener('click', signUp);
    document.getElementById('signOutBtn')?.addEventListener('click', signOut);
    document.getElementById('cloudSaveBtn')?.addEventListener('click', saveCloudState);
    document.getElementById('cloudLoadBtn')?.addEventListener('click', loadCloudState);
    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('fairteams:state-saved', scheduleAutoSave);
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
    switchStorageScopeForUser(authState.user);
    renderAuthState();
    if (authState.user) {
      await loadCloudState({ silent: true });
    }

    authState.client.auth.onAuthStateChange(async (_event, session) => {
      authState.user = session ? session.user : null;
      switchStorageScopeForUser(authState.user);
      renderAuthState();
      if (authState.user) {
        await loadCloudState({ silent: true });
      }
    });
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})(window);
