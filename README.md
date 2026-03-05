# Fairteamsbuilder (Standalone)

Der `fairteamsbuilder` läuft jetzt als eigenständige App mit:
- `index.html` (Team-Builder)
- `pool-manager.html` (Kategorien/Pools/Spieler verwalten)
- optionalem Supabase-Login + Cloud-Speichern/Laden pro Benutzer

## Lokal starten

```bash
cd fairteamsbuilder
python3 -m http.server 8080
```

Dann öffnen:
- `http://localhost:8080/index.html`

## Supabase Setup (Mehrbenutzer)

1. Supabase-Projekt erstellen.
2. In Supabase Auth aktivieren:
- `Email` Provider einschalten.
3. SQL ausführen:
- `../backend/supabase/fairteamsbuilder_auth.sql`
4. Konfiguration setzen:
- `supabase-config.js` direkt füllen
oder
- `supabase-config.local.example.js` nach `supabase-config.local.js` kopieren und Werte eintragen.

Benötigte Werte:
- `FAIRTEAMS_SUPABASE_URL`
- `FAIRTEAMS_SUPABASE_ANON_KEY`

## Netlify Deployment (Standalone)

### Option A: direkt aus diesem Repo
1. Neue Site in Netlify anlegen.
2. Base directory: `fairteamsbuilder`
3. Publish directory: `.`
4. Build command: leer lassen (kein Build nötig)
5. Deploy

### Option B: eigenes Repo nur für Fairteamsbuilder
1. Inhalt des Ordners `fairteamsbuilder` in ein neues Repo übernehmen.
2. Netlify mit diesem Repo verbinden.
3. Deploy ohne Build-Command.

`netlify.toml` im Ordner ist bereits vorbereitet.

## Nutzung Login + Cloud

1. User registrieren (`Registrieren`).
2. Danach anmelden (`Anmelden`).
3. `Cloud speichern` sichert den kompletten aktuellen App-State.
4. `Cloud laden` lädt den zuletzt gespeicherten Stand des angemeldeten Users.

Hinweis: Jeder User sieht nur den eigenen Stand (RLS-Policies über `auth.uid()`).
