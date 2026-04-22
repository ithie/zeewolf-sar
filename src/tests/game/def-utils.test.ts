import { describe, it, expect } from 'vitest';
import { applyParts, applyRotateNodes } from '../../game/def-utils';
import type { DEF } from '../../game/defs';

const CLOSE = 4; // decimal places for float comparisons

// ─── applyParts — rotateNodes (legacy) ───────────────────────────────────────

describe('applyParts — rotateNodes', () => {
    it('appends rotated faces to existing faces', () => {
        const def: DEF = {
            id: 'test',
            faces: [{ id: 'base', verts: [[0, 0, 0]], color: '#000' }],
            rotateNodes: [{
                pivot: [0, 0, 0],
                axis: [0, 0, 1],
                param: 'angle',
                faces: [{ id: 'arm', verts: [[1, 0, 0]], color: '#fff' }],
            }],
        };
        const result = applyParts(def, { angle: 0 });
        expect(result.faces.length).toBe(2);
        expect(result.faces[0].id).toBe('base');
        expect(result.faces[1].id).toBe('arm');
    });

    it('does not mutate the original DEF', () => {
        const def: DEF = {
            id: 'test',
            faces: [],
            rotateNodes: [{
                pivot: [0, 0, 0],
                axis: [0, 0, 1],
                param: 'angle',
                faces: [{ id: 'arm', verts: [[1, 0, 0]], color: '#fff' }],
            }],
        };
        applyParts(def, { angle: Math.PI / 2 });
        expect(def.faces.length).toBe(0);
    });

    it('rotates 90° around Z: [1,0,0] → [0,1,0]', () => {
        const def: DEF = {
            id: 'test',
            faces: [],
            rotateNodes: [{
                pivot: [0, 0, 0],
                axis: [0, 0, 1],
                param: 'a',
                faces: [{ id: 'arm', verts: [[1, 0, 0]], color: '#fff' }],
            }],
        };
        const result = applyParts(def, { a: Math.PI / 2 });
        const [x, y, z] = result.faces[0].verts[0];
        expect(x).toBeCloseTo(0, CLOSE);
        expect(y).toBeCloseTo(1, CLOSE);
        expect(z).toBeCloseTo(0, CLOSE);
    });

    it('rotates 180° around Z: [1,0,0] → [-1,0,0]', () => {
        const def: DEF = {
            id: 'test',
            faces: [],
            rotateNodes: [{
                pivot: [0, 0, 0],
                axis: [0, 0, 1],
                param: 'a',
                faces: [{ id: 'arm', verts: [[1, 0, 0]], color: '#fff' }],
            }],
        };
        const result = applyParts(def, { a: Math.PI });
        const [x, y] = result.faces[0].verts[0];
        expect(x).toBeCloseTo(-1, CLOSE);
        expect(y).toBeCloseTo(0, CLOSE);
    });

    it('pivot offset is respected', () => {
        const def: DEF = {
            id: 'test',
            faces: [],
            rotateNodes: [{
                pivot: [1, 0, 0],
                axis: [0, 0, 1],
                param: 'a',
                faces: [{ id: 'arm', verts: [[2, 0, 0]], color: '#fff' }],
            }],
        };
        // point [2,0,0] is distance 1 from pivot [1,0,0]
        // rotating 90° around Z through pivot → [1,1,0]
        const result = applyParts(def, { a: Math.PI / 2 });
        const [x, y] = result.faces[0].verts[0];
        expect(x).toBeCloseTo(1, CLOSE);
        expect(y).toBeCloseTo(1, CLOSE);
    });

    it('angle=0 leaves verts unchanged', () => {
        const verts = [[3, 2, 1]];
        const def: DEF = {
            id: 'test',
            faces: [],
            rotateNodes: [{
                pivot: [0, 0, 0],
                axis: [0, 0, 1],
                param: 'a',
                faces: [{ id: 'arm', verts, color: '#fff' }],
            }],
        };
        const result = applyParts(def, { a: 0 });
        const [x, y, z] = result.faces[0].verts[0];
        expect(x).toBeCloseTo(3, CLOSE);
        expect(y).toBeCloseTo(2, CLOSE);
        expect(z).toBeCloseTo(1, CLOSE);
    });

    it('missing param defaults to angle 0', () => {
        const def: DEF = {
            id: 'test',
            faces: [],
            rotateNodes: [{
                pivot: [0, 0, 0],
                axis: [0, 0, 1],
                param: 'missing',
                faces: [{ id: 'arm', verts: [[1, 0, 0]], color: '#fff' }],
            }],
        };
        const result = applyParts(def, {});
        const [x, y] = result.faces[0].verts[0];
        expect(x).toBeCloseTo(1, CLOSE);
        expect(y).toBeCloseTo(0, CLOSE);
    });
});

// ─── applyParts — parts ───────────────────────────────────────────────────────

describe('applyParts — parts', () => {
    it('appends part faces (no rotation)', () => {
        const def: DEF = {
            id: 'test',
            faces: [],
            parts: [{
                id: 'wing',
                faces: [{ id: 'w0', verts: [[0, 0, 0]], color: '#fff' }],
            }],
        };
        const result = applyParts(def, {});
        expect(result.faces.length).toBe(1);
        expect(result.faces[0].id).toBe('w0');
    });

    it('opts.only filters which parts are included', () => {
        const def: DEF = {
            id: 'test',
            faces: [],
            parts: [
                { id: 'a', faces: [{ id: 'fa', verts: [], color: '#f00' }] },
                { id: 'b', faces: [{ id: 'fb', verts: [], color: '#0f0' }] },
            ],
        };
        const result = applyParts(def, {}, { only: ['a'] });
        expect(result.faces.length).toBe(1);
        expect(result.faces[0].id).toBe('fa');
    });

    it('part with rotate applies Rodrigues rotation', () => {
        const def: DEF = {
            id: 'test',
            faces: [],
            parts: [{
                id: 'rotor',
                faces: [{ id: 'blade', verts: [[1, 0, 0]], color: '#fff' }],
                rotate: { pivot: [0, 0, 0], axis: [0, 0, 1], param: 'angle' },
            }],
        };
        const result = applyParts(def, { angle: Math.PI / 2 });
        const [x, y] = result.faces[0].verts[0];
        expect(x).toBeCloseTo(0, CLOSE);
        expect(y).toBeCloseTo(1, CLOSE);
    });
});

// ─── applyRotateNodes (alias) ─────────────────────────────────────────────────

describe('applyRotateNodes', () => {
    it('is an alias for applyParts and produces same result', () => {
        const def: DEF = {
            id: 'test',
            faces: [],
            rotateNodes: [{
                pivot: [0, 0, 0],
                axis: [0, 0, 1],
                param: 'a',
                faces: [{ id: 'arm', verts: [[1, 0, 0]], color: '#fff' }],
            }],
        };
        const r1 = applyParts(def, { a: 1.2 });
        const r2 = applyRotateNodes(def, { a: 1.2 });
        expect(r1.faces[0].verts[0]).toEqual(r2.faces[0].verts[0]);
    });
});
