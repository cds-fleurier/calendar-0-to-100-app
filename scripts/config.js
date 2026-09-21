const APP_VERSION = "3.0.1";

/*
 * Liaison avec les autres outils de la team (même origine cds-fleurier.github.io,
 * donc localStorage partagé) :
 *   TEAM_ME_KEY       clé localStorage commune = id du participant (data/participants.js
 *                     de la carte, chargé dans index.html)
 *   TEAM_CHOICES_API  Web App Apps Script de « Qui court où ? » (lecture seule ici)
 *   TEAM_APP_URL      où l'on envoie le participant pour choisir/modifier ses courses
 *   SLOT_BLOCS        emplacement calendrier → bloc « Qui court où » (mêmes fenêtres)
 */
const TEAM_ME_KEY      = "team_me";
const TEAM_CHOICES_API = "https://script.google.com/macros/s/AKfycbwS1c6LgGqqLaanrQvfPyprFUqocJZlvQG0sDPcZbSrqKRtCY8FmhBBWgBUd0diy5n3/exec";
const TEAM_APP_URL     = "https://cds-fleurier.github.io/qui-court-ou-0to100/";
const SLOT_BLOCS       = { race1: "noel", race2: "mars", race3: "juin", race4: "juillet" };

/*
 * raceStart — départ de la course 2027, relatif au lundi de la semaine UTMB choisie.
 * dayOffset : 0 = lundi, 4 = vendredi. `route` pointe vers assets/routes/<route>.json
 * (tracé affiché sur la carte).
 * Horaires confirmés par les métadonnées des GPX officiels 2026 :
 *   CCC vendredi 09h00 (startdate 2026-08-28T09:00:05+02:00)
 *   MCC lundi    10h00 (startdate 2026-08-24T10:00:03+02:00)
 * Reste à réajuster si l'organisation change le programme en 2027.
 */
const TRACKS = {
  "0to100": {
    label: "0 to 100",
    race: "CCC",
    startDate: "2026-03-02",
    raceStart: {
      dayOffset: 4,
      time: "09:00",
      utcOffset: "+02:00",
      place: "Courmayeur",
      route: "ccc"
    }
  },
  "0to40": {
    label: "0 to 40",
    race: "MCC",
    startDate: "2026-04-01",
    raceStart: {
      dayOffset: 0,
      time: "10:00",
      utcOffset: "+02:00",
      place: "Martigny-Combe",
      route: "mcc"
    }
  }
};

/*
 * EVENTS — étapes collectives fixées par le staff (WE Choc, courses d'équipe).
 * `place` et `optional` sont facultatifs. Les dates sont inclusives.
 */
const EVENTS = [
  {
    label: "WE Choc #1",
    start: "2026-05-23",
    end:   "2026-05-25",
    tracks: ["0to100", "0to40"],
    type: "choc"
  },
  {
    label: "ETC UTMB",
    start: "2026-08-25",
    end:   "2026-08-25",
    tracks: ["0to100"],
    type: "race"
  },
  {
    label: "WE Choc #2",
    start: "2026-10-24",
    end:   "2026-10-25",
    place: "Besançon",
    tracks: ["0to100", "0to40"],
    type: "choc"
  },
  {
    label: "WE Choc #3",
    start: "2027-05-15",
    end:   "2027-05-17",
    place: "Bellevaux (Haute-Savoie)",
    tracks: ["0to100", "0to40"],
    type: "choc"
  },
  {
    label: "WE Choc #4",
    start: "2027-07-24",
    end:   "2027-07-25",
    place: "La Rosière",
    tracks: ["0to100", "0to40"],
    type: "choc",
    optional: true
  }
];

/*
 * RACE_SLOTS — les 4 courses de préparation. Chaque participant choisit les
 * siennes (validation par le staff) ; l'app stocke son choix en local.
 * Chaque emplacement porte les contraintes du staff :
 *   windows : week-ends autorisés, liste de fenêtres { from, to } inclusives
 *             (la course doit tomber dans l'une d'elles)
 *   minKm / maxKm : distance attendue (l'un ou l'autre peut être null)
 *   note    : précision libre, facultative
 * Une saisie hors contrainte est signalée, pas bloquée (c'est le staff qui tranche).
 * Contraintes communiquées par le staff le 14/09/2026 : mêmes week-ends pour les
 * deux parcours, distances propres à chacun.
 */
const RACE_WINDOWS = {
  race1: [{ from: "2026-12-19", to: "2026-12-20" }, { from: "2026-12-26", to: "2026-12-27" }],
  race2: [{ from: "2027-03-20", to: "2027-03-21" }, { from: "2027-03-27", to: "2027-03-28" }],
  race3: [{ from: "2027-05-29", to: "2027-05-30" }, { from: "2027-06-05", to: "2027-06-06" }],
  race4: [{ from: "2027-07-03", to: "2027-07-04" }]
};

const RACE_SLOTS = {
  "0to100": [
    { id: "race1", label: "Course 1", windows: RACE_WINDOWS.race1, minKm: 10,   maxKm: 15 },
    { id: "race2", label: "Course 2", windows: RACE_WINDOWS.race2, minKm: 20,   maxKm: 30 },
    { id: "race3", label: "Course 3", windows: RACE_WINDOWS.race3, minKm: null, maxKm: 40 },
    { id: "race4", label: "Course 4", windows: RACE_WINDOWS.race4, minKm: 40,   maxKm: 50 }
  ],
  "0to40": [
    { id: "race1", label: "Course 1", windows: RACE_WINDOWS.race1, minKm: 10,   maxKm: 15 },
    { id: "race2", label: "Course 2", windows: RACE_WINDOWS.race2, minKm: 10,   maxKm: 15 },
    { id: "race3", label: "Course 3", windows: RACE_WINDOWS.race3, minKm: null, maxKm: 20 },
    { id: "race4", label: "Course 4", windows: RACE_WINDOWS.race4, minKm: 20,   maxKm: 25 }
  ]
};

const UTMB_SCENARIOS = {
  week1: {
    label: "23 août 2027 au 29 août 2027",
    weekStart: "2027-08-23",
    targetDate: "2027-08-29"
  },
  week2: {
    label: "30 août 2027 au 5 sept. 2027",
    weekStart: "2027-08-30",
    targetDate: "2027-09-05"
  }
};
