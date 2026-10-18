"""Build the personalized Find My SVGs and a closed walk from an OSM extract.

Usage: python tools/build-majang-map.py /path/to/osm-map.json
Input: OpenStreetMap API JSON (nodes and ways), or Overpass JSON with nodes.
This command never invents streets or fetches data implicitly.
"""
import hashlib
import heapq
import html
import json
import math
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CFG = json.loads((ROOT / 'personalization/map/config.json').read_text(encoding='utf-8'))
R = 6371000
COS = math.cos(math.radians(CFG['latitude']))
WALKABLE = {'residential', 'living_street', 'service', 'pedestrian', 'footway', 'path', 'steps', 'unclassified'}


def project(lon, lat):
    return ((lon-CFG['longitude'])*math.pi/180*R*COS,
            (CFG['latitude']-lat)*math.pi/180*R)


def distance(a, b):
    return math.hypot(a[0]-b[0], a[1]-b[1])


def shortest(graph, start, end, banned=frozenset(), banned_nodes=frozenset(), max_distance=700):
    queue, best = [(0, start, [start])], {start: 0}
    while queue:
        cost, node, path = heapq.heappop(queue)
        if node == end:
            return cost, path
        if cost > best.get(node, math.inf) or cost > max_distance:
            continue
        for nxt, weight in graph[node].items():
            if frozenset((node, nxt)) in banned or nxt in banned_nodes:
                continue
            nc = cost + weight
            if nc < best.get(nxt, math.inf):
                best[nxt] = nc
                heapq.heappush(queue, (nc, nxt, path+[nxt]))
    return None


def area(points):
    return abs(sum(a[0]*b[1]-b[0]*a[1] for a, b in zip(points, points[1:]))) / 2


def walking_graph(nodes, ways):
    graph, names = defaultdict(dict), {}
    for way in ways:
        tags = way.get('tags', {})
        if tags.get('highway') not in WALKABLE:
            continue
        if tags.get('foot') in {'no', 'private'} or (tags.get('access') in {'no', 'private'} and tags.get('foot') not in {'yes', 'designated', 'permissive'}):
            continue
        for a, b in zip(way.get('nodes', []), way.get('nodes', [])[1:]):
            if a not in nodes or b not in nodes:
                continue
            d = distance(nodes[a], nodes[b])
            if not d:
                continue
            graph[a][b] = graph[b][a] = d
            names[frozenset((a, b))] = tags.get('name', '마장동 골목길')
    return graph, names


def build_walk(nodes, ways):
    graph, names = walking_graph(nodes, ways)

    edges = [(min(distance(nodes[a], (0, 0)), distance(nodes[b], (0, 0))), a, b)
             for a in graph for b in graph[a] if a < b]
    candidates = []
    seen = set()
    for proximity, a, b in sorted(edges)[:140]:
        if proximity > 220:
            break
        result = shortest(graph, a, b, {frozenset((a, b))})
        if not result:
            continue
        length, path = result
        length += graph[a][b]
        route = path + [a]
        identity = frozenset(frozenset(edge) for edge in zip(route, route[1:]))
        if identity in seen:
            continue
        seen.add(identity)
        pts = [nodes[n] for n in route]
        nearest = min(distance(p, (0, 0)) for p in pts)
        farthest = max(distance(p, (0, 0)) for p in pts)
        if not (160 <= length <= 650 and nearest <= 75 and farthest <= 260 and area(pts) >= 500):
            continue
        # Prefer a quiet local block close to the supplied address, without
        # artificial crossings, repeated edges, or a long trip out and back.
        score = nearest*3 + abs(length-350)*.15 + farthest*.15
        candidates.append((score, route, length))
    if not candidates:
        raise ValueError('No verified public-street loop near the address. Inspect the OSM extract; do not fabricate a route.')
    _, route, length = min(candidates)
    ring = route[:-1]
    start = min(range(len(ring)), key=lambda i: distance(nodes[ring[i]], (0, 0)))
    ring = ring[start:]+ring[:start]
    ring.append(ring[0])
    pts = [nodes[n] for n in ring]
    streets = [names[frozenset(edge)] for edge in zip(ring, ring[1:])]
    return pts, streets, ring, length


def build_station_tour(nodes, ways):
    graph, names = walking_graph(nodes, ways)
    start = min(graph, key=lambda n: distance(nodes[n], (0, 0)))
    if distance(nodes[start], (0, 0)) > 75:
        raise ValueError('No public walking street near the starting address.')
    anchors = [start]
    for waypoint in CFG['waypoints']:
        entrance = nodes[waypoint['entranceNodeId']]
        nearest = min(graph, key=lambda n: distance(nodes[n], entrance))
        if distance(nodes[nearest], entrance) > 60:
            raise ValueError(f"No verified walking street near {waypoint['name']}.")
        anchors.append(nearest)
    route, used, length = [start], set(), 0
    for a, b in zip(anchors, anchors[1:] + anchors[:1]):
        # Keep each leg on connected OSM streets and return on different streets.
        result = shortest(graph, a, b, used, set(route) - {a, b}, max_distance=2500)
        if not result:
            raise ValueError('No continuous station loop without retracing streets. Inspect the OSM graph.')
        leg_length, leg = result
        route.extend(leg[1:])
        used.update(frozenset(edge) for edge in zip(leg, leg[1:]))
        length += leg_length
    pts = [nodes[n] for n in route]
    streets = [names[frozenset(edge)] for edge in zip(route, route[1:])]
    return pts, streets, route, length


def smooth_walk(points, streets):
    """Round bends within 1.5 m of their original intersection centerlines."""
    ring = points[:-1]
    out, labels = [], []
    for i, p in enumerate(ring):
        prev, nxt = ring[i-1], ring[(i+1) % len(ring)]
        before, after = distance(prev, p), distance(p, nxt)
        radius = min(1.5, before*.18, after*.18)
        entry = tuple(p[j]+(prev[j]-p[j])*radius/before for j in range(2))
        leave = tuple(p[j]+(nxt[j]-p[j])*radius/after for j in range(2))
        for step in range(5):
            t = step/4
            q = tuple((1-t)**2*entry[j]+2*(1-t)*t*p[j]+t*t*leave[j] for j in range(2))
            out.append(q)
            labels.append(streets[i-1] if t < .5 else streets[i])
    out.append(out[0]); labels.append(labels[0])
    return out, labels


def make_svg(elements, nodes, theme, viewport):
    cx, cy, span = viewport
    k = 1200/span
    def xy(p): return ((p[0]-cx+span/2)*k, (p[1]-cy+span/2)*k)
    def path(ids, close=False):
        pts = [xy(nodes[n]) for n in ids if n in nodes]
        if not pts: return ''
        return 'M'+'L'.join(f'{x:.1f},{y:.1f}' for x, y in pts)+('Z' if close else '')
    palettes = {
        'light': dict(land='#f4f1ea', block='#e2ddd4', edge='#d3cdc2', road='#fbfaf7', casing='#e9e5dd', green='#c8e6c0', water='#9fd1f2', text='#5d5d66', rail='#b9b4ad'),
        'dark': dict(land='#344559', block='#506c8e', edge='#4d5c71', road='#627185', casing='#56657b', green='#005f55', water='#1f3679', text='#d0d9e4', rail='#778698'),
    }
    c = palettes[theme]
    parts = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 1200" width="1200" height="1200">',
             '<!-- Map data © OpenStreetMap contributors, ODbL 1.0. Generated from the recorded OSM extract. -->',
             f'<rect width="1200" height="1200" fill="{c["land"]}"/>',
             '<g stroke-linejoin="round" stroke-linecap="round">']
    ways = [e for e in elements if e['type'] == 'way']
    for way in ways:
        t, ids = way.get('tags', {}), way.get('nodes', [])
        if not ids or ids[0] != ids[-1]: continue
        fill = None
        if 'building' in t: fill = c['block']
        elif t.get('leisure') in {'park', 'garden', 'playground', 'pitch'} or t.get('landuse') in {'grass', 'forest', 'recreation_ground'}: fill = c['green']
        elif t.get('natural') == 'water' or t.get('waterway') == 'riverbank': fill = c['water']
        if fill:
            parts.append(f'<path d="{path(ids, True)}" fill="{fill}" stroke="{c["edge"]}" stroke-width="1"/>')
    roads = [w for w in ways if 'highway' in w.get('tags', {})]
    widths = {'motorway':20, 'trunk':18, 'primary':15, 'secondary':12, 'tertiary':9, 'residential':5, 'living_street':4, 'service':3.5, 'unclassified':5, 'pedestrian':4, 'footway':1.8, 'path':1.5, 'steps':1.8, 'cycleway':2}
    for casing in [True, False]:
        for way in sorted(roads, key=lambda w: widths.get(w['tags']['highway'], 2)):
            w = widths.get(way['tags']['highway'], 2)*k
            parts.append(f'<path d="{path(way.get("nodes", []))}" fill="none" stroke="{c["casing"] if casing else c["road"]}" stroke-width="{w+(2 if casing else 0):.1f}"/>')
    for way in ways:
        if way.get('tags', {}).get('railway') in {'rail', 'light_rail'}:
            parts.append(f'<path d="{path(way.get("nodes", []))}" fill="none" stroke="{c["rail"]}" stroke-width="3" stroke-dasharray="8 5"/>')
    parts.append('</g>')
    stations = [(waypoint['name'], xy(nodes[waypoint['stationNodeId']])) for waypoint in CFG.get('waypoints', [])]
    placed = [p for _, p in stations]
    # Place each named street once along its longest available geometry.
    by_name = {}
    for way in roads:
        name = way.get('tags', {}).get('name')
        pts = [nodes[n] for n in way.get('nodes', []) if n in nodes]
        length = sum(distance(a,b) for a,b in zip(pts,pts[1:]))
        if name and length > by_name.get(name, (0, []))[0]: by_name[name] = (length, pts)
    for name, (length, pts) in sorted(by_name.items(), key=lambda item: -item[1][0]):
        if length < 45: continue
        target, walked = length*.5, 0
        for a,b in zip(pts,pts[1:]):
            d = distance(a,b)
            if walked+d < target: walked += d; continue
            t = (target-walked)/d
            p = tuple(a[j]+t*(b[j]-a[j]) for j in range(2))
            x,y = xy(p)
            if not 60<x<1140 or not 50<y<1150 or any(math.hypot(x-px,y-py)<130 for px,py in placed): break
            angle = math.degrees(math.atan2(b[1]-a[1],b[0]-a[0]))
            if angle > 90: angle -= 180
            if angle < -90: angle += 180
            parts.append(f'<text x="{x:.1f}" y="{y:.1f}" transform="rotate({angle:.1f} {x:.1f} {y:.1f})" text-anchor="middle" dominant-baseline="central" fill="{c["text"]}" stroke="{c["land"]}" stroke-width="5" paint-order="stroke" font-family="-apple-system,BlinkMacSystemFont,Apple SD Gothic Neo,Pretendard Variable,sans-serif" font-size="25" font-weight="600">{html.escape(name)}</text>')
            placed.append((x,y)); break
    for name, (x, y) in stations:
        parts.append(f'<g><circle cx="{x:.1f}" cy="{y:.1f}" r="15" fill="#7450bb" stroke="{c["road"]}" stroke-width="6"/><text x="{x+28:.1f}" y="{y+2:.1f}" dominant-baseline="central" fill="{c["text"]}" stroke="{c["land"]}" stroke-width="8" paint-order="stroke" font-family="-apple-system,BlinkMacSystemFont,Apple SD Gothic Neo,sans-serif" font-size="40" font-weight="700">{html.escape(name)}</text></g>')
    parts.append('</svg>')
    return '\n'.join(parts)


def main():
    source = Path(sys.argv[1])
    raw = source.read_bytes()
    data = json.loads(raw)
    elements = data['elements']
    nodes = {e['id']:project(e['lon'],e['lat']) for e in elements if e['type']=='node'}
    ways = [e for e in elements if e['type']=='way']
    route, streets, ids, length = build_station_tour(nodes, ways) if CFG.get('waypoints') else build_walk(nodes, ways)
    smooth, labels = smooth_walk(route, streets)
    extent = route + [nodes[w['stationNodeId']] for w in CFG.get('waypoints', [])]
    xs, ys = zip(*extent)
    cx,cy = (min(xs)+max(xs))/2, (min(ys)+max(ys))/2
    span = max(CFG.get('minMapSpanMeters', 520), (max(xs)-min(xs))*1.6, (max(ys)-min(ys))*1.65)
    # Reserve headroom for the photo pin and the original card's bottom panel.
    cy += span*.035
    output = ROOT/'public/personal/map'
    output.mkdir(parents=True,exist_ok=True)
    scale = 1200/span
    points = [[round((x-cx+span/2)*scale,2),round((y-cy+span/2)*scale,2)] for x,y in smooth]
    result = dict(width=1200,height=1200,points=points,streets=labels,loopMs=CFG['loopMs'],distanceMeters=round(length,1),address=CFG['address'],roadAddress=CFG['roadAddress'],title=CFG['title'],sourceNodeIds=ids,sourceLicense='ODbL-1.0',metersPerUnit=span/1200)
    result['waypoints'] = CFG.get('waypoints', [])
    result['cardAddress'] = CFG['cardAddress']
    result['home'] = dict(x=round((-cx+span/2)*scale, 2), y=round((-cy+span/2)*scale, 2))
    (output/'route.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'))+'\n', encoding='utf-8')
    home_icon = (ROOT/'personalization/map/vendor/google-home.svg').read_text(encoding='utf-8')
    (output/'google-home.svg').write_text(home_icon.replace('<path ', '<path fill="#fff" '), encoding='utf-8')
    (output/'Google-Material-Symbols-LICENSE.txt').write_bytes((ROOT/'personalization/map/vendor/Google-Material-Symbols-LICENSE.txt').read_bytes())
    for theme in ['light','dark']:
        (output/f'map-{theme}.svg').write_text(make_svg(elements,nodes,theme,(cx,cy,span)), encoding='utf-8')
    receipt = dict(source='OpenStreetMap API / Overpass',sourceUrl=CFG['dataUrl'],sourceFileModifiedAt=datetime.fromtimestamp(source.stat().st_mtime, timezone.utc).isoformat(),sha256=hashlib.sha256(raw).hexdigest(),bbox=CFG['bbox'],nodeCount=len(nodes),wayCount=len(ways),routeNodeIds=ids,routeDistanceMeters=round(length,1),cornerRadiusMeters=1.5,waypoints=CFG.get('waypoints', []),addressSources=CFG['sources'])
    (ROOT/'personalization/map/provenance.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n', encoding='utf-8')
    print(f'Built both themes; {len(points)} route points, {length:.0f} m closed public-street loop.')


if __name__ == '__main__': main()
