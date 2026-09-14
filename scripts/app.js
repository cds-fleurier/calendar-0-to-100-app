(function runApp() {
  const safeAppVersion = typeof APP_VERSION === "string" ? APP_VERSION : "1.0.0";
  const FALLBACK_CCC = { dayOffset: 4, time: "09:00", utcOffset: "+02:00", place: "Courmayeur",     route: "ccc" };
  const FALLBACK_MCC = { dayOffset: 0, time: "10:00", utcOffset: "+02:00", place: "Martigny-Combe", route: "mcc" };
  const safeTracks = typeof TRACKS === "object" && TRACKS ? TRACKS : {
    "0to100": { label: "0 to 100", race: "CCC", startDate: "2026-03-02", raceStart: FALLBACK_CCC },
    "0to40":  { label: "0 to 40",  race: "MCC", startDate: "2026-04-06", raceStart: FALLBACK_MCC }
  };
  const safeUtmbScenarios = typeof UTMB_SCENARIOS === "object" && UTMB_SCENARIOS ? UTMB_SCENARIOS : {
    week1: { label: "23 août 2027 au 29 août 2027",     weekStart: "2027-08-23", targetDate: "2027-08-29" },
    week2: { label: "30 août 2027 au 5 septembre 2027", weekStart: "2027-08-30", targetDate: "2027-09-05" }
  };

  const RING_CIRC     = 326.73; /* 2π × 52 */
  const WEEKDAY_HDRS  = ["L", "M", "M", "J", "V", "S", "D"];

  const versionNode    = document.getElementById("app-version");
  const onboardingCard = document.getElementById("onboarding-card");
  const trackerCard    = document.getElementById("tracker-card");
  const calendarCard   = document.getElementById("calendar-card");
  const onboardingForm = document.getElementById("onboarding-form");
  const resetButton    = document.getElementById("reset-profile");
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

  const PROFILE_COOKIE  = "zero_to_100_profile";
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

  function daysDiff(from, to) {
    const ms  = 24 * 60 * 60 * 1000;
    const a   = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const b   = new Date(to.getFullYear(),   to.getMonth(),   to.getDate());
    return Math.ceil((b - a) / ms);
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

  function getSavedProfile() {
    const raw = getCookie(PROFILE_COOKIE);
    if (!raw) return null;
    try {
      const p = JSON.parse(raw);
      if (!p.firstName || !safeTracks[p.track] || !safeUtmbScenarios[p.utmbScenario]) return null;
      return p;
    } catch { return null; }
  }

  function saveProfile(profile) {
    setCookie(PROFILE_COOKIE, JSON.stringify(profile), 365);
  }

  function clearProfile() {
    setCookie(PROFILE_COOKIE, "", -1);
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

  function own(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
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
      const race = races[slot.id];
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

    const bursts = [
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

  /* Date/heure de départ = lundi de la semaine UTMB + dayOffset, à l'heure locale course */
  function raceStartInfo(profile) {
    const track    = safeTracks[profile.track];
    const scenario = safeUtmbScenarios[profile.utmbScenario];
    if (!track || !scenario || !track.raceStart) return null;

    const rs      = track.raceStart;
    const weekRef = scenario.weekStart || scenario.targetDate;
    const day     = parseDate(weekRef);
    day.setDate(day.getDate() + (rs.dayOffset || 0));

    return {
      race:  track.race,
      route: rs.route,
      place: rs.place,
      date:  day,
      time:  rs.time,
      ts:    new Date(`${toDayKey(day)}T${rs.time}:00${rs.utcOffset}`).getTime()
    };
  }

  function renderCountdownHead(info) {
    if (countdownTitle) countdownTitle.textContent = `${info.race} UTMB 2027`;
    if (countdownSub) {
      const when = new Intl.DateTimeFormat("fr-FR", {
        weekday: "long", day: "numeric", month: "long"
      }).format(info.date);
      countdownSub.textContent =
        `Départ ${info.place} · ${when}, ${info.time.replace(":", "h")}`;
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
      const race = races[slot.id];
      if (race && race.date) {
        const d = parseDate(race.date);
        steps.push({
          kind: "race", label: race.name, place: race.place || null, km: race.km,
          validated: Boolean(race.validated),
          start: d, end: d, ts: d.getTime(), slot, race, issues: raceIssues(slot, race)
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
        start: info.date, end: info.date, ts: info.ts, issues: []
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
    const next = steps.find((st) => {
      const status = stepStatus(st, todayKey);
      return status === "now" || status === "future";
    });

    if (next) {
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
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-ghost btn-ghost--sm";
        btn.textContent = "Ajouter";
        btn.addEventListener("click", () => openRaceDialog(step.slot, null));
        right.appendChild(btn);
      } else {
        const jd = document.createElement("span");
        jd.className = "steps-jd";
        if (status === "past")     jd.textContent = "✓";
        else if (status === "now") jd.textContent = "J";
        else                       jd.textContent = `J-${daysDiff(now, step.start)}`;
        right.appendChild(jd);
        if (step.slot) {
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

  function renderCalendar(profile) {
    const track    = safeTracks[profile.track];
    const scenario = safeUtmbScenarios[profile.utmbScenario];
    const start    = parseDate(track.startDate);
    const end      = parseDate(scenario.targetDate);
    const now      = new Date();
    const todayKey = toDayKey(now);

    const doneDays   = getDoneDays(profile);
    /* Dodos = jusqu'au jour de course, pas jusqu'à la fin de la semaine UTMB */
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

    /* Profile lines */
    if (welcomeLine) welcomeLine.textContent = `Salut ${profile.firstName}.`;
    if (projectLine) projectLine.textContent = `${track.label} → ${track.race} · ${scenario.label}`;
    if (calendarMeta) calendarMeta.textContent =
      `Du ${formatDate(start)} au ${formatDate(end)} — ${totalDays} jours`;

    const eventMap = buildEventMap(profile, start, end);

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

        const isToday  = dayKey === todayKey;
        const isPast   = dayKey < todayKey;
        const isFuture = dayKey > todayKey;
        const checked  = isChecked(profile, doneDays, day);

        if (isToday)              cell.classList.add("day-cell--today");
        if (checked)              cell.classList.add("day-cell--done");
        else if (isPast)          cell.classList.add("day-cell--missed");
        else if (isFuture)        cell.classList.add("day-cell--future");

        const topSpan = document.createElement("span");
        topSpan.className   = "day-label";
        topSpan.textContent = weekdayLabel(day);

        const numSpan = document.createElement("span");
        numSpan.className   = "day-number";
        numSpan.textContent = String(day.getDate());

        const checkbox = document.createElement("input");
        checkbox.className = "day-checkbox";
        checkbox.type      = "checkbox";
        checkbox.checked   = checked;

        checkbox.addEventListener("change", function onToggle() {
          const wasChecked = isChecked(profile, doneDays, day);
          doneDays[dayKey] = checkbox.checked;
          setDoneDays(profile, doneDays);
          if (!wasChecked && checkbox.checked) showCelebration();
          renderCalendar(profile);
        });

        cell.appendChild(topSpan);
        cell.appendChild(numSpan);

        const ev = eventMap[dayKey];
        if (ev) {
          cell.classList.add(`day-cell--event-${ev.type}`);
          if (ev.optional) cell.classList.add("day-cell--event-optional");
          const tag = document.createElement("span");
          tag.className   = "event-tag";
          tag.textContent = ev.label;
          cell.appendChild(tag);
        }

        cell.appendChild(checkbox);
        grid.appendChild(cell);
      }

      details.appendChild(grid);
      calendarList.appendChild(details);
    }
  }

  /* ── View transitions ─────────────────────────────────────────────────── */

  function showTracker(profile) {
    onboardingCard.classList.add("hidden");
    trackerCard.classList.remove("hidden");
    calendarCard.classList.remove("hidden");
    currentProfile = profile;
    startCountdown(profile);
    if (stepsCard) stepsCard.classList.remove("hidden");
    renderSteps(profile);
    renderCalendar(profile);
  }

  function showOnboarding() {
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
    const firstName  = String(fd.get("firstName") || "").trim();
    const track      = String(fd.get("track") || "");
    const utmbScenario = String(fd.get("utmbScenario") || "");
    if (!firstName || !safeTracks[track] || !safeUtmbScenarios[utmbScenario]) return;
    const profile = { firstName, track, utmbScenario };
    saveProfile(profile);
    showTracker(profile);
  });

  resetButton.addEventListener("click", function onReset() {
    clearProfile();
    showOnboarding();
  });

  /* ── Init ─────────────────────────────────────────────────────────────── */

  const saved = getSavedProfile();
  if (saved) { showTracker(saved); return; }
  showOnboarding();
})();
