# DEF — Decoupled Element Facets

A declarative, renderer-agnostic way to describe 3D isometric objects as ordered sets of flat polygon faces.

---

## Motivation

The traditional approach in this codebase used imperative `draw*()` functions that mixed geometry, color, and rendering logic. DEF separates **what an object looks like** (geometry + colors) from **how it is rendered** (projection, depth sorting, camera).

---

## Face Schema

```typescript
interface DEFFace {
    id: string; // unique within the DEF
    verts: [number, number, number][]; // local [x, y, z] coords
    color: string; // CSS color, including rgba()
    stroke?: string; // optional outline color
    strokeWidth?: number; // default: 1
    normal?: [number, number]; // [nx, ny] for backface culling
}
```

### Coordinate System

- `+X` = object's nose / forward direction
- `+Y` = object's left side
- `+Z` = up
- Origin = object center at ground level (z=0)

### Backface Culling via `normal`

If a face has a `normal: [nx, ny]`, it is skipped when that normal points away from the isometric camera. The camera looks from the `+X+Y` direction, so faces with `nx + ny > 0` **face the camera and are visible**; faces with `nx + ny ≤ 0` face away and are culled.

For rotating objects the normal is rotated with the instance angle before the test, so culling is always relative to the object's current orientation.

Omit `normal` on top/bottom faces and faces that should always be visible.

### Hollow Objects and Double-Sided Walls

A wall that can be seen from **both sides** — for example, the interior of a building visible through an opening — requires **two faces with opposite normals**:

```javascript
// Exterior face — visible when camera is outside
{ id: 'wall_ext', normal: [-1, 0], verts: [...], color: '#ccc' },
// Interior face — visible when camera looks through the opening
{ id: 'wall_int', normal: [ 1, 0], verts: [...], color: '#aaa' },
```

At any camera angle exactly one of the pair passes the culling test. Closed objects (no openings) do not need interior faces because the interior is never visible.

---

## Collision Box Schema

```typescript
interface DEFCollisionBox {
    id: string;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number; // local z coords (world z offset added at render time)
}
```

---

## DEF Schema

```typescript
interface DEF {
    id: string;
    pivot: [number, number, number]; // local origin offset (usually [0,0,0])
    faces: DEFFace[];
    collisionBoxes?: DEFCollisionBox[];
}
```

### Face Ordering

Faces are drawn in **definition order** within an instance. Order them **back-to-front** for a fixed isometric camera (lower `local_x + local_y` first). For objects that rotate, order for the most common viewing angle.

There is **no per-face sort within an instance** — this is intentional to preserve manually tuned face order and avoid intra-object painter's algorithm failures at certain rotation angles.

---

## Instance Schema

```typescript
interface DEFInstance {
    x: number;      // world position
    y: number;
    z: number;      // world height offset (added to all face z coords)
    angle: number;  // rotation in radians around Z axis
    colors?: Record<string, string>; // face id → color override (see Palette System)
    drawFn?: (camX: number, camY: number) => void; // optional draw callback (see below)
}
```

---

## SceneRenderer API

```javascript
// Queue one instance for rendering.
// def may be null for drawFn-only entries (no geometry, just a depth-sorted callback).
SceneRenderer.add(def, { x, y, z, angle, colors?, drawFn? });

// Draw all queued instances (sorted back-to-front by instance centroid depth).
// Call once per frame, after all SceneRenderer.add() calls.
SceneRenderer.flush(camX, camY);

// Enable debug collision box outlines
SceneRenderer.debugCollision = true;
```

### Depth Sorting

Instances are sorted by their **centroid depth** (`world_x + world_y`). Faces within an instance maintain definition order. This works correctly for a fixed isometric camera.

---

## Color Override (Palette System)

To share a single DEF across objects that differ only in color, pass a `colors` map:

```javascript
SceneRenderer.add(PERSON_DEF, {
    x, y, z, angle,
    colors: { suit: '#ff6600', pants: '#ff6600' }, // face id → color override
});
```

Overrides only replace `color`, not `stroke`.

---

## Draw Callbacks (`drawFn`)

For elements that cannot be expressed as static geometry — animated parts, sprites, procedural shapes — attach a `drawFn` to the instance. It is called **after the instance's own faces**, depth-sorted alongside them in the same flush pass.

```javascript
SceneRenderer.add(HELI_DEF, {
    x, y, z, angle,
    drawFn: (cx, cy) => drawRotors(x, y, z, angle, rotorAngle, cx, cy),
});
SceneRenderer.flush(camX, camY);
```

`def` may be `null` when only the callback is needed (no geometry):

```javascript
SceneRenderer.add(null, {
    x, y, z: 0, angle: 0,
    drawFn: (cx, cy) => drawTree(x, y, cx, cy, scale, wind, type),
});
```

This keeps animated and sprite-based elements in the same depth-sorted pipeline as DEF geometry, without hard-coding draw order in the render loop.

---

## Cylinder Approximation

Circles and cylinders are approximated as n-sided polygons. Use `_cylFaces(radius, zBottom, zTop, color, stroke)` to generate side faces + top cap. **Use n ≥ 16** for objects where the circular shape is prominent. n=8 produces visibly angular results at large radii.

---

## Special Objects

Some elements are not expressed as static DEF geometry and use `drawFn` callbacks instead:

| Object                    | Reason                                                            |
| ------------------------- | ----------------------------------------------------------------- |
| Person (Survivor/Rescuer) | 2D screen-space sprite (`ctx.fillRect`, `ctx.arc`, pixel offsets) |
| Trees                     | Wind animation, procedural/organic shapes                         |
| Fuel Truck                | Tank uses a hybrid screen-space cylinder approximation            |
| Rotor blades              | Per-frame animated lines, not static geometry                     |

All of the above are attached as `drawFn` on their parent instance (or a null-DEF instance) so they participate in depth sorting.

---

## Example

```javascript
const EXAMPLE_DEF = {
    id: 'crate',
    pivot: [0, 0, 0],
    collisionBoxes: [{ id: 'body', xMin: -0.5, xMax: 0.5, yMin: -0.5, yMax: 0.5, zMin: 0, zMax: 1.0 }],
    faces: [
        // back faces first (lower x+y)
        {
            id: 'back',
            normal: [0, -1],
            verts: [
                [-0.5, -0.5, 0],
                [0.5, -0.5, 0],
                [0.5, -0.5, 1],
                [-0.5, -0.5, 1],
            ],
            color: '#8B6914',
        },
        {
            id: 'right',
            normal: [1, 0],
            verts: [
                [0.5, -0.5, 0],
                [0.5, 0.5, 0],
                [0.5, 0.5, 1],
                [0.5, -0.5, 1],
            ],
            color: '#A07820',
        },
        {
            id: 'left',
            normal: [-1, 0],
            verts: [
                [-0.5, 0.5, 0],
                [-0.5, -0.5, 0],
                [-0.5, -0.5, 1],
                [-0.5, 0.5, 1],
            ],
            color: '#7A5C10',
        },
        {
            id: 'front',
            normal: [0, 1],
            verts: [
                [0.5, 0.5, 0],
                [-0.5, 0.5, 0],
                [-0.5, 0.5, 1],
                [0.5, 0.5, 1],
            ],
            color: '#8B6914',
        },
        {
            id: 'top',
            verts: [
                [-0.5, -0.5, 1],
                [0.5, -0.5, 1],
                [0.5, 0.5, 1],
                [-0.5, 0.5, 1],
            ],
            color: '#C49A28',
        },
    ],
};

SceneRenderer.add(EXAMPLE_DEF, { x: 10, y: 5, z: 0, angle: 0 });
SceneRenderer.flush(camX, camY);
```
