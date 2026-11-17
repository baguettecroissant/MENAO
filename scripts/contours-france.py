"""Contours IGN (ADMIN EXPRESS COG-CARTO, Licence Ouverte 2.0) → tracés SVG légers de la métropole.

Carte de la zone d'intervention (F-162, ADR 0349). Source, à télécharger hors du dépôt (10 à 20 Mo) :
  https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&OUTPUTFORMAT=application/json
    &SRSNAME=EPSG:4326&COUNT=200&TYPENAMES=ADMINEXPRESS-COG-CARTO.LATEST:departement   (ou :region)
Usage : python3 -I scripts/contours-france.py <source.json> <sortie.json>
Sorties : packages/core/data/france-departements.json et france-regions.json.
"""
import json, math, sys
src, out = sys.argv[1], sys.argv[2]
W = 600
LON0, LON1, LAT0, LAT1 = -5.3, 9.7, 41.2, 51.2
K = math.cos(math.radians(46.5))
S = W / ((LON1 - LON0) * K)
H = round((LAT1 - LAT0) * S)
def proj(p): return ((p[0] - LON0) * K * S, (LAT1 - p[1]) * S)
def dp(pts, eps):
    if len(pts) < 3: return pts
    keep = [False] * len(pts); keep[0] = keep[-1] = True; stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop(); ax, ay = pts[a]; bx, by = pts[b]; dx, dy = bx - ax, by - ay; n = math.hypot(dx, dy) or 1e-9
        best, idx = 0, -1
        for i in range(a + 1, b):
            d = abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / n
            if d > best: best, idx = d, i
        if best > eps: keep[idx] = True; stack += [(a, idx), (idx, b)]
    return [p for p, k in zip(pts, keep) if k]
def area(r): return abs(sum(r[i][0] * r[i + 1][1] - r[i + 1][0] * r[i][1] for i in range(len(r) - 1))) / 2
res = {}
for f in json.load(open(src))["features"]:
    code = f["properties"]["code_insee"]
    if code.startswith("97") or code in ("01", "02", "03", "04", "06") and "region" in src: continue
    g = f["geometry"]; polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    d = []
    for poly in polys:
        ring = [proj(p) for p in poly[0]]
        if area(ring) < 6: continue
        # Anneau fermé : coupé au point le plus loin du premier, puis simplifié par moitié.
        far = max(range(len(ring)), key=lambda i: math.hypot(ring[i][0] - ring[0][0], ring[i][1] - ring[0][1]))
        ring = dp(ring[:far + 1], 0.9)[:-1] + dp(ring[far:], 0.9)
        if len(ring) < 4: continue
        d.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in ring[:-1]) + "Z")
    if d: res[code] = {"nom": f["properties"]["nom_officiel"], "d": "".join(d)}
json.dump({"source": "IGN ADMIN EXPRESS COG-CARTO, Licence Ouverte 2.0", "largeur": W, "hauteur": H,
           "projection": {"lon0": LON0, "lat1": LAT1, "k": round(K, 6), "echelle": round(S, 4)}, "zones": dict(sorted(res.items()))}, open(out, "w"), ensure_ascii=False, separators=(",", ":"))
print(len(res), "zones", H, "px de haut")
