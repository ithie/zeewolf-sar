const iso = (
    vx: number,
    vy: number,
    h: number,
    cx: number,
    cy: number,
    { canvas, tileW, tileH, stepH }: { canvas: HTMLCanvasElement; tileH: number; tileW: number; stepH: number }
) => {
    let cv = canvas || document.getElementById('gameCanvas');
    return {
        x: cv.width / 2 + (vx - vy) * (tileW / 2) - cx,
        y: cv.height / 2 + (vx + vy) * (tileH / 2) - h * stepH - cy,
    };
};

export { iso };
