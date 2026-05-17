(function runApp() {
  const safeAppVersion = typeof APP_VERSION === "string" ? APP_VERSION : "1.0.0";
  const safeTracks = typeof TRACKS === "object" && TRACKS ? TRACKS : {
    "0to100": { label: "0 to 100", race: "CCC", startDate: "2026-03-02" },
    "0to40": { label: "0 to 40", race: "MCC", startDate: "2026-04-06" }
  };
  const safeUtmbScenarios = typeof UTMB_SCENARIOS === "object" && UTMB_SCENARIOS ? UTMB_SCENARIOS : {
    week1: { label: "23 aout 2027 au 29 aout 2027", targetDate: "2027-08-29" },
    week2: { label: "30 aout 2027 au 5 septembre 2027", targetDate: "2027-09-05" }
  };

  const versionNode = document.getElementById("app-version");
  const onboardingCard = document.getElementById("onboarding-card");
  const trackerCard = document.getElementById("tracker-card");
  const calendarCard = document.getElementById("calendar-card");
  const onboardingForm = document.getElementById("onboarding-form");
  const resetButton = document.getElementById("reset-profile");
  const welcomeLine = document.getElementById("welcome-line");
  const projectLine = document.getElementById("project-line");
  const dodosLine = document.getElementById("dodos-line");
  const progressLine = document.getElementById("progress-line");
  const progressFill = document.getElementById("progress-fill");
  const calendarMeta = document.getElementById("calendar-meta");
  const calendarList = document.getElementById("calendar-list");
  const celebrationLayer = document.getElementById("celebration-layer");
  const profileCookieName = "zero_to_100_profile";
  const doneStoragePrefix = "zero_to_100_days_done";

  if (versionNode) {
    versionNode.textContent = safeAppVersion;
  }

  function parseDate(dateString) {
    return new Date(dateString + "T00:00:00");
  }

  function daysDiff(fromDate, toDate) {
    const dayMs = 24 * 60 * 60 * 1000;
    const from = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
    const to = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
    return Math.ceil((to - from) / dayMs);
  }

  function formatDate(date) {
    return new Intl.DateTimeFormat("fr-FR", {
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  }

  function monthLabel(date) {
    return new Intl.DateTimeFormat("fr-FR", {
      month: "long",
      year: "numeric"
    }).format(date);
  }

  function monthKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  }

  function weekdayLabel(date) {
    return new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date);
  }

  function toDayKey(date) {
    return date.toISOString().slice(0, 10);
  }

  function isSameMonth(left, right) {
    return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
  }

  function toMondayBasedIndex(date) {
    return (date.getDay() + 6) % 7;
  }

  function buildMonths(startDate, targetDate) {
    const months = [];
    const monthCursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    while (monthCursor <= targetDate) {
      const monthStart = new Date(monthCursor);
      const monthEnd = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 0);
      const firstVisibleDay = new Date(monthStart);
      firstVisibleDay.setDate(monthStart.getDate() - toMondayBasedIndex(monthStart));

      const lastVisibleDay = new Date(monthEnd);
      lastVisibleDay.setDate(monthEnd.getDate() + (6 - toMondayBasedIndex(monthEnd)));

      const days = [];
      const dayCursor = new Date(firstVisibleDay);
      while (dayCursor <= lastVisibleDay) {
        days.push(new Date(dayCursor));
        dayCursor.setDate(dayCursor.getDate() + 1);
      }

      months.push({
        monthStart,
        monthEnd,
        days
      });
      monthCursor.setMonth(monthCursor.getMonth() + 1);
    }
    return months;
  }

  function showCelebration() {
    if (!celebrationLayer) {
      return;
    }

    celebrationLayer.classList.remove("hidden");
    celebrationLayer.innerHTML = "";

    const message = document.createElement("div");
    message.className = "celebration-message";
    message.textContent = "BRAVO!";
    celebrationLayer.appendChild(message);

    const bursts = [
      { x: 24, y: 64, delay: 0 },
      { x: 50, y: 54, delay: 0.08 },
      { x: 76, y: 64, delay: 0.16 }
    ];

    for (let burstIndex = 0; burstIndex < bursts.length; burstIndex += 1) {
      const burst = bursts[burstIndex];

      const ring = document.createElement("span");
      ring.className = "burst-ring";
      ring.style.left = `${burst.x}%`;
      ring.style.top = `${burst.y}%`;
      ring.style.setProperty("--delay", `${burst.delay}s`);
      celebrationLayer.appendChild(ring);

      for (let index = 0; index < 36; index += 1) {
        const spark = document.createElement("span");
        spark.className = "spark";
        spark.style.left = `${burst.x}%`;
        spark.style.top = `${burst.y}%`;
        spark.style.setProperty("--dx", `${(Math.random() - 0.5) * 420}px`);
        spark.style.setProperty("--dy", `${(Math.random() - 0.65) * 320}px`);
        spark.style.setProperty("--delay", `${burst.delay + Math.random() * 0.2}s`);
        celebrationLayer.appendChild(spark);
      }

      for (let confettiIndex = 0; confettiIndex < 24; confettiIndex += 1) {
        const confetti = document.createElement("span");
        confetti.className = "confetti";
        confetti.style.left = `${burst.x + (Math.random() - 0.5) * 12}%`;
        confetti.style.top = `${burst.y - 8 + Math.random() * 6}%`;
        confetti.style.setProperty("--dx", `${(Math.random() - 0.5) * 260}px`);
        confetti.style.setProperty("--dy", `${140 + Math.random() * 220}px`);
        confetti.style.setProperty("--rot", `${Math.random() * 620}deg`);
        confetti.style.setProperty("--delay", `${burst.delay + 0.06 + Math.random() * 0.24}s`);
        celebrationLayer.appendChild(confetti);
      }
    }

    window.setTimeout(function hideCelebration() {
      celebrationLayer.classList.add("hidden");
      celebrationLayer.innerHTML = "";
    }, 1800);
  }

  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  }

  function getCookie(name) {
    const prefix = `${name}=`;
    const parts = document.cookie.split(";").map((part) => part.trim());
    for (let index = 0; index < parts.length; index += 1) {
      if (parts[index].startsWith(prefix)) {
        return decodeURIComponent(parts[index].slice(prefix.length));
      }
    }
    return null;
  }

  function getSavedProfile() {
    const raw = getCookie(profileCookieName);
    if (!raw) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.firstName || !safeTracks[parsed.track] || !safeUtmbScenarios[parsed.utmbScenario]) {
        return null;
      }
      return parsed;
    } catch (error) {
      return null;
    }
  }

  function saveProfile(profile) {
    setCookie(profileCookieName, JSON.stringify(profile), 365);
  }

  function clearProfile() {
    setCookie(profileCookieName, "", -1);
  }

  function doneStorageKey(profile) {
    return `${doneStoragePrefix}_${profile.track}_${profile.utmbScenario}_${profile.firstName.toLowerCase()}`;
  }

  function getDoneDays(profile) {
    const raw = localStorage.getItem(doneStorageKey(profile));
    if (!raw) {
      return {};
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      return {};
    }
  }

  function setDoneDays(profile, doneDays) {
    localStorage.setItem(doneStorageKey(profile), JSON.stringify(doneDays));
  }

  function hasOwnKey(objectValue, key) {
    return Object.prototype.hasOwnProperty.call(objectValue, key);
  }

  function isDefaultChecked(profile, day) {
    const year = day.getFullYear();
    const month = day.getMonth();
    if (year !== 2026) {
      return false;
    }

    if (profile.track === "0to100") {
      return month === 2 || month === 3;
    }

    if (profile.track === "0to40") {
      return month === 3;
    }

    return false;
  }

  function renderCalendar(profile) {
    const track = safeTracks[profile.track];
    const scenario = safeUtmbScenarios[profile.utmbScenario];
    const startDate = parseDate(track.startDate);
    const targetDate = parseDate(scenario.targetDate);
    const now = new Date();
    const dodosLeft = Math.max(0, daysDiff(now, targetDate));
    const doneDays = getDoneDays(profile);

    welcomeLine.textContent = `Salut ${profile.firstName}.`;
    projectLine.textContent = `${track.label} -> course ${track.race} | cible: ${scenario.label}`;
    dodosLine.textContent = `${dodosLeft} dodos restants jusqu'a la course (${track.race}).`;
    const totalDays = Math.max(0, daysDiff(startDate, targetDate) + 1);
    let doneCount = 0;
    const cursorCount = new Date(startDate);
    while (cursorCount <= targetDate) {
      const dayKey = toDayKey(cursorCount);
      const checked = hasOwnKey(doneDays, dayKey) ? Boolean(doneDays[dayKey]) : isDefaultChecked(profile, cursorCount);
      if (checked) {
        doneCount += 1;
      }
      cursorCount.setDate(cursorCount.getDate() + 1);
    }
    const progressPct = totalDays > 0 ? Math.round((doneCount / totalDays) * 100) : 0;
    progressLine.textContent = `${doneCount}/${totalDays} entrainements coches (${progressPct}%).`;
    progressFill.style.width = `${progressPct}%`;

    calendarMeta.textContent = `Du ${formatDate(startDate)} au ${formatDate(targetDate)} (${totalDays} jours).`;
    calendarList.innerHTML = "";

    const openMonthKeys = new Set();
    const existingAccordions = calendarList.querySelectorAll(".month-accordion");
    for (let index = 0; index < existingAccordions.length; index += 1) {
      const accordion = existingAccordions[index];
      if (accordion.open && accordion.dataset.monthKey) {
        openMonthKeys.add(accordion.dataset.monthKey);
      }
    }

    const months = buildMonths(startDate, targetDate);
    const currentMonthDate = new Date(now.getFullYear(), now.getMonth(), 1);
    const hasCurrentMonth = months.some(function checkMonth(month) {
      return isSameMonth(month.monthStart, currentMonthDate);
    });

    for (let monthIndex = 0; monthIndex < months.length; monthIndex += 1) {
      const month = months[monthIndex];
      const details = document.createElement("details");
      details.className = "month-accordion";
      const thisMonthKey = monthKey(month.monthStart);
      details.dataset.monthKey = thisMonthKey;
      if (openMonthKeys.size > 0) {
        details.open = openMonthKeys.has(thisMonthKey);
      } else if (hasCurrentMonth) {
        details.open = isSameMonth(month.monthStart, currentMonthDate);
      } else {
        details.open = monthIndex === 0;
      }

      const summary = document.createElement("summary");
      summary.textContent = monthLabel(month.monthStart);
      details.appendChild(summary);

      const grid = document.createElement("div");
      grid.className = "month-grid";

      for (let dayIndex = 0; dayIndex < month.days.length; dayIndex += 1) {
        const day = month.days[dayIndex];
        const cell = document.createElement("label");
        cell.className = "day-cell";

        const isInMonth = isSameMonth(day, month.monthStart);
        const isInProject = day >= startDate && day <= targetDate;
        if (!isInMonth || !isInProject) {
          cell.classList.add("empty");
          cell.innerHTML = "<span></span>";
          grid.appendChild(cell);
          continue;
        }

        const dayTop = document.createElement("span");
        dayTop.className = "day-label";
        dayTop.textContent = weekdayLabel(day);

        const dayNumber = document.createElement("span");
        dayNumber.className = "day-number";
        dayNumber.textContent = String(day.getDate());

        const checkbox = document.createElement("input");
        checkbox.className = "day-checkbox";
        checkbox.type = "checkbox";
        const dayKey = toDayKey(day);
        checkbox.checked = hasOwnKey(doneDays, dayKey) ? Boolean(doneDays[dayKey]) : isDefaultChecked(profile, day);
        checkbox.addEventListener("change", function onToggle() {
          const wasChecked = hasOwnKey(doneDays, dayKey) ? Boolean(doneDays[dayKey]) : isDefaultChecked(profile, day);
          doneDays[dayKey] = checkbox.checked;
          setDoneDays(profile, doneDays);
          if (!wasChecked && checkbox.checked) {
            showCelebration();
          }
          renderCalendar(profile);
        });

        cell.appendChild(dayTop);
        cell.appendChild(dayNumber);
        cell.appendChild(checkbox);
        grid.appendChild(cell);
      }

      details.appendChild(grid);
      calendarList.appendChild(details);
    }
  }

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

  onboardingForm.addEventListener("submit", function onSubmit(event) {
    event.preventDefault();
    const formData = new FormData(onboardingForm);
    const firstName = String(formData.get("firstName") || "").trim();
    const track = String(formData.get("track") || "");
    const utmbScenario = String(formData.get("utmbScenario") || "");
    if (!firstName || !safeTracks[track] || !safeUtmbScenarios[utmbScenario]) {
      return;
    }
    const profile = { firstName, track, utmbScenario };
    saveProfile(profile);
    showTracker(profile);
  });

  resetButton.addEventListener("click", function onReset() {
    clearProfile();
    showOnboarding();
  });

  const savedProfile = getSavedProfile();
  if (savedProfile) {
    showTracker(savedProfile);
    return;
  }

  showOnboarding();
})();
