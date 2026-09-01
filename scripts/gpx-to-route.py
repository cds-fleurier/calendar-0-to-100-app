#!/usr/bin/env python3
"""
Convertit un GPX de course en tracé pour la carte Leaflet du countdown.

Usage :
    python3 scripts/gpx-to-route.py ccc ~/Downloads/CCC.gpx
    python3 scripts/gpx-to-route.py mcc ~/Downloads/MCC.gpx --start "Courmayeur" --finish "Chamonix"

Écrit assets/routes/<slug>.json :
    { "name", "km", "start": {name, lat, lon}, "finish": {...}, "points": [[lat, lon], ...] }

Le tracé est échantillonné à MAX_POINTS points (le départ et l'arrivée sont
toujours conservés) pour garder un JSON léger côté navigateur.
"""

import argparse
import json
import math
import os
import xml.etree.ElementTree as ET

MAX_POINTS = 500
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "routes")

DEFAULTS = {
    "ccc": {"name": "CCC", "start": "Courmayeur",     "finish": "Chamonix"},
    "mcc": {"name": "MCC", "start": "Martigny-Combe", "finish": "Chamonix"},
}


def read_gpx(path):
    """Retourne [(lat, lon), ...] — trkpt en priorité, rtept sinon."""
    root = ET.parse(path).getroot()
    ns = {"g": root.tag.split("}")[0].strip("{")} if "}" in root.tag else {}
    prefix = "g:" if ns else ""

    pts = root.findall(f".//{prefix}trkpt", ns) or root.findall(f".//{prefix}rtept", ns)
    if not pts:
        raise SystemExit(f"Aucun trkpt/rtept trouvé dans {path}")
    return [(float(p.get("lat")), float(p.get("lon"))) for p in pts]


def haversine_km(a, b):
    r = 6371.0
    dlat = math.radians(b[0] - a[0])
    dlon = math.radians(b[1] - a[1])
    h = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(a[0])) * math.cos(math.radians(b[0])) * math.sin(dlon / 2) ** 2)
    return 2 * r * math.asin(math.sqrt(h))


def simplify(points, limit):
    if len(points) <= limit:
        return points
    step = len(points) / float(limit - 1)
    out = [points[int(i * step)] for i in range(limit - 1)]
    out.append(points[-1])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", help="ccc ou mcc")
    ap.add_argument("gpx")
    ap.add_argument("--name")
    ap.add_argument("--start")
    ap.add_argument("--finish")
    args = ap.parse_args()

    d = DEFAULTS.get(args.slug, {})
    raw = read_gpx(args.gpx)
    km = round(sum(haversine_km(raw[i], raw[i + 1]) for i in range(len(raw) - 1)))
    pts = [[round(lat, 5), round(lon, 5)] for lat, lon in simplify(raw, MAX_POINTS)]

    payload = {
        "name": args.name or d.get("name", args.slug.upper()),
        "km": km,
        "start":  {"name": args.start  or d.get("start", "Départ"),  "lat": pts[0][0],  "lon": pts[0][1]},
        "finish": {"name": args.finish or d.get("finish", "Arrivée"), "lat": pts[-1][0], "lon": pts[-1][1]},
        "points": pts,
    }

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f"{args.slug}.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, separators=(",", ":"))
    print(f"{payload['name']} : {km} km, {len(raw)} pts GPX -> {len(pts)} pts -> {out}")


if __name__ == "__main__":
    main()
