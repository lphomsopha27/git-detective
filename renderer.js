const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const homeBgCanvas = document.getElementById("homeBgCanvas");
const homeBgCtx = homeBgCanvas ? homeBgCanvas.getContext("2d") : null;
const winTrophyCanvas = document.getElementById("winTrophyCanvas");
const winTrophyCtx = winTrophyCanvas ? winTrophyCanvas.getContext("2d") : null;
let animTick = 0;
let canvasMousePos = { x: -1, y: -1 };

if (canvas) {
    canvas.addEventListener("mousemove", (e) => {
        const rect = canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        canvasMousePos.x = ((e.clientX - rect.left) / rect.width) * canvas.width;
        canvasMousePos.y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    });

    canvas.addEventListener("mouseleave", () => {
        canvasMousePos.x = -1;
        canvasMousePos.y = -1;
        canvas.style.cursor = "default";
    });
}

// ==================== PIXEL ART "YOU WIN" TROPHY BANNER ====================
const TROPHY_SPRITE = [
    "...OOOOOOOOOO...",
    "..OYYYYYYYYYYO..",
    "OOOWYYYYYYYYYYOO",
    "O.OYYYYYYYYYAAOO",
    "O.OYYYYYYYYYAAOO",
    "OOOWYYYYYYYYAAOO",
    "..OYYYYYYYYAAO..",
    "...OYYYYYYYAO...",
    "....OYYYYYAO....",
    ".....OYYYYO.....",
    "......OYYO......",
    "......OYYO......",
    ".....OYYYYO.....",
    "....OYYYYYYO....",
    "...OAAAAAAAAO...",
    "..OOOOOOOOOOOO.."
];

const PIXEL_LETTERS = {
    Y: ["1...1", "1...1", ".1.1.", "..1..", "..1..", "..1..", "..1.."],
    O: [".111.", "1...1", "1...1", "1...1", "1...1", "1...1", ".111."],
    U: ["1...1", "1...1", "1...1", "1...1", "1...1", "1...1", ".111."],
    W: ["1...1", "1...1", "1...1", "1.1.1", "1.1.1", "11.11", "1...1"],
    I: [".111.", "..1..", "..1..", "..1..", "..1..", "..1..", ".111."],
    N: ["1...1", "11..1", "1.1.1", "1..11", "1...1", "1...1", "1...1"]
};

function drawPixelTrophy(targetCtx, centerX, topY, pxSize, tick) {
    const palette = {
        O: "#090d16",
        W: "#ffffff",
        Y: "#fde047",
        A: "#d97706"
    };

    // Radiating golden pixel sparkle rays
    const rays = [
        { dx: -1, dy: -0.45, len: 13 },
        { dx: 1, dy: -0.45, len: 13 },
        { dx: -1.15, dy: 0.25, len: 14 },
        { dx: 1.15, dy: 0.25, len: 14 },
        { dx: -0.75, dy: 0.85, len: 13 },
        { dx: 0.75, dy: 0.85, len: 13 },
        { dx: 0, dy: 1.05, len: 11 }
    ];

    const rayOriginX = centerX;
    const rayOriginY = topY + 8 * pxSize;

    rays.forEach((r, rIdx) => {
        for (let step = 4; step <= r.len; step++) {
            const pulse = Math.sin(tick * 0.12 - step * 0.5 + rIdx) > -0.25;
            targetCtx.fillStyle = pulse ? "#fde047" : "#92400e";
            const rx = Math.round(rayOriginX + r.dx * step * pxSize);
            const ry = Math.round(rayOriginY + r.dy * step * pxSize);
            targetCtx.fillRect(rx, ry, pxSize - 1, pxSize - 1);
            if (step % 2 === 0) {
                targetCtx.fillRect(rx + pxSize, ry, pxSize - 2, pxSize - 2);
            }
        }
    });

    // Trophy Cup Pixels
    const spriteW = TROPHY_SPRITE[0].length * pxSize;
    const startX = Math.round(centerX - spriteW / 2);

    for (let r = 0; r < TROPHY_SPRITE.length; r++) {
        for (let c = 0; c < TROPHY_SPRITE[r].length; c++) {
            const ch = TROPHY_SPRITE[r][c];
            if (palette[ch]) {
                targetCtx.fillStyle = palette[ch];
                targetCtx.fillRect(startX + c * pxSize, topY + r * pxSize, pxSize, pxSize);
            }
        }
    }
}

function drawYouWinBanner(targetCtx, centerX, topY, pxSize) {
    const word = ["Y", "O", "U", " ", "W", "I", "N"];
    const rowColors = [
        "#ffffff",
        "#fde047",
        "#fde047",
        "#facc15",
        "#fb923c",
        "#f97316",
        "#ec4899"
    ];

    const charW = 5 * pxSize;
    const gap = pxSize * 1.5;
    const spaceW = pxSize * 3;
    let totalW = 0;
    word.forEach((ch, idx) => {
        totalW += ch === " " ? spaceW : charW;
        if (idx < word.length - 1) totalW += gap;
    });

    let curX = Math.round(centerX - totalW / 2);

    word.forEach((ch) => {
        if (ch === " ") {
            curX += spaceW + gap;
            return;
        }
        const grid = PIXEL_LETTERS[ch];
        // Deep purple retro block drop shadow
        targetCtx.fillStyle = "#3b0764";
        for (let r = 0; r < grid.length; r++) {
            for (let c = 0; c < grid[r].length; c++) {
                if (grid[r][c] === "1") {
                    targetCtx.fillRect(curX + c * pxSize + pxSize, topY + r * pxSize + pxSize, pxSize, pxSize);
                }
            }
        }

        // Gradient foreground pixels
        for (let r = 0; r < grid.length; r++) {
            targetCtx.fillStyle = rowColors[r];
            for (let c = 0; c < grid[r].length; c++) {
                if (grid[r][c] === "1") {
                    targetCtx.fillRect(curX + c * pxSize, topY + r * pxSize, pxSize, pxSize);
                }
            }
        }
        curX += charW + gap;
    });
}

function renderWinTrophyFrame() {
    if (!winTrophyCtx) return;
    animTick++;
    const w = winTrophyCanvas.width;
    const h = winTrophyCanvas.height;

    winTrophyCtx.fillStyle = "#060911";
    winTrophyCtx.fillRect(0, 0, w, h);

    drawPixelTrophy(winTrophyCtx, w / 2, 10, 5, animTick);
    drawYouWinBanner(winTrophyCtx, w / 2, 114, 6);
}

// ==================== PIXEL CITY & HARBOR TELEMETRY ====================
function renderHomeBgFrame() {
    if (!homeBgCtx) return;
    animTick++;
    const w = 960;
    const h = 540;
    const horizonY = 385;

    const skyGrad = homeBgCtx.createLinearGradient(0, 0, 0, horizonY);
    skyGrad.addColorStop(0, "#0b132b");
    skyGrad.addColorStop(0.55, "#1c2541");
    skyGrad.addColorStop(1, "#2a3959");
    homeBgCtx.fillStyle = skyGrad;
    homeBgCtx.fillRect(0, 0, w, horizonY);

    const clouds = [
        { x: 110, y: 92, cw: 120, ch: 18 },
        { x: 350, y: 72, cw: 140, ch: 20 },
        { x: 640, y: 98, cw: 130, ch: 20 },
        { x: 820, y: 78, cw: 105, ch: 16 }
    ];
    homeBgCtx.fillStyle = "rgba(148, 163, 184, 0.12)";
    clouds.forEach((c, idx) => {
        const drift = Math.sin(animTick * 0.01 + idx) * 6;
        homeBgCtx.fillRect(c.x + drift, c.y, c.cw, c.ch);
        homeBgCtx.fillRect(c.x + 16 + drift, c.y - 8, c.cw - 32, 8);
    });

    for (let i = 0; i < 36; i++) {
        const sx = (i * 173 + 29) % w;
        const sy = (i * 89 + 17) % 180;
        const blink = Math.sin(animTick * 0.05 + i) > 0.2;
        homeBgCtx.fillStyle = blink ? "#fde047" : "#64748b";
        homeBgCtx.fillRect(sx, sy, 2, 2);
    }

    homeBgCtx.save();
    homeBgCtx.font = "bold 48px 'Press Start 2P', monospace";
    homeBgCtx.textAlign = "center";
    homeBgCtx.fillStyle = "rgba(56, 189, 248, 0.05)";
    homeBgCtx.fillText("CASE #104", w / 2, 168);
    homeBgCtx.restore();

    const beamAngle = Math.sin(animTick * 0.015) * 0.22;
    homeBgCtx.save();
    homeBgCtx.translate(150, horizonY);
    homeBgCtx.rotate(beamAngle);
    const beamGrad = homeBgCtx.createLinearGradient(0, 0, 0, -290);
    beamGrad.addColorStop(0, "rgba(56, 189, 248, 0.14)");
    beamGrad.addColorStop(1, "rgba(56, 189, 248, 0)");
    homeBgCtx.fillStyle = beamGrad;
    homeBgCtx.beginPath();
    homeBgCtx.moveTo(-10, 0);
    homeBgCtx.lineTo(-75, -290);
    homeBgCtx.lineTo(75, -290);
    homeBgCtx.lineTo(10, 0);
    homeBgCtx.closePath();
    homeBgCtx.fill();
    homeBgCtx.restore();

    const farTowers = [
        { x: 16, y: 215, bw: 76, bh: horizonY - 215 },
        { x: 102, y: 185, bw: 84, bh: horizonY - 185 },
        { x: 200, y: 265, bw: 90, bh: horizonY - 265 },
        { x: 670, y: 260, bw: 90, bh: horizonY - 260 },
        { x: 772, y: 180, bw: 84, bh: horizonY - 180 },
        { x: 866, y: 215, bw: 80, bh: horizonY - 215 }
    ];
    homeBgCtx.fillStyle = "#11192e";
    farTowers.forEach(b => homeBgCtx.fillRect(b.x, b.y, b.bw, b.bh));

    const nearTowers = [
        { x: 0, y: 255, bw: 96, bh: horizonY - 255, winColor: "#facc15", sign: "GIT", signColor: "#fb7185" },
        { x: 106, y: 220, bw: 88, bh: horizonY - 220, winColor: "#38bdf8", sign: null },
        { x: 204, y: 315, bw: 90, bh: horizonY - 315, winColor: "#fb7185", sign: null },
        { x: 666, y: 315, bw: 90, bh: horizonY - 315, winColor: "#38bdf8", sign: null },
        { x: 766, y: 215, bw: 88, bh: horizonY - 215, winColor: "#facc15", sign: null },
        { x: 864, y: 255, bw: 96, bh: horizonY - 255, winColor: "#34d399", sign: "MAIN", signColor: "#fb7185" }
    ];

    nearTowers.forEach((b, idx) => {
        homeBgCtx.fillStyle = "#080d1a";
        homeBgCtx.fillRect(b.x, b.y, b.bw, b.bh);
        homeBgCtx.strokeStyle = "#1e2d4a";
        homeBgCtx.lineWidth = 2;
        homeBgCtx.strokeRect(b.x, b.y, b.bw, b.bh);

        homeBgCtx.fillStyle = "#334155";
        homeBgCtx.fillRect(b.x + Math.floor(b.bw / 2), b.y - 20, 3, 20);
        if (Math.floor(animTick / 28 + idx) % 2 === 0) {
            homeBgCtx.fillStyle = "#fb7185";
            homeBgCtx.fillRect(b.x + Math.floor(b.bw / 2) - 1, b.y - 24, 5, 5);
        }

        if (b.sign) {
            homeBgCtx.fillStyle = "#0f172a";
            homeBgCtx.fillRect(b.x + 12, b.y + 10, b.bw - 24, 16);
            homeBgCtx.strokeStyle = b.signColor;
            homeBgCtx.lineWidth = 1.5;
            homeBgCtx.strokeRect(b.x + 12, b.y + 10, b.bw - 24, 16);
            homeBgCtx.fillStyle = b.signColor;
            homeBgCtx.font = "bold 8px 'Press Start 2P', monospace";
            homeBgCtx.textAlign = "center";
            homeBgCtx.fillText(b.sign, b.x + b.bw / 2, b.y + 22);
        }

        const startY = b.sign ? b.y + 34 : b.y + 14;
        for (let wy = startY; wy < horizonY - 14; wy += 18) {
            for (let wx = b.x + 14; wx < b.x + b.bw - 16; wx += 18) {
                const lit = ((wx * 3 + wy * 7 + idx * 11) % 5) !== 0;
                homeBgCtx.fillStyle = lit ? b.winColor : "#111a30";
                homeBgCtx.fillRect(wx, wy, 8, 10);
            }
        }
    });

    const seaGrad = homeBgCtx.createLinearGradient(0, horizonY, 0, h);
    seaGrad.addColorStop(0, "#091526");
    seaGrad.addColorStop(1, "#040812");
    homeBgCtx.fillStyle = seaGrad;
    homeBgCtx.fillRect(0, horizonY, w, h - horizonY);

    homeBgCtx.strokeStyle = "rgba(56, 189, 248, 0.22)";
    homeBgCtx.lineWidth = 2;
    homeBgCtx.beginPath();
    homeBgCtx.moveTo(0, horizonY);
    homeBgCtx.lineTo(w, horizonY);
    homeBgCtx.stroke();

    homeBgCtx.strokeStyle = "rgba(56, 189, 248, 0.07)";
    homeBgCtx.lineWidth = 1;
    [430, 475, 515].forEach(gy => {
        homeBgCtx.beginPath();
        homeBgCtx.moveTo(60, gy);
        homeBgCtx.lineTo(w - 60, gy);
        homeBgCtx.stroke();
    });

    const nodes = [
        { x: 165, depth: 475, color: "#fb7185", glow: "rgba(251, 113, 133, 0.4)" },
        { x: 295, depth: 445, color: "#38bdf8", glow: "rgba(56, 189, 248, 0.4)" },
        { x: 425, depth: 490, color: "#fb7185", glow: "rgba(251, 113, 133, 0.4)" },
        { x: 555, depth: 440, color: "#38bdf8", glow: "rgba(56, 189, 248, 0.4)" },
        { x: 685, depth: 482, color: "#fb7185", glow: "rgba(251, 113, 133, 0.4)" },
        { x: 815, depth: 450, color: "#38bdf8", glow: "rgba(56, 189, 248, 0.4)" }
    ];

    nodes.forEach((n, idx) => {
        const bob = Math.sin(animTick * 0.04 + idx) * 3;
        const ny = n.depth + bob;

        homeBgCtx.strokeStyle = n.glow;
        homeBgCtx.lineWidth = 1.5;
        homeBgCtx.beginPath();
        homeBgCtx.moveTo(n.x, horizonY);
        homeBgCtx.lineTo(n.x, ny);
        homeBgCtx.stroke();

        homeBgCtx.fillStyle = n.glow;
        homeBgCtx.beginPath();
        homeBgCtx.arc(n.x, ny, 8, 0, Math.PI * 2);
        homeBgCtx.fill();

        homeBgCtx.fillStyle = n.color;
        homeBgCtx.fillRect(n.x - 3, ny - 3, 6, 6);
    });

    homeBgCtx.strokeStyle = "rgba(148, 163, 184, 0.25)";
    homeBgCtx.lineWidth = 1;
    homeBgCtx.beginPath();
    homeBgCtx.moveTo(925, horizonY + 10);
    homeBgCtx.lineTo(925, h - 18);
    homeBgCtx.stroke();
    for (let ty = horizonY + 15; ty < h - 18; ty += 18) {
        homeBgCtx.beginPath();
        homeBgCtx.moveTo(918, ty);
        homeBgCtx.lineTo(925, ty);
        homeBgCtx.stroke();
    }
}

// ==================== GAMEPLAY CANVAS RENDERERS ====================
function getWrappedLines(text, maxWidth) {
    const words = String(text).split(" ");
    const lines = [];
    let line = "";

    for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        if (ctx.measureText(testLine).width > maxWidth && i > 0) {
            lines.push(line.trim());
            line = words[i] + " ";
        } else {
            line = testLine;
        }
    }
    if (line.trim()) lines.push(line.trim());
    return lines;
}

function drawWrappedText(text, x, y, maxWidth, lineHeight) {
    const lines = getWrappedLines(text, maxWidth);
    let currentY = y;
    lines.forEach((ln) => {
        ctx.fillText(ln, x, currentY);
        currentY += lineHeight;
    });
    return currentY;
}

function drawCommitTooltip(evKey, ev, branch) {
    const boxW = 290;
    const padX = 14;
    const padY = 12;
    const lineHeight = 20;

    ctx.save();
    ctx.font = "16px 'VT323', monospace";
    const msgLines = getWrappedLines(`"${ev.commitMessage}"`, boxW - padX * 2);
    const boxH = padY * 2 + 22 + msgLines.length * lineHeight;

    const placeAbove = ev.pinPos.y > 270;
    let tipX = Math.round(ev.pinPos.x - boxW / 2);
    tipX = Math.max(28, Math.min(932 - boxW, tipX));
    const tipY = placeAbove
        ? Math.max(28, ev.pinPos.y - 62 - boxH)
        : Math.min(512 - boxH, ev.pinPos.y + 62);

    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(tipX + 4, tipY + 5, boxW, boxH);

    ctx.fillStyle = "#0b111e";
    ctx.fillRect(tipX, tipY, boxW, boxH);
    ctx.strokeStyle = branch.merged ? "#2ea44f" : "#38bdf8";
    ctx.lineWidth = 2;
    ctx.strokeRect(tipX, tipY, boxW, boxH);

    ctx.fillStyle = branch.merged ? "rgba(46, 164, 79, 0.2)" : "rgba(56, 189, 248, 0.2)";
    ctx.fillRect(tipX + 2, tipY + 2, boxW - 4, 22);

    ctx.fillStyle = "#fde047";
    ctx.font = "bold 14px 'VT323', monospace";
    ctx.textAlign = "left";
    ctx.fillText(`💾 ${evKey} [7c3e91a]`, tipX + padX, tipY + 17);

    ctx.fillStyle = "#f5f6fa";
    ctx.font = "16px 'VT323', monospace";
    let textY = tipY + padY + 28;
    msgLines.forEach((ln) => {
        ctx.fillText(ln, tipX + padX, textY);
        textY += lineHeight;
    });

    ctx.restore();
}

function drawEvidenceArt(type, x, y, w, h, tick) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();

    if (type === "suspect") {
        const allSolved = Object.keys(window.GameState.evidenceFiles).every(k => window.GameState.branches[k] && window.GameState.branches[k].merged);
        const grad = ctx.createRadialGradient(x + w / 2, y + h / 2, 6, x + w / 2, y + h / 2, w * 0.7);
        grad.addColorStop(0, allSolved ? "#1e3a29" : "#3b232a");
        grad.addColorStop(1, "#12161f");
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, w, h);

        ctx.strokeStyle = "rgba(255,255,255,0.08)";
        ctx.lineWidth = 1;
        for (let ly = y + 10; ly < y + h; ly += 12) {
            ctx.beginPath();
            ctx.moveTo(x, ly);
            ctx.lineTo(x + w, ly);
            ctx.stroke();
        }

        ctx.fillStyle = "#090c12";
        ctx.fillRect(x + w * 0.2, y + h * 0.62, w * 0.6, h * 0.4);
        ctx.fillRect(x + w * 0.36, y + h * 0.3, w * 0.28, h * 0.32);
        ctx.fillStyle = "#18202c";
        ctx.fillRect(x + w * 0.24, y + h * 0.26, w * 0.52, 5);
        ctx.fillRect(x + w * 0.33, y + h * 0.14, w * 0.34, 12);

        if (allSolved) {
            ctx.fillStyle = "#2ea44f";
            ctx.fillRect(x + w * 0.41, y + h * 0.41, 6, 4);
            ctx.fillRect(x + w * 0.53, y + h * 0.41, 6, 4);
        } else {
            ctx.fillStyle = "#eb3b5a";
            ctx.font = "bold 24px 'Press Start 2P', monospace";
            ctx.textAlign = "center";
            ctx.fillText("?", x + w / 2 + 1, y + h * 0.58);
        }
    } else if (type === "atTheScene") {
        ctx.fillStyle = "#16202e";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#636e72";
        ctx.fillRect(x + 22, y + 6, w - 44, h - 12);
        ctx.strokeStyle = "#b2bec3";
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 24, y + 8, w - 48, h - 16);
        ctx.strokeStyle = "#e1b12c";
        ctx.beginPath();
        ctx.arc(x + w / 2, y + h / 2, 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#e1b12c";
        ctx.fillRect(x + w / 2 - 2, y + h / 2 - 2, 4, 4);
        ctx.fillStyle = "#e1b12c";
        ctx.fillRect(x, y + h - 14, w, 7);
        ctx.fillStyle = "#111";
        for (let sx = x; sx < x + w; sx += 12) {
            ctx.fillRect(sx, y + h - 14, 5, 7);
        }
    } else if (type === "videologs") {
        ctx.fillStyle = "#0e1c18";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#dfe6e9";
        ctx.fillRect(x + 24, y + 18, 36, 16);
        ctx.fillStyle = "#636e72";
        ctx.fillRect(x + 60, y + 20, 8, 12);
        ctx.fillRect(x + 30, y + 34, 6, 12);
        ctx.fillRect(x + 22, y + 44, 16, 4);
        if (Math.floor(tick / 25) % 2 === 0) {
            ctx.fillStyle = "#eb3b5a";
            ctx.beginPath();
            ctx.arc(x + 14, y + 12, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.fillStyle = "#2ea44f";
        ctx.font = "bold 10px 'VT323', monospace";
        ctx.textAlign = "right";
        ctx.fillText("22:15:03", x + w - 6, y + 14);
    } else if (type === "witness1") {
        ctx.fillStyle = "#151d2e";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "rgba(225, 177, 44, 0.18)";
        ctx.beginPath();
        ctx.arc(x + 24, y + 16, 22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#2d3436";
        ctx.fillRect(x + 22, y + 28, 52, 13);
        ctx.fillRect(x + 32, y + 20, 30, 9);
        ctx.fillStyle = "#ffeaa7";
        ctx.fillRect(x + 70, y + 31, 4, 4);
        ctx.fillStyle = "#eb3b5a";
        ctx.fillRect(x + 22, y + 31, 4, 4);
        ctx.fillStyle = "#090c10";
        ctx.fillRect(x + 30, y + 39, 9, 6);
        ctx.fillRect(x + 56, y + 39, 9, 6);
    } else if (type === "witness2") {
        ctx.fillStyle = "#1b2436";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#f8c291";
        ctx.fillRect(x + 22, y + 14, 16, 16);
        ctx.fillStyle = "#3c6382";
        ctx.fillRect(x + 16, y + 30, 28, 22);
        ctx.fillStyle = "#e1b12c";
        ctx.fillRect(x + 54, y + 18, 24, 16);
        ctx.fillStyle = "#0a3d62";
        ctx.fillRect(x + 54, y + 22, 24, 4);
    } else if (type === "gallery") {
        ctx.fillStyle = "#161229";
        ctx.fillRect(x, y, w, h);
        ctx.fillStyle = "#334155";
        ctx.fillRect(x + 26, y + 30, 20, 18);
        ctx.fillStyle = "#38bdf8";
        ctx.beginPath();
        ctx.moveTo(x + 36, y + 12);
        ctx.lineTo(x + 44, y + 20);
        ctx.lineTo(x + 36, y + 28);
        ctx.lineTo(x + 28, y + 20);
        ctx.closePath();
        ctx.fill();
        const l2 = window.GameState.level2;
        ctx.strokeStyle = l2 && l2.laserReverted ? "#2ea44f" : "#eb3b5a";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x + 6, y + 10);
        ctx.lineTo(x + w - 6, y + 36);
        ctx.moveTo(x + w - 6, y + 10);
        ctx.lineTo(x + 6, y + 36);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPushpin(x, y, color) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.arc(x + 3, y + 4, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(x - 3, y - 3, 2, 2);
}

function drawDeskView() {
    animTick++;
    if (canvas) canvas.style.cursor = "default";
    const rainOffset = (animTick * 3) % 60;

    ctx.fillStyle = "#0b0f18";
    ctx.fillRect(0, 0, 960, 540);

    ctx.strokeStyle = "#141b29";
    ctx.lineWidth = 1;
    for (let y = 0; y < 360; y += 22) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(960, y);
        ctx.stroke();
        const offset = (y / 22) % 2 === 0 ? 0 : 28;
        for (let x = offset; x < 960; x += 56) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + 22);
            ctx.stroke();
        }
    }

    ctx.fillStyle = "#060911";
    ctx.fillRect(38, 32, 152, 302);
    ctx.fillStyle = "#0e1524";
    ctx.fillRect(46, 174, 32, 160);
    ctx.fillRect(84, 136, 42, 198);
    ctx.fillRect(132, 190, 50, 144);

    ctx.fillStyle = "rgba(225, 177, 44, 0.45)";
    ctx.fillRect(94, 154, 4, 4);
    ctx.fillRect(108, 176, 4, 4);
    ctx.fillRect(56, 200, 4, 4);
    ctx.fillStyle = "rgba(88, 166, 255, 0.4)";
    ctx.fillRect(144, 212, 4, 4);
    ctx.fillRect(96, 228, 4, 4);

    ctx.strokeStyle = "rgba(120, 175, 255, 0.35)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 24; i++) {
        let rx = 46 + (i * 11) % 138;
        let ry = 38 + ((i * 29 + rainOffset) % 284);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(rx - 5, ry + 12);
        ctx.stroke();
    }

    ctx.strokeStyle = "#262e3e";
    ctx.lineWidth = 5;
    ctx.strokeRect(38, 32, 152, 302);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(114, 32);
    ctx.lineTo(114, 334);
    ctx.moveTo(38, 183);
    ctx.lineTo(190, 183);
    ctx.stroke();

    ctx.fillStyle = "#26160b";
    ctx.fillRect(220, 32, 700, 302);
    ctx.fillStyle = "#634125";
    ctx.fillRect(230, 42, 680, 282);
    ctx.strokeStyle = "#160d06";
    ctx.lineWidth = 3;
    ctx.strokeRect(230, 42, 680, 282);

    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(528, 98, 92, 98);
    ctx.fillStyle = "#f5f6fa";
    ctx.fillRect(525, 94, 92, 98);
    drawEvidenceArt("suspect", 533, 102, 76, 64, animTick);
    ctx.fillStyle = "#eb3b5a";
    ctx.font = "bold 12px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText("WHO?", 571, 184);
    drawPushpin(571, 98, "#e1b12c");

    ctx.fillStyle = "#f6e58d";
    ctx.fillRect(270, 90, 56, 52);
    ctx.fillStyle = "#30336b";
    ctx.fillRect(278, 104, 38, 3);
    ctx.fillRect(278, 114, 28, 3);

    ctx.fillStyle = "#2b1c12";
    ctx.fillRect(0, 356, 960, 184);
    ctx.fillStyle = "#3b2618";
    ctx.fillRect(0, 356, 960, 10);
    ctx.fillStyle = "#170e08";
    ctx.fillRect(0, 366, 960, 4);

    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(264, 414, 185, 102);
    ctx.fillStyle = "#eccc68";
    ctx.fillRect(260, 402, 72, 12);
    ctx.fillStyle = "#f5f6fa";
    ctx.fillRect(260, 410, 185, 102);
    ctx.fillStyle = "#1e272e";
    ctx.font = "bold 15px 'VT323', monospace";
    ctx.textAlign = "left";
    ctx.fillText("CASE #104: BANK HEIST", 272, 434);
    ctx.fillStyle = "#57606f";
    ctx.font = "13px 'VT323', monospace";
    ctx.fillText("STATUS: ACTIVE INVESTIGATION", 272, 452);

    ctx.save();
    ctx.translate(365, 482);
    ctx.rotate(-0.12);
    ctx.strokeStyle = "#eb3b5a";
    ctx.lineWidth = 2;
    ctx.strokeRect(-48, -12, 96, 22);
    ctx.fillStyle = "#eb3b5a";
    ctx.font = "bold 13px 'VT323', monospace";
    ctx.textAlign = "center";
    ctx.fillText("CONFIDENTIAL", 0, 3);
    ctx.restore();

    ctx.fillStyle = "#dcdde1";
    ctx.fillRect(500, 434, 34, 42);
    ctx.fillRect(534, 444, 8, 22);
    ctx.fillStyle = "#4a2c18";
    ctx.fillRect(504, 436, 26, 6);

    const steamShift = Math.sin(animTick * 0.08) * 3;
    ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
    ctx.fillRect(510 + steamShift, 416, 3, 10);
    ctx.fillRect(522 - steamShift, 410, 3, 12);

    ctx.fillStyle = "#e1b12c";
    ctx.fillRect(722, 414, 10, 64);
    ctx.fillRect(698, 476, 58, 10);
    ctx.fillStyle = "#2ea44f";
    ctx.fillRect(686, 392, 82, 22);
    ctx.fillStyle = "#55efc4";
    ctx.fillRect(692, 396, 70, 4);

    const lampGrad = ctx.createRadialGradient(727, 420, 15, 650, 460, 360);
    lampGrad.addColorStop(0, "rgba(255, 215, 100, 0.22)");
    lampGrad.addColorStop(1, "rgba(255, 215, 100, 0)");
    ctx.fillStyle = lampGrad;
    ctx.fillRect(200, 330, 760, 210);
}

function drawCorkboardView() {
    animTick++;
    const state = window.GameState;
    const allSolved = Object.keys(state.evidenceFiles).every(k => state.branches[k] && state.branches[k].merged);
    const modalBlocking = typeof isAnyModalOpen === "function" && isAnyModalOpen();

    ctx.fillStyle = "#241409";
    ctx.fillRect(0, 0, 960, 540);
    ctx.strokeStyle = "#3d2312";
    ctx.lineWidth = 4;
    ctx.strokeRect(14, 14, 932, 512);

    ctx.fillStyle = "#664326";
    ctx.fillRect(20, 20, 920, 500);

    ctx.fillStyle = "rgba(35, 18, 6, 0.22)";
    for (let gx = 28; gx < 932; gx += 16) {
        for (let gy = 30; gy < 512; gy += 16) {
            const jitter = ((gx * 7 + gy * 13) % 9);
            ctx.fillRect(gx + jitter, gy + (jitter % 5), 2, 2);
        }
    }

    ctx.strokeStyle = "rgba(15, 8, 2, 0.55)";
    ctx.lineWidth = 6;
    ctx.strokeRect(23, 23, 914, 494);

    ctx.fillStyle = "#e1b12c";
    ctx.fillRect(16, 16, 18, 6);
    ctx.fillRect(16, 16, 6, 18);
    ctx.fillRect(926, 16, 18, 6);
    ctx.fillRect(938, 16, 6, 18);
    ctx.fillRect(16, 518, 18, 6);
    ctx.fillRect(16, 506, 6, 18);
    ctx.fillRect(926, 518, 18, 6);
    ctx.fillRect(938, 506, 6, 18);

    ctx.save();
    ctx.translate(825, 106);
    ctx.rotate(0.05);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(-68, -42, 140, 88);
    ctx.fillStyle = "#dcdde1";
    ctx.fillRect(-70, -44, 140, 88);
    ctx.fillStyle = "#1e272e";
    ctx.fillRect(-62, -36, 124, 14);
    ctx.fillStyle = "#f5f6fa";
    ctx.font = "bold 10px 'VT323', monospace";
    ctx.textAlign = "center";
    ctx.fillText("DAILY CHRONICLE", 0, -26);
    ctx.fillStyle = "#2f3640";
    ctx.font = "bold 11px 'VT323', monospace";
    ctx.fillText("METRO BANK HIT!", 0, -10);
    ctx.fillStyle = "#718093";
    ctx.fillRect(-60, -2, 55, 34);
    ctx.fillRect(2, 0, 56, 4);
    ctx.fillRect(2, 9, 50, 4);
    ctx.fillRect(2, 18, 54, 4);
    ctx.fillRect(2, 27, 42, 4);
    ctx.fillStyle = "rgba(246, 229, 141, 0.75)";
    ctx.fillRect(-22, -50, 44, 10);
    ctx.restore();

    ctx.save();
    ctx.translate(115, 386);
    ctx.rotate(-0.06);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(-58, -48, 120, 100);
    ctx.fillStyle = "#f6e58d";
    ctx.fillRect(-60, -50, 120, 100);
    ctx.fillStyle = "#f9ca24";
    ctx.fillRect(-60, -50, 120, 14);
    ctx.fillStyle = "#130f40";
    ctx.font = "bold 13px 'VT323', monospace";
    ctx.textAlign = "left";
    ctx.fillText("CLUE NOTES:", -50, -22);
    ctx.font = "12px 'VT323', monospace";
    ctx.fillText("- Breach at 22:15", -50, -4);
    ctx.fillText("- Inside override?", -50, 12);
    ctx.fillText("- Check 4 leads!", -50, 28);
    drawPushpin(0, -42, "#58a6ff");
    ctx.restore();

    ctx.fillStyle = "rgba(13, 18, 28, 0.94)";
    ctx.fillRect(36, 44, 186, 150);
    ctx.strokeStyle = "#2c364f";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(36, 44, 186, 150);

    ctx.fillStyle = "#e1b12c";
    ctx.font = "bold 15px 'VT323', monospace";
    ctx.textAlign = "left";
    ctx.fillText("📁 CASE LEADS:", 48, 66);

    let ly = 92;
    Object.keys(state.evidenceFiles).forEach(key => {
        const isPinned = state.branches[key] && state.branches[key].pinned;
        const isMerged = state.branches[key] && state.branches[key].merged;

        ctx.fillStyle = isMerged ? "#2ea44f" : isPinned ? "#e1b12c" : "#7f8fa6";
        ctx.fillText(`${isMerged ? "✓" : isPinned ? "📌" : "○"} ${key}`, 48, ly);
        ly += 25;
    });

    const center = { x: 482, y: 270 };
    const centerPin = { x: center.x, y: center.y - 68 };

    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(center.x - 68, center.y - 72, 144, 156);
    ctx.fillStyle = "#f5f6fa";
    ctx.fillRect(center.x - 72, center.y - 76, 144, 156);

    drawEvidenceArt("suspect", center.x - 62, center.y - 64, 124, 102, animTick);

    ctx.fillStyle = allSolved ? "#2ea44f" : "#eb3b5a";
    ctx.font = "bold 15px 'Press Start 2P', monospace";
    ctx.textAlign = "center";
    ctx.fillText(allSolved ? "CULPRIT" : "WHO?", center.x, center.y + 62);

    if (allSolved) {
        ctx.fillStyle = "#1e272e";
        ctx.font = "bold 13px 'VT323', monospace";
        ctx.fillText("VAULT TECH", center.x, center.y + 76);
    }

    drawPushpin(centerPin.x, centerPin.y, allSolved ? "#2ea44f" : "#e1b12c");

    let hoveredKey = null;
    if (!modalBlocking && canvasMousePos.x >= 0 && canvasMousePos.y >= 0) {
        Object.keys(state.evidenceFiles).forEach(key => {
            const ev = state.evidenceFiles[key];
            const branch = state.branches[key];
            if (branch && branch.pinned && ev.taskCompleted && ev.commitMessage) {
                const withinX = canvasMousePos.x >= ev.pinPos.x - 64 && canvasMousePos.x <= ev.pinPos.x + 64;
                const withinY = canvasMousePos.y >= ev.pinPos.y - 54 && canvasMousePos.y <= ev.pinPos.y + 54;
                if (withinX && withinY) {
                    hoveredKey = key;
                }
            }
        });
    }

    if (canvas) {
        canvas.style.cursor = hoveredKey ? "pointer" : "default";
    }

    Object.keys(state.evidenceFiles).forEach(key => {
        const ev = state.evidenceFiles[key];
        const branch = state.branches[key];

        if (branch && branch.pinned) {
            const cardPin = { x: ev.pinPos.x, y: ev.pinPos.y - 44 };
            const isHovered = hoveredKey === key;

            ctx.save();
            ctx.translate(ev.pinPos.x, ev.pinPos.y);
            ctx.rotate(ev.tilt || 0);

            ctx.fillStyle = "rgba(0,0,0,0.45)";
            ctx.fillRect(-58, -48, 124, 104);
            ctx.fillStyle = isHovered ? "#fffbeb" : "#f5f6fa";
            ctx.fillRect(-62, -52, 124, 104);

            if (isHovered) {
                ctx.strokeStyle = "#facc15";
                ctx.lineWidth = 3;
                ctx.strokeRect(-62, -52, 124, 104);
            }

            drawEvidenceArt(key, -54, -42, 108, 62, animTick);

            ctx.fillStyle = "#1e272e";
            ctx.font = "bold 15px 'VT323', monospace";
            ctx.textAlign = "center";
            ctx.fillText(key, 0, 34);

            if (branch.merged) {
                ctx.fillStyle = "#2ea44f";
                ctx.font = "bold 11px 'VT323', monospace";
                ctx.fillText("✓ MERGED TO MAIN", 0, 46);
            } else if (ev.taskCompleted) {
                ctx.fillStyle = "#0284c7";
                ctx.font = "bold 11px 'VT323', monospace";
                ctx.fillText("✓ COMMITTED", 0, 46);
            } else {
                ctx.fillStyle = "#57606f";
                ctx.font = "bold 11px 'VT323', monospace";
                ctx.fillText(ev.subtitle, 0, 46);
            }
            ctx.restore();

            if (branch.merged) {
                ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
                ctx.lineWidth = 4;
                ctx.beginPath();
                ctx.moveTo(centerPin.x + 2, centerPin.y + 4);
                ctx.lineTo(cardPin.x + 2, cardPin.y + 4);
                ctx.stroke();

                ctx.strokeStyle = "rgba(235, 59, 90, 0.3)";
                ctx.lineWidth = 7;
                ctx.beginPath();
                ctx.moveTo(centerPin.x, centerPin.y);
                ctx.lineTo(cardPin.x, cardPin.y);
                ctx.stroke();

                ctx.strokeStyle = "#eb3b5a";
                ctx.lineWidth = 2.5;
                ctx.beginPath();
                ctx.moveTo(centerPin.x, centerPin.y);
                ctx.lineTo(cardPin.x, cardPin.y);
                ctx.stroke();
            }

            drawPushpin(cardPin.x, cardPin.y, branch.merged ? "#eb3b5a" : "#e1b12c");
        }
    });

    if (allSolved) {
        ctx.save();
        ctx.translate(482, 454);
        ctx.rotate(-0.04);
        ctx.fillStyle = "rgba(13, 18, 28, 0.92)";
        ctx.fillRect(-155, -24, 310, 48);
        ctx.strokeStyle = "#2ea44f";
        ctx.lineWidth = 3;
        ctx.strokeRect(-155, -24, 310, 48);
        ctx.fillStyle = "#2ea44f";
        ctx.font = "bold 16px 'Press Start 2P', monospace";
        ctx.textAlign = "center";
        ctx.fillText("CASE #104 SOLVED", 0, 6);
        ctx.restore();
    }

    if (hoveredKey) {
        drawCommitTooltip(hoveredKey, state.evidenceFiles[hoveredKey], state.branches[hoveredKey]);
    }
}

function drawEvidencePortalView() {
    animTick++;
    if (canvas) canvas.style.cursor = "default";
    const state = window.GameState;
    const evKey = state.activeBranch;
    const ev = state.evidenceFiles[evKey];

    ctx.fillStyle = "#0a0e16";
    ctx.fillRect(0, 0, 960, 540);

    ctx.strokeStyle = "#111724";
    ctx.lineWidth = 1;
    for (let x = 0; x < 960; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 540);
        ctx.stroke();
    }

    ctx.fillStyle = "#131926";
    ctx.fillRect(24, 32, 340, 476);
    ctx.strokeStyle = "#2a344a";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 32, 340, 476);

    if (ev) {
        drawEvidenceArt(evKey, 38, 48, 72, 48, animTick);
        ctx.strokeStyle = "#e1b12c";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(38, 48, 72, 48);
    }

    ctx.fillStyle = "#e1b12c";
    ctx.font = "bold 16px 'VT323', monospace";
    ctx.textAlign = "left";
    drawWrappedText(ev ? ev.title : evKey, 120, 66, 230, 19);

    ctx.strokeStyle = "#262e3e";
    ctx.beginPath();
    ctx.moveTo(38, 114);
    ctx.lineTo(350, 114);
    ctx.stroke();

    if (ev && ev.logs) {
        let py = 144;
        ev.logs.forEach((item) => {
            if (item.name) {
                ctx.fillStyle = "#0d121c";
                ctx.fillRect(38, py - 18, 312, 52);
                ctx.strokeStyle = item.suspect ? "rgba(235, 59, 90, 0.5)" : "#1f2738";
                ctx.lineWidth = 1;
                ctx.strokeRect(38, py - 18, 312, 52);

                ctx.fillStyle = "#f5f6fa";
                ctx.font = "13px 'Fira Code', monospace";
                ctx.fillText(`[${item.time}] ${item.name}`, 48, py + 2);

                ctx.fillStyle = item.suspect ? "#eb3b5a" : "#2ea44f";
                ctx.font = "bold 12px 'Fira Code', monospace";
                ctx.fillText(`STATUS: ${item.status}`, 48, py + 22);
                py += 64;
            } else if (item.quote) {
                ctx.fillStyle = "#0d121c";
                ctx.fillRect(38, py - 20, 312, 126);
                ctx.strokeStyle = "#26334d";
                ctx.strokeRect(38, py - 20, 312, 126);

                ctx.fillStyle = "#74b9ff";
                ctx.font = "13px 'Fira Code', monospace";
                py = drawWrappedText(item.quote, 50, py + 4, 288, 22) + 28;
            }
        });
    }

    ctx.fillStyle = "#131926";
    ctx.fillRect(380, 32, 556, 476);
    ctx.strokeStyle = "#2a344a";
    ctx.lineWidth = 2;
    ctx.strokeRect(380, 32, 556, 476);

    ctx.fillStyle = "#2ea44f";
    ctx.font = "bold 18px 'VT323', monospace";
    ctx.fillText("💻 FORENSIC CODE ANALYZER", 396, 66);

    ctx.strokeStyle = "#262e3e";
    ctx.beginPath();
    ctx.moveTo(396, 80);
    ctx.lineTo(920, 80);
    ctx.stroke();

    ctx.fillStyle = "#dcdde1";
    ctx.font = "16px 'VT323', monospace";
    if (ev && ev.taskPrompt) {
        drawWrappedText(ev.taskPrompt, 396, 106, 524, 20);
    }

    if (ev && ev.taskCompleted) {
        ctx.fillStyle = "rgba(46, 164, 79, 0.14)";
        ctx.fillRect(396, 406, 524, 46);
        ctx.strokeStyle = "#2ea44f";
        ctx.strokeRect(396, 406, 524, 46);
        ctx.fillStyle = "#2ea44f";
        ctx.font = "bold 16px 'VT323', monospace";
        const msgPreview = ev.commitMessage ? `: "${ev.commitMessage}"` : "";
        ctx.fillText(`✓ COMMITTED${msgPreview}`.slice(0, 62), 410, 434);
    } else if (ev && ev.puzzleSolved) {
        ctx.fillStyle = "rgba(56, 189, 248, 0.14)";
        ctx.fillRect(396, 406, 524, 46);
        ctx.strokeStyle = "#38bdf8";
        ctx.strokeRect(396, 406, 524, 46);
        ctx.fillStyle = "#7dd3fc";
        ctx.font = "bold 16px 'VT323', monospace";
        ctx.fillText("✓ CODE VERIFIED — RUN 'git commit' BELOW", 410, 434);
    } else {
        ctx.fillStyle = "rgba(225, 177, 44, 0.1)";
        ctx.fillRect(396, 406, 524, 46);
        ctx.strokeStyle = "rgba(225, 177, 44, 0.45)";
        ctx.strokeRect(396, 406, 524, 46);
        ctx.fillStyle = "#e1b12c";
        ctx.font = "bold 16px 'VT323', monospace";
        ctx.fillText("🧩 SOLVE THE CODE BLANK TO UNLOCK COMMIT", 410, 434);
    }
}

// ==================== LEVEL 02: FORENSIC INSPECTION VIEW ====================
function drawLevel2View() {
    animTick++;
    if (canvas) canvas.style.cursor = "default";
    const l2 = window.GameState.level2;
    const isSolved = l2.laserReverted && l2.alarmReverted;

    ctx.fillStyle = "#0a0e16";
    ctx.fillRect(0, 0, 960, 540);

    ctx.strokeStyle = "#111724";
    ctx.lineWidth = 1;
    for (let x = 0; x < 960; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 540);
        ctx.stroke();
    }

    ctx.fillStyle = "#131926";
    ctx.fillRect(24, 32, 340, 476);
    ctx.strokeStyle = "#2a344a";
    ctx.lineWidth = 2;
    ctx.strokeRect(24, 32, 340, 476);

    drawEvidenceArt("gallery", 38, 48, 72, 48, animTick);
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(38, 48, 72, 48);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 16px 'VT323', monospace";
    ctx.textAlign = "left";
    drawWrappedText("Case #208: Midnight Gallery Sabotage", 120, 66, 230, 19);

    ctx.strokeStyle = "#262e3e";
    ctx.beginPath();
    ctx.moveTo(38, 114);
    ctx.lineTo(350, 114);
    ctx.stroke();

    if (l2.paneMode === "BRIEFING") {
        ctx.fillStyle = "#0d121c";
        ctx.fillRect(38, 130, 312, 165);
        ctx.strokeStyle = "#26334d";
        ctx.strokeRect(38, 130, 312, 165);

        ctx.fillStyle = "#fde047";
        ctx.font = "bold 15px 'VT323', monospace";
        ctx.fillText("INCIDENT REPORT // 00:05", 50, 154);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "14px 'VT323', monospace";
        drawWrappedText(
            "The Starlight Diamond vanished at midnight without triggering the West Gallery laser grid or silent alarm. Audit the repository history to find and revert the sabotage.",
            50, 178, 288, 20
        );
    } else if (l2.paneMode === "LOG") {
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 14px 'VT323', monospace";
        ctx.fillText("📜 COMMIT HISTORY (git log)", 38, 134);

        let cy = 148;
        l2.commits.forEach((c) => {
            const isReverted = (c.hash === "8f4e11b" && l2.laserReverted) || (c.hash === "2c7b63e" && l2.alarmReverted);
            const isRevertCommit = c.hash.startsWith("rev-");

            ctx.fillStyle = "#0d121c";
            ctx.fillRect(38, cy, 312, 60);
            ctx.strokeStyle = isRevertCommit
                ? "#2ea44f"
                : (c.suspicious && !isReverted) ? "rgba(235, 59, 90, 0.55)" : "#1f2738";
            ctx.lineWidth = 1;
            ctx.strokeRect(38, cy, 312, 60);

            ctx.fillStyle = isRevertCommit ? "#2ea44f" : "#facc15";
            ctx.font = "bold 12px 'Fira Code', monospace";
            ctx.fillText(`${c.hash.replace("rev-", "")}  [${c.time}]  ${c.author}`, 48, cy + 18);

            ctx.fillStyle = isReverted ? "#64748b" : "#f1f5f9";
            ctx.font = "12px 'Fira Code', monospace";
            const label = isReverted ? `${c.message} (REVERTED)` : c.message;
            ctx.fillText(label.slice(0, 36), 48, cy + 38);

            cy += 68;
            if (cy > 440) return;
        });
    } else if (l2.paneMode === "SHOW") {
        const diff = l2.diffs[l2.inspectedHash] || l2.diffs["8f4e11b"];
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 14px 'VT323', monospace";
        ctx.fillText(`🔬 DIFF: ${diff.file} (${l2.inspectedHash})`, 38, 134);

        ctx.fillStyle = "#080b12";
        ctx.fillRect(38, 146, 312, 220);
        ctx.strokeStyle = "#26334d";
        ctx.strokeRect(38, 146, 312, 220);

        ctx.fillStyle = "#94a3b8";
        ctx.font = "12px 'Fira Code', monospace";
        ctx.fillText(`Author: ${diff.author}`, 48, 170);
        ctx.fillText(`Msg: ${diff.message}`, 48, 190);

        let dy = 222;
        diff.lines.forEach((ln) => {
            if (ln.type === "del") {
                ctx.fillStyle = "rgba(235, 59, 90, 0.18)";
                ctx.fillRect(44, dy - 14, 300, 22);
                ctx.fillStyle = "#fb7185";
            } else if (ln.type === "add") {
                ctx.fillStyle = "rgba(46, 164, 79, 0.18)";
                ctx.fillRect(44, dy - 14, 300, 22);
                ctx.fillStyle = "#4ade80";
            } else {
                ctx.fillStyle = "#94a3b8";
            }
            ctx.font = "11px 'Fira Code', monospace";
            ctx.fillText(ln.text, 48, dy);
            dy += 28;
        });
    } else if (l2.paneMode === "BLAME") {
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 14px 'VT323', monospace";
        ctx.fillText("🖐️ FINGERPRINT AUDIT: alarm.js", 38, 134);

        let by = 148;
        l2.blameLines.forEach((bl) => {
            ctx.fillStyle = "#0d121c";
            ctx.fillRect(38, by, 312, 64);
            ctx.strokeStyle = bl.suspect ? "rgba(235, 59, 90, 0.6)" : "#1f2738";
            ctx.strokeRect(38, by, 312, 64);

            ctx.fillStyle = bl.suspect ? "#fb7185" : "#38bdf8";
            ctx.font = "bold 11px 'Fira Code', monospace";
            ctx.fillText(`L${bl.num} | ${bl.hash} | @${bl.author}`, 48, by + 18);

            ctx.fillStyle = bl.suspect ? "#fde047" : "#cbd5e1";
            ctx.font = "11px 'Fira Code', monospace";
            ctx.fillText(bl.code, 48, by + 40);
            by += 72;
        });
    }

    ctx.fillStyle = "#131926";
    ctx.fillRect(380, 32, 556, 476);
    ctx.strokeStyle = "#2a344a";
    ctx.lineWidth = 2;
    ctx.strokeRect(380, 32, 556, 476);

    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 18px 'VT323', monospace";
    ctx.fillText("🛡️ GALLERY SECURITY DIAGNOSTICS", 396, 66);

    ctx.strokeStyle = "#262e3e";
    ctx.beginPath();
    ctx.moveTo(396, 80);
    ctx.lineTo(920, 80);
    ctx.stroke();

    if (l2.step === 5 && !l2.puzzleSolved) {
        ctx.fillStyle = "#dcdde1";
        ctx.font = "16px 'VT323', monospace";
        drawWrappedText(l2.taskPrompt, 396, 106, 524, 20);
    } else {
        ctx.fillStyle = "#0d121c";
        ctx.fillRect(396, 102, 524, 92);
        ctx.strokeStyle = l2.laserReverted ? "#2ea44f" : "#eb3b5a";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(396, 102, 524, 92);

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 16px 'VT323', monospace";
        ctx.fillText("SUBSYSTEM 01: WEST GALLERY LASER GRID (laser_grid.js)", 412, 128);
        ctx.fillStyle = l2.laserReverted ? "#2ea44f" : "#fb7185";
        ctx.font = "bold 15px 'Fira Code', monospace";
        ctx.fillText(
            l2.laserReverted ? "STATUS: ARMED (Reverted commit 8f4e11b)" : "STATUS: DISABLED — Tampered in commit 8f4e11b",
            412, 156
        );
        ctx.fillStyle = "#94a3b8";
        ctx.font = "14px 'VT323', monospace";
        ctx.fillText(
            l2.laserReverted ? "✓ Laser grid integrity verified." : "Inspect commit 8f4e11b with 'git show' and undo with 'git revert'.",
            412, 180
        );

        ctx.fillStyle = "#0d121c";
        ctx.fillRect(396, 212, 524, 92);
        ctx.strokeStyle = l2.alarmReverted ? "#2ea44f" : "#eb3b5a";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(396, 212, 524, 92);

        ctx.fillStyle = "#f8fafc";
        ctx.font = "bold 16px 'VT323', monospace";
        ctx.fillText("SUBSYSTEM 02: VAULT SILENT ALARM (alarm.js)", 412, 238);
        ctx.fillStyle = l2.alarmReverted ? "#2ea44f" : "#fb7185";
        ctx.font = "bold 15px 'Fira Code', monospace";
        ctx.fillText(
            l2.alarmReverted ? "STATUS: ARMED (Reverted commit 2c7b63e)" : "STATUS: DELAYED (999999ms) — Audit alarm.js",
            412, 266
        );
        ctx.fillStyle = "#94a3b8";
        ctx.font = "14px 'VT323', monospace";
        ctx.fillText(
            l2.alarmReverted ? "✓ Silent alarm response restored to 250ms." : "Run 'git blame alarm.js' to trace who altered the alarm delay.",
            412, 290
        );

        if (isSolved) {
            ctx.fillStyle = "rgba(46, 164, 79, 0.16)";
            ctx.fillRect(396, 322, 524, 66);
            ctx.strokeStyle = "#2ea44f";
            ctx.strokeRect(396, 322, 524, 66);
            ctx.fillStyle = "#4ade80";
            ctx.font = "bold 14px 'Press Start 2P', monospace";
            ctx.fillText("CASE #208 SOLVED!", 412, 350);
            ctx.fillStyle = "#e2e8f0";
            ctx.font = "16px 'VT323', monospace";
            ctx.fillText("Inside accomplice identified: Security Tech Victor Kane (v.kane)", 412, 374);
        }
    }

    if (isSolved) {
        ctx.fillStyle = "rgba(46, 164, 79, 0.14)";
        ctx.fillRect(396, 406, 524, 46);
        ctx.strokeStyle = "#2ea44f";
        ctx.strokeRect(396, 406, 524, 46);
        ctx.fillStyle = "#2ea44f";
        ctx.font = "bold 16px 'VT323', monospace";
        ctx.fillText("✓ GALLERY SECURITY RESTORED — CLICK WIN SCREEN ABOVE", 410, 434);
    } else if (l2.step === 5 && !l2.puzzleSolved) {
        ctx.fillStyle = "rgba(225, 177, 44, 0.1)";
        ctx.fillRect(396, 406, 524, 46);
        ctx.strokeStyle = "rgba(225, 177, 44, 0.45)";
        ctx.strokeRect(396, 406, 524, 46);
        ctx.fillStyle = "#e1b12c";
        ctx.font = "bold 16px 'VT323', monospace";
        ctx.fillText("🧩 IDENTIFY THE AUTHOR FROM GIT BLAME TO UNLOCK REVERT", 410, 434);
    } else {
        ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
        ctx.fillRect(396, 406, 524, 46);
        ctx.strokeStyle = "rgba(56, 189, 248, 0.45)";
        ctx.strokeRect(396, 406, 524, 46);
        ctx.fillStyle = "#7dd3fc";
        ctx.font = "bold 16px 'VT323', monospace";
        ctx.fillText("🕵️ USE FORENSIC GIT COMMANDS IN THE TERMINAL BELOW", 410, 434);
    }
}

function renderCanvasFrame() {
    const state = window.GameState;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (state.activeLevel === 2) {
        drawLevel2View();
        return;
    }

    if (state.currentView === "DESK") {
        drawDeskView();
    } else if (state.currentView === "CORKBOARD") {
        drawCorkboardView();
    } else if (state.currentView === "EVIDENCE_PORTAL") {
        drawEvidencePortalView();
    }
}