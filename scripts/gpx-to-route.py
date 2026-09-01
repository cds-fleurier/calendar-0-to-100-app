#!/usr/bin/env python3
"""
Convertit un GPX de course en tracé pour la carte Leaflet du countdown.

Usage :
    python3 scripts/gpx-to-route.py ccc ~/Downloads/CCC.gpx
    python3 scripts/gpx-to-route.py mcc ~/Downloads/CCC.gpx --from "Martigny" --start "Martigny-Combe"

Écrit assets/routes/<slug>.json :
    { "name", "km", "dplus", "start": {name, lat, lon}, "finish": {...},
      "points": [[lat, lon], ...], "checkpoints": [{name, km, lat, lon}, ...] }

Les GPX UTMB World Series portent la distance officielle, le dénivelé et les
points de contrôle (<wpt>) : on les reprend tels quels plutôt que de les
recalculer. Avec --from, le tracé est coupé au point de contrôle indiqué (la
MCC emprunte la fin du parcours CCC) : distance et D+ sont alors mesurés sur le
tronçon et le résultat est marqué "derived".
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
    """Retourne (points[(lat, lon, ele)], meta, checkpoints)."""
    root = ET.parse(path).getroot()
    ns = {"g": root.tag.split("}")[0].strip("{")} if "}" in root.tag else {}
    prefix = "g:" if ns else ""

    def meta_text(tag):
        node = root.find(f".//{prefix}metadata/{prefix}{tag}", ns)
        return node.text.strip() if node is not None and node.text else None

    nodes = root.findall(f".//{prefix}trkpt", ns) or root.findall(f".//{prefix}rtept", ns)
    if not nodes:
        raise SystemExit(f"Aucun trkpt/rtept trouvé dans {path}")

    points = []
    for n in nodes:
        ele = n.find(f"{prefix}ele", ns)
        points.append((
            float(n.get("lat")),
            float(n.get("lon")),
            float(ele.text) if ele is not None and ele.text else 0.0,
        ))

    meta = {
        "name":          meta_text("name"),
        "start":         meta_text("startplace"),
        "finish":        meta_text("finishplace"),
        "distance":      meta_text("distance"),
        "elevationgain": meta_text("elevationgain"),
    }

    checkpoints = []
    for w in root.findall(f".//{prefix}wpt", ns):
        name = w.find(f"{prefix}name", ns)
        dist = w.find(f".//{prefix}distance", ns)
        checkpoints.append({
            "name":   name.text.strip() if name is not None and name.text else "",
            "meters": int(dist.text) if dist is not None and dist.text else None,
            "lat":    round(float(w.get("lat")), 5),
            "lon":    round(float(w.get("lon")), 5),
        })

    return points, meta, checkpoints


def haversine_km(a, b):
    r = 6371.0
    dlat = math.radians(b[0] - a[0])
    dlon = math.radians(b[1] - a[1])
    h = (math.sin(dlat / 2) ** 2
         + math.cos(math.radians(a[0])) * math.cos(math.radians(b[0])) * math.sin(dlon / 2) ** 2)
    return 2 * r * math.asin(math.sqrt(h))


def measure(points):
    """(km, D+) mesurés sur le tracé brut."""
    km = sum(haversine_km(points[i], points[i + 1]) for i in range(len(points) - 1))
    dplus = sum(max(0.0, points[i + 1][2] - points[i][2]) for i in range(len(points) - 1))
    return km, dplus


def nearest_index(points, lat, lon):
    return min(range(len(points)), key=lambda i: haversine_km(points[i], (lat, lon)))


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
    ap.add_argument("--from", dest="from_cp",
                    help="Nom du point de contrôle où couper le tracé (tronçon final)")
    args = ap.parse_args()

    d = DEFAULTS.get(args.slug, {})
    raw, meta, checkpoints = read_gpx(args.gpx)
    derived = False
    offset_m = 0

    if args.from_cp:
        match = next((c for c in checkpoints if args.from_cp.lower() in c["name"].lower()), None)
        if not match:
            raise SystemExit(f"Point de contrôle « {args.from_cp} » introuvable dans le GPX")
        cut = nearest_index(raw, match["lat"], match["lon"])
        raw = raw[cut:]
        offset_m = match["meters"] or 0
        checkpoints = [c for c in checkpoints if (c["meters"] or 0) > offset_m]
        derived = True

    measured_km, measured_dplus = measure(raw)
    if derived or not meta.get("distance"):
        km, dplus = round(measured_km), round(measured_dplus / 50) * 50
    else:
        km = round(int(meta["distance"]) / 1000.0)
        dplus = int(meta["elevationgain"]) if meta.get("elevationgain") else round(measured_dplus)

    pts = [[round(lat, 5), round(lon, 5)] for lat, lon, _ in simplify(raw, MAX_POINTS)]
    start_name  = args.start  or (None if derived else meta.get("start"))  or d.get("start", "Départ")
    finish_name = args.finish or meta.get("finish") or d.get("finish", "Arrivée")

    payload = {
        "name": args.name or d.get("name", args.slug.upper()),
        "km": km,
        "dplus": dplus,
        "start":  {"name": start_name,  "lat": pts[0][0],  "lon": pts[0][1]},
        "finish": {"name": finish_name, "lat": pts[-1][0], "lon": pts[-1][1]},
        "points": pts,
        # Points de contrôle hors départ/arrivée (déjà matérialisés par les gros
        # marqueurs) — filtrés sur la position, le nom pouvant différer d'un
        # fichier à l'autre ("Martigny Combe" vs "Martigny-Combe")
        "checkpoints": [
            {"name": c["name"], "lat": c["lat"], "lon": c["lon"],
             "km": round(((c["meters"] or 0) - offset_m) / 1000.0, 1)}
            for c in checkpoints
            if min(haversine_km((c["lat"], c["lon"]), (pts[0][0], pts[0][1])),
                   haversine_km((c["lat"], c["lon"]), (pts[-1][0], pts[-1][1]))) > 0.3
        ],
    }
    if derived:
        payload["derived"] = os.path.basename(args.gpx)

    os.makedirs(OUT_DIR, exist_ok=True)
    out = os.path.join(OUT_DIR, f"{args.slug}.json")
    with open(out, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, separators=(",", ":"))
    print(f"{payload['name']} : {km} km, {dplus} m D+, {len(payload['checkpoints'])} points de "
          f"contrôle, {len(raw)} pts GPX -> {len(pts)} pts"
          + (" [dérivé]" if derived else "") + f" -> {out}")


if __name__ == "__main__":
    main()
