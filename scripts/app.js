(function runApp() {
  const safeAppVersion = typeof APP_VERSION === "string" ? APP_VERSION : "1.0.0";
  const safeTracks = typeof TRACKS === "object" && TRACKS ? TRACKS : {
    "0to100": { label: "0 to 100", race: "CCC", startDate: "2026-03-02" },
    "0to40":  { label: "0 to 40",  race: "MCC", startDate: "2026-04-06" }
  };
  const safeUtmbScenarios = typeof UTMB_SCENARIOS === "object" && UTMB_SCENARIOS ? UTMB_SCENARIOS : {
    week1: { label: "23 août 2027 au 29 août 2027",       targetDate: "2027-08-29" },
    week2: { label: "30 août 2027 au 5 septembre 2027",   targetDate: "2027-09-05" }
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
  const streakValue    = document.getElementById("streak-value");
  const progressRing   = document.getElementById("progress-ring");
  const progressPctEl  = document.getElementById("progress-pct");
  const calendarMeta   = document.getElementById("calendar-meta");
  const calendarList   = document.getElementById("calendar-list");
  const celebLayer     = document.getElementById("celebration-layer");

  const PROFILE_COOKIE  = "zero_to_100_profile";
  const DONE_KEY_PREFIX = "zero_to_100_days_done";

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

  /* ── Render ───────────────────────────────────────────────────────────── */

  function renderCalendar(profile) {
    const track    = safeTracks[profile.track];
    const scenario = safeUtmbScenarios[profile.utmbScenario];
    const start    = parseDate(track.startDate);
    const end      = parseDate(scenario.targetDate);
    const now      = new Date();
    const todayKey = toDayKey(now);

    const doneDays   = getDoneDays(profile);
    const dodosLeft  = Math.max(0, daysDiff(now, end));
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
    if (streakValue)   streakValue.textContent  = String(streak);
    if (progressPctEl) progressPctEl.textContent = `${pct}%`;
    if (progressRing)  progressRing.style.strokeDashoffset = (RING_CIRC * (1 - pct / 100)).toFixed(2);

    /* Profile lines */
    if (welcomeLine) welcomeLine.textContent = `Salut ${profile.firstName}.`;
    if (projectLine) projectLine.textContent = `${track.label} → ${track.race} · ${scenario.label}`;
    if (calendarMeta) calendarMeta.textContent =
      `Du ${formatDate(start)} au ${formatDate(end)} — ${totalDays} jours`;

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
    renderCalendar(profile);
  }

  function showOnboarding() {
    onboardingCard.classList.remove("hidden");
    trackerCard.classList.add("hidden");
    calendarCard.classList.add("hidden");
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
