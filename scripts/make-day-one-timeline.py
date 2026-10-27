"""Builds src/videos/day-one-timeline.json: scene lengths and on-screen event frames for
"Day One, Sorted.", anchored to word times in the two voiceover takes (ElevenLabs Scribe
transcript, 23 Oct 2026). The video code and scripts/make-day-one-audio.py both read the JSON.

Run: python3 scripts/make-day-one-timeline.py
"""

import json

FPS = 24

# Word start times (s) in each take, from the transcript.
FULL_WORDS = {
    "new": 0.08, "no_laptop": 3.52, "no_login": 4.44, "no_idea": 5.36, "then": 7.02,
    "mac": 8.36, "how_many": 9.36, "copilot_q": 11.60, "wifi_q": 12.92, "password_end": 15.02,
    "one_founder": 15.58, "every_tab": 16.60, "open_end": 17.52,
    "laptops_from": 18.00, "licences_from": 19.32, "wifi_from": 20.54, "security": 22.34, "list_end": 24.42,
    "or_make": 24.84, "tell_us": 26.90, "we_quote": 28.04, "dell": 29.20, "m365": 30.56, "copilot": 32.12,
    "ubiquiti": 32.86, "fortinet": 34.06, "one_quote": 35.40, "sourced": 37.26, "configured": 38.80,
    "licences_assigned": 39.52, "certiport": 40.68, "set_up": 42.20, "in_english": 43.86,
    "your_new_hire": 46.14, "you_get_back": 48.32, "hardware": 49.70, "sorted": 51.70, "request": 52.40,
    "url_end": 54.66,
}
FEED_WORDS = {  # second take, start times shifted by its 56.8 s offset in the transcribed file
    k: round(v - 56.8, 2)
    for k, v in {
        "new": 56.90, "nothings": 58.66, "mac": 59.78, "how_many": 60.72, "copilot_q": 61.78, "cooked": 62.96,
        "one_founder": 64.14, "every_tab": 65.12, "or_one_call": 66.54, "laptops": 68.42, "m365": 69.06,
        "copilot": 70.48, "wifi": 71.12, "security": 71.64, "on_one_quote": 72.38, "configured": 73.52,
        "licences_assigned": 74.22, "training": 75.32, "in_english": 76.20, "so_you": 78.32, "hardware": 79.78,
        "sorted": 81.68, "request": 82.40,
    }.items()
}


def build(words, offset, scenes):
    """scenes: list of (id, start_s). Returns frames per scene and a local-frame helper."""
    t = lambda key: words[key] + offset
    starts = [s for _, s in scenes]
    total = scenes[-1][1]
    lens = []
    for i, (sid, s) in enumerate(scenes[:-1]):
        lens.append([sid, round(scenes[i + 1][1] * FPS) - round(s * FPS)])
    start_of = {sid: s for sid, s in scenes}
    local = lambda sid, key, nudge=0.0: max(0, round((t(key) + nudge - start_of[sid]) * FPS))
    return lens, local


def full():
    O = 0.5
    scenes = [("hook", 0), ("desk", 3.75), ("chaos", 7.25), ("tabs", 16.0), ("tangle", 18.3), ("fix", 25.25),
              ("resolve", 46.5), ("end", 50.0), ("_", 60.0)]
    lens, L = build(FULL_WORDS, O, scenes)
    return {
        "voOffset": O,
        "scenes": lens,
        "hook": {"crumble": 66},
        "desk": [[L("desk", "no_laptop"), "No laptop"], [L("desk", "no_login"), "No login"], [L("desk", "no_idea"), "No idea who to call"]],
        "chaos": {
            # Who ordered, Mac or Windows, How many M365, Wi-Fi password, Copilot, Which vendor
            "main": [L("chaos", "then"), L("chaos", "mac"), L("chaos", "how_many"), L("chaos", "wifi_q"), L("chaos", "copilot_q"), L("chaos", "wifi_q", 0.7)],
            "flood": [L("chaos", "wifi_q", 1.0), L("chaos", "password_end", 0.2)],
            "cooked": L("chaos", "password_end", 0.45),
        },
        "tabs": {"drag": [L("tabs", "every_tab"), L("tabs", "open_end")]},
        "tangle": [[L("tangle", "laptops_from"), "Laptops here"], [L("tangle", "licences_from"), "Licences there"],
                   [L("tangle", "wifi_from"), "Wi-Fi? Whoever picks up"], [L("tangle", "security"), "Security and training: still on the list"]],
        "fix": {
            "headlines": [[L("fix", "or_make"), "One call to Alert"], [L("fix", "one_quote"), "One quote. One supplier"],
                          [L("fix", "set_up"), "Set up, not just shipped"], [L("fix", "in_english"), "English, Spanish or Portuguese"]],
            "message": L("fix", "tell_us"),
            "quote": L("fix", "we_quote"),
            "rows": [L("fix", k) for k in ("dell", "m365", "copilot", "ubiquiti", "fortinet", "one_quote")],
            "checklist": L("fix", "one_quote", 1.2),
            "ticks": [L("fix", k) for k in ("sourced", "configured", "licences_assigned", "certiport")],
            "ready": L("fix", "in_english", 1.0),
        },
        "resolve": {"snap": 2, "blocks": 12, "arrow": 30,
                    "lines": [[L("resolve", "your_new_hire"), "Logged in on day one"], [L("resolve", "you_get_back"), "Back to building"]]},
        "end": {"head": 4, "sorted": L("end", "sorted"), "cta": L("end", "request"), "url": L("end", "request", 0.8)},
    }


def feed():
    O = 0.4
    scenes = [("hook", 0), ("chaos", 3.2), ("tabs", 7.5), ("fix", 9.6), ("resolve", 21.6), ("end", 23.4), ("_", 30.0)]
    lens, L = build(FEED_WORDS, O, scenes)
    return {
        "voOffset": O,
        "scenes": lens,
        "hook": {"crumble": 56},
        "desk": [],
        "chaos": {
            "main": [L("chaos", "mac", 0.5), L("chaos", "mac"), L("chaos", "how_many"), L("chaos", "copilot_q", 0.5), L("chaos", "copilot_q"), L("chaos", "copilot_q", 0.75)],
            "flood": [L("chaos", "copilot_q", 0.8), L("chaos", "cooked", -0.1)],
            "cooked": L("chaos", "cooked"),
        },
        "tabs": {"drag": [L("tabs", "every_tab"), L("tabs", "every_tab", 0.8)]},
        "tangle": [],
        "fix": {
            "headlines": [[L("fix", "or_one_call"), "One call to Alert"], [L("fix", "on_one_quote"), "One quote. One supplier"],
                          [L("fix", "in_english"), "English, Spanish or Portuguese"]],
            "message": 0,
            "quote": L("fix", "laptops", -0.4),
            "rows": [L("fix", "laptops"), L("fix", "m365"), L("fix", "copilot"), L("fix", "wifi"), L("fix", "security"), L("fix", "on_one_quote")],
            "checklist": L("fix", "on_one_quote", 0.6),
            "ticks": [L("fix", "configured", -0.3), L("fix", "configured"), L("fix", "licences_assigned"), L("fix", "training")],
            "ready": L("fix", "in_english", 0.5),
        },
        "resolve": {"snap": 1, "blocks": 7, "arrow": 14, "lines": [[L("resolve", "so_you"), "Back to building"]]},
        "end": {"head": 4, "sorted": L("end", "sorted"), "cta": L("end", "request"), "url": L("end", "request", 0.6)},
    }


out = {"fps": FPS, "full": full(), "feed": feed()}
for cut in ("full", "feed"):
    total = sum(n for _, n in out[cut]["scenes"])
    print(cut, total, out[cut]["scenes"])
with open("src/videos/day-one-timeline.json", "w") as f:
    json.dump(out, f, indent=1)
print(json.dumps(out["full"]["fix"]), json.dumps(out["feed"]["fix"]))
