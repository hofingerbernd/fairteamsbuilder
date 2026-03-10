(function initFairteamsAuthCloud(global) {
  const TABLE = 'fairteams_user_states';

  const authState = {
    client: null,
    user: null
  };

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
    return normalized ? `${normalized}@fairteams.local` : '';
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
    if (email.endsWith('@fairteams.local')) return email.replace('@fairteams.local', '');
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

  function readConfig() {
    const url = String(global.FAIRTEAMS_SUPABASE_URL || '').trim();
    const key = String(global.FAIRTEAMS_SUPABASE_ANON_KEY || '').trim();
    return { url, key };
  }

  function renderAuthState() {
    const userLabel = document.getElementById('authUserLabel');
    const signOutBtn = document.getElementById('signOutBtn');
    const loadBtn = document.getElementById('cloudLoadBtn');
    const saveBtn = document.getElementById('cloudSaveBtn');

    const loggedIn = !!authState.user;
    if (userLabel) {
      userLabel.textContent = loggedIn ? `Angemeldet: ${displayNameFromUser(authState.user)}` : 'Nicht angemeldet.';
    }
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
      setAuthStatus(`Anmeldung fehlgeschlagen: ${error.message}`, true);
      return;
    }
    setAuthStatus('Anmeldung erfolgreich.', false);
  }

  async function signUp() {
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
      setAuthStatus(`Registrierung fehlgeschlagen: ${error.message}`, true);
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
      setAuthStatus(`Abmeldung fehlgeschlagen: ${error.message}`, true);
      return;
    }
    setAuthStatus('Abgemeldet.', false);
  }

  async function saveCloudState() {
    if (!authState.client || !authState.user) {
      setAuthStatus('Bitte zuerst anmelden.', true);
      return;
    }

    const payload = {
      user_id: authState.user.id,
      app_state: global.state,
      updated_at: new Date().toISOString()
    };

    const { error } = await authState.client.from(TABLE).upsert(payload, { onConflict: 'user_id' });
    if (error) {
      setAuthStatus(`Cloud speichern fehlgeschlagen: ${error.message}`, true);
      return;
    }
    setAuthStatus('Cloud speichern erfolgreich.', false);
  }

  async function loadCloudState() {
    if (!authState.client || !authState.user) {
      setAuthStatus('Bitte zuerst anmelden.', true);
      return;
    }

    const { data, error } = await authState.client
      .from(TABLE)
      .select('app_state')
      .eq('user_id', authState.user.id)
      .maybeSingle();

    if (error) {
      setAuthStatus(`Cloud laden fehlgeschlagen: ${error.message}`, true);
      return;
    }
    if (!data || !data.app_state) {
      setAuthStatus('Kein Cloud-Stand vorhanden.', false);
      return;
    }

    try {
      if (typeof global.applyImportedState !== 'function') {
        throw new Error('applyImportedState ist nicht verfügbar.');
      }
      global.applyImportedState(data.app_state);

      if (typeof global.renderMultiPoolList === 'function') {
        global.renderMultiPoolList();
      }
      if (typeof global.renderSessionList === 'function') {
        global.renderSessionList();
      }
      if (typeof global.newDistribution === 'function') {
        global.newDistribution();
      }
      if (typeof global.renderCategories === 'function') {
        global.renderCategories();
      }

      setAuthStatus('Cloud-Stand geladen.', false);
    } catch (e) {
      setAuthStatus(`Cloud-Daten ungültig: ${e.message}`, true);
    }
  }

  function bindAuthEvents() {
    document.getElementById('signInBtn')?.addEventListener('click', signIn);
    document.getElementById('signUpBtn')?.addEventListener('click', signUp);
    document.getElementById('signOutBtn')?.addEventListener('click', signOut);
    document.getElementById('cloudSaveBtn')?.addEventListener('click', saveCloudState);
    document.getElementById('cloudLoadBtn')?.addEventListener('click', loadCloudState);
  }

  async function bootstrap() {
    bindAuthEvents();

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
      setAuthStatus(`Session konnte nicht geladen werden: ${error.message}`, true);
    }

    authState.user = data && data.session ? data.session.user : null;
    renderAuthState();

    authState.client.auth.onAuthStateChange((_event, session) => {
      authState.user = session ? session.user : null;
      renderAuthState();
    });
  }

  document.addEventListener('DOMContentLoaded', bootstrap);
})(window);
