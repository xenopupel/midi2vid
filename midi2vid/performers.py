"""Who plays what: a goth pianist plays the lead with two hands, small creatures
play a few of the other parts by hopping onto the keys.

Parts are picked per 4-bar window, so the goth follows whatever carries the
melody there (chords in the intro, the lead line in the drop). Creatures only
take notes they can physically reach in time, and only notes someone actually
plays light up a key, so the keyboard never turns into mush.
"""
from dataclasses import dataclass
import math

NUM_KEYS = 24
WINDOW_BARS = 4

# name, which part it takes, min seconds between hops, hop height, hop time
CREATURES = [
    ("crow", "second", 0.17, 0.10, 0.16),
    ("toad", "bass", 0.24, 0.16, 0.22),
    ("beetle", "third", 0.11, 0.04, 0.10),
]


@dataclass
class Hit:
    start: float
    end: float
    key: int
    vel: float


def _score(notes, span):
    """How lead-like a part is: long, high notes beat fast arps and low pads."""
    if not notes:
        return 0.0
    rate = len(notes) / span
    s = sum(min(n.end - n.start, 1.0) * (n.pitch / 60.0) ** 2 for n in notes)
    return s * (0.3 if rate > 6 else 1.0)


def _pick_parts(notes, bar_len, song_end, lead_name=None):
    """Per window: (lead notes, second part, third part, bass part)."""
    win = WINDOW_BARS * bar_len
    melodic = [n for n in notes if n.role == "keys"]
    bass = [n for n in notes if n.role == "bass"]
    out = {"lead": [], "second": [], "third": [], "bass": []}
    # identical doubled 808 tracks: keep the busiest one
    if bass:
        counts = {}
        for n in bass:
            counts[n.track] = counts.get(n.track, 0) + 1
        best = max(counts, key=counts.get)
        out["bass"] = [n for n in bass if n.track == best]
    w0 = 0.0
    while w0 < song_end:
        w1 = w0 + win
        by_track = {}
        for n in melodic:
            if w0 <= n.start < w1:
                by_track.setdefault(n.track, []).append(n)
        ranked = sorted(by_track.values(), key=lambda ns: _score(ns, win), reverse=True)
        if lead_name:
            forced = [ns for ns in ranked if lead_name.lower() in ns[0].track_name.lower()]
            if forced:
                ranked.remove(forced[0])
                ranked.insert(0, forced[0])
        if ranked:
            top = _score(ranked[0], win)
            out["lead"] += ranked[0]
            if len(ranked) > 1:
                out["second"] += ranked[1]
            if len(ranked) > 2 and _score(ranked[2], win) > 0.15 * top:
                out["third"] += ranked[2]
        w0 = w1
    for k in out:
        out[k].sort(key=lambda n: n.start)
    return out


def _key(pitch, base):
    return (pitch - base) % NUM_KEYS


def key_x(k):
    """Key centre in instrument space (keyboard spans -0.5..0.5)."""
    return (k + 0.5) / NUM_KEYS - 0.5


def _group_chords(notes, eps=0.03):
    groups = []
    for n in notes:
        if groups and n.start - groups[-1][0].start < eps:
            groups[-1].append(n)
        else:
            groups.append([n])
    return groups


def _hands(lead, base):
    """Split the lead into a left- and a right-hand sequence of Hits."""
    left, right = [], []
    lk, rk = 7, 16  # resting keys
    for g in _group_chords(lead):
        g = sorted(g, key=lambda n: n.pitch)
        keys = [_key(n.pitch, base) for n in g]
        lo, hi = g[0], g[-1]
        if len(g) > 1:
            kl, kh = min(keys), max(keys)
            left.append(Hit(lo.start, lo.end, kl, lo.velocity / 127))
            right.append(Hit(hi.start, hi.end, kh, hi.velocity / 127))
            lk, rk = kl, kh
        else:
            k = keys[0]
            if abs(k - lk) < abs(k - rk) and k <= rk:
                left.append(Hit(lo.start, lo.end, k, lo.velocity / 127))
                lk = k
            else:
                right.append(Hit(lo.start, lo.end, k, lo.velocity / 127))
                rk = k
            if lk >= rk:  # keep the hands from crossing
                lk = max(0, rk - 3)
    return left, right


def _thin(hits, min_gap):
    """Drop notes a creature could not hop to in time."""
    out = []
    for h in hits:
        if not out or h.start - out[-1].start >= min_gap:
            out.append(h)
    return out


def _seq_at(hits, t, travel):
    """Position along a hit sequence: (key x, travel 0..1 arc, pressed amount, since landing, idle)."""
    lo, hi = 0, len(hits)
    while lo < hi:
        m = (lo + hi) // 2
        if hits[m].start <= t:
            lo = m + 1
        else:
            hi = m
    i = lo - 1
    nxt = hits[lo] if lo < len(hits) else None
    if i < 0:
        k = nxt.key if nxt else 0
        return key_x(k), 0.0, 0.0, 9.0, (nxt.start - t) if nxt else 9.0
    cur = hits[i]
    x = key_x(cur.key)
    arc = 0.0
    if nxt:
        dur = min(travel, (nxt.start - cur.start) * 0.8)
        s = nxt.start - dur
        if t >= s:
            u = (t - s) / dur
            e = u * u * (3 - 2 * u)
            x = x + (key_x(nxt.key) - x) * e
            arc = 4 * u * (1 - u)
    if t <= cur.end:
        press = cur.vel * (0.7 + 0.3 * math.exp(-(t - cur.start) / 0.1))
    else:
        press = cur.vel * math.exp(-(t - cur.end) / 0.08)
    idle = t - cur.end
    if nxt:
        idle = min(idle, nxt.start - t)
    return x, arc, press, t - cur.start, idle


class Performers:
    def __init__(self, notes, bar_len, song_end, lead_name=None):
        parts = _pick_parts(notes, bar_len, song_end, lead_name)
        played = parts["lead"] + parts["second"] + parts["third"] + parts["bass"]
        self.base = 12 * (min(n.pitch for n in played) // 12) if played else 48
        self.left, self.right = _hands(parts["lead"], self.base)
        self.creatures = []
        for name, part, gap, height, travel in CREATURES:
            src = parts[part]
            if part == "bass":  # the toad sits on the low end
                hits = [Hit(n.start, n.end, n.pitch % 12, n.velocity / 127) for n in src]
            else:
                hits = [Hit(n.start, n.end, _key(n.pitch, self.base), n.velocity / 127)
                        for g in _group_chords(src) for n in [max(g, key=lambda n: n.pitch)]]
            self.creatures.append((name, _thin(hits, gap), height, travel))
        self.pressers = self.left + self.right + [h for c in self.creatures for h in c[1]]
        self.pressers.sort(key=lambda h: h.start)
        self.summary = {
            "lead": sorted({n.track_name for n in parts["lead"]}),
            **{c[0]: sorted({n.track_name for n in parts[c[1]]}) for c in CREATURES},
        }

    def keys(self, t):
        vals = [0.0] * NUM_KEYS
        for h in self.pressers:
            if h.start > t:
                break
            if t - h.end > 0.5:
                continue
            v = h.vel * (0.75 + 0.25 * math.exp(-(t - h.start) / 0.15)) if t <= h.end else h.vel * math.exp(-(t - h.end) / 0.12)
            vals[h.key] = max(vals[h.key], v)
        return vals

    def hand(self, hits, t, rest_x):
        if not hits:
            return [rest_x, 0.0, 1.0, 0.0]
        x, arc, press, since, idle = _seq_at(hits, t, 0.12)
        # drift back to a hover above the keys when the part rests
        lift = max(arc, min(1.0, max(0.0, idle - 0.6) / 0.6))
        return [x, press, lift, 1.0]

    def creature(self, i, t):
        name, hits, height, travel = self.creatures[i]
        if not hits:
            return [0.0, 0.0, 0.0, 0.0]
        x, arc, press, since, idle = _seq_at(hits, t, travel)
        vis = max(0.0, min(1.0, 1.0 - (idle - 1.2) / 0.4))
        squash = math.exp(-since / 0.07) if since >= 0 else 0.0
        return [x, arc * height, squash, vis]

    def frame(self, t):
        """Uniform values: hands (2 x vec4) and creatures (3 x vec4)."""
        row = self.hand(self.left, t, key_x(7)) + self.hand(self.right, t, key_x(16))
        for i in range(len(self.creatures)):
            row += self.creature(i, t)
        return row
