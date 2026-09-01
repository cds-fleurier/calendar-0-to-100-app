const APP_VERSION = "2.6.1";

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
    tracks: ["0to100", "0to40"],
    type: "choc"
  },
  {
    label: "WE Choc #3",
    start: "2027-05-15",
    end:   "2027-05-17",
    tracks: ["0to100", "0to40"],
    type: "choc"
  }
];

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
