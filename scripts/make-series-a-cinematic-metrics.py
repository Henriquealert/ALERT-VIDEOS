"""Advance widths (em) of the faces "Series A, sorted." justifies, so each builder line can be sized
to fill the frame width exactly. Read from the supplied brand font files; kerning is not applied
(the video sets font-kerning: none to match).

Run (fonttools): python3 scripts/make-series-a-cinematic-metrics.py
Writes src/videos/series-a-cinematic-metrics.json.
"""

import json

from fontTools.ttLib import TTFont

FACES = {
    "sansBold": "public/fonts/DM Sans/static/DMSans-Bold.ttf",
    "statement": "public/fonts/Archivo Narrow/static/ArchivoNarrow-BoldItalic.ttf",
    "numeral": "public/fonts/Archivo Narrow/static/ArchivoNarrow-Bold.ttf",
    "serifItalic": "public/fonts/Instrument Serif/InstrumentSerif-Italic.ttf",
}
CHARS = "".join(chr(c) for c in range(32, 127)) + "·—ñçêéáíóúãõÑÇÊ"

out = {}
for name, path in FACES.items():
    font = TTFont(path)
    upm = font["head"].unitsPerEm
    cmap = font.getBestCmap()
    hmtx = font["hmtx"]
    os2 = font["OS/2"]
    out[name] = {
        "cap": round(os2.sCapHeight / upm, 4),
        "adv": {ch: round(hmtx[cmap[ord(ch)]][0] / upm, 4) for ch in CHARS if ord(ch) in cmap},
    }
with open("src/videos/series-a-cinematic-metrics.json", "w") as f:
    json.dump(out, f, ensure_ascii=False)
print({k: (v["cap"], len(v["adv"])) for k, v in out.items()})
