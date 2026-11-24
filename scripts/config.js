const APP_VERSION = "3.5.0";

/*
 * Liaison avec les autres outils de la team (même origine cds-fleurier.github.io,
 * donc localStorage partagé) :
 *   TEAM_ME_KEY       clé localStorage commune = id du participant (data/participants.js
 *                     de la carte, chargé dans index.html)
 *   TEAM_CHOICES_API  Web App Apps Script de « Qui court où ? » : lecture des courses, et
 *                     synchro des jours cochés entre appareils (onglet `calendrier`, v3.2.0)
 *   TEAM_APP_URL      où l'on envoie le participant pour choisir/modifier ses courses
 *   SLOT_BLOCS        emplacement calendrier → bloc « Qui court où » (mêmes fenêtres)
 */
const TEAM_ME_KEY      = "team_me";
const TEAM_CHOICES_API = "https://script.google.com/macros/s/AKfycbwS1c6LgGqqLaanrQvfPyprFUqocJZlvQG0sDPcZbSrqKRtCY8FmhBBWgBUd0diy5n3/exec";
const TEAM_APP_URL     = "https://cds-fleurier.github.io/qui-court-ou-0to100/";
const SLOT_BLOCS       = { race1: "noel", race2: "mars", race3: "juin", race4: "juillet" };

/*
 * raceStart — départ de la course 2027.
 *   date         : date officielle fixe (AAAA-MM-JJ).
 *   dateEnd      : si la date exacte n'est pas encore connue, dernier jour possible (le compte à
 *                  rebours vise alors le premier jour possible, `date`).
 *   time         : heure de départ (heure locale, décalage `utcOffset`).
 *   timeTentative: true = heure pas encore confirmée par l'organisation (« heure à confirmer »).
 *   dayOffset    : seulement si `date` est absent — jours après `weekStart` de la semaine UTMB
 *                  (0 = premier jour). Plus utilisé depuis que les dates 2027 sont connues.
 * CCC 2027 : date officielle annoncée le 20/11/2026 = mercredi 25 août 2027 ; heure non confirmée,
 * 09h00 comme en 2026 (GPX officiel 2026 : startdate 2026-08-28T09:00:05+02:00).
 * MCC 2027 : dimanche 22, lundi 23 ou mardi 24 août 2027 (20/11/2026), date exacte à venir ;
 * 10h00 comme en 2026 (startdate 2026-08-24T10:00:03+02:00). Quand la date tombe : mettre `date`,
 * supprimer `dateEnd`, vérifier l'heure.
 * `route` pointe vers assets/routes/<route>.json (tracé affiché sur la carte).
 */
const TRACKS = {
  "0to100": {
    label: "0 to 100",
    race: "CCC",
    startDate: "2026-03-02",
    raceStart: {
      date: "2027-08-25",
      time: "09:00",
      timeTentative: true,
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
      date: "2027-08-22",
      dateEnd: "2027-08-24",
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

/*
 * Semaine UTMB 2027 : du dimanche 22 au dimanche 29 août (fixée le 20/11/2026 : CCC mer. 25,
 * MCC 22-24). `targetDate` = dernier jour du calendrier ; `weekStart` ne sert que de repli
 * (raceStart sans `date`).
 * L'ancien choix « 30 août – 5 sept. » (week2) n'existe plus : depuis la v3.5.0, un profil week2
 * est migré vers week1 au chargement (cases locales + ligne du Sheet récupérées). La clé week2
 * reste un alias par sécurité (un vieux cookie ne doit jamais renvoyer à l'écran d'accueil).
 */
const UTMB_OFFICIAL = {
  label: "semaine UTMB du 22 au 29 août 2027",
  weekStart: "2027-08-22",
  targetDate: "2027-08-29"
};
const UTMB_SCENARIOS = {
  week1: UTMB_OFFICIAL,
  week2: UTMB_OFFICIAL
};
