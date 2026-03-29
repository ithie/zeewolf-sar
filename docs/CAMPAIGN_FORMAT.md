# Campaign Format

Campaigns are stored as JSON in `src/game/campaigns/`. Each file contains one campaign with one or more mission levels. New campaigns saved via the Mission Editor are automatically registered in `src/game/main.ts`.

## Top-level Structure

```json
{
  "type": "tutorial",
  "campaignTitle": "TUTORIAL",
  "campaignSublines": ["Erste Flugversuche"],
  "music": {
    "briefing": "main",
    "ingame": "tutorial"
  },
  "levels": [ ... ]
}
```

| Field              | Type     | Description                                           |
| ------------------ | -------- | ----------------------------------------------------- |
| `type`             | string   | Internal identifier (used for routing)                |
| `campaignTitle`    | string   | Displayed title on the campaign select screen         |
| `campaignSublines` | string[] | Subtitle lines shown below the title                  |
| `music`            | object   | Optional. Per-campaign music assignments (see below)  |
| `levels`           | array    | Ordered list of mission levels                        |

---

## Music

The optional `music` field assigns songs to specific campaign phases. Both sub-fields are optional; if omitted, the current music simply continues playing.

```json
"music": {
  "briefing": "main",
  "ingame": "tutorial"
}
```

| Field      | Type   | Description                                                    |
| ---------- | ------ | -------------------------------------------------------------- |
| `briefing` | string | Song key to start when the mission briefing screen is shown    |
| `ingame`   | string | Song key to start when the mission itself begins               |

Song keys correspond to filenames (without `.json`) in `src/game/music/`. The Workbench Campaign Editor exposes dropdowns for both fields.

---

## Level

Each entry in `levels` describes one playable mission.

```json
{
  "headline":    "Erste Flugversuche",
  "briefing":    "Rette alle Überlebenden.",
  "gridSize":    100,
  "terrain":     "...",
  "spawnObject": "pad",
  "objects":     [ ... ],
  "payloads":    [ ... ],
  "foliage":     [ ... ],
  "rain":        false,
  "night":       false,
  "windDir":     90,
  "windStr":     1,
  "windVar":     false
}
```

| Field         | Type    | Description                                                   |
| ------------- | ------- | ------------------------------------------------------------- |
| `headline`    | string  | Mission title shown in briefing                               |
| `briefing`    | string  | Briefing text                                                 |
| `gridSize`    | number  | Width and height of the terrain grid in tiles                 |
| `terrain`     | string  | Run-length encoded elevation data (see below)                 |
| `spawnObject` | string  | Where the helicopter spawns: `"pad"` or `"carrier"`           |
| `objects`     | array   | Placed scene objects (pads, carriers, boats, lighthouses)     |
| `payloads`    | array   | Rescue targets (persons or crates)                            |
| `foliage`     | array   | Decorative vegetation                                         |
| `rain`        | boolean | Rain effect active                                            |
| `night`       | boolean | Night mode active                                             |
| `windDir`     | number  | Wind direction in degrees (0 = North, 90 = East)              |
| `windStr`     | number  | Wind strength (0 = calm, higher = stronger)                   |
| `windVar`     | boolean | Randomly varying wind                                         |

---

## Terrain Encoding

The `terrain` field is a run-length encoded string representing a flat array of elevation values, row by row (left to right, top to bottom). The full array has `gridSize × gridSize` entries.

**Encoding rules:**

- A plain number, e.g. `97`, represents a single tile with that elevation.
- `3x97` means the value `97` repeated 3 times.
- `-10x5` means the value `-10` repeated 5 times. Negative values mark water or void tiles.

**Example (decoded excerpt):** `3x97,-10x4` → `[97, 97, 97, -10, -10, -10, -10]`

---

## Objects

### Rescue Pad

```json
{ "type": "pad", "x": 15, "y": 20 }
```

Landing and spawn point for the helicopter.

### Carrier

```json
{
  "type":   "carrier",
  "x":      40,
  "y":      60,
  "angle":  0,
  "path":   "circle",
  "speed":  0.5,
  "radius": 15
}
```

| Field    | Type   | Description                                          |
| -------- | ------ | ---------------------------------------------------- |
| `x`, `y` | number | Starting grid position                               |
| `angle`  | number | Initial heading in degrees                           |
| `path`   | string | Movement pattern: `"circle"` · `"straight"` · `"static"` |
| `speed`  | number | Movement speed                                       |
| `radius` | number | Circle radius (for `"circle"` path)                  |

### Boat

Same fields as Carrier. Boats are smaller vessels and do not serve as spawn points.

### Lighthouse

```json
{ "type": "lighthouse", "x": 10, "y": 25 }
```

Static decorative/navigational object.

---

## Payloads

Rescue targets the player must winch up and deliver.

```json
{ "type": "person", "x": 27, "y": 30 }
```

| Field    | Type   | Values              |
| -------- | ------ | ------------------- |
| `type`   | string | `"person"` · `"crate"` |
| `x`, `y` | number | Grid position       |

---

## Foliage

Decorative vegetation, not interactable.

```json
{ "x": 12, "y": 18, "s": 1.2, "type": "tree" }
```

| Field    | Type   | Description         |
| -------- | ------ | ------------------- |
| `x`, `y` | number | Grid position       |
| `s`      | number | Scale factor        |
| `type`   | string | Vegetation type     |
