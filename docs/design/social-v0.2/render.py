"""Render the Agele social design source. No app/runtime dependencies.

Run from any directory: python docs/design/social-v0.2/render.py
Requires CairoSVG and Pillow; Manrope installed locally for canonical PNG type.
All figures and trader identities below are illustrative demo content.
"""

import base64
import html
import io
from pathlib import Path

import cairosvg
from PIL import Image

OUT = Path(__file__).resolve().parent
ROOT = OUT.parents[2]
BG, PANEL, FLOAT = "#080A0D", "#0E1116", "#171B22"
FG, MUTED, EDGE = "#EBEDF0", "#929BA8", "#29303A"
BRAND, UP, DOWN, WARN = "#B8DCA5", "#2CDB99", "#FF6177", "#E6C17B"


class Board:
    def __init__(self, title, width=1440, height=960):
        self.width, self.height, self.parts = width, height, []
        self.add(f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">')
        self.add(f'<title id="title">{html.escape(title)}</title><desc id="desc">Agele v0.2 design proposal. All people, activity and financial figures are illustrative demo data, not live performance.</desc>')
        self.add('<defs><style>text{font-family:Manrope,Arial,sans-serif}.mono{font-family:"JetBrains Mono",monospace}</style>')
        self.add('<clipPath id="round"><circle cx="20" cy="20" r="20"/></clipPath>')
        for token in ["sol", "wif", "bonk", "jup", "pengu", "pump", "pyth"]:
            im = Image.open(ROOT / f"public/tokens/{token}.webp").convert("RGBA")
            im.thumbnail((80, 80))
            buf = io.BytesIO()
            im.save(buf, format="PNG")
            data = base64.b64encode(buf.getvalue()).decode()
            self.add(f'<symbol id="{token}" viewBox="0 0 40 40"><image width="40" height="40" preserveAspectRatio="xMidYMid slice" clip-path="url(#round)" xlink:href="data:image/png;base64,{data}"/></symbol>')
        self.add('</defs>')
        self.rect(0, 0, width, height, BG)

    def add(self, s):
        self.parts.append(s)

    def rect(self, x, y, w, h, fill=PANEL, stroke=None, r=0):
        self.add(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{fill}"' + (f' stroke="{stroke}"' if stroke else '') + '/>')

    def line(self, x1, y1, x2, y2, color=EDGE):
        self.add(f'<path d="M{x1} {y1}H{x2}" stroke="{color}"/>' if y1 == y2 else f'<path d="M{x1} {y1}L{x2} {y2}" stroke="{color}"/>')

    def text(self, x, y, s, size=13, color=FG, weight=400, mono=False, anchor="start"):
        self.add(f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" font-weight="{weight}" text-anchor="{anchor}"' + (' class="mono"' if mono else '') + f'>{html.escape(str(s))}</text>')

    def circle(self, x, y, r, fill):
        self.add(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{fill}"/>')

    def logo(self, x, y, token, size=32):
        self.add(f'<use xlink:href="#{token}" x="{x}" y="{y}" width="{size}" height="{size}"/>')

    def avatar(self, x, y, size=36, n=0):
        # Authored demo avatar art, not token placeholders or identity verification.
        colors = [("#24343A", "#ACCDD1"), ("#343047", "#C8BDE0"), ("#3A3228", "#DAC7AA")]
        a, b = colors[n % len(colors)]
        self.circle(x + size / 2, y + size / 2, size / 2, a)
        self.circle(x + size * .5, y + size * .39, size * .15, b)
        self.add(f'<path d="M{x+size*.2} {y+size*.78}Q{x+size*.5} {y+size*.31} {x+size*.8} {y+size*.78}Z" fill="{b}"/>')

    def icon(self, x, y, name, color=MUTED, size=16):
        paths = {
            "comment": 'M4 3h16v13H9l-5 4V3Z',
            "heart": 'M12 20 3 11C-2 3 7-1 12 6c5-7 14-3 9 5L12 20Z',
            "replay": 'M5 7a8 8 0 1 1-1 9M5 2v5h5M10 9l6 4-6 4V9Z',
            "link": 'M8 16 16 8M9 5l2-2a6 6 0 0 1 9 9l-2 2M15 19l-2 2a6 6 0 0 1-9-9l2-2',
            "copy": 'M8 8h13v13H8V8ZM16 4H4v12',
            "search": 'M18 18l5 5M20 11a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
            "arrow": 'M4 12h16m-6-6 6 6-6 6',
            "pause": 'M8 4v16M16 4v16',
            "filter": 'M3 6h18M6 12h12M9 18h6',
            "plus": 'M12 4v16M4 12h16',
            "close": 'm5 5 14 14M5 19 19 5',
            "check": 'm4 12 5 5L20 6',
            "chevron": 'm8 5 7 7-7 7',
            "previous": 'm15 5-7 7 7 7',
            "play": 'm8 4 13 8-13 8V4Z',
        }
        self.add(f'<svg aria-hidden="true" focusable="false" x="{x}" y="{y}" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" stroke="{color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="{paths[name]}"/></svg>')

    def btn(self, x, y, w, label, primary=False, h=32):
        self.rect(x, y, w, h, BRAND if primary else FLOAT, None if primary else EDGE, 4)
        self.text(x + w / 2, y + h / 2 + 4.5, label, 12, BG if primary else FG, 600, anchor="middle")

    def badge(self, x, y, label="Demo", color=WARN, w=44):
        self.rect(x, y, w, 20, PANEL, EDGE, 4)
        self.text(x + w / 2, y + 14, label, 10, color, 600, anchor="middle")

    def shell(self, active="Feed"):
        self.rect(0, 0, self.width, 48, PANEL)
        self.line(0, 48, self.width, 48)
        self.add(f'<g transform="translate(22 10) scale(.7)"><path fill="{BRAND}" d="M3 31 15 7h9L12 31H3Zm23-24 11 24H27l-5-11 4-13Zm-10 18 3-6h5l3 6H16Z"/></g>')
        self.text(58, 32, "agele", 21, FG, 700)
        x = 156
        for label, w in [("Trade", 63), ("Pulse", 63), ("Feed", 61), ("Leaderboard", 103), ("Portfolio", 80)]:
            if label == active:
                self.rect(x - 10, 8, w, 32, "#232830", r=4)
            self.text(x, 29, label, 12, BRAND if label == active else MUTED, 600)
            x += w + 7
        self.rect(660, 10, 284, 28, BG, EDGE, 4)
        self.icon(672, 17, "search", size=13)
        self.text(694, 29, "Search token or contract address", 11, MUTED)
        self.text(927, 29, "/", 11, MUTED, mono=True)
        self.badge(1118, 14)
        self.logo(1180, 16, "sol", 16)
        self.text(1203, 29, "SOL", 11, MUTED)
        self.btn(1244, 10, 78, "Deposit", h=28)
        self.avatar(1350, 10, 28)
        self.has_shell = True

    def footer(self):
        self.rect(0, self.height - 28, self.width, 28, PANEL)
        self.line(0, self.height - 28, self.width, self.height - 28)
        self.circle(18, self.height - 14, 3, UP)
        self.text(28, self.height - 10, "Connected", 10, MUTED)
        self.text(113, self.height - 10, "Demo", 10, WARN)
        for i, (token, price, change) in enumerate([("sol", "$196.12", "+2.8%"), ("wif", "$2.04", "+12.4%"), ("bonk", "$0.000021", "−3.2%"), ("jup", "$0.94", "+6.1%"), ("pengu", "$0.031", "+8.7%")]):
            x = 200 + 218 * i
            self.logo(x, self.height - 21, token, 14)
            self.text(x + 21, self.height - 10, token.upper(), 10, FG, 600)
            self.text(x + 71, self.height - 10, price, 10, MUTED, mono=True)
            self.text(x + 140, self.height - 10, change, 10, DOWN if change.startswith("−") else UP, mono=True)

    def title(self, title, sub, action=None):
        self.text(160, 104, title, 26, weight=600)
        self.text(160, 129, sub, 13, MUTED)
        if action:
            self.btn(1156, 83, 124, action)

    def save(self, name):
        if getattr(self, "has_shell", False):
            self.footer()
        source = '\n'.join(self.parts) + '\n</svg>\n'
        (OUT / f"{name}.svg").write_text(source, encoding="utf-8")
        cairosvg.svg2png(bytestring=source.encode("utf-8"), write_to=str(OUT / f"{name}.png"))


def tabs(b, x, y, labels, active=0, widths=None):
    for i, label in enumerate(labels):
        w = widths[i] if widths else max(66, len(label) * 8 + 24)
        b.text(x + 12, y + 20, label, 12, FG if i == active else MUTED, 600)
        if i == active:
            b.line(x + 10, y + 34, x + w - 10, y + 34, BRAND)
        x += w


def trade_card(b, x, y, w=728, who="solsurfer", token="wif", side="Bought", amount="2.40", n=0):
    b.rect(x, y, w, 200, PANEL, EDGE, 6)
    b.avatar(x + 20, y + 18, 34, n)
    b.text(x + 65, y + 33, who, 13, weight=600)
    b.text(x + 65, y + 51, "Trade", 11, MUTED)
    b.text(x + w - 20, y + 33, "2m · · ·", 11, MUTED, anchor="end")
    b.text(x + 20, y + 83, side, 15, UP if side == "Bought" else DOWN, 600)
    b.text(x + 83, y + 83, f"{amount} SOL of {token.upper()}", 15, weight=600)
    b.rect(x + 20, y + 100, w - 40, 54, BG, EDGE, 4)
    b.logo(x + 32, y + 111, token, 32)
    b.text(x + 75, y + 121, token.upper(), 12, weight=600)
    b.text(x + 75, y + 139, "dogwifhat" if token == "wif" else token.upper(), 11, MUTED)
    b.text(x + 256, y + 121, "Market cap at trade", 10, MUTED)
    b.text(x + 256, y + 140, "$2.04B", 12, mono=True)
    b.text(x + 435, y + 121, "Since first buy", 10, MUTED)
    b.text(x + 435, y + 140, "+12.4%", 12, UP, mono=True)
    b.icon(x + w - 48, y + 119, "arrow", BRAND)
    b.icon(x + 20, y + 171, "heart")
    b.text(x + 44, y + 184, "18", 11, MUTED, mono=True)
    b.icon(x + 94, y + 171, "comment")
    b.text(x + 118, y + 184, "4", 11, MUTED, mono=True)
    b.icon(x + 166, y + 171, "link")
    b.text(x + 190, y + 184, "Share", 11, MUTED)
    b.icon(x + w - 244, y + 171, "replay", BRAND)
    b.text(x + w - 221, y + 184, "Replay", 11, BRAND, 600)
    b.btn(x + w - 128, y + 163, 108, "Buy " + token.upper(), h=29)


def feed():
    b = Board("Agele — feed and theses")
    b.shell()
    b.title("Feed", "Trades, theses, and the people behind them.")
    tabs(b, 148, 155, ["Global", "Following"], widths=[80, 96])
    b.btn(650, 155, 66, "All")
    b.text(736, 175, "Trades", 12, MUTED)
    b.text(818, 175, "Theses", 12, MUTED)
    b.rect(160, 209, 728, 64, PANEL, EDGE, 6)
    b.avatar(180, 224, 32)
    b.text(226, 245, "Share the thinking behind your position", 13, MUTED)
    b.btn(766, 225, 102, "Add thesis", h=32)
    trade_card(b, 160, 287)
    b.rect(160, 501, 728, 242, PANEL, EDGE, 6)
    b.avatar(180, 519, 34, 1)
    b.text(225, 534, "theta", 13, weight=600)
    b.text(225, 552, "Thesis · Holding", 11, MUTED)
    b.text(868, 534, "6m · · ·", 11, MUTED, anchor="end")
    b.text(180, 586, "Watching the higher lows on JUP. Volume is building,", 14)
    b.text(180, 609, "but I want to see the range hold before adding.", 14)
    b.rect(180, 630, 688, 54, BG, EDGE, 4)
    b.logo(192, 641, "jup", 32)
    b.text(236, 652, "JUP", 12, weight=600)
    b.text(236, 670, "Jupiter", 11, MUTED)
    b.text(426, 659, "Position 3.25 SOL", 11, MUTED)
    b.text(610, 659, "+0.40 SOL  (+12.4%)", 11, UP, mono=True)
    b.icon(838, 649, "arrow", BRAND)
    b.icon(180, 710, "heart")
    b.text(204, 723, "32", 11, MUTED, mono=True)
    b.icon(254, 710, "comment")
    b.text(278, 723, "8", 11, MUTED, mono=True)
    b.icon(326, 710, "link")
    b.text(350, 723, "Share", 11, MUTED)
    b.text(855, 723, "2 older · Open thread", 11, BRAND, anchor="end")
    trade_card(b, 160, 757, who="lowcap_larry", token="bonk", side="Sold", amount="1.25", n=2)
    # Crop at the fixed status bar, as a real scrolling feed viewport would.
    b.rect(912, 155, 368, 270, PANEL, EDGE, 6)
    b.text(932, 185, "Traders to watch", 13, weight=600)
    b.text(1260, 185, "7D", 10, MUTED, mono=True, anchor="end")
    for i, (who, sub) in enumerate([("theta", "Theses on JUP and SOL"), ("lowcap_larry", "Trading new launches"), ("frostbyte", "Momentum, with a thesis")]):
        y = 209 + i * 64
        b.avatar(932, y, 32, i + 1)
        b.text(976, y + 12, who, 12, weight=600)
        b.text(976, y + 30, sub, 11, MUTED)
        b.btn(1192, y, 68, "Follow")
    b.text(932, 402, "Explore traders", 11, BRAND, 600)
    b.icon(1244, 389, "arrow", BRAND)
    b.rect(912, 441, 368, 137, PANEL, EDGE, 6)
    b.text(932, 471, "From Pulse", 13, weight=600)
    b.text(932, 495, "See launches as they move from new", 12, MUTED)
    b.text(932, 516, "to final stretch to migrated.", 12, MUTED)
    b.text(932, 552, "Open Pulse", 11, BRAND, 600)
    b.icon(1244, 540, "arrow", BRAND)
    b.text(912, 612, "Demo traders · simulated activity", 10, MUTED)
    b.save("01-feed")


def profile():
    b = Board("Agele — public trader profile")
    b.shell()
    b.text(160, 93, "Feed / solsurfer", 11, MUTED)
    b.avatar(160, 118, 64)
    b.text(244, 141, "solsurfer", 25, weight=600)
    b.text(244, 165, "48mi…m54P", 11, MUTED, mono=True)
    b.icon(348, 152, "copy", size=14)
    b.text(160, 212, "Patient entries. Clear exits. Mostly SOL ecosystem.", 14)
    b.text(160, 241, "1,284", 12, weight=600, mono=True)
    b.text(210, 241, "followers", 12, MUTED)
    b.text(292, 241, "86", 12, weight=600, mono=True)
    b.text(320, 241, "following", 12, MUTED)
    b.text(424, 241, "3 mutuals · Avg hold 4h 12m · 142 trades · Joined Oct 2026", 12, MUTED)
    b.btn(1168, 125, 112, "Following")
    b.text(1280, 177, "Demo profile", 10, WARN, anchor="end")
    b.line(160, 267, 1280, 267)
    b.text(160, 301, "Performance", 14, weight=600)
    tabs(b, 1036, 278, ["24H", "7D", "30D"], active=1, widths=[78, 78, 78])
    for i, (label, val, color) in enumerate([("Realized PnL", "+18.42 SOL", UP), ("Unrealized PnL", "−0.86 SOL", DOWN), ("Win rate", "62.5%", FG), ("Closed positions", "24", FG)]):
        x = 160 + 284 * i
        b.text(x, 343, label, 11, MUTED)
        b.text(x, 376, val, 25, color, 600, mono=True)
    b.text(160, 401, "7D · simulated performance · fees included where available", 10, MUTED)
    b.rect(160, 425, 1120, 167, PANEL, EDGE, 6)
    b.text(180, 452, "Cumulative realized PnL", 11, MUTED)
    b.text(972, 452, "Portfolio", 10, MUTED)
    b.text(1055, 452, "PnL", 10, BRAND, 600)
    for i, v in enumerate(["20 SOL", "10 SOL", "0 SOL"]):
        y = 466 + i * 42
        b.line(180, y, 1200, y, "#1C222B")
        b.text(1258, y + 4, v, 10, MUTED, mono=True, anchor="end")
    b.add(f'<path d="M180 547 228 547 228 538 310 538 310 542 381 542 381 516 483 516 483 521 548 521 548 498 641 498 641 506 727 506 727 487 831 487 831 492 917 492 917 469 1010 469 1010 478 1093 478 1093 465 1185 465" fill="none" stroke="{BRAND}" stroke-width="2"/>')
    for x, v in [(180, "21 Nov"), (487, "23 Nov"), (812, "25 Nov"), (1154, "27 Nov")]:
        b.text(x, 577, v, 10, MUTED, mono=True)
    tabs(b, 148, 612, ["Activity", "Positions", "Theses", "Replays"], widths=[96, 100, 88, 92])
    b.line(160, 647, 1280, 647)
    for i, (token, side, amount, when, n) in enumerate([("wif", "Buy", "2.40 SOL", "2m", 0), ("jup", "Sell", "1.80 SOL", "28m", 1), ("bonk", "Buy", "0.75 SOL", "1h", 2)]):
        y = 667 + i * 75
        b.logo(180, y + 9, token, 34)
        b.text(230, y + 24, token.upper(), 13, weight=600)
        b.text(230, y + 43, "Trade", 11, MUTED)
        b.text(465, y + 30, side, 12, UP if side == "Buy" else DOWN, 600)
        b.text(594, y + 30, amount, 12, mono=True)
        b.text(817, y + 30, when + " ago", 11, MUTED)
        b.icon(1040, y + 16, "replay", BRAND)
        b.text(1064, y + 30, "Replay trade", 11, BRAND)
        b.text(1258, y + 30, "View token", 11, MUTED, anchor="end")
        b.line(160, y + 61, 1280, y + 61)
    b.save("02-profile")


def pulse_card(b, x, y, token, name, cap, vol, age, progress=None, migrated=False):
    w = 357
    b.rect(x, y, w, 188, PANEL, EDGE, 6)
    b.logo(x + 16, y + 18, token, 40)
    b.text(x + 68, y + 33, name, 14, weight=600)
    b.text(x + 68, y + 52, token.upper(), 10, MUTED)
    b.text(x + w - 16, y + 31, age, 10, MUTED, mono=True, anchor="end")
    b.text(x + 16, y + 84, "7xKp…pump" if not migrated else "8n2D…mB4r", 10, MUTED, mono=True)
    b.icon(x + 120, y + 72, "copy", size=13)
    b.text(x + 16, y + 112, "MCap", 10, MUTED)
    b.text(x + 65, y + 112, cap, 12, weight=600, mono=True)
    b.text(x + 187, y + 112, "Vol 24h", 10, MUTED)
    b.text(x + 248, y + 112, vol, 12, mono=True)
    if progress is not None:
        b.rect(x + 16, y + 130, 325, 3, EDGE, r=1)
        b.rect(x + 16, y + 130, 325 * progress / 100, 3, BRAND, r=1)
        b.text(x + 16, y + 155, "Bonding curve", 10, MUTED)
        b.text(x + w - 16, y + 155, f"{progress}%", 10, BRAND, mono=True, anchor="end")
    else:
        b.text(x + 16, y + 146, "Migrated to PumpSwap" if migrated else "Bonding data unavailable", 10, BRAND if migrated else MUTED)
    b.line(x + 16, y + 166, x + 341, y + 166)
    b.text(x + 16, y + 182, "View token", 10, MUTED)
    b.text(x + 341, y + 182, "Buy 0.10 SOL", 10, BRAND, 600, anchor="end")


def pulse():
    b = Board("Agele — Pulse lifecycle board")
    b.shell("Pulse")
    b.title("Pulse", "Follow the lifecycle. Find your next trade.", "Filters")
    b.btn(160, 155, 118, "All platforms")
    b.btn(290, 155, 134, "Quick buy: 0.10")
    b.logo(402, 165, "sol", 13)
    b.text(444, 175, "Edit presets", 11, MUTED)
    b.icon(1125, 164, "pause", size=14)
    b.text(1149, 175, "Pause updates", 11, MUTED)
    for i, (title, count, sub) in enumerate([("New", "24", "Newest launches first"), ("Final stretch", "8", "Near graduation"), ("Migrated", "16", "Newest migrations first")]):
        x = 160 + i * 381
        b.text(x, 224, title, 15, weight=600)
        b.badge(x + (111 if i == 1 else 81 if i == 2 else 45), 209, count, MUTED, w=28)
        b.text(x, 247, sub, 11, MUTED)
        b.line(x, 262, x + 357, 262)
    rows = [
        (160, 278, "pump", "Pump", "$8.2K", "$2.4K", "12s", 12, False),
        (160, 482, "bonk", "Bonk", "$12.7K", "$4.1K", "38s", 24, False),
        (541, 278, "wif", "dogwifhat", "$62.1K", "$28.7K", "4m", 94, False),
        (541, 482, "pengu", "Pudgy Penguins", "$58.4K", "$19.1K", "8m", 87, False),
        (922, 278, "jup", "Jupiter", "$114.2K", "$42.6K", "1m", None, True),
        (922, 482, "pyth", "Pyth Network", "$86.4K", "$31.2K", "5m", None, True),
    ]
    for row in rows:
        pulse_card(b, *row)
    b.save("03-pulse")


def replay():
    b = Board("Agele — trade detail and replay at a selected fill")
    b.shell()
    b.text(160, 92, "Feed / solsurfer / WIF", 11, MUTED)
    b.logo(160, 113, "wif", 42)
    b.text(216, 133, "WIF", 23, weight=600)
    b.text(216, 154, "solsurfer’s position", 12, MUTED)
    b.badge(291, 116, "Closed", MUTED, 52)
    b.btn(962, 120, 86, "Follow")
    b.btn(1060, 120, 86, "Share")
    b.btn(1158, 120, 122, "Buy WIF", primary=True)
    b.rect(160, 185, 728, 394, PANEL, EDGE, 6)
    b.text(180, 213, "Price / SOL", 12, weight=600)
    tabs(b, 392, 190, ["1H", "4H", "1D", "7D", "ALL"], 2, [58] * 5)
    b.badge(787, 198, "Replay", BRAND, 80)
    for i, label in enumerate(["0.012", "0.010", "0.008", "0.006"]):
        y = 262 + i * 70
        b.line(180, y, 808, y, "#1C222B")
        b.text(870, y + 4, label, 10, MUTED, mono=True, anchor="end")
    # Deterministic illustration: historical candles, selected fill and future context.
    points = [438, 429, 448, 410, 419, 392, 407, 386, 398, 364, 382, 348, 360, 339, 350, 318, 336, 308, 325, 291, 302, 276, 299, 266, 280, 251, 268, 260, 243, 257, 237, 248]
    for i, y in enumerate(points):
        x = 188 + 19 * i
        color = UP if i % 3 != 2 else DOWN
        if i > 17:
            color = "#414A56"
        b.line(x + 4, y - 9, x + 4, y + 22, color)
        b.rect(x, y, 8, 11 + i % 7, color)
    b.line(180, 419, 808, 419, "#596474")
    b.text(182, 411, "Average entry at fill 3", 10, MUTED)
    for x, y, label, color in [(230, 458, "B1", UP), (383, 416, "B2", UP), (516, 343, "S3", DOWN)]:
        b.circle(x, y, 12, BG)
        b.text(x, y + 4, label, 9, color, 600, anchor="middle")
    b.line(516, 242, 516, 485, BRAND)
    b.text(653, 487, "Unplayed", 10, MUTED)
    for x, label in [(180, "14:00"), (389, "14:30"), (595, "15:00"), (769, "15:30")]:
        b.text(x, 513, label, 10, MUTED, mono=True)
    b.line(180, 530, 868, 530)
    b.icon(182, 548, "replay", FG)
    b.icon(222, 548, "previous", FG)
    b.icon(262, 548, "play", BRAND)
    b.icon(302, 548, "chevron", FG)
    b.rect(346, 554, 290, 3, EDGE, r=1)
    b.rect(346, 554, 116, 3, BRAND, r=1)
    b.circle(462, 555, 5, BRAND)
    b.text(662, 562, "3 / 6 fills", 11, MUTED, mono=True)
    b.text(790, 562, "1×", 11, FG)
    b.text(845, 562, "2×", 11, MUTED)
    b.text(160, 608, "21 Nov 2026 · 14:32:08 UTC", 11, MUTED, mono=True)
    b.text(886, 608, "Paused at selected fill", 11, BRAND, anchor="end")
    b.rect(912, 185, 368, 304, PANEL, EDGE, 6)
    b.text(932, 215, "At fill 3 of 6", 14, weight=600)
    b.text(932, 241, "Historical position, not today’s quote", 11, MUTED)
    for i, (label, val, color) in enumerate([("Position value", "3.84 SOL", FG), ("Realized PnL so far", "+0.12 SOL", UP), ("Token amount", "431.4 WIF", FG), ("Average entry", "0.0089 SOL", FG), ("Fees paid so far", "0.006 SOL", FG)]):
        y = 281 + i * 39
        b.text(932, y, label, 12, MUTED)
        b.text(1260, y, val, 12, color, mono=True, anchor="end")
    b.rect(912, 505, 368, 207, PANEL, EDGE, 6)
    b.text(932, 535, "Position thesis", 13, weight=600)
    b.avatar(932, 553, 28)
    b.text(970, 571, "solsurfer · 21 Nov", 11, MUTED)
    b.text(932, 610, "Adding on the range reclaim.", 13)
    b.text(932, 633, "Invalidation is below the last low.", 13)
    b.text(932, 685, "2 older updates · 4 comments", 11, BRAND)
    b.text(160, 653, "Transactions", 15, weight=600)
    b.text(870, 653, "6 total · chronological", 11, MUTED, anchor="end")
    for i, (name, amount, when, color) in enumerate([("Buy", "1.20 SOL", "14:03:12", UP), ("Buy", "2.40 SOL", "14:17:04", UP), ("Sell", "0.80 SOL", "14:32:08", DOWN)]):
        y = 677 + i * 66
        b.rect(160, y, 728, 60, "#171F1C" if i == 2 else PANEL, EDGE, 4)
        b.text(180, y + 24, f"{i + 1:02}", 11, MUTED, mono=True)
        b.text(224, y + 24, name, 12, color, 600)
        b.text(224, y + 44, "Fill · transaction details", 10, MUTED)
        b.text(484, y + 32, amount, 12, mono=True)
        b.text(756, y + 32, when, 11, MUTED, mono=True)
        b.icon(846, y + 22, "chevron", BRAND if i == 2 else MUTED)
    b.text(180, 906, "3 later fills · select a fill to move the chart", 11, MUTED)
    b.save("04-replay")


def share():
    b = Board("Agele — exportable replay share card", 1080, 720)
    b.rect(48, 48, 984, 624, PANEL, EDGE, 12)
    b.add(f'<g transform="translate(80 78)"><path fill="{BRAND}" d="M3 31 15 7h9L12 31H3Zm23-24 11 24H27l-5-11 4-13Zm-10 18 3-6h5l3 6H16Z"/></g>')
    b.text(136, 107, "agele", 28, weight=700)
    b.badge(916, 87, "Demo", WARN, 76)
    b.avatar(80, 153, 40)
    b.text(134, 179, "solsurfer", 19, weight=600)
    b.text(80, 232, "Closed position", 14, MUTED)
    b.logo(80, 258, "wif", 48)
    b.text(142, 291, "WIF", 28, weight=600)
    b.text(992, 310, "+1.84 SOL", 55, UP, 600, mono=True, anchor="end")
    b.text(992, 345, "+23.8% realized return", 17, UP, anchor="end")
    b.line(80, 378, 992, 378)
    b.text(80, 418, "21–27 Nov 2026", 13, MUTED)
    b.text(992, 418, "6 fills · fees included", 13, MUTED, anchor="end")
    b.add(f'<path d="M80 541 134 541 169 551 215 529 261 534 310 499 351 507 401 479 450 485 490 458 543 469 590 435 631 452 679 424 727 436 780 409 833 422 888 391 942 403 992 389" transform="translate(0 34)" fill="none" stroke="{BRAND}" stroke-width="2.5"/>')
    b.text(80, 617, "Simulated performance · not your execution", 12, WARN)
    b.text(992, 643, "agele · View position replay", 12, MUTED, anchor="end")
    b.save("05-share-card")


def mobile_shell(b, x, y, active="Feed", w=390, h=844):
    b.rect(x, y, w, h, BG, EDGE, 8)
    b.line(x, y + 56, x + w, y + 56)
    b.add(f'<g transform="translate({x+16} {y+14}) scale(.65)"><path fill="{BRAND}" d="M3 31 15 7h9L12 31H3Zm23-24 11 24H27l-5-11 4-13Zm-10 18 3-6h5l3 6H16Z"/></g>')
    b.text(x + 51, y + 36, "agele", 19, weight=700)
    b.badge(x + 232, y + 18)
    b.icon(x + 299, y + 22, "search", size=17)
    b.avatar(x + 344, y + 16, 26)


def mobile_nav(b, x, y, active="Feed", w=390, h=844):
    b.rect(x + 1, y + h - 74, w - 2, 73, PANEL)
    b.line(x, y + h - 74, x + w, y + h - 74)
    for i, label in enumerate(["Trade", "Pulse", "Feed", "Ranks", "Portfolio"]):
        xx = x + 39 + i * 78
        b.text(xx, y + h - 36, label, 10, BRAND if label == active else MUTED, 600, anchor="middle")
        if label == active:
            b.line(xx - 14, y + h - 62, xx + 14, y + h - 62, BRAND)


def mobile():
    b = Board("Agele — responsive feed, Pulse and profile at 390px", 1304, 1020)
    b.text(32, 44, "Social, without the clutter", 25, weight=600)
    b.text(32, 72, "390px · single-column content · 44px action targets · no discovery rail", 12, MUTED)
    yy = 116
    for x, title in [(32, "Feed"), (457, "Pulse"), (882, "Profile")]:
        mobile_shell(b, x, yy, "Pulse" if title == "Pulse" else "Feed")
    x, y = 32, yy
    b.text(x + 16, y + 93, "Feed", 23, weight=600)
    tabs(b, x + 4, y + 110, ["Global", "Following"], widths=[86, 102])
    b.icon(x + 352, y + 124, "filter", size=18)
    b.rect(x + 16, y + 164, 358, 52, PANEL, EDGE, 4)
    b.avatar(x + 28, y + 175, 28)
    b.text(x + 69, y + 195, "Add a position thesis", 12, MUTED)
    b.icon(x + 340, y + 182, "plus", BRAND)
    b.rect(x + 16, y + 232, 358, 220, PANEL, EDGE, 6)
    b.avatar(x + 32, y + 248, 32)
    b.text(x + 76, y + 263, "solsurfer", 13, weight=600)
    b.text(x + 76, y + 282, "Bought · 2m", 11, UP)
    b.text(x + 32, y + 314, "2.40 SOL of WIF", 18, weight=600)
    b.logo(x + 32, y + 331, "wif", 30)
    b.text(x + 74, y + 350, "WIF", 12, weight=600)
    b.text(x + 32, y + 388, "Since first buy", 11, MUTED)
    b.text(x + 358, y + 388, "+12.4%", 12, UP, mono=True, anchor="end")
    b.icon(x + 32, y + 416, "heart")
    b.text(x + 55, y + 430, "18", 11, MUTED)
    b.icon(x + 94, y + 416, "comment")
    b.text(x + 117, y + 430, "4", 11, MUTED)
    b.text(x + 204, y + 430, "Replay", 11, BRAND)
    b.btn(x + 264, y + 400, 94, "Buy WIF", h=44)
    b.rect(x + 16, y + 468, 358, 270, PANEL, EDGE, 6)
    b.avatar(x + 32, y + 486, 32, 1)
    b.text(x + 76, y + 501, "theta", 13, weight=600)
    b.text(x + 76, y + 520, "Thesis · Holding · 6m", 11, MUTED)
    b.text(x + 32, y + 556, "Watching the higher lows on JUP.", 13)
    b.text(x + 32, y + 579, "I want the range to hold before", 13)
    b.text(x + 32, y + 602, "adding to the position.", 13)
    b.logo(x + 32, y + 621, "jup", 30)
    b.text(x + 74, y + 642, "3.25 SOL", 12, mono=True)
    b.text(x + 358, y + 642, "+12.4%", 12, UP, mono=True, anchor="end")
    b.line(x + 32, y + 674, x + 358, y + 674)
    b.icon(x + 32, y + 698, "heart")
    b.text(x + 55, y + 712, "32", 11, MUTED)
    b.icon(x + 94, y + 698, "comment")
    b.text(x + 117, y + 712, "8", 11, MUTED)
    b.text(x + 358, y + 712, "2 older", 11, BRAND, anchor="end")
    x = 457
    b.text(x + 16, y + 93, "Pulse", 23, weight=600)
    tabs(b, x + 4, y + 110, ["New 24", "Final stretch 8", "Migrated 16"], 0, [100, 136, 138])
    b.btn(x + 16, y + 164, 180, "Quick buy: 0.10 SOL", h=44)
    b.icon(x + 270, y + 178, "pause", size=18)
    b.icon(x + 340, y + 178, "filter", size=18)
    for i, (token, name, cap, prog) in enumerate([("pump", "Pump", "$8.2K", "12%"), ("bonk", "Bonk", "$12.7K", "24%")]):
        cy = y + 228 + i * 252
        b.rect(x + 16, cy, 358, 236, PANEL, EDGE, 6)
        b.logo(x + 32, cy + 18, token, 40)
        b.text(x + 86, cy + 36, name, 14, weight=600)
        b.text(x + 86, cy + 56, "7xKp…pump", 10, MUTED, mono=True)
        b.text(x + 358, cy + 32, "12s", 10, MUTED, anchor="end")
        b.text(x + 32, cy + 96, "Market cap", 11, MUTED)
        b.text(x + 358, cy + 96, cap, 13, mono=True, anchor="end")
        b.text(x + 32, cy + 124, "Volume 24h", 11, MUTED)
        b.text(x + 358, cy + 124, "$2.4K", 13, mono=True, anchor="end")
        b.rect(x + 32, cy + 145, 326, 3, EDGE)
        b.rect(x + 32, cy + 145, 50, 3, BRAND)
        b.text(x + 32, cy + 168, "Bonding curve", 10, MUTED)
        b.text(x + 358, cy + 168, prog, 10, BRAND, anchor="end")
        b.btn(x + 32, cy + 180, 326, "Buy 0.10 SOL", h=44)
    x = 882
    b.avatar(x + 16, y + 76, 52)
    b.text(x + 82, y + 98, "solsurfer", 20, weight=600)
    b.text(x + 82, y + 122, "48mi…m54P", 10, MUTED, mono=True)
    b.text(x + 16, y + 166, "Patient entries. Clear exits.", 13)
    b.text(x + 16, y + 195, "1,284 followers · 86 following · 3 mutuals", 11, MUTED)
    b.btn(x + 16, y + 217, 358, "Following", h=44)
    tabs(b, x + 4, y + 277, ["24H", "7D", "30D"], 1, [72, 72, 72])
    for i, (label, value, color) in enumerate([("Realized PnL", "+18.42 SOL", UP), ("Unrealized PnL", "−0.86 SOL", DOWN), ("Win rate", "62.5%", FG), ("Avg hold", "4h 12m", FG)]):
        xx, cy = x + 16 + (i % 2) * 188, y + 346 + (i // 2) * 81
        b.text(xx, cy, label, 11, MUTED)
        b.text(xx, cy + 29, value, 20, color, 600, mono=True)
    tabs(b, x + 4, y + 495, ["Positions", "Activity", "Theses"], 0, [114, 106, 106])
    b.text(x + 16, y + 570, "Open", 12, BRAND, 600)
    b.text(x + 87, y + 570, "Closed", 12, MUTED)
    for i, (token, value, pnl) in enumerate([("wif", "3.84 SOL", "+0.48 SOL"), ("jup", "3.25 SOL", "+0.40 SOL")]):
        cy = y + 591 + 76 * i
        b.line(x + 16, cy, x + 374, cy)
        b.logo(x + 16, cy + 18, token, 34)
        b.text(x + 62, cy + 33, token.upper(), 12, weight=600)
        b.text(x + 62, cy + 51, "View position", 10, MUTED)
        b.text(x + 358, cy + 31, value, 12, mono=True, anchor="end")
        b.text(x + 358, cy + 51, pnl, 11, UP, mono=True, anchor="end")
    for x, active in [(32, "Feed"), (457, "Pulse"), (882, "Feed")]:
        mobile_nav(b, x, yy, active)
    b.text(32, 995, "Feed: no side rail", 11, MUTED)
    b.text(457, 995, "Pulse: one lifecycle column at a time", 11, MUTED)
    b.text(882, 995, "Profile: compact, stacked performance", 11, MUTED)
    b.save("06-mobile")


def social_detail():
    b = Board("Agele — position thesis composer, thread and feed filters")
    b.text(40, 55, "One task at a time", 25, weight=600)
    b.text(40, 84, "Position-attached theses · threaded discussion · remembered feed filters", 13, MUTED)
    x, y, w = 40, 133, 420
    b.rect(x, y, w, 658, PANEL, EDGE, 6)
    b.text(x + 24, y + 39, "Add thesis", 19, weight=600)
    b.icon(x + w - 42, y + 23, "close")
    b.text(x + 24, y + 76, "Position", 11, MUTED)
    b.rect(x + 24, y + 91, w - 48, 68, BG, EDGE, 4)
    b.logo(x + 38, y + 109, "jup", 32)
    b.text(x + 82, y + 119, "JUP · Open position", 12, weight=600)
    b.text(x + 82, y + 141, "3.25 SOL · +12.4%", 11, UP, mono=True)
    b.icon(x + w - 52, y + 116, "chevron")
    b.rect(x + 24, y + 179, w - 48, 246, BG, "#596474", 4)
    b.text(x + 40, y + 209, "Watching the higher lows on JUP.", 13)
    b.text(x + 40, y + 232, "Volume is building, but I want to", 13)
    b.text(x + 40, y + 255, "see the range hold before adding.", 13)
    b.text(x + w - 40, y + 408, "112 / 3,000", 10, MUTED, mono=True, anchor="end")
    b.text(x + 24, y + 457, "Public · attached to this position", 11, MUTED)
    b.rect(x + 24, y + 483, 16, 16, BG, "#596474", 3)
    b.text(x + 50, y + 496, "Pin this update", 12)
    b.text(x + 24, y + 542, "New updates keep your earlier thesis history.", 11, MUTED)
    b.btn(x + 24, y + 585, w - 48, "Publish thesis", primary=True, h=44)
    b.text(x, y + 692, "No open position: replace editor with Choose a position.", 11, MUTED)
    x, w = 488, 488
    b.rect(x, y, w, 740, PANEL, EDGE, 6)
    b.text(x + 24, y + 39, "Thesis", 19, weight=600)
    b.icon(x + w - 42, y + 23, "close")
    b.avatar(x + 24, y + 64, 34, 1)
    b.text(x + 70, y + 79, "theta", 13, weight=600)
    b.text(x + 70, y + 100, "Pinned · 6m ago", 11, MUTED)
    b.text(x + 24, y + 142, "Watching the higher lows on JUP.", 14)
    b.text(x + 24, y + 165, "I want the range to hold before adding.", 14)
    b.logo(x + 24, y + 187, "jup", 30)
    b.text(x + 67, y + 207, "JUP · 3.25 SOL · +12.4%", 12, UP)
    b.text(x + 24, y + 254, "2 older updates", 11, BRAND, 600)
    b.icon(x + 24, y + 279, "heart")
    b.text(x + 49, y + 292, "32", 11, MUTED)
    b.text(x + 106, y + 292, "8 comments", 11, MUTED)
    b.line(x + 24, y + 316, x + w - 24, y + 316)
    b.avatar(x + 24, y + 338, 28)
    b.text(x + 64, y + 351, "solsurfer", 12, weight=600)
    b.text(x + 64, y + 376, "What’s your invalidation level?", 12)
    b.text(x + 64, y + 404, "Reply", 11, MUTED)
    b.icon(x + 128, y + 391, "heart", size=14)
    b.line(x + 52, y + 425, x + 52, y + 519)
    b.avatar(x + 70, y + 432, 26, 1)
    b.text(x + 108, y + 445, "theta · Author", 11, BRAND, 600)
    b.text(x + 108, y + 470, "Below the prior range low.", 12)
    b.text(x + 108, y + 497, "Reply", 11, MUTED)
    b.text(x + 24, y + 560, "Load older comments", 11, BRAND)
    b.rect(x + 24, y + 593, w - 48, 72, BG, "#596474", 4)
    b.text(x + 40, y + 622, "Add a comment…", 12, MUTED)
    b.text(x + w - 40, y + 650, "0 / 200", 10, MUTED, mono=True, anchor="end")
    b.btn(x + w - 128, y + 679, 104, "Comment", h=40)
    x, w = 1004, 396
    b.rect(x, y, w, 600, PANEL, EDGE, 6)
    b.text(x + 24, y + 39, "Feed filters", 19, weight=600)
    b.icon(x + w - 42, y + 23, "close")
    for i, (label, value) in enumerate([("Minimum trade size", "All sizes"), ("Trader portfolio size", "Any portfolio"), ("Market cap range", "No minimum — No maximum"), ("Activity", "Trades · Theses · Closed positions")]):
        cy = y + 83 + i * 97
        b.text(x + 24, cy, label, 11, MUTED)
        b.rect(x + 24, cy + 15, w - 48, 44, BG, "#596474", 4)
        b.text(x + 40, cy + 42, value, 11)
    b.text(x + 24, y + 497, "Saved on this device", 11, MUTED)
    b.btn(x + 24, y + 532, 100, "Reset", h=44)
    b.btn(x + 136, y + 532, w - 160, "Apply filters", primary=True, h=44)
    b.text(x, y + 638, "Controls use the backend’s supported filter set.", 11, MUTED)
    b.save("07-thesis-thread-filters")


def mobile_replay():
    b = Board("Agele — replay on a 390px mobile viewport", 390, 844)
    mobile_shell(b, 0, 0)
    b.text(16, 86, "solsurfer / WIF", 12, MUTED)
    b.logo(16, 105, "wif", 36)
    b.text(64, 129, "WIF position", 20, weight=600)
    b.badge(302, 110, "Closed", MUTED, 72)
    b.text(16, 175, "Replay · 3 / 6 fills", 12, BRAND, 600)
    b.text(374, 175, "SOL", 11, MUTED, anchor="end")
    b.rect(16, 193, 358, 235, PANEL, EDGE, 6)
    for i in range(4):
        b.line(28, 219 + i * 46, 360, 219 + i * 46, "#1C222B")
    b.add(f'<path d="M28 365 47 355 66 361 85 337 104 348 123 320 142 329 161 302 180 316 199 288 218 305 237 270" fill="none" stroke="{BRAND}" stroke-width="2"/>')
    b.add('<path d="m237 270 19 14 19-31 19 12 19-30 19 8 19-23" fill="none" stroke="#414A56" stroke-width="2"/>')
    b.line(237, 207, 237, 386, BRAND)
    for x, y, s, c in [(47, 372, "B1", UP), (142, 347, "B2", UP), (237, 291, "S3", DOWN)]:
        b.circle(x, y, 12, BG)
        b.text(x, y + 4, s, 9, c, 600, anchor="middle")
    b.text(28, 410, "14:00", 10, MUTED, mono=True)
    b.text(360, 410, "15:30 UTC", 10, MUTED, mono=True, anchor="end")
    b.icon(20, 451, "replay", size=18)
    b.icon(64, 451, "previous", size=18)
    b.icon(108, 451, "play", BRAND, size=18)
    b.icon(152, 451, "chevron", size=18)
    b.rect(194, 458, 108, 3, EDGE)
    b.rect(194, 458, 43, 3, BRAND)
    b.circle(237, 459, 5, BRAND)
    b.text(362, 464, "1×", 12, anchor="end")
    b.text(16, 510, "At selected fill", 12, MUTED)
    b.text(16, 544, "3.84 SOL", 23, weight=600, mono=True)
    b.text(374, 544, "+0.12 SOL", 18, UP, mono=True, anchor="end")
    b.text(16, 568, "Position value", 10, MUTED)
    b.text(374, 568, "Realized so far", 10, MUTED, anchor="end")
    tabs(b, 4, 594, ["Fills", "Thesis", "Comments"], 0, [84, 98, 120])
    b.rect(16, 648, 358, 65, "#171F1C", EDGE, 4)
    b.text(32, 674, "03  Sell · 0.80 SOL", 12, DOWN, 600)
    b.text(32, 698, "21 Nov · 14:32:08 UTC", 10, MUTED, mono=True)
    b.icon(338, 672, "chevron", BRAND)
    b.rect(0, 738, 390, 106, PANEL)
    b.line(0, 738, 390, 738)
    b.btn(16, 754, 112, "Share", h=44)
    b.btn(140, 754, 234, "Buy WIF", primary=True, h=44)
    b.text(195, 827, "Historical playback · Demo", 10, MUTED, anchor="middle")
    b.save("08-mobile-replay")


def continuations():
    b = Board("Agele — P1 leaderboard, holders and notifications")
    b.text(40, 55, "Social context, where you need it", 25, weight=600)
    b.text(40, 84, "P1 layouts · the backend contract controls availability · no dead tabs in the product", 13, MUTED)
    y, w = 132, 432
    for x in [40, 504, 968]:
        b.rect(x, y, w, 744, PANEL, EDGE, 6)
    x = 40
    b.text(x + 24, y + 40, "Leaderboard", 20, weight=600)
    tabs(b, x + 12, y + 61, ["Traders", "Positions"], 0, [106, 114])
    tabs(b, x + 12, y + 108, ["24H", "7D", "30D", "All"], 1, [76, 76, 76, 76])
    b.text(x + 24, y + 183, "Ranked by total PnL · 7D", 11, MUTED)
    b.rect(x + 24, y + 205, w - 48, 62, "#232830", r=4)
    b.text(x + 40, y + 231, "#142", 13, BRAND, 600, mono=True)
    b.text(x + 111, y + 231, "You", 12, weight=600)
    b.text(x + w - 40, y + 231, "+2.18 SOL", 12, UP, mono=True, anchor="end")
    b.text(x + 111, y + 252, "Your rank in this window", 10, MUTED)
    for i, (who, pnl, tokens) in enumerate([("solsurfer", "+18.42 SOL", ["wif", "jup"]), ("theta", "+14.68 SOL", ["jup", "sol"]), ("lowcap_larry", "+11.04 SOL", ["bonk", "pump"])]):
        cy = y + 296 + i * 100
        b.text(x + 24, cy + 25, str(i + 1), 12, WARN, 600, mono=True)
        b.avatar(x + 55, cy + 7, 30, i)
        b.text(x + 98, cy + 21, who, 12, weight=600)
        b.logo(x + 98, cy + 37, tokens[0], 18)
        b.logo(x + 122, cy + 37, tokens[1], 18)
        b.text(x + w - 24, cy + 27, pnl, 12, UP, mono=True, anchor="end")
        b.line(x + 24, cy + 79, x + w - 24, cy + 79)
    b.btn(x + 24, y + 643, w - 48, "Following only", h=44)
    b.text(x + 24, y + 717, "Tap trader for profile · tap position for replay", 10, MUTED)
    x = 504
    b.logo(x + 24, y + 20, "jup", 32)
    b.text(x + 68, y + 42, "JUP", 20, weight=600)
    tabs(b, x + 12, y + 61, ["Holders", "Feed", "About"], 0, [104, 80, 88])
    b.text(x + 24, y + 133, "Holders", 14, weight=600)
    b.text(x + w - 24, y + 133, "Following", 11, BRAND, anchor="end")
    for i, (who, value, hold, thesis) in enumerate([("theta", "3.25 SOL", "4h 12m", "Watching the higher lows on JUP."), ("solsurfer", "1.68 SOL", "2h 41m", "Waiting for the range reclaim.")]):
        cy = y + 158 + i * 194
        b.line(x + 24, cy, x + w - 24, cy)
        b.avatar(x + 24, cy + 20, 30, i + 1)
        b.text(x + 66, cy + 35, who, 12, weight=600)
        b.text(x + w - 24, cy + 35, value, 12, mono=True, anchor="end")
        b.text(x + 66, cy + 56, "Avg hold " + hold, 10, MUTED)
        b.rect(x + 66, cy + 76, w - 90, 91, BG, EDGE, 4)
        b.text(x + 80, cy + 101, "Thesis · 6m ago", 10, MUTED)
        b.text(x + 80, cy + 126, thesis, 11)
        b.text(x + 80, cy + 151, "8 comments", 10, BRAND)
    b.text(x + 24, y + 624, "Thesis age and context stay with the holder.", 11, MUTED)
    b.text(x + 24, y + 650, "Team tag only when verified by the API.", 11, MUTED)
    x = 968
    b.text(x + 24, y + 40, "Notifications", 20, weight=600)
    b.icon(x + w - 42, y + 23, "close")
    b.text(x + 24, y + 91, "Today", 12, weight=600)
    for i, (who, action, when) in enumerate([("solsurfer", "bought WIF", "2m"), ("theta", "liked your JUP thesis", "12m"), ("lowcap_larry + 3", "started following you", "1h")]):
        cy = y + 116 + i * 108
        b.circle(x + 15, cy + 21, 3, BRAND)
        b.avatar(x + 28, cy + 4, 32, i)
        b.text(x + 74, cy + 18, who, 12, weight=600)
        b.text(x + 74, cy + 42, action, 12)
        b.text(x + 74, cy + 64, when + " ago", 10, MUTED)
        b.line(x + 24, cy + 87, x + w - 24, cy + 87)
    b.text(x + 24, y + 469, "This week", 12, weight=600)
    b.text(x + 24, y + 511, "Your thesis has 8 new comments", 12)
    b.text(x + 24, y + 536, "JUP · 2d ago", 10, MUTED)
    b.btn(x + 24, y + 643, w - 48, "Notification settings", h=44)
    b.text(x + 24, y + 717, "Alerts open context. They never place a trade.", 10, MUTED)
    b.save("09-social-continuations")


def states():
    b = Board("Agele — loading, empty, stale and error states")
    b.text(40, 55, "Keep the structure. Tell the truth.", 25, weight=600)
    b.text(40, 84, "The same states apply in demo and indexed mode. Financial values never appear until returned by the API.", 13, MUTED)
    for x, y, title in [(40, 137, "01 · Initial feed loading"), (740, 137, "02 · Following is empty"), (40, 538, "03 · Pulse connection lost"), (740, 538, "04 · Publish rejected")]:
        b.text(x, y, title, 13, weight=600)
        b.rect(x, y + 20, 660, 324, PANEL, EDGE, 6)
    for yy in [181, 303]:
        b.circle(80, yy + 22, 18, "#232830")
        b.rect(112, yy + 7, 130, 9, "#232830", r=3)
        b.rect(112, yy + 27, 70, 8, "#232830", r=3)
        b.rect(64, yy + 62, 555, 10, "#232830", r=3)
        b.rect(64, yy + 86, 340, 10, "#232830", r=3)
    b.text(64, 455, "Shape-matched, non-interactive skeletons", 11, MUTED)
    b.text(772, 233, "Your people, your feed", 23, weight=600)
    b.text(772, 270, "Follow traders to see their trades and theses here.", 13, MUTED)
    b.btn(772, 301, 168, "Discover traders", primary=True, h=44)
    b.text(772, 414, "Signed out: Sign in to follow traders", 12, MUTED)
    b.text(772, 441, "Sign-in unconfigured: Sign-in unavailable", 12, MUTED)
    b.badge(64, 583, "Reconnecting", WARN, 122)
    b.text(64, 633, "Showing the last update from 14:32 UTC.", 14)
    b.text(64, 663, "Live ranking is paused. Your current view stays in place.", 12, MUTED)
    b.btn(64, 692, 112, "Reconnect", h=44)
    b.text(64, 786, "No snapshot yet: Pulse unavailable + Retry", 12, MUTED)
    b.text(64, 815, "Never replace an API error with browser demo tokens.", 11, MUTED)
    b.text(772, 612, "Your draft is still here", 21, weight=600)
    b.text(772, 649, "This update couldn’t be published. Edit it and try again.", 12, DOWN)
    b.text(772, 678, "Use the server’s safe moderation reason when available.", 12, MUTED)
    b.btn(772, 710, 164, "Back to draft", h=44)
    b.text(772, 796, "Rate limited: Try again in 30s (server-provided wait)", 11, MUTED)
    b.text(772, 825, "Closed >3h: keep history readable; remove update action.", 11, MUTED)
    b.save("10-states")


if __name__ == "__main__":
    feed()
    profile()
    pulse()
    replay()
    share()
    mobile()
    social_detail()
    mobile_replay()
    continuations()
    states()
