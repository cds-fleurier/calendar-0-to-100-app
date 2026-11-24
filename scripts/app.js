(function runApp() {
  const safeAppVersion = typeof APP_VERSION === "string" ? APP_VERSION : "1.0.0";
  /* Replis si config.js n'a pas chargé — à garder alignés sur config.js */
  const FALLBACK_CCC = { date: "2027-08-25", time: "09:00", timeTentative: true, utcOffset: "+02:00", place: "Courmayeur", route: "ccc" };
  const FALLBACK_MCC = { date: "2027-08-22", dateEnd: "2027-08-24", time: "10:00", utcOffset: "+02:00", place: "Martigny-Combe", route: "mcc" };
  const safeTracks = typeof TRACKS === "object" && TRACKS ? TRACKS : {
    "0to100": { label: "0 to 100", race: "CCC", startDate: "2026-03-02", raceStart: FALLBACK_CCC },
    "0to40":  { label: "0 to 40",  race: "MCC", startDate: "2026-04-01", raceStart: FALLBACK_MCC }
  };
  const safeUtmbScenarios = typeof UTMB_SCENARIOS === "object" && UTMB_SCENARIOS ? UTMB_SCENARIOS : {
    week1: { label: "semaine UTMB du 22 au 29 août 2027", weekStart: "2027-08-22", targetDate: "2027-08-29" },
    week2: { label: "semaine UTMB du 22 au 29 août 2027", weekStart: "2027-08-22", targetDate: "2027-08-29" }
  };

  const RING_CIRC     = 326.73; /* 2π × 52 */
  const WEEKDAY_HDRS  = ["L", "M", "M", "J", "V", "S", "D"];

  const versionNode    = document.getElementById("app-version");
  const onboardingCard = document.getElementById("onboarding-card");
  const trackerCard    = document.getElementById("tracker-card");
  const calendarCard   = document.getElementById("calendar-card");
  const onboardingForm = document.getElementById("onboarding-form");
  const resetButton    = document.getElementById("reset-profile");
  const syncStatusEl   = document.getElementById("sync-status");
  const welcomeLine    = document.getElementById("welcome-line");
  const projectLine    = document.getElementById("project-line");
  const dodosValue     = document.getElementById("dodos-value");
  const dodosRaceLbl   = document.getElementById("dodos-race-lbl");
  const streakValue    = document.getElementById("streak-value");
  const progressRing   = document.getElementById("progress-ring");
  const progressPctEl  = document.getElementById("progress-pct");
  const calendarMeta   = document.getElementById("calendar-meta");
  const calendarList   = document.getElementById("calendar-list");
  const celebLayer     = document.getElementById("celebration-layer");
  const countdownCard  = document.getElementById("countdown-card");
  const cdDays         = document.getElementById("cd-days");
  const cdHours        = document.getElementById("cd-hours");
  const cdMins         = document.getElementById("cd-mins");
  const cdSecs         = document.getElementById("cd-secs");
  const countdownTitle = document.getElementById("countdown-title");
  const countdownSub   = document.getElementById("countdown-sub");
  const mapEl          = document.getElementById("race-map");
  const mapBadge       = document.getElementById("map-badge");
  const mapHint        = document.getElementById("map-hint");
  const mapFallback    = document.getElementById("map-fallback");
  const stepsCard      = document.getElementById("steps-card");
  const stepFlag       = document.getElementById("step-flag");
  const stepsTitle     = document.getElementById("steps-title");
  const stepSub        = document.getElementById("step-sub");
  const sdDays         = document.getElementById("sd-days");
  const sdHours        = document.getElementById("sd-hours");
  const sdMins         = document.getElementById("sd-mins");
  const sdSecs         = document.getElementById("sd-secs");
  const stepsList      = document.getElementById("steps-list");
  const raceDialog     = document.getElementById("race-dialog");
  const raceForm       = document.getElementById("race-form");
  const raceDlgTitle   = document.getElementById("race-dialog-title");
  const raceDlgRule    = document.getElementById("race-dialog-rule");
  const raceNameIn     = document.getElementById("race-name");
  const raceDateIn     = document.getElementById("race-date");
  const raceKmIn       = document.getElementById("race-km");
  const racePlaceIn    = document.getElementById("race-place");
  const raceValidIn    = document.getElementById("race-validated");
  const raceWarning    = document.getElementById("race-warning");
  const raceCancelBtn  = document.getElementById("race-cancel");
  const raceDeleteBtn  = document.getElementById("race-delete");

  /* Tuiles OSM standard, assombries en CSS (.leaflet-tile-pane) : pas de clé API,
     contrairement aux fonds sombres CARTO / Stadia. */
  const TILE_URL    = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const TILE_ATTRIB =
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  let countdownTimer = null;
  let stepTimer      = null;
  let currentProfile = null;   /* profil affiché, utilisé par le dialog course */
  let editingSlot    = null;   /* emplacement en cours d'édition dans le dialog */
  let raceMap        = null;   /* instance Leaflet, créée une seule fois */
  let raceLayer      = null;   /* tracé + marqueurs de la course courante */
  let raceMapSlug    = null;   /* course actuellement dessinée */
  const routeCache   = {};

  const participantSel  = document.getElementById("participant");
  const firstNameIn     = document.getElementById("first-name");
  const firstNameField  = document.getElementById("first-name-field");
  const trackSel        = document.getElementById("track");
  const linkTeamBox     = document.getElementById("link-team");
  const linkParticipant = document.getElementById("link-participant");
  const linkGoBtn       = document.getElementById("link-go");

  const PROFILE_COOKIE  = "zero_to_100_profile";
  const PROFILE_STORE   = "zero_to_100_profile";   /* copie localStorage du cookie (v3.5.0) */
  const FETCH_TIMEOUT_MS = 15000;                  /* Apps Script peut mettre plusieurs secondes */
  const DONE_KEY_PREFIX = "zero_to_100_days_done";
  const RACES_KEY_PREFIX = "zero_to_100_races";

  if (versionNode) versionNode.textContent = safeAppVersion;

  /* ── Date helpers ─────────────────────────────────────────────────────── */

  function parseDate(str) {
    return new Date(str + "T00:00:00");
  }

  function toDayKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  /* Nombre de jours calendaires entre deux dates (minuit à minuit). Math.round et non ceil :
     un changement d'heure entre les deux fait 23 h ou 25 h, pas un jour de plus ou de moins.
     C'est ce que comptent les « dodos » et les J-n (nuits restantes). Le compte à rebours, lui,
     affiche la durée exacte jusqu'à l'heure de départ : passé l'heure du départ dans la journée,
     il indique un jour plein de moins que les dodos (ex. 271 dodos = 270 j 18 h). */
  function daysDiff(from, to) {
    const ms  = 24 * 60 * 60 * 1000;
    const a   = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const b   = new Date(to.getFullYear(),   to.getMonth(),   to.getDate());
    return Math.round((b - a) / ms);
  }

  /* fetch avec délai max : sans réponse d'Apps Script, on abandonne (le hors-ligne prend le relais) */
  function fetchWithTimeout(url, options) {
    const ctrl  = typeof AbortController === "function" ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS) : null;
    return fetch(url, Object.assign({}, options, ctrl ? { signal: ctrl.signal } : {}))
      .finally(() => clearTimeout(timer));
  }

  /* Lien externe : seulement http(s) (pas de javascript: venu d'un fichier de données) */
  function safeUrl(url) {
    try {
      const u = new URL(String(url));
      return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
    } catch { return null; }
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short", year: "numeric", month: "2-digit", day: "2-digit"
    }).format(date);
  }

  function monthLabel(date) {
    return new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" }).format(date);
  }

  function monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function weekdayLabel(date) {
    return new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date);
  }

  function isSameMonth(a, b) {
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
  }

  function mondayIndex(date) {
    return (date.getDay() + 6) % 7;
  }

  /* ── Calendar months builder ──────────────────────────────────────────── */

  function buildMonths(startDate, targetDate) {
    const months = [];
    const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (cursor <= targetDate) {
      const monthStart = new Date(cursor);
      const monthEnd   = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);

      const firstVisible = new Date(monthStart);
      firstVisible.setDate(monthStart.getDate() - mondayIndex(monthStart));
      const lastVisible = new Date(monthEnd);
      lastVisible.setDate(monthEnd.getDate() + (6 - mondayIndex(monthEnd)));

      const days = [];
      const dayCursor = new Date(firstVisible);
      while (dayCursor <= lastVisible) {
        days.push(new Date(dayCursor));
        dayCursor.setDate(dayCursor.getDate() + 1);
      }
      months.push({ monthStart, days });
      cursor.setMonth(cursor.getMonth() + 1);
    }
    return months;
  }

  /* ── Profile persistence ──────────────────────────────────────────────── */

  function setCookie(name, value, days) {
    const exp = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`;
  }

  function getCookie(name) {
    const prefix = `${name}=`;
    for (const part of document.cookie.split(";").map((p) => p.trim())) {
      if (part.startsWith(prefix)) return decodeURIComponent(part.slice(prefix.length));
    }
    return null;
  }

  /* Safari (ITP) efface les cookies posés en JS après 7 jours sans visite : le cookie est
     réécrit à chaque visite (showTracker) et doublé d'une copie localStorage, lue en repli. */
  function parseProfile(raw) {
    if (!raw) return null;
    try {
      const p = JSON.parse(raw);
      if (!p || !p.firstName || !safeTracks[p.track] || !safeUtmbScenarios[p.utmbScenario]) return null;
      return p;
    } catch { return null; }
  }

  function getSavedProfile() {
    let stored = null;
    try { stored = localStorage.getItem(PROFILE_STORE); } catch { /* stockage indisponible */ }
    return parseProfile(getCookie(PROFILE_COOKIE)) || parseProfile(stored);
  }

  function saveProfile(profile) {
    const json = JSON.stringify(profile);
    setCookie(PROFILE_COOKIE, json, 365);
    try { localStorage.setItem(PROFILE_STORE, json); } catch { /* stockage indisponible */ }
  }

  function clearProfile() {
    setCookie(PROFILE_COOKIE, "", -1);
    try { localStorage.removeItem(PROFILE_STORE); } catch { /* stockage indisponible */ }
  }

  /* ── Identité partagée avec les autres outils de la team ─────────────── */

  /* Roster de la carte (window.PARTICIPANTS) — vide si le script n'a pas chargé (offline) */
  const ROSTER = Array.isArray(window.PARTICIPANTS)
    ? window.PARTICIPANTS.slice().sort((a, b) => a.name.localeCompare(b.name, "fr"))
    : [];
  const rosterById = {};
  for (const p of ROSTER) rosterById[p.id] = p;

  /* Invités (pas dans le trombinoscope) : id "guest|<100|40>|<Prénom>", partagé avec Qui court où */
  const GUEST_PREFIX = "guest|";
  function guestId(group, name) { return GUEST_PREFIX + group + "|" + String(name).trim().replace(/\|/g, " "); }
  function guestFromId(id) {
    if (typeof id !== "string" || !id.startsWith(GUEST_PREFIX)) return null;
    const [, group, name] = id.split("|");
    if (!name || !["100", "40"].includes(group)) return null;
    return { id, name, group, photo: "", guest: true };
  }
  function person(id) { return rosterById[id] || guestFromId(id); }
  const TEAM_TRACK = { "100": "0to100", "40": "0to40" };
  const teamMeKey  = typeof TEAM_ME_KEY === "string" ? TEAM_ME_KEY : "team_me";

  function normName(str) {
    return String(str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  }

  function getTeamMe() {
    try { const v = localStorage.getItem(teamMeKey); return v && person(v) ? v : null; } catch { return null; }
  }

  function setTeamMe(id) {
    try { if (id) localStorage.setItem(teamMeKey, id); } catch { /* stockage indisponible */ }
  }

  /* Retrouve le participant du roster à partir d'un prénom saisi librement (profils d'avant la v3) */
  function matchRoster(firstName) {
    const n = normName(firstName);
    if (!n) return null;
    const exact = ROSTER.filter((p) => normName(p.name) === n);
    if (exact.length === 1) return exact[0];
    const first = ROSTER.filter((p) => normName(p.name).split(" ")[0] === n.split(" ")[0]);
    return first.length === 1 ? first[0] : null;
  }

  /* Invité ajouté depuis au trombinoscope : même groupe + même prénom exact (casse et accents
     ignorés) → son vrai id. Même règle que Qui court où (pas de rapprochement sur le premier mot). */
  function rosterMatchForGuest(id) {
    const g = guestFromId(id);
    if (!g) return null;
    const exact = ROSTER.filter((p) => p.group === g.group && normName(p.name) === normName(g.name));
    return exact.length === 1 ? exact[0] : null;
  }

  function fillRosterSelect(select, placeholder) {
    if (!select) return;
    select.innerHTML = "";
    const first = document.createElement("option");
    first.value = ""; first.textContent = placeholder;
    select.appendChild(first);
    for (const [group, label] of [["100", "0 to 100"], ["40", "0 to 40"]]) {
      const og = document.createElement("optgroup");
      og.label = label;
      for (const p of ROSTER.filter((x) => x.group === group)) {
        const o = document.createElement("option");
        o.value = p.id; o.textContent = p.name;
        og.appendChild(o);
      }
      if (og.children.length) select.appendChild(og);
    }
    const guest = guestFromId(getTeamMe());
    if (guest) {
      const o = document.createElement("option");
      o.value = guest.id; o.textContent = `${guest.name} (invité)`;
      select.appendChild(o);
    }
    const other = document.createElement("option");
    other.value = "__other"; other.textContent = "Je ne suis pas dans la liste";
    select.appendChild(other);
  }

  /* Relie le profil à un participant : mémorise l'id + le partage avec les autres outils */
  function linkProfile(profile, participantId) {
    const p = rosterById[participantId];
    if (!p) return profile;
    const linked = Object.assign({}, profile, { participantId: p.id });
    saveProfile(linked);
    setTeamMe(p.id);
    return linked;
  }

  /* ── Courses choisies dans « Qui court où ? » ─────────────────────────── */

  const TEAM_CACHE_KEY = "team_choices_cache";
  const COURSES_LIST   = Array.isArray(window.COURSES) ? window.COURSES : [];
  /* Scripts cross-repo (roster de la carte, courses de Qui court où) pas chargés : réseau, ou
     dépôt en cours de mise à jour → on le dit au lieu d'afficher « personne d'autre » */
  const TEAM_DATA_MISSING = "données de la team indisponibles pour l'instant";
  const courseById     = {};
  for (const c of COURSES_LIST) courseById[c.id] = c;
  let teamChoices = null;   /* null tant que rien n'est chargé (ni réseau, ni cache) */

  function readTeamCache() {
    try {
      const raw = localStorage.getItem(TEAM_CACHE_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && Array.isArray(parsed.choices) ? parsed.choices : null;
    } catch { return null; }
  }

  async function loadTeamChoices() {
    const api = typeof TEAM_CHOICES_API === "string" ? TEAM_CHOICES_API : "";
    if (teamChoices === null) teamChoices = readTeamCache();
    if (!api) return;
    try {
      const res  = await fetchWithTimeout(api, { cache: "no-store" });
      const data = await res.json();
      if (data && data.ok && Array.isArray(data.choices)) {
        teamChoices = data.choices;
        try { localStorage.setItem(TEAM_CACHE_KEY, JSON.stringify({ at: Date.now(), choices: data.choices })); } catch { /* plein */ }
      }
    } catch (err) {
      console.warn("Qui court où : choix indisponibles, on garde le cache", err);
    }
  }

  function blocOfSlot(slot) {
    return typeof SLOT_BLOCS === "object" && SLOT_BLOCS ? SLOT_BLOCS[slot.id] || null : null;
  }

  /* Course déclarée dans « Qui court où ? » pour cet emplacement, au format des courses perso */
  function teamRaceFor(profile, slot) {
    if (!profile.participantId || !Array.isArray(teamChoices)) return null;
    const bloc = blocOfSlot(slot);
    if (!bloc) return null;
    const choice = teamChoices.find((c) => c.participant === profile.participantId && c.bloc === bloc && c.course);
    if (!choice) return null;
    const validated = /^(1|true|oui|x|ok|yes|✓)$/i.test(String(choice.validated || "").trim());
    const ws = slotWindows(slot);
    const sameCourse = (c) => c.bloc === bloc && c.course === choice.course &&
      (choice.course !== "autre" || normName(c.note) === normName(choice.note));
    const companions = teamChoices
      .filter((c) => c.participant !== profile.participantId && sameCourse(c))
      .map((c) => person(c.participant)).filter(Boolean)
      .map((p) => p.name).sort((a, b) => a.localeCompare(b, "fr"));

    if (choice.course === "autre") {
      /* Hors liste : en attente tant que le staff ne l'a pas cochée dans le Sheet */
      return {
        name: choice.note || "Autre course", date: ws.length ? ws[0].from : null, km: null, place: null,
        validated, team: true, other: true, dateApprox: true, bloc, companions
      };
    }
    const course = courseById[choice.course];
    if (!course) {
      if (COURSES_LIST.length) return null;   /* course retirée de la liste */
      /* Liste des courses pas chargée : le choix existe, on ne sait juste pas encore lequel */
      return {
        name: "Course choisie dans Qui court où", date: ws.length ? ws[0].from : null, km: null, place: null,
        validated: true, team: true, dateApprox: true, unknown: true, bloc, companions
      };
    }
    /* Course de la liste du staff : validée par construction */
    return {
      name: course.dept ? `${course.name} (${course.dept})` : course.name,
      date: course.date || course.weekend || (ws.length ? ws[0].from : null),
      km: typeof course.km === "number" ? course.km : null,
      place: null, validated: true, team: true, bloc, companions,
      url: course.url ? safeUrl(course.url) : null, signup: course.signup || null
    };
  }

  /* Une saisie manuelle dont le nom correspond à une course de la liste du staff est validée aussi */
  function inStaffList(name) {
    const n = normName(name);
    if (n.length < 8) return false;           /* « trail » ou « maxi » ne suffisent pas */
    return COURSES_LIST.some((c) => {
      const cn = normName(c.name);
      return cn === n || cn.includes(n) || n.includes(cn);
    });
  }

  /* Course affichée pour l'emplacement : « Qui court où ? » d'abord, sinon la saisie locale (héritage) */
  function raceForSlot(profile, slot, localRaces) {
    const team = teamRaceFor(profile, slot);
    if (team) return team;
    const local = localRaces[slot.id];
    if (!local) return null;
    return local.validated || !inStaffList(local.name) ? local : Object.assign({}, local, { validated: true });
  }

  /* Ligne « inscriptions » : ouverture datée (J-n), déjà ouvertes, ou note libre */
  function signupText(race) {
    const sg = race && race.signup;
    if (!sg) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const fmt = (d) => new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short" }).format(d);
    if (sg.close && parseDate(sg.close) < today) return { cls: "", text: `Inscriptions closes depuis le ${fmt(parseDate(sg.close))}` };
    if (sg.open) {
      const d = parseDate(sg.open);
      const days = Math.round((d - today) / 86400000);
      const when = fmt(d);
      if (days > 0)   return { cls: days <= 21 ? "soon" : "", text: `Inscriptions : ouverture ${when} · J-${days}` };
      if (days === 0) return { cls: "soon", text: "Inscriptions : ouverture AUJOURD'HUI" };
      return { cls: "open", text: `Inscriptions ouvertes depuis le ${when}${sg.close ? ` (jusqu'au ${fmt(parseDate(sg.close))})` : ""}` };
    }
    if (sg.status === "open") return { cls: "open", text: "Inscriptions ouvertes" };
    return sg.note ? { cls: "", text: sg.note } : null;
  }

  function teamBlocUrl(slot) {
    const base = typeof TEAM_APP_URL === "string" ? TEAM_APP_URL : "";
    const bloc = blocOfSlot(slot);
    return bloc ? `${base}#bloc-${bloc}` : base;
  }

  /* ── Done-days persistence ────────────────────────────────────────────── */

  function doneStorageKey(profile) {
    return `${DONE_KEY_PREFIX}_${profile.track}_${profile.utmbScenario}_${profile.firstName.toLowerCase()}`;
  }

  function getDoneDays(profile) {
    const raw = localStorage.getItem(doneStorageKey(profile));
    if (!raw) return {};
    try { return JSON.parse(raw); } catch { return {}; }
  }

  function setDoneDays(profile, doneDays) {
    localStorage.setItem(doneStorageKey(profile), JSON.stringify(doneDays));
  }

  /* ── Synchro des jours cochés entre appareils (Sheet de « Qui court où ? ») ──
     Le localStorage reste la copie de travail (affichage immédiat, hors ligne). Chaque
     changement est mis en attente (`pending`) puis envoyé en lot ; le serveur ne modifie que
     les jours envoyés, deux appareils ne s'écrasent donc pas. Au premier passage, les jours
     déjà cochés sur cet appareil sont envoyés une fois (migration). */
  const SYNC_DEBOUNCE_MS = 2000;
  let syncTimer = null;
  let syncInFlight = false;
  const PULL_MIN_INTERVAL_MS = 30000;
  let lastPullAt = 0;

  function syncApi() { return typeof TEAM_CHOICES_API === "string" ? TEAM_CHOICES_API : ""; }
  function syncId(profile) { return profile && profile.participantId ? profile.participantId : ""; }
  function pendingKey(profile) { return `${DONE_KEY_PREFIX}_pending_${profile.track}_${profile.utmbScenario}_${syncId(profile)}`; }
  function migratedKey(profile) { return `${DONE_KEY_PREFIX}_synced_${profile.track}_${profile.utmbScenario}_${syncId(profile)}`; }

  function readJson(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
  }
  function writeJson(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* plein */ }
  }

  function setSyncStatus(text, warn) {
    if (!syncStatusEl) return;
    syncStatusEl.textContent = text || "";
    syncStatusEl.classList.toggle("hidden", !text);
    syncStatusEl.classList.toggle("sync-status--warn", Boolean(warn));
  }

  function syncLabel(at) {
    const hm = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(at);
    return `☁️ Cases synchronisées entre tes appareils · ${hm}`;
  }

  /* Un jour coché/décoché : enregistré localement, puis envoyé (regroupé) */
  function queueDoneChange(profile, dayKey, value) {
    if (!syncApi() || !syncId(profile)) return;
    const pending = readJson(pendingKey(profile), {});
    pending[dayKey] = value;
    writeJson(pendingKey(profile), pending);
    clearTimeout(syncTimer);
    syncTimer = setTimeout(() => pushDone(profile), SYNC_DEBOUNCE_MS);
  }

  async function pushDone(profile) {
    if (syncInFlight) { syncTimer = setTimeout(() => pushDone(profile), SYNC_DEBOUNCE_MS); return; }
    const sent = readJson(pendingKey(profile), {});
    if (!Object.keys(sent).length) return;
    syncInFlight = true;
    try {
      /* Pas de Content-Type → pas de preflight CORS (Apps Script ne gère pas OPTIONS) */
      const res = await fetchWithTimeout(syncApi(), {
        method: "POST",
        keepalive: true, /* la requête aboutit même si l'onglet est fermé / l'appli mise en arrière-plan */
        body: JSON.stringify({ type: "cal", participant: syncId(profile), track: profile.track, scenario: profile.utmbScenario, set: sent })
      });
      const data = await res.json();
      if (!data || !data.ok) throw new Error((data && data.error) || "réponse invalide");
      /* On retire de l'attente ce qui est parti (sauf si l'utilisateur a re-changé ce jour entre-temps) */
      const pending = readJson(pendingKey(profile), {});
      for (const k of Object.keys(sent)) if (pending[k] === sent[k]) delete pending[k];
      writeJson(pendingKey(profile), pending);
      writeJson(migratedKey(profile), true);
      applyServerDone(profile, data.done || {});
      setSyncStatus(syncLabel(new Date()));
    } catch (err) {
      console.warn("Synchro calendrier : envoi impossible, on réessaiera", err);
      setSyncStatus("⏳ Hors ligne : tes cases sont gardées ici et seront synchronisées plus tard", true);
    } finally {
      syncInFlight = false;
    }
  }

  /* État serveur + changements encore en attente = ce qu'on affiche */
  function applyServerDone(profile, serverDone) {
    const merged = Object.assign({}, serverDone, readJson(pendingKey(profile), {}));
    const before = JSON.stringify(getDoneDays(profile));
    setDoneDays(profile, merged);
    if (JSON.stringify(merged) !== before && currentProfile === profile) renderCalendar(profile);
  }

  async function pullDone(profile, { throttle = false } = {}) {
    if (!syncApi() || !syncId(profile)) return;
    if (throttle && Date.now() - lastPullAt < PULL_MIN_INTERVAL_MS) return;
    lastPullAt = Date.now();
    try {
      const res = await fetchWithTimeout(`${syncApi()}?cal=${encodeURIComponent(syncId(profile))}`, { cache: "no-store" });
      const data = await res.json();
      if (!data || !data.ok || !Array.isArray(data.cal)) throw new Error((data && data.error) || "réponse invalide");
      const row = data.cal.find((r) => r.track === profile.track && r.scenario === profile.utmbScenario);
      /* Ancienne ligne week2 : reprise si le profil vient de week2, ou s'il n'y a pas encore de
         ligne week1 (appareil neuf d'un participant qui était en week2) */
      const legacyRow = profile.utmbScenario !== LEGACY_SCENARIO &&
        data.cal.find((r) => r.track === profile.track && r.scenario === LEGACY_SCENARIO);
      if (legacyRow && (profile.legacyScenario || !row)) adoptLegacyRow(profile, legacyRow, row);
      if (profile.legacyScenario) {
        /* Les « non fait » explicites issus de la fusion (ex. un jour de mars décoché) partent
           aussi, sauf si le jour est déjà fait côté serveur */
        const local = getDoneDays(profile), server = (row && row.done) || {}, pending = readJson(pendingKey(profile), {});
        for (const k of Object.keys(local)) {
          if (local[k] === false && server[k] !== true && !own(pending, k)) pending[k] = false;
        }
        writeJson(pendingKey(profile), pending);
        delete profile.legacyScenario;
        saveProfile(profile);
      }
      if (!row && !readJson(migratedKey(profile), false)) {
        /* Premier passage : on envoie ce qui est déjà coché sur cet appareil */
        const local = getDoneDays(profile);
        if (Object.keys(local).length) {
          writeJson(pendingKey(profile), Object.assign({}, local, readJson(pendingKey(profile), {})));
          await pushDone(profile);
          return;
        }
      }
      if (row && !readJson(migratedKey(profile), false)) {
        /* Cet appareil n'a jamais été synchronisé mais un autre l'a été : on garde l'union des
           jours cochés (une séance faite ne se perd pas), le serveur l'emporte pour le reste */
        const local = getDoneDays(profile), server = row.done || {}, pending = readJson(pendingKey(profile), {});
        for (const k of Object.keys(local)) if (local[k] === true && server[k] !== true) pending[k] = true;
        writeJson(pendingKey(profile), pending);
      }
      if (row) applyServerDone(profile, row.done || {});
      writeJson(migratedKey(profile), true);
      if (Object.keys(readJson(pendingKey(profile), {})).length) await pushDone(profile);
      else setSyncStatus(syncLabel(new Date()));
    } catch (err) {
      console.warn("Synchro calendrier : lecture impossible, on garde la copie locale", err);
      setSyncStatus("⏳ Hors ligne : affichage des cases enregistrées sur cet appareil", true);
    }
  }

  function own(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  /* ── Migration week2 → week1 (v3.5.0) ─────────────────────────────────────
     Le scénario UTMB fait partie des clés localStorage et des lignes du Sheet. Depuis la v3.4.0
     il n'y a plus qu'une semaine (week1) ; un profil week2 (ou un profil repassé en week1 par
     « Modifier mon profil » en v3.4.0) garde ses cases sous week2. Au chargement, une seule fois :
     les cases locales week2 sont fusionnées dans week1 (union des jours cochés), mises en attente
     d'envoi vers la ligne week1 du Sheet, et le profil note `legacyScenario` pour qu'à la
     prochaine lecture du Sheet la ligne week2 soit récupérée aussi (appareil sans copie locale). */
  const LEGACY_SCENARIO = "week2";

  /* Ajoute `src` à `target` : un jour fait d'un côté reste fait ; un « non fait » explicite ne
     remplace jamais un « fait » */
  function unionDone(target, src) {
    for (const k of Object.keys(src || {})) {
      if (src[k] === true) target[k] = true;
      else if (!own(target, k)) target[k] = Boolean(src[k]);
    }
    return target;
  }

  function migrateLegacyScenario(profile) {
    let p = profile;
    if (p.utmbScenario === LEGACY_SCENARIO) {
      p = Object.assign({}, p, { utmbScenario: "week1", legacyScenario: LEGACY_SCENARIO });
    }
    const old      = Object.assign({}, p, { utmbScenario: LEGACY_SCENARIO });
    const oldDone  = readJson(doneStorageKey(old), null);
    const oldPend  = syncId(p) ? readJson(pendingKey(old), null) : null;
    if (oldDone || oldPend) {
      const done = unionDone(getDoneDays(p), oldDone);
      setDoneDays(p, done);
      if (syncId(p)) {
        const pending = unionDone(readJson(pendingKey(p), {}), oldPend);
        for (const k of Object.keys(done)) if (done[k] === true) pending[k] = true;
        writeJson(pendingKey(p), pending);
      }
      /* Copie de secours, puis on retire les clés week2 (sinon la fusion se referait à chaque
         visite et recocherait un jour décoché depuis) */
      if (oldDone) writeJson(`${DONE_KEY_PREFIX}_backup_${LEGACY_SCENARIO}_${p.track}_${p.firstName.toLowerCase()}`, oldDone);
      try {
        localStorage.removeItem(doneStorageKey(old));
        if (syncId(p)) localStorage.removeItem(pendingKey(old));
      } catch { /* stockage indisponible */ }
      if (!p.legacyScenario) p = Object.assign({}, p, { legacyScenario: LEGACY_SCENARIO });
    }
    if (p !== profile) saveProfile(p);
    return p;
  }

  /* Ligne week2 du Sheet → jours en attente pour la ligne week1 (mêmes règles d'union) */
  function adoptLegacyRow(profile, legacyRow, row) {
    const server  = (row && row.done) || {};
    const pending = readJson(pendingKey(profile), {});
    const legacy  = legacyRow.done || {};
    for (const k of Object.keys(legacy)) {
      if (legacy[k] === true && server[k] !== true) pending[k] = true;
      else if (legacy[k] !== true && !own(server, k) && !own(pending, k)) pending[k] = false;
    }
    writeJson(pendingKey(profile), pending);
  }

  function isDefaultChecked(profile, day) {
    const year  = day.getFullYear();
    const month = day.getMonth();
    if (year !== 2026) return false;
    if (profile.track === "0to100") return month === 2 || month === 3;
    if (profile.track === "0to40")  return month === 3;
    return false;
  }

  function isChecked(profile, doneDays, day) {
    const key = toDayKey(day);
    return own(doneDays, key) ? Boolean(doneDays[key]) : isDefaultChecked(profile, day);
  }

  /* ── Events ───────────────────────────────────────────────────────────── */

  function teamEvents(profile) {
    const events = typeof EVENTS !== "undefined" && Array.isArray(EVENTS) ? EVENTS : [];
    return events.filter((ev) => Array.isArray(ev.tracks) && ev.tracks.includes(profile.track));
  }

  /* Événements d'équipe + courses perso du participant, au même format */
  function allEvents(profile) {
    const list  = teamEvents(profile).slice();
    const races = getRaces(profile);
    for (const slot of raceSlots(profile)) {
      const race = raceForSlot(profile, slot, races);
      if (!race || !race.date) continue;
      list.push({ label: race.name, start: race.date, end: race.date, type: "race", personal: true, optional: !race.validated });
    }
    return list;
  }

  function buildEventMap(profile, startDate, endDate) {
    const map = {};
    for (const ev of allEvents(profile)) {
      const evStart = parseDate(ev.start);
      const evEnd   = parseDate(ev.end);
      const cursor  = new Date(evStart);
      while (cursor <= evEnd) {
        if (cursor >= startDate && cursor <= endDate) {
          map[toDayKey(cursor)] = ev;
        }
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return map;
  }

  /* ── Streak ───────────────────────────────────────────────────────────── */

  function calculateStreak(profile, startDate, doneDays) {
    const startKey = toDayKey(startDate);
    let streak = 0;
    const cursor = new Date();

    if (!isChecked(profile, doneDays, cursor)) {
      cursor.setDate(cursor.getDate() - 1);
    }

    while (toDayKey(cursor) >= startKey) {
      if (!isChecked(profile, doneDays, cursor)) break;
      streak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return streak;
  }

  /* ── Celebration ──────────────────────────────────────────────────────── */

  function showCelebration() {
    if (!celebLayer) return;
    celebLayer.classList.remove("hidden");
    celebLayer.innerHTML = "";

    const msg = document.createElement("div");
    msg.className   = "celebration-message";
    msg.textContent = "BRAVO !";
    celebLayer.appendChild(msg);

    /* Réglage « Réduire les animations » de l'iPhone : juste le message, sans feu d'artifice */
    const reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const bursts = reduceMotion ? [] : [
      { x: 22, y: 62, delay: 0 },
      { x: 50, y: 52, delay: 0.08 },
      { x: 78, y: 62, delay: 0.16 }
    ];

    for (const burst of bursts) {
      const ring = document.createElement("span");
      ring.className = "burst-ring";
      ring.style.cssText = `left:${burst.x}%;top:${burst.y}%`;
      ring.style.setProperty("--delay", `${burst.delay}s`);
      celebLayer.appendChild(ring);

      for (let i = 0; i < 36; i++) {
        const spark = document.createElement("span");
        spark.className = "spark";
        spark.style.cssText = `left:${burst.x}%;top:${burst.y}%`;
        spark.style.setProperty("--dx",    `${(Math.random() - 0.5) * 420}px`);
        spark.style.setProperty("--dy",    `${(Math.random() - 0.65) * 320}px`);
        spark.style.setProperty("--delay", `${burst.delay + Math.random() * 0.2}s`);
        celebLayer.appendChild(spark);
      }

      for (let i = 0; i < 24; i++) {
        const confetti = document.createElement("span");
        confetti.className = "confetti";
        confetti.style.cssText = `left:${burst.x + (Math.random() - 0.5) * 12}%;top:${burst.y - 8 + Math.random() * 6}%`;
        confetti.style.setProperty("--dx",    `${(Math.random() - 0.5) * 260}px`);
        confetti.style.setProperty("--dy",    `${140 + Math.random() * 220}px`);
        confetti.style.setProperty("--rot",   `${Math.random() * 620}deg`);
        confetti.style.setProperty("--delay", `${burst.delay + 0.06 + Math.random() * 0.24}s`);
        celebLayer.appendChild(confetti);
      }
    }

    window.setTimeout(() => {
      celebLayer.classList.add("hidden");
      celebLayer.innerHTML = "";
    }, 1900);
  }

  /* ── Countdown course 2027 ────────────────────────────────────────────── */

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  /* Date/heure de départ = date officielle si connue, sinon premier jour de la semaine UTMB + dayOffset */
  function raceStartInfo(profile) {
    const track    = safeTracks[profile.track];
    const scenario = safeUtmbScenarios[profile.utmbScenario];
    if (!track || !scenario || !track.raceStart) return null;

    const rs      = track.raceStart;
    const weekRef = scenario.weekStart || scenario.targetDate;
    const day     = parseDate(rs.date || weekRef);
    if (!rs.date) day.setDate(day.getDate() + (rs.dayOffset || 0));

    return {
      race:  track.race,
      route: rs.route,
      place: rs.place,
      date:  day,
      dateEnd: rs.date && rs.dateEnd ? parseDate(rs.dateEnd) : null,
      time:  rs.time,
      timeTentative: Boolean(rs.timeTentative),
      ts:    new Date(`${toDayKey(day)}T${rs.time}:00${rs.utcOffset}`).getTime()
    };
  }

  /* "dimanche 22, lundi 23 ou mardi 24 août" */
  function possibleDaysText(from, to) {
    const days = [];
    const d = new Date(from);
    while (d <= to && days.length < 10) { days.push(new Date(d)); d.setDate(d.getDate() + 1); }
    const fmt = (x) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric" }).format(x);
    const month = new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(to);
    const parts = days.map(fmt);
    const last = parts.pop();
    return (parts.length ? `${parts.join(", ")} ou ${last}` : last) + ` ${month}`;
  }

  function renderCountdownHead(info) {
    if (countdownTitle) countdownTitle.textContent = `${info.race} UTMB 2027`;
    if (countdownSub) {
      if (info.dateEnd) {
        countdownSub.textContent =
          `Départ ${info.place} · ${possibleDaysText(info.date, info.dateEnd)} (date exacte à venir) · compte à rebours sur le premier jour possible`;
      } else {
        const when = new Intl.DateTimeFormat("fr-FR", {
          weekday: "long", day: "numeric", month: "long"
        }).format(info.date);
        const tentative = info.timeTentative ? " (heure à confirmer)" : "";
        countdownSub.textContent =
          `Départ ${info.place} · ${when}, ${info.time.replace(":", "h")}${tentative}`;
      }
    }
  }

  /* ── Carte du tracé (Leaflet) ─────────────────────────────────────────── */

  /* Leaflet est chargé en `defer` : il n'est pas encore là quand app.js s'exécute */
  function whenLeafletReady(cb) {
    if (typeof L !== "undefined") { cb(); return; }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function retry() {
        if (typeof L !== "undefined") cb();
        else if (mapFallback) mapFallback.classList.remove("hidden");
      }, { once: true });
      return;
    }
    if (mapFallback) mapFallback.classList.remove("hidden");
  }

  function ensureMap() {
    if (raceMap || !mapEl) return raceMap;

    raceMap = L.map(mapEl, {
      zoomControl: true,
      scrollWheelZoom: false,   /* la molette scrolle la page, pas la carte */
      attributionControl: true,
      zoomSnap: 0.25            /* zoom fractionnaire : le tracé remplit le cadre */
    });
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIB, maxZoom: 17 })
      .addTo(raceMap);

    /* Sur mobile, un doigt sur la carte doit d'abord scroller la page :
       le drag ne s'active qu'après un tap explicite. */
    if (L.Browser.mobile) {
      raceMap.dragging.disable();
      raceMap.touchZoom.disable();
      if (mapHint) {
        mapHint.classList.remove("hidden");
        mapHint.addEventListener("click", () => {
          raceMap.dragging.enable();
          raceMap.touchZoom.enable();
          mapHint.classList.add("hidden");
        });
      }
    }

    return raceMap;
  }

  function pinIcon(kind, label) {
    return L.divIcon({
      className: "",
      html: `<span class="race-pin race-pin--${kind}"><b class="race-pin__label">${label}</b></span>`,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
  }

  /* Distance affichée seulement si elle est fiable : officielle (GPX de la course),
     approximative (tracé dérivé d'un autre GPX), ou tue (tracé provisoire). */
  function raceBadgeText(route) {
    if (route.provisional || !route.km) return route.name;
    if (route.derived) return `${route.name} · ~${route.km} km`;
    const dplus = route.dplus ? ` · D+ ${route.dplus} m` : "";
    return `${route.name} · ${route.km} km${dplus}`;
  }

  function drawRoute(route) {
    const map = ensureMap();
    if (!map) return;

    if (raceLayer) { map.removeLayer(raceLayer); raceLayer = null; }
    raceLayer = L.layerGroup().addTo(map);

    const pts = route.points || [];
    let bounds = null;

    if (pts.length > 1) {
      L.polyline(pts, { color: "#ff6b00", weight: 9, opacity: 0.16, lineJoin: "round" }).addTo(raceLayer);
      const line = L.polyline(pts, { color: "#ff6b00", weight: 3, opacity: 0.95, lineJoin: "round" }).addTo(raceLayer);
      bounds = line.getBounds();
    }

    /* Ravitos et points de contrôle : petits points cliquables */
    (route.checkpoints || []).forEach((cp) => {
      L.circleMarker([cp.lat, cp.lon], {
        radius: 3.5, color: "#f5c518", weight: 1, opacity: 0.9,
        fillColor: "#f5c518", fillOpacity: 0.85
      })
        .bindTooltip(cp.km ? `${cp.name} · km ${cp.km}` : cp.name, { direction: "top" })
        .addTo(raceLayer);
    });

    if (route.start) {
      L.marker([route.start.lat, route.start.lon], { icon: pinIcon("start", route.start.name), keyboard: false })
        .addTo(raceLayer);
    }
    if (route.finish) {
      L.marker([route.finish.lat, route.finish.lon], { icon: pinIcon("finish", route.finish.name), keyboard: false })
        .addTo(raceLayer);
    }

    if (mapBadge) {
      mapBadge.textContent = raceBadgeText(route);
      mapBadge.classList.remove("hidden");
    }

    map.invalidateSize();
    /* Marge basse plus large : les étiquettes pendent sous les marqueurs */
    if (bounds) map.fitBounds(bounds, { paddingTopLeft: [26, 26], paddingBottomRight: [26, 44] });
    else if (route.start) map.setView([route.start.lat, route.start.lon], 13);
  }

  function showRaceMap(slug) {
    if (!mapEl || !slug) return;
    if (raceMapSlug === slug && raceMap) { raceMap.invalidateSize(); return; }

    const render = (route) => {
      raceMapSlug = slug;
      whenLeafletReady(() => drawRoute(route));
    };

    if (routeCache[slug]) { render(routeCache[slug]); return; }

    fetch(`assets/routes/${slug}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(r.status))))
      .then((route) => { routeCache[slug] = route; render(route); })
      .catch(() => { if (mapFallback) mapFallback.classList.remove("hidden"); });
  }

  function stopCountdown() {
    if (countdownTimer !== null) {
      window.clearInterval(countdownTimer);
      countdownTimer = null;
    }
  }

  function startCountdown(profile) {
    stopCountdown();
    if (!countdownCard) return;

    const info = raceStartInfo(profile);
    if (!info || Number.isNaN(info.ts)) {
      countdownCard.classList.add("hidden");
      return;
    }

    countdownCard.classList.remove("hidden");
    renderCountdownHead(info);
    showRaceMap(info.route);

    function tick() {
      const diff = info.ts - Date.now();

      if (diff <= 0) {
        countdownCard.classList.add("countdown-card--go");
        if (cdDays)  cdDays.textContent  = "0";
        if (cdHours) cdHours.textContent = "00";
        if (cdMins)  cdMins.textContent  = "00";
        if (cdSecs)  cdSecs.textContent  = "00";
        stopCountdown();
        return;
      }

      countdownCard.classList.remove("countdown-card--go");
      const totalSec = Math.floor(diff / 1000);
      if (cdDays)  cdDays.textContent  = String(Math.floor(totalSec / 86400));
      if (cdHours) cdHours.textContent = pad2(Math.floor((totalSec % 86400) / 3600));
      if (cdMins)  cdMins.textContent  = pad2(Math.floor((totalSec % 3600) / 60));
      if (cdSecs)  cdSecs.textContent  = pad2(totalSec % 60);
    }

    tick();
    countdownTimer = window.setInterval(tick, 1000);
  }

  /* ── Courses perso (persistance) ──────────────────────────────────────── */

  function raceSlots(profile) {
    const slots = typeof RACE_SLOTS === "object" && RACE_SLOTS ? RACE_SLOTS[profile.track] : null;
    return Array.isArray(slots) ? slots : [];
  }

  /* Indépendant du scénario UTMB : changer de semaine ne doit pas effacer ses courses */
  function racesStorageKey(profile) {
    return `${RACES_KEY_PREFIX}_${profile.track}_${profile.firstName.toLowerCase()}`;
  }

  function getRaces(profile) {
    const raw = localStorage.getItem(racesStorageKey(profile));
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch { return {}; }
  }

  function setRaces(profile, races) {
    localStorage.setItem(racesStorageKey(profile), JSON.stringify(races));
  }

  function formatShort(date) {
    return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(date);
  }

  /* "24–25 oct. 2026", "30 avr. – 2 mai 2027" ou "sam. 24 oct. 2026" */
  function formatRange(start, end) {
    if (toDayKey(start) === toDayKey(end)) {
      return new Intl.DateTimeFormat("fr-FR", {
        weekday: "short", day: "numeric", month: "short", year: "numeric"
      }).format(start);
    }
    if (isSameMonth(start, end)) {
      return `${start.getDate()}–${formatShort(end)}`;
    }
    const s = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(start);
    return `${s} – ${formatShort(end)}`;
  }

  function slotWindows(slot) {
    return Array.isArray(slot.windows) ? slot.windows.filter((w) => w && w.from && w.to) : [];
  }

  /* Dernier jour autorisé pour l'emplacement (sert à le ranger dans la liste) */
  function slotDeadline(slot) {
    const ws = slotWindows(slot);
    if (!ws.length) return null;
    return parseDate(ws.reduce((max, w) => (w.to > max ? w.to : max), ws[0].to));
  }

  /* "19–20 ou 26–27 déc. 2026" — les fenêtres d'un même mois partagent le suffixe */
  function windowsText(ws) {
    const dayFmt = new Intl.DateTimeFormat("fr-FR", { day: "numeric" });
    const groups = [];
    for (const w of ws) {
      const from = parseDate(w.from);
      const to   = parseDate(w.to);
      const key  = monthKey(to);
      const days = isSameMonth(from, to)
        ? `${dayFmt.format(from)}–${dayFmt.format(to)}`
        : `${new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(from)} – ${dayFmt.format(to)}`;
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.days.push(days);
      else groups.push({ key, days: [days], suffix: new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(to) });
    }
    return groups.map((g) => `${g.days.join(" ou ")} ${g.suffix}`).join(" ou ");
  }

  function kmText(slot) {
    if (slot.minKm != null && slot.maxKm != null) return `${slot.minKm}–${slot.maxKm} km`;
    if (slot.minKm != null) return `≥ ${slot.minKm} km`;
    if (slot.maxKm != null) return `≤ ${slot.maxKm} km`;
    return "";
  }

  /* Texte des contraintes d'un emplacement : "19–20 ou 26–27 déc. 2026 · 10–15 km" */
  function slotRuleText(slot) {
    const parts = [];
    const ws = slotWindows(slot);
    if (ws.length) parts.push(windowsText(ws));
    const km = kmText(slot);
    if (km) parts.push(km);
    if (slot.note) parts.push(slot.note);
    return parts.join(" · ");
  }

  /* Écarts entre la course saisie et les contraintes — signalés, jamais bloquants */
  function raceIssues(slot, race) {
    const issues = [];
    const ws = slotWindows(slot);
    if (race.date && ws.length && !ws.some((w) => race.date >= w.from && race.date <= w.to)) {
      issues.push(`hors des dates autorisées (${windowsText(ws)})`);
    }
    if (typeof race.km === "number") {
      if (slot.minKm != null && race.km < slot.minKm) issues.push(`distance sous le minimum (${slot.minKm} km)`);
      if (slot.maxKm != null && race.km > slot.maxKm) issues.push(`distance au-dessus du maximum (${slot.maxKm} km)`);
    }
    return issues;
  }

  /* ── Étapes (WE Choc + courses perso + course finale) ─────────────────── */

  /*
   * Une étape = { kind, label, start, end, ts, place, optional, slot, race, issues }
   *   kind : "choc" | "race" | "slot" (course pas encore choisie) | "final"
   *   ts   : instant visé par le countdown (minuit local du 1er jour, ou l'heure
   *          de départ officielle pour la course finale)
   */
  function buildSteps(profile) {
    const steps = [];

    for (const ev of teamEvents(profile)) {
      const start = parseDate(ev.start);
      const end   = parseDate(ev.end);
      steps.push({
        kind: ev.type === "choc" ? "choc" : "race",
        label: ev.label, place: ev.place || null, optional: Boolean(ev.optional),
        start, end, ts: start.getTime(), issues: []
      });
    }

    const races = getRaces(profile);
    for (const slot of raceSlots(profile)) {
      const race = raceForSlot(profile, slot, races);
      if (race && race.date) {
        const d = parseDate(race.date);
        steps.push({
          kind: "race", label: race.name, place: race.place || null, km: race.km,
          validated: Boolean(race.validated), team: Boolean(race.team),
          companions: race.companions || [], dateApprox: Boolean(race.dateApprox),
          /* Validée par le staff (liste, case cochée ou nom dans la liste) → pas d'alerte de contrainte */
          start: d, end: d, ts: d.getTime(), slot, race, issues: race.validated ? [] : raceIssues(slot, race)
        });
      } else {
        /* Pas encore choisie : on la range à la fin de sa fenêtre, sinon en bout de liste */
        const anchor = slotDeadline(slot);
        steps.push({ kind: "slot", label: slot.label, start: anchor, end: anchor, ts: anchor ? anchor.getTime() : Infinity, slot, issues: [] });
      }
    }

    const info = raceStartInfo(profile);
    if (info && !Number.isNaN(info.ts)) {
      steps.push({
        kind: "final", label: `${info.race} UTMB 2027`, place: info.place,
        start: info.date, end: info.dateEnd || info.date, ts: info.ts, issues: []
      });
    }

    steps.sort((a, b) => a.ts - b.ts);
    return steps;
  }

  function stepStatus(step, todayKey) {
    if (step.kind === "slot") return "todo";
    const sKey = toDayKey(step.start);
    const eKey = toDayKey(step.end);
    if (eKey < todayKey)  return "past";
    if (sKey <= todayKey) return "now";
    return "future";
  }

  const STEP_FLAGS = { choc: "⚡", race: "🏁", slot: "🏁", final: "🏔️" };

  function stopStepCountdown() {
    if (stepTimer !== null) {
      window.clearInterval(stepTimer);
      stepTimer = null;
    }
  }

  function startStepCountdown(ts) {
    stopStepCountdown();
    function tick() {
      const diff = ts - Date.now();
      if (diff <= 0) {
        stepsCard.classList.add("countdown-card--go");
        if (sdDays)  sdDays.textContent  = "0";
        if (sdHours) sdHours.textContent = "00";
        if (sdMins)  sdMins.textContent  = "00";
        if (sdSecs)  sdSecs.textContent  = "00";
        stopStepCountdown();
        return;
      }
      stepsCard.classList.remove("countdown-card--go");
      const totalSec = Math.floor(diff / 1000);
      if (sdDays)  sdDays.textContent  = String(Math.floor(totalSec / 86400));
      if (sdHours) sdHours.textContent = pad2(Math.floor((totalSec % 86400) / 3600));
      if (sdMins)  sdMins.textContent  = pad2(Math.floor((totalSec % 3600) / 60));
      if (sdSecs)  sdSecs.textContent  = pad2(totalSec % 60);
    }
    tick();
    stepTimer = window.setInterval(tick, 1000);
  }

  function stepMetaText(step) {
    const bits = [];
    if (step.race && step.race.unknown) bits.push(TEAM_DATA_MISSING);
    else if (step.dateApprox) bits.push("date à préciser");
    if (typeof step.km === "number") bits.push(`${step.km} km`);
    if (step.place) bits.push(step.place);
    if (step.optional) bits.push("optionnel");
    return bits.join(" · ");
  }

  function renderSteps(profile) {
    if (!stepsCard || !stepsList) return;
    const now      = new Date();
    const todayKey = toDayKey(now);
    const steps    = buildSteps(profile);

    /* Prochaine étape = la première en cours ou à venir (les courses non choisies n'ont pas de date) */
    const dated = steps.find((st) => {
      const status = stepStatus(st, todayKey);
      return status === "now" || status === "future";
    });
    /* …sauf si une course reste à choisir et que son échéance tombe avant : c'est elle l'urgence
       (sinon on afficherait un WE Choc dans six mois alors que la Course 1 se choisit ce mois-ci) */
    const toChoose = steps.find((st) => st.kind === "slot" && st.start && toDayKey(st.start) >= todayKey);
    const next = toChoose && (!dated || toChoose.ts <= dated.ts) ? toChoose : dated;

    if (next && next.kind === "slot") {
      if (stepFlag)   stepFlag.textContent   = STEP_FLAGS.slot;
      if (stepsTitle) stepsTitle.textContent = `Choisis ta ${next.label}`;
      if (stepSub) {
        const rule = slotRuleText(next.slot);
        stepSub.textContent = `À choisir avant le ${formatShort(next.start)}` + (rule ? ` · ${rule}` : "");
      }
      startStepCountdown(next.ts);
    } else if (next) {
      const status = stepStatus(next, todayKey);
      if (stepFlag)   stepFlag.textContent   = STEP_FLAGS[next.kind] || "⛰️";
      if (stepsTitle) stepsTitle.textContent = next.label;
      if (stepSub) {
        const meta = stepMetaText(next);
        stepSub.textContent = formatRange(next.start, next.end) + (meta ? ` · ${meta}` : "");
      }
      startStepCountdown(status === "now" ? 0 : next.ts);
    } else {
      stopStepCountdown();
      if (stepFlag)   stepFlag.textContent   = "🏁";
      if (stepsTitle) stepsTitle.textContent = "Toutes les étapes sont passées";
      if (stepSub)    stepSub.textContent    = "";
      stepsCard.classList.add("countdown-card--go");
    }

    stepsList.innerHTML = "";
    for (const step of steps) {
      const status = stepStatus(step, todayKey);
      const li = document.createElement("li");
      li.className = `steps-item steps-item--${status} steps-item--${step.kind}`;
      if (step === next) li.classList.add("steps-item--next");
      if (step.slot && step.kind === "race" && !step.validated) li.classList.add("steps-item--pending");

      const when = document.createElement("span");
      when.className = "steps-when";
      if (step.kind === "slot") {
        when.textContent = step.start ? `avant le ${formatShort(step.start)}` : "date à définir";
      } else {
        when.textContent = formatRange(step.start, step.end);
      }

      const body = document.createElement("span");
      body.className = "steps-body";
      const name = document.createElement("span");
      name.className = "steps-label";
      name.textContent = step.kind === "slot" ? `${step.label} · à choisir` : step.label;
      body.appendChild(name);

      /* Course perso : statut de validation par le staff */
      if (step.slot && step.kind === "race") {
        const badge = document.createElement("span");
        badge.className = `steps-status ${step.validated ? "steps-status--ok" : "steps-status--pending"}`;
        badge.textContent = step.validated ? "✓ Validée par le staff" : "⏳ En attente de validation";
        body.appendChild(badge);
      }

      /* Inscriptions (relevé Qui court où) + lien site officiel */
      const sg = step.race && signupText(step.race);
      if (sg) {
        const line = document.createElement("span");
        line.className = `steps-signup${sg.cls ? " steps-signup--" + sg.cls : ""}`;
        line.textContent = `📝 ${sg.text}`;
        if (step.race.url) {
          line.appendChild(document.createTextNode(" · "));
          const a = document.createElement("a");
          a.href = step.race.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = "site ↗";
          line.appendChild(a);
        }
        body.appendChild(line);
      }

      /* Qui d'autre y va (depuis « Qui court où ? ») — sans répéter « indisponible » deux fois */
      if (step.team && !(step.race.unknown && !ROSTER.length)) {
        const who = document.createElement("span");
        who.className = "steps-with";
        who.textContent = !ROSTER.length
          ? `🏃 ${TEAM_DATA_MISSING}`
          : step.companions.length
            ? `🏃 avec ${step.companions.join(", ")}`
            : "🏃 personne d'autre pour l'instant";
        body.appendChild(who);
      }

      const metaText = step.kind === "slot" ? slotRuleText(step.slot) : stepMetaText(step);
      if (metaText || step.issues.length) {
        const meta = document.createElement("span");
        meta.className = "steps-meta";
        meta.textContent = step.issues.length
          ? `⚠️ ${step.issues.join(", ")}${metaText ? " · " + metaText : ""}`
          : metaText;
        if (step.issues.length) meta.classList.add("steps-meta--warn");
        body.appendChild(meta);
      }

      const right = document.createElement("span");
      right.className = "steps-right";
      if (step.kind === "slot") {
        /* Le choix se fait dans « Qui court où ? » (liste validée par le staff) — si le profil
           est relié à la team ; sinon la saisie locale reste disponible */
        if (profile.participantId) {
          const link = document.createElement("a");
          link.className = "btn-ghost btn-ghost--sm";
          link.href = teamBlocUrl(step.slot);
          link.textContent = "Choisir";
          right.appendChild(link);
        }
        /* v3.2.0 : les courses se choisissent uniquement dans « Qui court où ? ». La saisie
           locale ne reste que pour un profil pas relié à la team (roster non chargé). */
        if (!profile.participantId) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn-ghost btn-ghost--sm";
          btn.textContent = "Ajouter";
          btn.addEventListener("click", () => openRaceDialog(step.slot, null));
          right.appendChild(btn);
        }
      } else {
        const jd = document.createElement("span");
        jd.className = "steps-jd";
        if (status === "past")     jd.textContent = "✓";
        else if (status === "now") jd.textContent = "J";
        else                       jd.textContent = `J-${daysDiff(now, step.start)}`;
        right.appendChild(jd);
        if (step.slot && step.team) {
          const link = document.createElement("a");
          link.className = "btn-ghost btn-ghost--sm";
          link.href = teamBlocUrl(step.slot);
          link.textContent = "Modifier";
          link.setAttribute("aria-label", `Modifier ${step.label} dans Qui court où`);
          right.appendChild(link);
        } else if (step.slot && profile.participantId) {
          /* Ancienne saisie locale : à déclarer dans « Qui court où ? » (elle s'efface d'elle-même
             à l'affichage dès qu'un choix y existe pour ce bloc) */
          const link = document.createElement("a");
          link.className = "btn-ghost btn-ghost--sm";
          link.href = teamBlocUrl(step.slot);
          link.textContent = "Déclarer";
          link.title = "Course saisie sur cet appareil seulement : déclare-la dans Qui court où pour que la team la voie";
          right.appendChild(link);
        } else if (step.slot) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "btn-ghost btn-ghost--sm";
          btn.textContent = "Modifier";
          btn.setAttribute("aria-label", `Modifier ${step.label}`);
          btn.addEventListener("click", () => openRaceDialog(step.slot, step.race));
          right.appendChild(btn);
        }
      }

      li.appendChild(when);
      li.appendChild(body);
      li.appendChild(right);
      stepsList.appendChild(li);
    }
  }

  /* ── Dialog course perso ──────────────────────────────────────────────── */

  function readRaceForm() {
    const km = parseFloat(String(raceKmIn.value).replace(",", "."));
    return {
      name:  raceNameIn.value.trim(),
      date:  raceDateIn.value,
      km:    Number.isFinite(km) ? km : null,
      place: racePlaceIn.value.trim(),
      validated: Boolean(raceValidIn && raceValidIn.checked)
    };
  }

  function refreshRaceWarning() {
    if (!editingSlot || !raceWarning) return;
    const issues = raceIssues(editingSlot, readRaceForm());
    raceWarning.textContent = issues.length ? `⚠️ Hors contrainte : ${issues.join(", ")}. À valider avec le staff.` : "";
    raceWarning.classList.toggle("hidden", issues.length === 0);
  }

  function openRaceDialog(slot, race) {
    if (!raceDialog || !currentProfile) return;
    editingSlot = slot;
    if (raceDlgTitle) raceDlgTitle.textContent = slot.label;
    if (raceDlgRule) {
      const rule = slotRuleText(slot);
      raceDlgRule.textContent = rule;
      raceDlgRule.classList.toggle("hidden", !rule);
    }
    raceNameIn.value  = race ? race.name || "" : "";
    raceDateIn.value  = race ? race.date || "" : "";
    raceKmIn.value    = race && typeof race.km === "number" ? String(race.km) : "";
    racePlaceIn.value = race ? race.place || "" : "";
    if (raceValidIn) raceValidIn.checked = Boolean(race && race.validated);
    if (raceDeleteBtn) raceDeleteBtn.classList.toggle("hidden", !race);
    refreshRaceWarning();
    if (typeof raceDialog.showModal === "function") raceDialog.showModal();
    else raceDialog.setAttribute("open", "");
    raceNameIn.focus();
  }

  function closeRaceDialog() {
    editingSlot = null;
    if (!raceDialog) return;
    if (typeof raceDialog.close === "function" && raceDialog.open) raceDialog.close();
    else raceDialog.removeAttribute("open");
  }

  function afterRaceChange() {
    if (!currentProfile) return;
    renderSteps(currentProfile);
    renderCalendar(currentProfile);
  }

  if (raceForm) {
    raceForm.addEventListener("input", refreshRaceWarning);
    raceForm.addEventListener("submit", function onRaceSubmit(event) {
      event.preventDefault();
      if (!editingSlot || !currentProfile) return;
      const race = readRaceForm();
      if (!race.name || !race.date || race.km === null) return;
      const races = getRaces(currentProfile);
      races[editingSlot.id] = race;
      setRaces(currentProfile, races);
      closeRaceDialog();
      afterRaceChange();
    });
  }
  if (raceCancelBtn) raceCancelBtn.addEventListener("click", closeRaceDialog);
  if (raceDeleteBtn) {
    raceDeleteBtn.addEventListener("click", function onRaceDelete() {
      if (!editingSlot || !currentProfile) return;
      const races = getRaces(currentProfile);
      delete races[editingSlot.id];
      setRaces(currentProfile, races);
      closeRaceDialog();
      afterRaceChange();
    });
  }
  if (raceDialog) raceDialog.addEventListener("close", () => { editingSlot = null; });

  /* ── Render ───────────────────────────────────────────────────────────── */

  function calendarBounds(profile) {
    const track    = safeTracks[profile.track];
    const scenario = safeUtmbScenarios[profile.utmbScenario];
    return { track, scenario, start: parseDate(track.startDate), end: parseDate(scenario.targetDate) };
  }

  /* Anneau, dodos, streak : recalculés à chaque coche sans reconstruire la grille */
  function renderStats(profile, doneDays) {
    const { track, start, end } = calendarBounds(profile);
    const now        = new Date();
    /* Dodos = nuits jusqu'au jour de course (= J-n), pas jusqu'à la fin de la semaine UTMB */
    const raceInfo   = raceStartInfo(profile);
    const dodosLeft  = Math.max(0, daysDiff(now, raceInfo ? raceInfo.date : end));
    const totalDays  = Math.max(0, daysDiff(start, end) + 1);
    const streak     = calculateStreak(profile, start, doneDays);

    let doneCount = 0;
    const cc = new Date(start);
    while (cc <= end) {
      if (isChecked(profile, doneDays, cc)) doneCount++;
      cc.setDate(cc.getDate() + 1);
    }
    const pct = totalDays > 0 ? Math.round((doneCount / totalDays) * 100) : 0;

    /* Stats */
    if (dodosValue)    dodosValue.textContent  = String(dodosLeft);
    if (dodosRaceLbl)  dodosRaceLbl.textContent = `dodos jusqu'à la ${track.race} 2027`;
    if (streakValue)   streakValue.textContent  = String(streak);
    if (progressPctEl) progressPctEl.textContent = `${pct}%`;
    if (progressRing)  progressRing.style.strokeDashoffset = (RING_CIRC * (1 - pct / 100)).toFixed(2);
    return totalDays;
  }

  const longDayFmt = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  /* État visuel + libellé lu par VoiceOver d'une case : « lundi 3 novembre 2026, fait » */
  function applyDayState(cell, checkbox, day, checked, todayKey, ev) {
    const dayKey = toDayKey(day);
    cell.classList.toggle("day-cell--done",   checked);
    cell.classList.toggle("day-cell--missed", !checked && dayKey < todayKey);
    cell.classList.toggle("day-cell--future", !checked && dayKey > todayKey);
    checkbox.checked = checked;
    checkbox.setAttribute("aria-label",
      `${longDayFmt.format(day)}${ev ? `, ${ev.label}` : ""}, ${checked ? "fait" : "non fait"}`);
  }

  function renderCalendar(profile) {
    const { track, scenario, start, end } = calendarBounds(profile);
    const now      = new Date();
    const todayKey = toDayKey(now);
    const doneDays = getDoneDays(profile);
    const totalDays = renderStats(profile, doneDays);

    /* Profile lines */
    if (welcomeLine) welcomeLine.textContent = `Salut ${profile.firstName}.`;
    if (projectLine) projectLine.textContent = `${track.label} → ${track.race} · ${scenario.label}`;
    if (calendarMeta) calendarMeta.textContent =
      `Du ${formatDate(start)} au ${formatDate(end)} — ${totalDays} jours`;

    const eventMap = buildEventMap(profile, start, end);

    /* Reconstruction (synchro, course modifiée) : on garde la case qui avait le focus clavier */
    const focusedDay = document.activeElement && document.activeElement.classList &&
      document.activeElement.classList.contains("day-checkbox") ? document.activeElement.dataset.day : null;

    /* Preserve open-month state */
    const openKeys = new Set();
    calendarList.querySelectorAll(".month-accordion").forEach((acc) => {
      if (acc.open && acc.dataset.monthKey) openKeys.add(acc.dataset.monthKey);
    });
    calendarList.innerHTML = "";

    const months    = buildMonths(start, end);
    const curMonth  = new Date(now.getFullYear(), now.getMonth(), 1);
    const hasCurr   = months.some((m) => isSameMonth(m.monthStart, curMonth));

    for (let mi = 0; mi < months.length; mi++) {
      const { monthStart, days } = months[mi];
      const mKey = monthKey(monthStart);

      const details = document.createElement("details");
      details.className        = "month-accordion";
      details.dataset.monthKey = mKey;

      if (openKeys.size > 0) {
        details.open = openKeys.has(mKey);
      } else if (hasCurr) {
        details.open = isSameMonth(monthStart, curMonth);
      } else {
        details.open = mi === 0;
      }

      const summary = document.createElement("summary");
      summary.textContent = monthLabel(monthStart);
      details.appendChild(summary);

      /* Weekday header */
      const headerRow = document.createElement("div");
      headerRow.className = "month-header-row";
      for (const lbl of WEEKDAY_HDRS) {
        const hd = document.createElement("span");
        hd.className   = "month-header-day";
        hd.textContent = lbl;
        headerRow.appendChild(hd);
      }
      details.appendChild(headerRow);

      /* Day grid */
      const grid = document.createElement("div");
      grid.className = "month-grid";

      for (const day of days) {
        const inMonth   = isSameMonth(day, monthStart);
        const inProject = day >= start && day <= end;
        const dayKey    = toDayKey(day);

        const cell = document.createElement("label");
        cell.className = "day-cell";

        if (!inMonth || !inProject) {
          cell.classList.add("day-cell--out");
          cell.appendChild(document.createElement("span"));
          grid.appendChild(cell);
          continue;
        }

        if (dayKey === todayKey) cell.classList.add("day-cell--today");
        const ev = eventMap[dayKey];

        const topSpan = document.createElement("span");
        topSpan.className   = "day-label";
        topSpan.setAttribute("aria-hidden", "true");
        topSpan.textContent = weekdayLabel(day);

        const numSpan = document.createElement("span");
        numSpan.className   = "day-number";
        numSpan.textContent = String(day.getDate());
        numSpan.setAttribute("aria-hidden", "true");

        const checkbox = document.createElement("input");
        checkbox.className = "day-checkbox";
        checkbox.type      = "checkbox";
        checkbox.dataset.day = dayKey;
        applyDayState(cell, checkbox, day, isChecked(profile, doneDays, day), todayKey, ev);

        /* Une coche ne met à jour que sa case et les stats : pas de reconstruction, le focus
           et le défilement restent en place */
        checkbox.addEventListener("change", function onToggle() {
          const current    = getDoneDays(profile);
          const wasChecked = isChecked(profile, current, day);
          current[dayKey] = checkbox.checked;
          setDoneDays(profile, current);
          queueDoneChange(profile, dayKey, checkbox.checked);
          applyDayState(cell, checkbox, day, checkbox.checked, toDayKey(new Date()), ev);
          renderStats(profile, current);
          if (!wasChecked && checkbox.checked) showCelebration();
        });

        cell.appendChild(topSpan);
        cell.appendChild(numSpan);

        if (ev) {
          cell.classList.add(`day-cell--event-${ev.type}`);
          if (ev.optional) cell.classList.add("day-cell--event-optional");
          const tag = document.createElement("span");
          /* Pictogramme plutôt que le nom (illisible à 11 px dans une case de 40 px) ; le nom
             complet est dans l'aria-label de la case, dans l'infobulle et dans la liste des étapes */
          tag.className   = "event-tag";
          tag.textContent = ev.type === "choc" ? "⚡" : "🏁";
          tag.setAttribute("aria-hidden", "true");
          cell.title = ev.label;
          cell.appendChild(tag);
        }

        cell.appendChild(checkbox);
        grid.appendChild(cell);
      }

      details.appendChild(grid);
      calendarList.appendChild(details);
    }

    if (focusedDay) {
      const again = calendarList.querySelector(`.day-checkbox[data-day="${focusedDay}"]`);
      if (again) again.focus({ preventScroll: true });
    }
  }

  /* ── View transitions ─────────────────────────────────────────────────── */

  function renderLinkBox(profile) {
    if (!linkTeamBox) return;
    const show = !profile.participantId && ROSTER.length > 0;
    linkTeamBox.classList.toggle("hidden", !show);
    if (show) {
      fillRosterSelect(linkParticipant, "— c'est moi —");
      const guess = matchRoster(profile.firstName);
      if (guess) linkParticipant.value = guess.id;
    }
  }

  function showTracker(profile) {
    profile = migrateLegacyScenario(profile);
    /* Profil d'avant la v3 : on le relie au roster si le prénom est sans ambiguïté */
    if (!profile.participantId) {
      const guess = matchRoster(profile.firstName);
      if (guess && TEAM_TRACK[guess.group] === profile.track) profile = linkProfile(profile, guess.id);
    } else {
      const upgraded = rosterMatchForGuest(profile.participantId);
      if (upgraded) profile = linkProfile(profile, upgraded.id); /* garde firstName → cases locales conservées, renvoyées sous le vrai id */
      else setTeamMe(profile.participantId);
    }
    saveProfile(profile);   /* réécrit à chaque visite : Safari ne le purge pas après 7 jours */
    onboardingCard.classList.add("hidden");
    trackerCard.classList.remove("hidden");
    calendarCard.classList.remove("hidden");
    currentProfile = profile;
    startCountdown(profile);
    if (stepsCard) stepsCard.classList.remove("hidden");
    renderLinkBox(profile);
    /* Cache des choix Qui court où lu AVANT le premier rendu : pas de bascule visible
       entre saisies locales et courses de la team pendant l'appel réseau */
    if (teamChoices === null) teamChoices = readTeamCache();
    renderSteps(profile);
    renderCalendar(profile);
    /* Courses de « Qui court où ? » : cache d'abord (déjà rendu), puis réseau */
    loadTeamChoices().then(() => {
      if (currentProfile === profile) { renderSteps(profile); renderCalendar(profile); }
    });
    /* Jours cochés : copie locale déjà affichée, puis état synchronisé */
    setSyncStatus("");
    pullDone(profile);
  }

  function showOnboarding() {
    /* Identité déjà connue d'un autre outil (ou de l'ancien profil) → préremplie */
    if (participantSel && ROSTER.length) {
      const me = getTeamMe();
      participantSel.value = me || "";
      participantSel.dispatchEvent(new Event("change"));
    }
    onboardingCard.classList.remove("hidden");
    trackerCard.classList.add("hidden");
    calendarCard.classList.add("hidden");
    currentProfile = null;
    stopCountdown();
    stopStepCountdown();
    if (countdownCard) countdownCard.classList.add("hidden");
    if (stepsCard) stepsCard.classList.add("hidden");
  }

  /* ── Events ───────────────────────────────────────────────────────────── */

  onboardingForm.addEventListener("submit", function onSubmit(event) {
    event.preventDefault();
    const fd         = new FormData(onboardingForm);
    const pid        = String(fd.get("participant") || "");
    const person     = rosterById[pid] || guestFromId(pid) || null;
    const firstName  = person ? person.name : String(fd.get("firstName") || "").trim();
    const track      = String(fd.get("track") || "");
    const utmbScenario = String(fd.get("utmbScenario") || "");
    if (!firstName || !safeTracks[track] || !safeUtmbScenarios[utmbScenario]) return;
    const profile = { firstName, track, utmbScenario };
    /* Dans le trombi → son id ; sinon un id invité partagé avec Qui court où (mêmes courses) */
    profile.participantId = person ? person.id : guestId(track === "0to40" ? "40" : "100", firstName);
    saveProfile(profile);
    setTeamMe(profile.participantId);
    showTracker(profile);
  });

  resetButton.addEventListener("click", function onReset() {
    clearProfile();
    showOnboarding();
  });

  /* ── Init ─────────────────────────────────────────────────────────────── */

  /* Onboarding : sélecteur roster (le prénom libre reste dispo pour qui n'y est pas) */
  if (participantSel) {
    if (ROSTER.length) {
      fillRosterSelect(participantSel, "— choisis ton prénom —");
      participantSel.addEventListener("change", () => {
        const p = person(participantSel.value);
        const other = participantSel.value === "__other";
        if (firstNameField) firstNameField.classList.toggle("hidden", !other);
        if (firstNameIn) firstNameIn.required = other;
        if (p && trackSel && TEAM_TRACK[p.group]) trackSel.value = TEAM_TRACK[p.group];
      });
    } else {
      /* Roster non chargé (offline) : on retombe sur le prénom libre */
      participantSel.closest(".field").classList.add("hidden");
      if (firstNameField) firstNameField.classList.remove("hidden");
      if (firstNameIn) firstNameIn.required = true;
    }
  }

  if (linkGoBtn) {
    linkGoBtn.addEventListener("click", () => {
      if (!currentProfile || !linkParticipant) return;
      const v = linkParticipant.value;
      if (v === "__other") {
        /* Pas dans le trombi : identifiant invité, partagé avec Qui court où */
        const gid = guestId(currentProfile.track === "0to40" ? "40" : "100", currentProfile.firstName);
        const linked = Object.assign({}, currentProfile, { participantId: gid });
        saveProfile(linked);
        setTeamMe(gid);
        showTracker(linked);
        return;
      }
      if (!rosterById[v]) return;
      showTracker(linkProfile(currentProfile, v));
    });
  }

  /* Retour sur l'onglet : on rafraîchit les choix de la team (au plus toutes les 30 s) */
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "visible" || !currentProfile) return;
    if (Date.now() - lastPullAt < PULL_MIN_INTERVAL_MS) return;
    const profile = currentProfile;
    loadTeamChoices().then(() => {
      if (currentProfile === profile) { renderSteps(profile); renderCalendar(profile); }
    });
    pullDone(profile, { throttle: true });
  });
  /* Retour du réseau : on envoie ce qui attendait */
  window.addEventListener("online", () => { if (currentProfile) pushDone(currentProfile); });
  /* On quitte l'onglet : on n'attend pas la fin du délai pour envoyer */
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden" && currentProfile) { clearTimeout(syncTimer); pushDone(currentProfile); }
  });

  const saved = getSavedProfile();
  if (saved) { showTracker(saved); return; }
  showOnboarding();
})();
