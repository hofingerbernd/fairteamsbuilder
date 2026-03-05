(function applyFairteamsSupabaseConfig(global) {
  const defaults = {
    url: '',
    anonKey: ''
  };

  const localOverride =
    global.FAIRTEAMS_SUPABASE_LOCAL && typeof global.FAIRTEAMS_SUPABASE_LOCAL === 'object'
      ? global.FAIRTEAMS_SUPABASE_LOCAL
      : null;

  const presetUrl = String(global.FAIRTEAMS_SUPABASE_URL || '').trim();
  const presetAnonKey = String(global.FAIRTEAMS_SUPABASE_ANON_KEY || '').trim();

  const resolvedUrl =
    presetUrl || String((localOverride && localOverride.url) || defaults.url).trim();
  const resolvedAnonKey =
    presetAnonKey || String((localOverride && localOverride.anonKey) || defaults.anonKey).trim();

  global.FAIRTEAMS_SUPABASE_URL = resolvedUrl;
  global.FAIRTEAMS_SUPABASE_ANON_KEY = resolvedAnonKey;
})(window);
