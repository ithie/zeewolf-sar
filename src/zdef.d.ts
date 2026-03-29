declare module '*.zdef' {
    const def: {
        id: string;
        pivot?: number[];
        faces: Array<{
            id: string;
            verts: number[][];
            color: string;
            stroke?: string | null;
            strokeWidth?: number;
            normal?: [number, number];
        }>;
        collisionBoxes?: Array<{
            id: string;
            xMin: number; xMax: number;
            yMin: number; yMax: number;
            zMin: number; zMax: number;
        }>;
    };
    export default def;
}
