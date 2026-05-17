const APP_VERSION = "2.1.0";

const TRACKS = {
  "0to100": {
    label: "0 to 100",
    race: "CCC",
    startDate: "2026-03-02"
  },
  "0to40": {
    label: "0 to 40",
    race: "MCC",
    startDate: "2026-04-01"
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
    targetDate: "2027-08-29"
  },
  week2: {
    label: "30 août 2027 au 5 sept. 2027",
    targetDate: "2027-09-05"
  }
};
