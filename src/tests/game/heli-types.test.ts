import { describe, it, expect } from 'vitest';
import { HELI_TYPES, getHeliType } from '../../game/heli-types';

describe('HELI_TYPES', () => {
    it('contains at least one entry', () => {
        expect(HELI_TYPES.length).toBeGreaterThan(0);
    });

    it('all ids are unique', () => {
        const ids = HELI_TYPES.map(h => h.id);
        const unique = new Set(ids);
        expect(unique.size).toBe(ids.length);
    });

    it('contains expected vehicle ids', () => {
        const ids = HELI_TYPES.map(h => h.id);
        expect(ids).toContain('dolphin');
        expect(ids).toContain('jayhawk');
        expect(ids).toContain('chinook');
        expect(ids).toContain('glider');
    });

    it('all scale values are > 0', () => {
        HELI_TYPES.forEach(h => {
            expect(h.scale).toBeGreaterThan(0);
        });
    });

    it('all previewScale values are > 0', () => {
        HELI_TYPES.forEach(h => {
            expect(h.previewScale).toBeGreaterThan(0);
        });
    });

    it('all physics values are >= 0', () => {
        HELI_TYPES.forEach(h => {
            expect(h.maxLoad).toBeGreaterThanOrEqual(0);
            expect(h.accel).toBeGreaterThanOrEqual(0);
            expect(h.friction).toBeGreaterThan(0);
            expect(h.tiltSpeed).toBeGreaterThanOrEqual(0);
            expect(h.fuelRate).toBeGreaterThanOrEqual(0);
            expect(h.liftPower).toBeGreaterThanOrEqual(0);
            expect(h.cargoResist).toBeGreaterThanOrEqual(0);
        });
    });

    it('friction is < 1 for all helis (realistic deceleration)', () => {
        HELI_TYPES.forEach(h => {
            expect(h.friction).toBeLessThan(1);
        });
    });

    it('collision box xMin < xMax and yMin < yMax and zMax > 0', () => {
        HELI_TYPES.forEach(h => {
            const b = h.collisionBox;
            expect(b.xMin).toBeLessThan(b.xMax);
            expect(b.yMin).toBeLessThan(b.yMax);
            expect(b.zMax).toBeGreaterThan(0);
        });
    });

    it('all helis have a DEF with at least one face', () => {
        HELI_TYPES.forEach(h => {
            expect(h.def).toBeDefined();
            expect(h.def.faces.length).toBeGreaterThan(0);
        });
    });

    it('heavier helis have higher maxLoad', () => {
        const dolphin = getHeliType('dolphin');
        const chinook = getHeliType('chinook');
        expect(chinook.maxLoad).toBeGreaterThan(dolphin.maxLoad);
    });

    it('heavier helis have lower accel', () => {
        const dolphin = getHeliType('dolphin');
        const chinook = getHeliType('chinook');
        expect(chinook.accel).toBeLessThan(dolphin.accel);
    });

    it('glider has no fuel consumption', () => {
        const glider = getHeliType('glider');
        expect(glider.fuelRate).toBe(0);
        expect(glider.accel).toBe(0);
        expect(glider.liftPower).toBe(0);
    });

    it('tandem helis have multiple rotorOffsets', () => {
        const chinook = getHeliType('chinook');
        expect(chinook.rotorOffsets.length).toBeGreaterThan(1);
    });
});

describe('getHeliType', () => {
    it('returns the correct entry by id', () => {
        const h = getHeliType('jayhawk');
        expect(h.id).toBe('jayhawk');
        expect(h.label).toBe('MH-60T Jayhawk');
    });

    it('throws for unknown id', () => {
        expect(() => getHeliType('fantasy_chopper')).toThrow('Unknown heli type: fantasy_chopper');
    });

    it('result is same object reference as in HELI_TYPES', () => {
        const h = getHeliType('dolphin');
        expect(h).toBe(HELI_TYPES.find(x => x.id === 'dolphin'));
    });
});
