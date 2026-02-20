export const compressTerrain = (grid: number[][]): string => {
    const flat: number[] = [];
    grid.forEach(col => col.forEach(v => flat.push(Math.round(v * 10))));

    const res: (string | number)[] = [];
    let count = 1;
    let cur = flat[0];

    for (let i = 1; i < flat.length; i++) {
        if (flat[i] === cur) {
            count++;
        } else {
            res.push(count > 1 ? `${cur}x${count}` : cur);
            cur = flat[i];
            count = 1;
        }
    }
    res.push(count > 1 ? `${cur}x${count}` : cur);
    return res.join(',');
};

export const decompressTerrain = (str: string, gridSize: number): number[][] => {
    const flat: number[] = [];
    str.split(',').forEach(t => {
        if (t.includes('x')) {
            const [v, c] = t.split('x');
            for (let i = 0; i < parseInt(c, 10); i++) flat.push(parseInt(v, 10) / 10);
        } else {
            flat.push(parseInt(t, 10) / 10);
        }
    });

    const res: number[][] = [];
    let k = 0;
    for (let x = 0; x <= gridSize; x++) {
        res[x] = [];
        for (let y = 0; y <= gridSize; y++) {
            res[x][y] = flat[k++];
        }
    }
    return res;
};
