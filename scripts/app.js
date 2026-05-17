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
  const calendarMeta = document.getElementById("calendar-meta");
  const calendarList = document.getElementById("calendar-list");
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
    calendarMeta.textContent = `Du ${formatDate(startDate)} au ${formatDate(targetDate)} (${totalDays} jours).`;
    calendarList.innerHTML = "";

    const cursor = new Date(startDate);
    while (cursor <= targetDate) {
      const dayKey = cursor.toISOString().slice(0, 10);
      const row = document.createElement("label");
      row.className = "day-row";

      const dateLabel = document.createElement("span");
      dateLabel.textContent = formatDate(cursor);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = Boolean(doneDays[dayKey]);
      checkbox.addEventListener("change", function onToggle() {
        doneDays[dayKey] = checkbox.checked;
        setDoneDays(profile, doneDays);
      });

      row.appendChild(dateLabel);
      row.appendChild(checkbox);
      calendarList.appendChild(row);
      cursor.setDate(cursor.getDate() + 1);
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
