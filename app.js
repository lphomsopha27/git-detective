let audioCtx = null;
let soundEnabled = false;
let isHelperOpen = false;
let isCommitModalOpen = false;
let isHintOpen = false;
let isWinScreenOpen = false;
let isAdminModalOpen = false;
let isAdminAuthenticated = false;
let pendingWinLevel = null;
let winScreenLevel = 1;
let isGameActive = false;

// SHA-256 hash of the admin password so plain text is never stored in code
const ADMIN_HASH = "743215d21ee9adf0f31a08f5c195a1b680a3bf00837d53d7d1b106f99a0f5203";

function sha256(str) {
    const bytes = new TextEncoder().encode(str);
    const bitLen = bytes.length * 8;
    const totalLen = (((bytes.length + 8) >> 6) + 1) * 64;
    const buf = new Uint8Array(totalLen);
    buf.set(bytes);
    buf[bytes.length] = 0x80;

    const view = new DataView(buf.buffer);
    view.setUint32(totalLen - 8, Math.floor(bitLen / 0x100000000), false);
    view.setUint32(totalLen - 4, bitLen >>> 0, false);

    const H = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    const K = [
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];

    const rotr = (x, n) => (x >>> n) | (x << (32 - n));
    const w = new Uint32Array(64);

    for (let offset = 0; offset < totalLen; offset += 64) {
        for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4, false);
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }

        let [a, b, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i++) {
            const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (h + S1 + ch + K[i] + w[i]) >>> 0;
            const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) >>> 0;

            h = g;
            g = f;
            f = e;
            e = (d + temp1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) >>> 0;
        }

        H[0] = (H[0] + a) >>> 0;
        H[1] = (H[1] + b) >>> 0;
        H[2] = (H[2] + c) >>> 0;
        H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0;
        H[5] = (H[5] + f) >>> 0;
        H[6] = (H[6] + g) >>> 0;
        H[7] = (H[7] + h) >>> 0;
    }

    return H.map(v => v.toString(16).padStart(8, "0")).join("");
}

function toggleAudio() {
    soundEnabled = !soundEnabled;
    const gameBtn = document.getElementById("sound-btn");
    const homeBtn = document.getElementById("home-sound-btn");
    if (gameBtn) gameBtn.textContent = soundEnabled ? "🔊 ON" : "🔇 OFF";
    if (homeBtn) homeBtn.textContent = soundEnabled ? "🔊" : "🔇";

    if (soundEnabled && !audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playBeep(freq = 440, type = "sine", duration = 0.08) {
    if (!soundEnabled || !audioCtx) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

function playVictoryFanfare() {
    if (!soundEnabled || !audioCtx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
        setTimeout(() => playBeep(freq, "triangle", 0.16), idx * 110);
    });
}

function isAnyModalOpen() {
    return isHelperOpen || isCommitModalOpen || isHintOpen || isWinScreenOpen || isAdminModalOpen;
}

function isLevel1Complete() {
    const state = window.GameState;
    return Object.keys(state.evidenceFiles).every(k => state.branches[k] && state.branches[k].merged);
}

function isLevel2Complete() {
    const l2 = window.GameState.level2;
    return !!(l2 && l2.laserReverted && l2.alarmReverted);
}

// ==================== DECLUTTERED LEVEL 02 CANVAS RENDERER ====================
function drawRoundedBox(ctx, x, y, w, h, fill, stroke, lineWidth = 2) {
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.strokeRect(x, y, w, h);
    }
}

function renderLevel2CleanFrame() {
    const canvas = document.getElementById("gameCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const l2 = window.GameState.level2;
    const W = canvas.width;
    const H = canvas.height;

    ctx.fillStyle = "#070b14";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "rgba(56, 189, 248, 0.04)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 32) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 32) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
    }

    // 1. Top Header Strip (Case Title + 6-Step Progress Dots)
    drawRoundedBox(ctx, 36, 14, W - 72, 36, "#0d1424", "#22314f", 2);
    ctx.textAlign = "left";
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 13px 'Press Start 2P', monospace";
    ctx.fillText("CASE #208: MIDNIGHT GALLERY", 54, 38);

    const currentProgressStep = (l2.laserReverted && l2.alarmReverted) ? 7 : (l2.step || 1);
    const dotStartX = W - 210;
    for (let s = 1; s <= 6; s++) {
        const dx = dotStartX + (s - 1) * 26;
        const done = currentProgressStep > s;
        const active = currentProgressStep === s;
        ctx.fillStyle = done ? "#2ea44f" : (active ? "#facc15" : "#1e293b");
        ctx.fillRect(dx, 24, 18, 16);
        ctx.strokeStyle = active ? "#fef08a" : "#334155";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(dx, 24, 18, 16);

        ctx.fillStyle = (done || active) ? "#070b14" : "#64748b";
        ctx.textAlign = "center";
        ctx.font = "bold 14px 'VT323', monospace";
        ctx.fillText(String(s), dx + 9, 36);
    }

    // 2. Two Compact Subsystem Status Cards
    const cardW = (W - 88) / 2;
    const leftX = 36;
    const rightX = 52 + cardW;
    const cardY = 62;
    const cardH = 58;

    const laserOk = !!l2.laserReverted;
    drawRoundedBox(ctx, leftX, cardY, cardW, cardH, laserOk ? "#0b1f17" : "#1c1017", laserOk ? "#2ea44f" : "#fb7185", 2);
    ctx.textAlign = "left";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px 'VT323', monospace";
    ctx.fillText("SUBSYSTEM 01 // PERIMETER", leftX + 16, cardY + 21);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 17px 'Fira Code', monospace";
    ctx.fillText("laser_grid.js", leftX + 16, cardY + 45);

    ctx.textAlign = "right";
    ctx.fillStyle = laserOk ? "#4ade80" : "#fb7185";
    ctx.font = "bold 18px 'VT323', monospace";
    ctx.fillText(laserOk ? "✓ RESTORED" : "⚠ DISABLED (8f4e11b)", leftX + cardW - 16, cardY + 37);

    const alarmOk = !!l2.alarmReverted;
    drawRoundedBox(ctx, rightX, cardY, cardW, cardH, alarmOk ? "#0b1f17" : "#1c1017", alarmOk ? "#2ea44f" : "#fb7185", 2);
    ctx.textAlign = "left";
    ctx.fillStyle = "#94a3b8";
    ctx.font = "15px 'VT323', monospace";
    ctx.fillText("SUBSYSTEM 02 // SILENT ALARM", rightX + 16, cardY + 21);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 17px 'Fira Code', monospace";
    ctx.fillText("alarm.js", rightX + 16, cardY + 45);

    ctx.textAlign = "right";
    ctx.fillStyle = alarmOk ? "#4ade80" : "#fb7185";
    ctx.font = "bold 18px 'VT323', monospace";
    ctx.fillText(alarmOk ? "✓ RESTORED" : "⚠ DELAYED (2c7b63e)", rightX + cardW - 16, cardY + 37);

    // 3. Single Focused Workspace Card
    const mainX = 36;
    const mainY = 134;
    const mainW = W - 72;
    const mainH = H - mainY - 22;
    drawRoundedBox(ctx, mainX, mainY, mainW, mainH, "#0b1120", "#2c3e63", 2);

    const isStep5Puzzle = l2.step === 5 && !l2.puzzleSolved;
    const isSolved = laserOk && alarmOk;

    if (isSolved) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#4ade80";
        ctx.font = "bold 18px 'Press Start 2P', monospace";
        ctx.fillText("GALLERY SECURITY RESTORED", W / 2, mainY + 95);

        ctx.fillStyle = "#e2e8f0";
        ctx.font = "24px 'VT323', monospace";
        ctx.fillText("Both forged commits by v.kane have been safely reverted on main.", W / 2, mainY + 145);

        drawRoundedBox(ctx, mainX + 150, mainY + 180, mainW - 300, 96, "#081410", "#2ea44f", 2);
        ctx.fillStyle = "#86efac";
        ctx.font = "22px 'VT323', monospace";
        ctx.fillText("✓ 9e1f001 — Reverted laser grid shutdown", W / 2, mainY + 218);
        ctx.fillText("✓ 4d8a712 — Reverted silent alarm delay", W / 2, mainY + 252);
        return;
    }

    if (isStep5Puzzle) {
        ctx.textAlign = "center";
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 13px 'Press Start 2P', monospace";
        ctx.fillText("STEP 5: VERIFY THE ACCOMPLICE", W / 2, mainY + 36);

        ctx.fillStyle = "#cbd5e1";
        ctx.font = "21px 'VT323', monospace";
        ctx.fillText("Line 3 of alarm.js was modified by v.kane — fill in their username below:", W / 2, mainY + 66);
        return;
    }

    if (l2.paneMode === "SHOW" && l2.inspectedHash && l2.diffs[l2.inspectedHash]) {
        const diff = l2.diffs[l2.inspectedHash];
        ctx.textAlign = "left";
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 13px 'Press Start 2P', monospace";
        ctx.fillText(`COMMIT DIFF // ${l2.inspectedHash}`, mainX + 24, mainY + 34);

        ctx.textAlign = "right";
        ctx.fillStyle = "#94a3b8";
        ctx.font = "20px 'Fira Code', monospace";
        ctx.fillText(diff.file, mainX + mainW - 24, mainY + 34);

        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mainX + 20, mainY + 48);
        ctx.lineTo(mainX + mainW - 20, mainY + 48);
        ctx.stroke();

        ctx.textAlign = "left";
        let lineY = mainY + 84;
        diff.lines.forEach((lineObj) => {
            const text = typeof lineObj === "string" ? lineObj : (lineObj.text || "");
            const isRemove = text.trim().startsWith("-") || lineObj.type === "remove";
            const isAdd = text.trim().startsWith("+") || lineObj.type === "add";

            if (isRemove || isAdd) {
                ctx.fillStyle = isRemove ? "rgba(244, 63, 94, 0.14)" : "rgba(46, 164, 79, 0.14)";
                ctx.fillRect(mainX + 24, lineY - 22, mainW - 48, 32);
            }

            ctx.fillStyle = isRemove ? "#fb7185" : (isAdd ? "#4ade80" : "#cbd5e1");
            ctx.font = "17px 'Fira Code', monospace";
            ctx.fillText(text, mainX + 36, lineY);
            lineY += 38;
        });

        ctx.fillStyle = "#fde047";
        ctx.font = "21px 'VT323', monospace";
        ctx.fillText(
            l2.inspectedHash === "8f4e11b"
                ? "▶ Sabotage confirmed! Run 'git revert 8f4e11b' in the terminal to restore the lasers."
                : "▶ Inspect 'git show 8f4e11b' to check the laser grid commit.",
            mainX + 24,
            mainY + mainH - 22
        );
        return;
    }

    if (l2.paneMode === "BLAME") {
        ctx.textAlign = "left";
        ctx.fillStyle = "#fde047";
        ctx.font = "bold 13px 'Press Start 2P', monospace";
        ctx.fillText("GIT BLAME // alarm.js", mainX + 24, mainY + 34);

        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mainX + 20, mainY + 48);
        ctx.lineTo(mainX + mainW - 20, mainY + 48);
        ctx.stroke();

        const blameRows = [
            { hash: "a19c204", author: "m.chen", time: "18:10", code: "const alarmEnabled = true;", suspect: false },
            { hash: "a19c204", author: "m.chen", time: "18:10", code: "const sensorZone = 'WEST_GALLERY';", suspect: false },
            { hash: "2c7b63e", author: "v.kane", time: "23:58", code: "const alarmDelayMs = 999999;", suspect: true },
            { hash: "a19c204", author: "m.chen", time: "18:10", code: "export { alarmEnabled, alarmDelayMs };", suspect: false }
        ];

        let rowY = mainY + 88;
        blameRows.forEach((row) => {
            if (row.suspect) {
                drawRoundedBox(ctx, mainX + 24, rowY - 26, mainW - 48, 40, "rgba(244, 63, 94, 0.16)", "#fb7185", 1.5);
            }
            ctx.fillStyle = row.suspect ? "#fb7185" : "#64748b";
            ctx.font = "15px 'Fira Code', monospace";
            ctx.fillText(`${row.hash} (${row.author} ${row.time})`, mainX + 36, rowY);

            ctx.fillStyle = row.suspect ? "#fde047" : "#e2e8f0";
            ctx.fillText(row.code, mainX + 330, rowY);
            rowY += 50;
        });
        return;
    }

    if (l2.paneMode === "LOG") {
        ctx.textAlign = "left";
        ctx.fillStyle = "#38bdf8";
        ctx.font = "bold 13px 'Press Start 2P', monospace";
        ctx.fillText("REPOSITORY COMMIT LOG (main)", mainX + 24, mainY + 34);

        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mainX + 20, mainY + 48);
        ctx.lineTo(mainX + mainW - 20, mainY + 48);
        ctx.stroke();

        const visibleCommits = (l2.commits || []).slice(0, 5);
        let rowY = mainY + 64;
        visibleCommits.forEach((c) => {
            const cleanHash = c.hash.replace("rev-", "");
            const isSuspectUnreverted =
                (cleanHash === "8f4e11b" && !laserOk) ||
                (cleanHash === "2c7b63e" && !alarmOk);

            drawRoundedBox(
                ctx,
                mainX + 24,
                rowY,
                mainW - 48,
                44,
                isSuspectUnreverted ? "#1c121b" : "#0f172a",
                isSuspectUnreverted ? "#fb7185" : "#24324d",
                1.5
            );

            ctx.textAlign = "left";
            ctx.fillStyle = isSuspectUnreverted ? "#fde047" : "#38bdf8";
            ctx.font = "bold 15px 'Fira Code', monospace";
            ctx.fillText(cleanHash, mainX + 38, rowY + 27);

            ctx.fillStyle = "#f1f5f9";
            ctx.font = "21px 'VT323', monospace";
            ctx.fillText(c.message, mainX + 135, rowY + 28);

            ctx.textAlign = "right";
            ctx.fillStyle = isSuspectUnreverted ? "#fb7185" : "#94a3b8";
            ctx.font = "19px 'VT323', monospace";
            ctx.fillText(`${c.time} • ${c.author}`, mainX + mainW - 38, rowY + 28);

            rowY += 54;
        });
        return;
    }

    // Default BRIEFING view (Step 1)
    ctx.textAlign = "left";
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 14px 'Press Start 2P', monospace";
    ctx.fillText("INCIDENT BRIEFING", mainX + 28, mainY + 42);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(mainX + 28, mainY + 58);
    ctx.lineTo(mainX + mainW - 28, mainY + 58);
    ctx.stroke();

    const bullets = [
        "1. At 00:00, an intruder bypassed the West Gallery without triggering an alarm.",
        "2. Someone pushed disguised maintenance commits right before midnight.",
        "3. Audit the commit history, identify the insider, and revert both sabotage commits."
    ];

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "23px 'VT323', monospace";
    bullets.forEach((line, idx) => {
        ctx.fillText(line, mainX + 28, mainY + 104 + idx * 44);
    });

    drawRoundedBox(ctx, mainX + 28, mainY + mainH - 72, mainW - 56, 46, "#111c33", "#38bdf8", 2);
    ctx.fillStyle = "#7dd3fc";
    ctx.font = "bold 22px 'VT323', monospace";
    ctx.fillText("▶ START AUDIT: Type 'git log' in the terminal below to view recent commits.", mainX + 46, mainY + mainH - 42);
}

// ==================== HIDDEN ADMIN CONTROLS ====================
function openAdminModal() {
    const modal = document.getElementById("admin-modal-overlay");
    const authSection = document.getElementById("admin-auth-section");
    const controlsSection = document.getElementById("admin-controls-section");
    const passInput = document.getElementById("admin-password-input");
    const errEl = document.getElementById("admin-password-error");
    const badgeStatus = document.getElementById("admin-badge-status");

    if (!modal) return;

    const appShell = document.getElementById("app-shell");
    if (appShell && !appShell.classList.contains("hidden")) {
        appShell.classList.add("opacity-30", "brightness-50", "pointer-events-none");
    }

    if (isAdminAuthenticated) {
        authSection.classList.add("hidden");
        controlsSection.classList.remove("hidden");
        if (badgeStatus) {
            badgeStatus.textContent = seenCommands.size >= Object.keys(COMMAND_HELPERS).length ? "✓ ALL UNLOCKED" : "UNLOCK";
        }
    } else {
        controlsSection.classList.add("hidden");
        authSection.classList.remove("hidden");
        if (errEl) errEl.classList.add("hidden");
        if (passInput) passInput.value = "";
    }

    modal.classList.remove("hidden");
    isAdminModalOpen = true;
    playBeep(520, "triangle", 0.08);

    if (!isAdminAuthenticated && passInput) {
        setTimeout(() => passInput.focus(), 25);
    }
}

function closeAdminModal() {
    const appShell = document.getElementById("app-shell");
    if (appShell) {
        appShell.classList.remove("opacity-30", "brightness-50", "pointer-events-none");
    }
    const modal = document.getElementById("admin-modal-overlay");
    if (modal) modal.classList.add("hidden");
    isAdminModalOpen = false;

    const input = document.getElementById("terminal-input");
    if (input && isGameActive && !isAnyModalOpen()) input.focus();
}

function verifyAdminPassword() {
    const passInput = document.getElementById("admin-password-input");
    const errEl = document.getElementById("admin-password-error");
    if (!passInput) return;

    if (sha256(passInput.value.trim()) === ADMIN_HASH) {
        isAdminAuthenticated = true;
        if (errEl) errEl.classList.add("hidden");
        document.getElementById("admin-auth-section").classList.add("hidden");
        document.getElementById("admin-controls-section").classList.remove("hidden");
        playBeep(740, "triangle", 0.14);
    } else {
        if (errEl) errEl.classList.remove("hidden");
        playBeep(200, "sawtooth", 0.16);
        passInput.value = "";
        passInput.focus();
    }
}

function forceCompleteLevel1Data() {
    const state = window.GameState;
    const defaultCommits = {
        atTheScene: "Verified Vault Tech unverified presence at 22:15",
        videologs: "Confirmed Cam_01_Vault signal cut tamper",
        witness1: "Matched getaway sedan plate prefix X99",
        witness2: "Confirmed OVERRIDE clearance required for lock bypass"
    };

    Object.keys(state.evidenceFiles).forEach((key) => {
        const ev = state.evidenceFiles[key];
        ev.puzzleSolved = true;
        ev.taskCompleted = true;
        if (!ev.commitMessage) {
            ev.commitMessage = defaultCommits[key] || "Verified forensic lead";
        }
        state.branches[key] = { pinned: true, merged: true };
    });

    ["status", "branch", "checkout", "commit", "merge"].forEach(cmd => seenCommands.add(cmd));
    state.activeBranch = "main";
    state.currentView = "CORKBOARD";
    state.currentStep = 7;
    updateAchievementCounters();
    saveProgress();
}

function forceCompleteLevel2Data() {
    forceCompleteLevel1Data();
    const l2 = window.GameState.level2;
    l2.paneMode = "LOG";
    l2.inspectedHash = "8f4e11b";
    l2.blameChecked = true;
    l2.puzzleSolved = true;
    l2.step = 7;

    if (!l2.laserReverted) {
        l2.laserReverted = true;
        l2.commits.unshift({
            hash: "rev-9e1f001",
            author: "detective",
            time: "00:12",
            message: "Revert \"Routine laser grid maintenance\"",
            file: "laser_grid.js",
            suspicious: false
        });
    }

    if (!l2.alarmReverted) {
        l2.alarmReverted = true;
        l2.commits.unshift({
            hash: "rev-4d8a712",
            author: "detective",
            time: "00:15",
            message: "Revert \"Optimize silent alarm threshold\"",
            file: "alarm.js",
            suspicious: false
        });
    }

    ["log", "show", "blame", "revert"].forEach(cmd => seenCommands.add(cmd));
    updateAchievementCounters();
    saveProgress();
}

function adminSkipToLevel2() {
    if (!isAdminAuthenticated) return;
    forceCompleteLevel1Data();
    closeAdminModal();
    refreshHomeScreen();
    startLevel2(!isLevel2Complete());
    window.writeOutput("[ADMIN OVERRIDE] Level 01 skipped. Welcome to Case #208!", "text-rose-400 font-bold");
    playVictoryFanfare();
}

function adminCompleteLevel1Win() {
    if (!isAdminAuthenticated) return;
    forceCompleteLevel1Data();
    window.GameState.activeLevel = 1;
    saveProgress();
    closeAdminModal();
    refreshHomeScreen();
    syncCodePuzzleOverlay();
    updateInstructionBanner();
    openWinScreen(1);
}

function adminSkipLevel2Win() {
    if (!isAdminAuthenticated) return;
    forceCompleteLevel2Data();
    window.GameState.activeLevel = 2;
    saveProgress();
    closeAdminModal();
    refreshHomeScreen();
    syncCodePuzzleOverlay();
    updateInstructionBanner();
    openWinScreen(2);
}

function adminUnlockAllBadges() {
    if (!isAdminAuthenticated) return;
    Object.keys(COMMAND_HELPERS).forEach(k => seenCommands.add(k));
    saveProgress();
    updateAchievementCounters();
    refreshHomeScreen();
    if (!document.getElementById("achievements-subview").classList.contains("hidden")) {
        renderAchievements();
    }
    const badgeStatus = document.getElementById("admin-badge-status");
    if (badgeStatus) badgeStatus.textContent = "✓ ALL UNLOCKED";
    playBeep(780, "triangle", 0.14);
}

// ==================== YOU WIN SCREEN & CERTIFICATE GENERATOR ====================
const LEVEL_WIN_META = {
    1: {
        caseTag: "CASE #104",
        subtitle: "CASE #104: METROPOLITAN BANK HEIST",
        shortTitle: "Metropolitan Bank Heist",
        headline: "METROPOLITAN BANK HEIST SOLVED!",
        verdictHtml: "All 4 evidence leads were isolated on separate branches, forensically verified, committed, and merged cleanly into <code class=\"text-emerald-400\">main</code>. Culprit identified: <strong class=\"text-rose-400\">VAULT TECH</strong>.",
        certSummary: "For isolating, verifying, and merging all 4 leads in Case #104: Metropolitan Bank Heist",
        culpritText: "CULPRIT IDENTIFIED: SENIOR VAULT TECH",
        commitHash: "7c3e91a",
        commands: ["status", "branch", "checkout", "commit", "merge"]
    },
    2: {
        caseTag: "CASE #208",
        subtitle: "CASE #208: MIDNIGHT GALLERY SABOTAGE",
        shortTitle: "Midnight Gallery Sabotage",
        headline: "MIDNIGHT GALLERY SABOTAGE SOLVED!",
        verdictHtml: "The repository audit uncovered both tampered security commits, traced the line-by-line fingerprints, and safely reverted the sabotage. Accomplice caught: <strong class=\"text-rose-400\">VICTOR KANE (v.kane)</strong>.",
        certSummary: "For auditing history, tracing fingerprints, and reverting sabotage in Case #208: Midnight Gallery",
        culpritText: "ACCOMPLICE CAUGHT: VICTOR KANE (v.kane)",
        commitHash: "4d8a712",
        commands: ["log", "show", "blame", "revert"]
    }
};

function getFormattedDate() {
    try {
        return new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });
    } catch (e) {
        return "2026";
    }
}

function getDetectiveRank() {
    if (isLevel1Complete() && isLevel2Complete()) return "MASTER FORENSIC INSPECTOR";
    if (winScreenLevel === 2) return "SENIOR FORENSIC INSPECTOR";
    return "CERTIFIED CODE DETECTIVE";
}

function openWinScreen(levelNum = 1) {
    winScreenLevel = levelNum;
    const meta = LEVEL_WIN_META[levelNum] || LEVEL_WIN_META[1];

    document.getElementById("win-case-subtitle").textContent = meta.subtitle;
    document.getElementById("win-headline").textContent = meta.headline;
    document.getElementById("win-verdict-text").innerHTML = meta.verdictHtml;

    const listEl = document.getElementById("win-commands-list");
    const countBadge = document.getElementById("win-cmd-count-badge");
    if (listEl) {
        listEl.innerHTML = "";
        meta.commands.forEach((cmdKey) => {
            const info = COMMAND_HELPERS[cmdKey];
            if (!info) return;
            const row = document.createElement("div");
            row.className = "bg-[#080d19] border border-[#233354] p-2.5 flex items-start gap-2.5";
            row.innerHTML = `
                <span class="text-lg shrink-0">${info.icon}</span>
                <div class="min-w-0">
                    <div class="flex items-center gap-2">
                        <span class="font-code text-xs sm:text-sm font-bold text-[#fde047]">${info.title}</span>
                        <span class="font-terminal text-xs px-1.5 bg-emerald-950 text-emerald-400 border border-emerald-500/40">✓</span>
                    </div>
                    <p class="font-terminal text-sm text-gray-300 leading-tight mt-0.5">${info.git}</p>
                </div>
            `;
            listEl.appendChild(row);
        });
    }
    if (countBadge) countBadge.textContent = `${meta.commands.length} COMMANDS`;

    const nameInput = document.getElementById("cert-detective-name");
    if (nameInput) {
        nameInput.value = window.GameState.detectiveName || "";
    }
    document.getElementById("cert-download-toast").classList.add("hidden");
    updateCertificatePreview();

    const nextBtn = document.getElementById("win-next-level-btn");
    if (nextBtn) {
        if (levelNum === 1) {
            nextBtn.textContent = "NEXT CASE: LEVEL 02 ▶";
            nextBtn.classList.remove("hidden");
        } else {
            nextBtn.textContent = "🏆 VIEW ALL BADGES";
            nextBtn.classList.remove("hidden");
        }
    }

    const appShell = document.getElementById("app-shell");
    if (appShell && !appShell.classList.contains("hidden")) {
        appShell.classList.add("opacity-30", "brightness-50", "pointer-events-none");
    }

    document.getElementById("win-screen-overlay").classList.remove("hidden");
    isWinScreenOpen = true;
    playVictoryFanfare();

    if (nameInput) {
        setTimeout(() => nameInput.focus(), 40);
    }
}

function closeWinScreen() {
    const appShell = document.getElementById("app-shell");
    if (appShell) {
        appShell.classList.remove("opacity-30", "brightness-50", "pointer-events-none");
    }
    document.getElementById("win-screen-overlay").classList.add("hidden");
    isWinScreenOpen = false;

    const input = document.getElementById("terminal-input");
    if (input && isGameActive && !isAnyModalOpen()) input.focus();
}

function inspectSolvedLevelFromWin() {
    const targetLevel = winScreenLevel;
    closeWinScreen();
    if (targetLevel === 2) {
        startLevel2(false);
    } else {
        startLevel1(false);
    }
}

function goToNextLevelFromWin() {
    const currentWinLevel = winScreenLevel;
    closeWinScreen();
    if (currentWinLevel === 1) {
        startLevel2(false);
    } else {
        openHomeScreen("ACHIEVEMENTS");
    }
}

function updateCertificatePreview() {
    const nameInput = document.getElementById("cert-detective-name");
    const rawName = nameInput ? nameInput.value.trim() : "";
    window.GameState.detectiveName = rawName;
    saveProgress();

    const displayName = rawName || "Junior Git Detective";
    const meta = LEVEL_WIN_META[winScreenLevel] || LEVEL_WIN_META[1];

    document.getElementById("cert-preview-name").textContent = displayName;
    document.getElementById("cert-preview-case").textContent = `For solving ${meta.subtitle}`;
    document.getElementById("cert-preview-meta").innerHTML = `
        <span>RANK: ${getDetectiveRank()}</span>
        <span>${getFormattedDate().toUpperCase()}</span>
    `;
}

function downloadCertificate() {
    const nameInput = document.getElementById("cert-detective-name");
    const rawName = nameInput ? nameInput.value.trim() : "";
    const detectiveName = rawName || "Junior Git Detective";
    window.GameState.detectiveName = rawName;
    saveProgress();

    const meta = LEVEL_WIN_META[winScreenLevel] || LEVEL_WIN_META[1];
    const dateStr = getFormattedDate();
    const rankStr = getDetectiveRank();

    const certCanvas = document.createElement("canvas");
    certCanvas.width = 1200;
    certCanvas.height = 850;
    const c = certCanvas.getContext("2d");

    c.fillStyle = "#080d1a";
    c.fillRect(0, 0, 1200, 850);

    c.strokeStyle = "rgba(56, 189, 248, 0.06)";
    c.lineWidth = 1;
    for (let gx = 0; gx < 1200; gx += 30) {
        c.beginPath();
        c.moveTo(gx, 0);
        c.lineTo(gx, 850);
        c.stroke();
    }
    for (let gy = 0; gy < 850; gy += 30) {
        c.beginPath();
        c.moveTo(0, gy);
        c.lineTo(1200, gy);
        c.stroke();
    }

    c.strokeStyle = "#facc15";
    c.lineWidth = 8;
    c.strokeRect(28, 28, 1144, 794);

    c.strokeStyle = "#38bdf8";
    c.lineWidth = 2;
    c.strokeRect(46, 46, 1108, 758);

    c.fillStyle = "#facc15";
    const corners = [
        [24, 24], [1148, 24], [24, 798], [1148, 798]
    ];
    corners.forEach(([cx, cy]) => c.fillRect(cx, cy, 28, 28));

    if (typeof drawPixelTrophy === "function") {
        drawPixelTrophy(c, 600, 68, 4, 0);
    }

    c.textAlign = "center";
    c.fillStyle = "#38bdf8";
    c.font = "bold 22px 'VT323', monospace";
    c.fillText("GIT DETECTIVE BUREAU  •  VERSION CONTROL INVESTIGATION DIVISION", 600, 166);

    c.fillStyle = "#fde047";
    c.font = "bold 30px 'Press Start 2P', monospace";
    c.fillText("CERTIFICATE OF MERIT", 600, 214);

    c.strokeStyle = "#263654";
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(160, 238);
    c.lineTo(1040, 238);
    c.stroke();

    c.fillStyle = "#94a3b8";
    c.font = "bold 24px 'VT323', monospace";
    c.fillText("THIS OFFICIAL COMMENDATION IS PRESENTED TO", 600, 278);

    c.fillStyle = "#ffffff";
    c.font = "bold 62px 'VT323', monospace";
    c.fillText(detectiveName, 600, 342);

    const nameWidth = Math.min(760, Math.max(340, c.measureText(detectiveName).width + 80));
    c.strokeStyle = "#facc15";
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(600 - nameWidth / 2, 356);
    c.lineTo(600 + nameWidth / 2, 356);
    c.stroke();

    c.fillStyle = "#e2e8f0";
    c.font = "26px 'VT323', monospace";
    c.fillText(meta.certSummary, 600, 398);

    c.fillStyle = "#fb7185";
    c.font = "bold 24px 'VT323', monospace";
    c.fillText(`${meta.culpritText}   |   RANK AWARDED: ${rankStr}`, 600, 432);

    c.fillStyle = "#0d1526";
    c.fillRect(110, 462, 980, 224);
    c.strokeStyle = "#38bdf8";
    c.lineWidth = 2;
    c.strokeRect(110, 462, 980, 224);

    c.fillStyle = "#38bdf8";
    c.font = "bold 22px 'VT323', monospace";
    c.fillText("VERIFIED GIT COMMANDS MASTERED IN THIS INVESTIGATION", 600, 492);

    c.textAlign = "left";
    let cmdY = 528;
    meta.commands.forEach((cmdKey) => {
        const info = COMMAND_HELPERS[cmdKey];
        if (!info) return;
        c.fillStyle = "#2ea44f";
        c.font = "bold 22px 'VT323', monospace";
        c.fillText("✓", 136, cmdY);

        c.fillStyle = "#fde047";
        c.font = "bold 21px 'Fira Code', monospace";
        c.fillText(info.title, 164, cmdY);

        c.fillStyle = "#cbd5e1";
        c.font = "21px 'VT323', monospace";
        const desc = info.git.length > 74 ? info.git.slice(0, 71) + "..." : info.git;
        c.fillText(`— ${desc}`, 435, cmdY);
        cmdY += 32;
    });

    c.textAlign = "left";
    c.fillStyle = "#94a3b8";
    c.font = "22px 'VT323', monospace";
    c.fillText(`DATE ISSUED: ${dateStr}`, 110, 742);
    c.fillText(`VERIFIED COMMIT HASH: #${meta.commitHash}`, 110, 770);

    c.save();
    c.translate(970, 745);
    c.rotate(-0.08);
    c.strokeStyle = "#2ea44f";
    c.lineWidth = 3;
    c.strokeRect(-115, -26, 230, 52);
    c.fillStyle = "rgba(46, 164, 79, 0.14)";
    c.fillRect(-115, -26, 230, 52);
    c.fillStyle = "#4ade80";
    c.textAlign = "center";
    c.font = "bold 22px 'VT323', monospace";
    c.fillText(`${meta.caseTag} • CASE CLOSED`, 0, 7);
    c.restore();

    const safeFileName = detectiveName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "detective";
    const link = document.createElement("a");
    link.download = `git-detective-case-${winScreenLevel === 2 ? "208" : "104"}-${safeFileName}.png`;
    link.href = certCanvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    const toast = document.getElementById("cert-download-toast");
    if (toast) toast.classList.remove("hidden");
    playVictoryFanfare();
}

// ==================== HOME & SUB-VIEWS ====================
function openSubView(viewName) {
    const titleView = document.getElementById("title-menu-view");
    const levelsView = document.getElementById("levels-subview");
    const achView = document.getElementById("achievements-subview");

    titleView.classList.add("hidden");
    levelsView.classList.add("hidden");
    achView.classList.add("hidden");

    if (viewName === "LEVELS") {
        refreshHomeScreen();
        levelsView.classList.remove("hidden");
    } else if (viewName === "ACHIEVEMENTS") {
        renderAchievements();
        achView.classList.remove("hidden");
    } else {
        refreshHomeScreen();
        titleView.classList.remove("hidden");
    }
    playBeep(500, "triangle", 0.06);
}

function openHomeScreen(subView = "TITLE") {
    isGameActive = false;
    document.getElementById("app-shell").classList.add("hidden");
    document.getElementById("home-screen").classList.remove("hidden");
    openSubView(subView);
}

function handleLevelPrimaryClick(levelNum) {
    if (levelNum === 1) {
        if (isLevel1Complete()) {
            openWinScreen(1);
        } else {
            startLevel1(false);
        }
    } else if (levelNum === 2) {
        if (!isLevel1Complete()) return;
        if (isLevel2Complete()) {
            openWinScreen(2);
        } else {
            startLevel2(false);
        }
    }
}

function handleLevelCardClick(levelNum, event) {
    if (event.target.closest("button")) return;
    if (levelNum === 1 && isLevel1Complete()) {
        openWinScreen(1);
    } else if (levelNum === 2 && isLevel1Complete() && isLevel2Complete()) {
        openWinScreen(2);
    }
}

function updateAchievementCounters() {
    const total = Object.keys(COMMAND_HELPERS).length;
    const unlocked = seenCommands.size;

    const gameCounter = document.getElementById("game-badge-counter");
    const titleBadges = document.getElementById("title-badges-stat");
    const summaryPill = document.getElementById("achievements-summary-pill");

    if (gameCounter) gameCounter.textContent = `${unlocked}/${total}`;
    if (titleBadges) titleBadges.textContent = `${unlocked}/${total} BADGES`;
    if (summaryPill) summaryPill.textContent = `${unlocked} / ${total} UNLOCKED`;
}

function refreshHomeScreen() {
    const state = window.GameState;
    const totalLeads = Object.keys(state.evidenceFiles).length;
    const mergedCount = Object.keys(state.evidenceFiles).filter(k => state.branches[k] && state.branches[k].merged).length;
    const hasStarted = state.currentStep > 1 || Object.keys(state.branches).length > 1;
    const level1Solved = mergedCount === totalLeads;

    const l2 = state.level2;
    const l2RevertedCount = (l2.laserReverted ? 1 : 0) + (l2.alarmReverted ? 1 : 0);
    const level2Solved = l2RevertedCount === 2;
    const level2Started = l2.step > 1 || l2.paneMode !== "BRIEFING";

    const titleLeads = document.getElementById("title-leads-stat");
    if (titleLeads) titleLeads.textContent = `${mergedCount + l2RevertedCount}/6 CLUES`;

    const l1Card = document.getElementById("level1-card");
    const badge = document.getElementById("level1-status-badge");
    const progressText = document.getElementById("level1-progress-text");
    const playBtn = document.getElementById("level1-play-btn");
    const boardBtn = document.getElementById("level1-board-btn");
    const replayBtn = document.getElementById("level1-replay-btn");

    if (progressText) progressText.textContent = `${mergedCount} / ${totalLeads}`;

    if (level1Solved) {
        if (l1Card) l1Card.classList.add("cursor-pointer", "hover:border-emerald-400");
        if (badge) {
            badge.textContent = "✓ SOLVED";
            badge.className = "px-2.5 py-0.5 bg-[#182d1e] text-emerald-400 border border-emerald-500/50 font-terminal text-base";
        }
        if (playBtn) {
            playBtn.textContent = "🏆 WIN SCREEN";
            playBtn.className = "pixel-btn pixel-btn-amber flex-1 py-3 px-3 bg-amber-500 hover:bg-amber-400 border-2 border-yellow-200 font-pixel text-[10px] sm:text-xs text-[#090d16] cursor-pointer";
        }
        if (boardBtn) boardBtn.classList.remove("hidden");
        if (replayBtn) replayBtn.classList.remove("hidden");
    } else if (hasStarted) {
        if (l1Card) l1Card.classList.remove("cursor-pointer", "hover:border-emerald-400");
        if (badge) {
            badge.textContent = "● IN PROGRESS";
            badge.className = "px-2.5 py-0.5 bg-[#2b2310] text-[#fde047] border border-yellow-500/50 font-terminal text-base";
        }
        if (playBtn) {
            playBtn.textContent = "▶ CONTINUE";
            playBtn.className = "pixel-btn pixel-btn-emerald flex-1 py-3 px-3 bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-200 font-pixel text-xs text-white cursor-pointer";
        }
        if (boardBtn) boardBtn.classList.add("hidden");
        if (replayBtn) replayBtn.classList.remove("hidden");
    } else {
        if (l1Card) l1Card.classList.remove("cursor-pointer", "hover:border-emerald-400");
        if (badge) {
            badge.textContent = "● READY";
            badge.className = "px-2.5 py-0.5 bg-[#162847] text-sky-300 border border-sky-500/50 font-terminal text-base";
        }
        if (playBtn) {
            playBtn.textContent = "▶ START";
            playBtn.className = "pixel-btn pixel-btn-emerald flex-1 py-3 px-3 bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-200 font-pixel text-xs text-white cursor-pointer";
        }
        if (boardBtn) boardBtn.classList.add("hidden");
        if (replayBtn) replayBtn.classList.add("hidden");
    }

    const l2Card = document.getElementById("level2-card");
    const l2BadgeNum = document.getElementById("level2-badge-num");
    const l2Status = document.getElementById("level2-status-badge");
    const l2Title = document.getElementById("level2-title");
    const l2Desc = document.getElementById("level2-desc");
    const l2Tags = document.getElementById("level2-tags");
    const l2Progress = document.getElementById("level2-progress-text");
    const l2PlayBtn = document.getElementById("level2-play-btn");
    const l2BoardBtn = document.getElementById("level2-board-btn");
    const l2ReplayBtn = document.getElementById("level2-replay-btn");

    if (l2Progress) l2Progress.textContent = `${l2RevertedCount} / 2`;

    if (level1Solved) {
        if (l2Card) {
            l2Card.className = level2Solved
                ? "bg-[#10182b] border-2 border-[#38bdf8] hover:border-emerald-400 p-5 flex flex-col justify-between shadow-[0_6px_0_#050811] transition-all cursor-pointer"
                : "bg-[#10182b] border-2 border-[#38bdf8] p-5 flex flex-col justify-between shadow-[0_6px_0_#050811] transition-all";
        }
        if (l2BadgeNum) l2BadgeNum.className = "px-2.5 py-1 bg-[#38bdf8] text-[#090d16] font-pixel text-[10px]";
        if (l2Title) l2Title.className = "text-white font-pixel text-xs sm:text-sm leading-relaxed mb-2";
        if (l2Desc) l2Desc.className = "text-gray-300 font-terminal text-lg leading-snug mb-4";
        if (l2Progress) l2Progress.className = "text-[#38bdf8] font-bold";
        if (l2Tags) {
            l2Tags.innerHTML = `
                <span class="px-2 py-0.5 bg-[#080c17] text-[#7dd3fc] border border-[#2c3a57]">git log</span>
                <span class="px-2 py-0.5 bg-[#080c17] text-[#7dd3fc] border border-[#2c3a57]">git show</span>
                <span class="px-2 py-0.5 bg-[#080c17] text-[#7dd3fc] border border-[#2c3a57]">git blame</span>
                <span class="px-2 py-0.5 bg-[#080c17] text-[#7dd3fc] border border-[#2c3a57]">git revert</span>
            `;
        }

        if (l2PlayBtn) {
            l2PlayBtn.disabled = false;
        }

        if (level2Solved) {
            if (l2Status) {
                l2Status.textContent = "✓ SOLVED";
                l2Status.className = "px-2.5 py-0.5 bg-[#182d1e] text-emerald-400 border border-emerald-500/50 font-terminal text-base";
            }
            if (l2PlayBtn) {
                l2PlayBtn.textContent = "🏆 WIN SCREEN";
                l2PlayBtn.className = "pixel-btn pixel-btn-amber flex-1 py-3 px-3 bg-amber-500 hover:bg-amber-400 border-2 border-yellow-200 font-pixel text-[10px] sm:text-xs text-[#090d16] cursor-pointer";
            }
            if (l2BoardBtn) l2BoardBtn.classList.remove("hidden");
            if (l2ReplayBtn) l2ReplayBtn.classList.remove("hidden");
        } else if (level2Started) {
            if (l2Status) {
                l2Status.textContent = "● IN PROGRESS";
                l2Status.className = "px-2.5 py-0.5 bg-[#2b2310] text-[#fde047] border border-yellow-500/50 font-terminal text-base";
            }
            if (l2PlayBtn) {
                l2PlayBtn.textContent = "▶ CONTINUE";
                l2PlayBtn.className = "pixel-btn pixel-btn-emerald flex-1 py-3 px-3 bg-sky-600 hover:bg-sky-500 border-2 border-sky-200 font-pixel text-xs text-white cursor-pointer";
            }
            if (l2BoardBtn) l2BoardBtn.classList.add("hidden");
            if (l2ReplayBtn) l2ReplayBtn.classList.remove("hidden");
        } else {
            if (l2Status) {
                l2Status.textContent = "● READY";
                l2Status.className = "px-2.5 py-0.5 bg-[#162847] text-sky-300 border border-sky-500/50 font-terminal text-base";
            }
            if (l2PlayBtn) {
                l2PlayBtn.textContent = "▶ START";
                l2PlayBtn.className = "pixel-btn pixel-btn-emerald flex-1 py-3 px-3 bg-sky-600 hover:bg-sky-500 border-2 border-sky-200 font-pixel text-xs text-white cursor-pointer";
            }
            if (l2BoardBtn) l2BoardBtn.classList.add("hidden");
            if (l2ReplayBtn) l2ReplayBtn.classList.add("hidden");
        }
    } else {
        if (l2Card) l2Card.className = "bg-[#0c111f] border-2 border-[#25314a] p-5 flex flex-col justify-between opacity-75 transition-all";
        if (l2BadgeNum) l2BadgeNum.className = "px-2.5 py-1 bg-[#1e293b] text-gray-400 font-pixel text-[10px]";
        if (l2Status) {
            l2Status.textContent = "🔒 LOCKED";
            l2Status.className = "px-2.5 py-0.5 bg-[#161e2e] text-gray-400 border border-[#2e3b56] font-terminal text-base";
        }
        if (l2Title) l2Title.className = "text-gray-300 font-pixel text-xs sm:text-sm leading-relaxed mb-2";
        if (l2Desc) l2Desc.className = "text-gray-400 font-terminal text-lg leading-snug mb-4";
        if (l2Progress) l2Progress.className = "text-gray-400 font-bold";
        if (l2Tags) {
            l2Tags.innerHTML = `
                <span class="px-2 py-0.5 bg-[#080b14] text-gray-500 border border-[#1f293d]">🔒 git log</span>
                <span class="px-2 py-0.5 bg-[#080b14] text-gray-500 border border-[#1f293d]">🔒 git show</span>
                <span class="px-2 py-0.5 bg-[#080b14] text-gray-500 border border-[#1f293d]">🔒 git blame</span>
                <span class="px-2 py-0.5 bg-[#080b14] text-gray-500 border border-[#1f293d]">🔒 git revert</span>
            `;
        }
        if (l2PlayBtn) {
            l2PlayBtn.disabled = true;
            l2PlayBtn.textContent = "🔒 SOLVE LEVEL 01 FIRST";
            l2PlayBtn.className = "flex-1 py-3 px-3 bg-[#161e2e] text-gray-500 font-pixel text-xs border-2 border-[#26324a] cursor-not-allowed";
        }
        if (l2BoardBtn) l2BoardBtn.classList.add("hidden");
        if (l2ReplayBtn) l2ReplayBtn.classList.add("hidden");
    }

    updateAchievementCounters();
}

function renderAchievements() {
    const grid = document.getElementById("achievements-grid");
    if (!grid) return;

    grid.innerHTML = "";
    updateAchievementCounters();

    Object.keys(COMMAND_HELPERS).forEach(key => {
        const cmd = COMMAND_HELPERS[key];
        const isUnlocked = seenCommands.has(key);
        const card = document.createElement("div");

        if (isUnlocked) {
            card.className = "bg-[#10182b] border-2 border-[#facc15] p-3.5 flex flex-col justify-between shadow-lg";
            card.innerHTML = `
                <div>
                    <div class="flex items-center justify-between gap-2 mb-1.5">
                        <span class="text-xl">${cmd.icon}</span>
                        <span class="px-2 py-0.5 bg-[#182d1e] text-emerald-400 border border-emerald-500/50 font-terminal text-sm font-bold">✓ LEARNED</span>
                    </div>
                    <div class="text-[#fde047] font-terminal font-bold text-xl">${cmd.title}</div>
                    <div class="text-white font-pixel text-[10px] mt-1 mb-1.5">${cmd.badgeName.toUpperCase()}</div>
                    <p class="text-gray-300 font-terminal text-base leading-snug">${cmd.metaphor}</p>
                </div>
                <div class="mt-2.5 pt-2 border-t border-[#1f2b42] text-sm font-terminal text-sky-300">
                    💻 ${cmd.git}
                </div>
            `;
        } else {
            const hintText = cmd.level === 2
                ? `🔒 Use '${cmd.title.split(" ")[0]} ${key}' in Level 02`
                : `🔒 Use '${cmd.title.split(" ")[0]} ${key}' in Level 01`;

            card.className = "bg-[#0c111f] border-2 border-[#232f47] p-3.5 flex flex-col justify-between opacity-65";
            card.innerHTML = `
                <div>
                    <div class="flex items-center justify-between gap-2 mb-1.5">
                        <span class="text-xl">🔒</span>
                        <span class="px-2 py-0.5 bg-[#161e2e] text-gray-300 border border-[#2c3a57] font-terminal text-sm font-bold">LOCKED</span>
                    </div>
                    <div class="text-gray-300 font-terminal font-bold text-xl">${cmd.title}</div>
                    <div class="text-gray-400 font-pixel text-[10px] mt-1 mb-1.5">??? LOCKED</div>
                    <p class="text-gray-400 font-terminal text-base leading-snug">
                        Run this Git command during a case to unlock its badge.
                    </p>
                </div>
                <div class="mt-2.5 pt-2 border-t border-[#1a2234] text-sm font-terminal text-gray-400">
                    ${hintText}
                </div>
            `;
        }
        grid.appendChild(card);
    });
}

function resetAllProgress() {
    if (!confirm("Reset all saved progress and command badges?")) return;
    seenCommands.clear();
    window.GameState.activeLevel = 1;
    window.GameState.detectiveName = "";
    resetLevel1State();
    resetLevel2State();

    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    setCookie(SAVE_KEY, "", -1);

    refreshHomeScreen();
    renderAchievements();
    syncCodePuzzleOverlay();
    updateInstructionBanner();
    playBeep(280, "sawtooth", 0.14);
}

function startLevel1(forceReset = false) {
    window.GameState.activeLevel = 1;
    if (forceReset) {
        resetLevel1State();
    }
    saveProgress();

    document.getElementById("home-screen").classList.add("hidden");
    document.getElementById("app-shell").classList.remove("hidden");
    isGameActive = true;

    const history = document.getElementById("terminal-history");
    if (history) {
        history.innerHTML = "";
        window.writeOutput("detective-os v2.4 [repo: case-104-bank-heist]");
        window.writeOutput(
            window.GameState.currentStep > 1
                ? `Resumed session on branch '${window.GameState.activeBranch}'.`
                : "On branch main. Working tree clean.",
            window.GameState.currentStep > 1 ? "text-[#fde047]" : "text-gray-300"
        );
    }

    syncCodePuzzleOverlay();
    updateInstructionBanner();
    const input = document.getElementById("terminal-input");
    if (input) input.focus();
}

function startLevel2(forceReset = false) {
    if (!isLevel1Complete()) return;

    window.GameState.activeLevel = 2;
    if (forceReset) {
        resetLevel2State();
    }
    saveProgress();

    document.getElementById("home-screen").classList.add("hidden");
    document.getElementById("app-shell").classList.remove("hidden");
    isGameActive = true;

    const history = document.getElementById("terminal-history");
    if (history) {
        history.innerHTML = "";
        window.writeOutput("detective-os v2.4 [repo: case-208-gallery-security]");
        window.writeOutput("ALERT: West Gallery perimeter compromised at 00:00. Audit main branch commits.", "text-[#38bdf8]");
    }

    syncCodePuzzleOverlay();
    updateInstructionBanner();
    const input = document.getElementById("terminal-input");
    if (input) input.focus();
}

// ==================== FILL-IN-THE-BLANK CODE PUZZLE ====================
function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getActivePuzzleTarget() {
    const state = window.GameState;
    if (state.activeLevel === 2) {
        const l2 = state.level2;
        if (l2.step === 5 && !l2.puzzleSolved) return l2;
        return null;
    }
    if (state.currentView === "EVIDENCE_PORTAL" && state.evidenceFiles[state.activeBranch]) {
        return state.evidenceFiles[state.activeBranch];
    }
    return null;
}

function syncCodePuzzleOverlay() {
    const overlay = document.getElementById("code-puzzle-overlay");
    const linesContainer = document.getElementById("code-puzzle-lines");
    const feedbackEl = document.getElementById("code-puzzle-feedback");
    const verifyBtn = document.getElementById("code-verify-btn");

    if (!overlay || !linesContainer) return;

    const target = getActivePuzzleTarget();
    if (!target) {
        overlay.classList.add("hidden");
        return;
    }

    if (window.GameState.activeLevel === 2) {
        overlay.style.left = "14%";
        overlay.style.top = "39%";
        overlay.style.width = "72%";
        overlay.style.height = "49%";
    } else {
        overlay.style.left = "41.25%";
        overlay.style.top = "28.89%";
        overlay.style.width = "54.583%";
        overlay.style.height = "41.48%";
    }

    overlay.classList.remove("hidden");

    linesContainer.innerHTML = target.codeLines.map((rawLine, idx) => {
        const lineNum = `<span class="text-gray-500 select-none mr-2.5">${idx + 1}</span>`;
        const isComment = rawLine.trim().startsWith("//");

        if (rawLine.includes("{{BLANK}}")) {
            const parts = rawLine.split("{{BLANK}}");
            const safeBefore = escapeHtml(parts[0]).replace(/ /g, "&nbsp;");
            const safeAfter = escapeHtml(parts[1]).replace(/ /g, "&nbsp;");

            if (target.puzzleSolved) {
                return `<div class="leading-relaxed whitespace-nowrap">${lineNum}<span>${safeBefore}</span><span class="px-1.5 py-0.5 bg-emerald-900/60 border border-emerald-400 text-emerald-300 font-bold">${escapeHtml(target.blankAnswer)}</span><span>${safeAfter}</span></div>`;
            }

            return `<div class="leading-relaxed whitespace-nowrap">${lineNum}<span>${safeBefore}</span><input id="code-blank-input" type="text" autocomplete="off" placeholder="${target.blankPlaceholder || "???"}" class="mx-0.5 px-1.5 py-0.5 w-28 bg-[#121929] border-2 border-[#facc15] focus:border-[#38bdf8] text-[#fde047] font-code text-xs sm:text-sm outline-none" /><span>${safeAfter}</span></div>`;
        }

        const formatted = escapeHtml(rawLine).replace(/ /g, "&nbsp;");
        return `<div class="leading-relaxed whitespace-nowrap ${isComment ? "text-[#6a9955]" : "text-[#58a6ff]"}">${lineNum}${formatted}</div>`;
    }).join("");

    if (target.puzzleSolved) {
        feedbackEl.textContent = "✓ Verified!";
        feedbackEl.className = "font-terminal text-sm sm:text-base text-emerald-400 truncate";
        verifyBtn.textContent = "SOLVED ✓";
        verifyBtn.disabled = true;
        verifyBtn.className = "px-2.5 py-0.5 bg-emerald-900/60 text-emerald-300 font-pixel text-[9px] sm:text-[10px] border border-emerald-500/50 shrink-0";
    } else {
        feedbackEl.textContent = window.GameState.activeLevel === 2
            ? "Enter the username flagged in git blame and click VERIFY"
            : "Fill in the blank using the clue on the left";
        feedbackEl.className = "font-terminal text-sm sm:text-base text-gray-400 truncate";
        verifyBtn.textContent = "VERIFY";
        verifyBtn.disabled = false;
        verifyBtn.className = "px-2.5 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white font-pixel text-[9px] sm:text-[10px] border border-emerald-300 shrink-0 cursor-pointer";

        const blankInput = document.getElementById("code-blank-input");
        if (blankInput) {
            blankInput.addEventListener("keydown", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault();
                    verifyCodePuzzle();
                }
            });
            setTimeout(() => blankInput.focus(), 30);
        }
    }
}

function verifyCodePuzzle() {
    const state = window.GameState;
    const target = getActivePuzzleTarget();
    const blankInput = document.getElementById("code-blank-input");
    const feedbackEl = document.getElementById("code-puzzle-feedback");

    if (!target || target.puzzleSolved || !blankInput) return;

    const cleaned = blankInput.value.trim().replace(/^["'@#]+|["']+$/g, "").toUpperCase();
    const expected = target.blankAnswer.trim().replace(/^["'@#]+|["']+$/g, "").toUpperCase();

    if (cleaned === expected) {
        target.puzzleSolved = true;
        if (state.activeLevel === 2) {
            state.level2.step = 6;
            window.writeOutput("[analyzer] Accomplice 'v.kane' flagged. Now revert commit 2c7b63e to restore the alarm!", "text-emerald-400");
        } else {
            window.writeOutput(`[analyzer] Code verified on '${state.activeBranch}'. Ready to run 'git commit'.`, "text-emerald-400");
        }
        saveProgress();
        syncCodePuzzleOverlay();
        updateInstructionBanner();
        playBeep(660, "triangle", 0.14);

        const termInput = document.getElementById("terminal-input");
        if (termInput) termInput.focus();
    } else {
        feedbackEl.textContent = "✕ Mismatch — check the blame output above!";
        feedbackEl.className = "font-terminal text-sm sm:text-base text-rose-400 truncate";
        blankInput.classList.remove("border-[#facc15]");
        blankInput.classList.add("border-rose-500");
        playBeep(220, "sawtooth", 0.14);
        blankInput.focus();
    }
}

// ==================== COMMIT MESSAGE MODAL (LEVEL 01) ====================
function openCommitModal() {
    const state = window.GameState;
    const modal = document.getElementById("commit-modal-overlay");
    const branchLabel = document.getElementById("commit-branch-label");
    const msgInput = document.getElementById("commit-msg-input");
    const errEl = document.getElementById("commit-modal-error");

    if (!modal || !msgInput) return;

    branchLabel.textContent = `branch: ${state.activeBranch}`;
    msgInput.value = "";
    errEl.classList.add("hidden");

    const appShell = document.getElementById("app-shell");
    if (appShell) appShell.classList.add("opacity-30", "brightness-50", "pointer-events-none");

    modal.classList.remove("hidden");
    isCommitModalOpen = true;
    playBeep(540, "triangle", 0.08);
    setTimeout(() => msgInput.focus(), 20);
}

function closeCommitModal() {
    const appShell = document.getElementById("app-shell");
    if (appShell) appShell.classList.remove("opacity-30", "brightness-50", "pointer-events-none");

    document.getElementById("commit-modal-overlay").classList.add("hidden");
    isCommitModalOpen = false;

    const input = document.getElementById("terminal-input");
    if (input && isGameActive && !isAnyModalOpen()) input.focus();
}

function finalizeCommit(message) {
    const state = window.GameState;
    const ev = state.evidenceFiles[state.activeBranch];
    if (!ev) return;

    ev.taskCompleted = true;
    ev.commitMessage = message;
    if (state.currentStep === 4 && state.activeBranch === "atTheScene") {
        state.currentStep = 5;
    }

    updateInstructionBanner();
    saveProgress();

    window.writeOutput(`[${state.activeBranch} 7c3e91a] ${message}`, "text-[#2ea44f]");
    showHelperCard("commit");
}

function submitCommitMessage() {
    const msgInput = document.getElementById("commit-msg-input");
    const errEl = document.getElementById("commit-modal-error");
    if (!msgInput) return;

    const msg = msgInput.value.trim();
    if (msg.length < 3) {
        errEl.classList.remove("hidden");
        playBeep(220, "sawtooth", 0.12);
        msgInput.focus();
        return;
    }

    closeCommitModal();
    finalizeCommit(msg);
}

// ==================== DETECTIVE HINT MODAL ====================
function getContextualHint() {
    const state = window.GameState;

    if (state.activeLevel === 2) {
        const l2 = state.level2;
        if (l2.laserReverted && l2.alarmReverted) {
            return {
                stage: "CASE #208 SOLVED",
                body: "Both forged commits have been reverted and gallery security is back online!",
                cmd: "Click WIN SCREEN in the top bar to claim & download your certificate."
            };
        }
        if (l2.step === 1) {
            return {
                stage: "STEP 1: AUDIT COMMIT TIMELINE",
                body: "List the recent commits on the gallery repository to find suspicious late-night changes.",
                cmd: "git log"
            };
        }
        if (l2.step === 2) {
            return {
                stage: "STEP 2: INSPECT COMMIT DIFF",
                body: "Examine commit 8f4e11b ('Routine laser grid maintenance' at 23:49) to see what it actually changed.",
                cmd: "git show 8f4e11b"
            };
        }
        if (l2.step === 3) {
            return {
                stage: "STEP 3: REVERT LASER SABOTAGE",
                body: "Commit 8f4e11b disabled the West Gallery laser grid. Undo it cleanly with a revert commit.",
                cmd: "git revert 8f4e11b"
            };
        }
        if (l2.step === 4) {
            return {
                stage: "STEP 4: TRACE ALARM FINGERPRINTS",
                body: "Subsystem 02 shows alarm.js was delayed to 999999ms. Dust alarm.js to see who edited it.",
                cmd: "git blame alarm.js"
            };
        }
        if (l2.step === 5) {
            return {
                stage: "STEP 5: FLAG THE ACCOMPLICE",
                body: l2.blankHint,
                cmd: `Type "${l2.blankAnswer}" into the yellow code box and click VERIFY.`
            };
        }
        return {
            stage: "STEP 6: REVERT ALARM SABOTAGE",
            body: "Now undo v.kane's second malicious commit (2c7b63e) to restore the 250ms silent alarm.",
            cmd: "git revert 2c7b63e"
        };
    }

    const allKeys = Object.keys(state.evidenceFiles);
    const mergedCount = allKeys.filter(k => state.branches[k] && state.branches[k].merged).length;

    if (mergedCount === allKeys.length) {
        return {
            stage: "CASE #104 SOLVED",
            body: "All 4 leads have been investigated, committed, and merged into main! Level 02 is now unlocked.",
            cmd: "Click WIN SCREEN in the top bar to download your certificate!"
        };
    }

    if (state.currentView === "DESK") {
        return {
            stage: "STEP 1: INSPECT THE BOARD",
            body: "Check your repository status to walk over to the detective corkboard.",
            cmd: "git status"
        };
    }

    if (state.currentView === "EVIDENCE_PORTAL") {
        const branch = state.activeBranch;
        const ev = state.evidenceFiles[branch];

        if (!ev.puzzleSolved) {
            return {
                stage: `CODE PUZZLE (${branch})`,
                body: ev.blankHint,
                cmd: `Type "${ev.blankAnswer}" into the yellow code box and click VERIFY.`
            };
        }
        if (!ev.taskCompleted) {
            return {
                stage: `COMMIT FINDINGS (${branch})`,
                body: "Your forensic code fix is verified! Now seal your findings onto this branch.",
                cmd: "git commit"
            };
        }
        return {
            stage: "RETURN TO MAIN BOARD",
            body: "Your findings are committed on this branch. Switch back to main so you can merge them.",
            cmd: "git checkout main"
        };
    }

    const readyToMerge = allKeys.find(k => state.branches[k] && state.evidenceFiles[k].taskCompleted && !state.branches[k].merged);
    if (readyToMerge) {
        return {
            stage: `MERGE LEAD (${readyToMerge})`,
            body: `You committed findings on '${readyToMerge}'. Connect its red thread to the main suspect board.`,
            cmd: `git merge ${readyToMerge}`
        };
    }

    const nextLead = allKeys.find(k => !state.branches[k] || !state.branches[k].merged);
    if (nextLead) {
        if (!state.branches[nextLead]) {
            return {
                stage: `ISOLATE LEAD (${nextLead})`,
                body: `Create a dedicated investigation branch for '${nextLead}' before checking it out.`,
                cmd: `git branch ${nextLead}`
            };
        }
        return {
            stage: `INVESTIGATE LEAD (${nextLead})`,
            body: `Branch '${nextLead}' is pinned on the board. Switch into that branch to examine its evidence.`,
            cmd: `git checkout ${nextLead}`
        };
    }

    return {
        stage: "INVESTIGATION",
        body: "Use git status to inspect your current case state.",
        cmd: "git status"
    };
}

function openHintModal() {
    const hint = getContextualHint();
    document.getElementById("hint-stage-label").textContent = hint.stage;
    document.getElementById("hint-body-text").textContent = hint.body;
    document.getElementById("hint-cmd-box").textContent = `> ${hint.cmd}`;

    const appShell = document.getElementById("app-shell");
    if (appShell) appShell.classList.add("opacity-30", "brightness-50", "pointer-events-none");

    document.getElementById("hint-modal-overlay").classList.remove("hidden");
    isHintOpen = true;
    playBeep(580, "triangle", 0.08);
}

function closeHintModal() {
    const appShell = document.getElementById("app-shell");
    if (appShell) appShell.classList.remove("opacity-30", "brightness-50", "pointer-events-none");

    document.getElementById("hint-modal-overlay").classList.add("hidden");
    isHintOpen = false;

    const input = document.getElementById("terminal-input");
    if (input && isGameActive && !isAnyModalOpen()) input.focus();
}

// ==================== FIELD MANUAL MODAL ====================
function showHelperCard(cmdKey) {
    if (seenCommands.has(cmdKey) || !COMMAND_HELPERS[cmdKey]) return false;
    seenCommands.add(cmdKey);
    saveProgress();
    updateAchievementCounters();

    const info = COMMAND_HELPERS[cmdKey];
    document.getElementById("helper-cmd-title").textContent = info.title;
    document.getElementById("helper-cmd-tag").textContent = info.tag;
    document.getElementById("helper-metaphor-text").textContent = info.metaphor;
    document.getElementById("helper-git-text").textContent = info.git;

    const appShell = document.getElementById("app-shell");
    if (appShell) appShell.classList.add("opacity-30", "brightness-50", "pointer-events-none");

    document.getElementById("helper-card-overlay").classList.remove("hidden");
    isHelperOpen = true;

    const input = document.getElementById("terminal-input");
    if (input) input.blur();
    playBeep(520, "triangle", 0.12);
    return true;
}

function closeHelperCard() {
    const appShell = document.getElementById("app-shell");
    if (appShell) appShell.classList.remove("opacity-30", "brightness-50", "pointer-events-none");

    document.getElementById("helper-card-overlay").classList.add("hidden");
    isHelperOpen = false;

    if (pendingWinLevel) {
        const lvl = pendingWinLevel;
        pendingWinLevel = null;
        openWinScreen(lvl);
        return;
    }

    const input = document.getElementById("terminal-input");
    if (input && isGameActive && !isAnyModalOpen()) input.focus();
}

function triggerLevelCompletionWin(levelNum) {
    if (isHelperOpen) {
        pendingWinLevel = levelNum;
    } else {
        setTimeout(() => {
            if (!isWinScreenOpen) openWinScreen(levelNum);
        }, 650);
    }
}

// ==================== TERMINAL & MISSION BANNER ====================
window.writeOutput = function(text, color = "text-gray-300") {
    const history = document.getElementById("terminal-history");
    if (!history) return;
    const line = document.createElement("div");
    line.className = `${color} whitespace-pre-wrap leading-tight font-terminal`;
    line.textContent = text;
    history.appendChild(line);
    history.scrollTop = history.scrollHeight;
    playBeep(600, "square", 0.03);
};

window.triggerScreenFade = function(callback) {
    const overlay = document.getElementById("fade-overlay");
    if (!overlay) {
        callback();
        syncCodePuzzleOverlay();
        updateInstructionBanner();
        saveProgress();
        return;
    }

    overlay.style.opacity = "1";
    setTimeout(() => {
        callback();
        syncCodePuzzleOverlay();
        updateInstructionBanner();
        saveProgress();
        setTimeout(() => { overlay.style.opacity = "0"; }, 100);
    }, 180);
};

function updateInstructionBanner() {
    const state = window.GameState;
    const banner = document.getElementById("instruction-banner");
    const textEl = document.getElementById("instruction-text");
    const winBtn = document.getElementById("win-banner-btn");
    if (!banner || !textEl) return;

    if (state.activeLevel === 2) {
        const l2 = state.level2;
        if (l2.laserReverted && l2.alarmReverted) {
            textEl.textContent = "🏆 CASE #208 SOLVED! Both forged commits reverted and gallery security restored.";
            banner.classList.replace("border-[#e1b12c]", "border-[#2ea44f]");
            textEl.classList.replace("text-[#fde047]", "text-[#2ea44f]");
            if (winBtn) winBtn.classList.remove("hidden");
            return;
        }

        if (winBtn) winBtn.classList.add("hidden");
        banner.classList.replace("border-[#2ea44f]", "border-[#e1b12c]");
        textEl.classList.replace("text-[#2ea44f]", "text-[#fde047]");

        if (l2.step === 1) {
            textEl.textContent = "🎯 Step 1: Type 'git log' to audit the gallery security commit history.";
        } else if (l2.step === 2) {
            textEl.textContent = "🎯 Step 2: Inspect the suspicious 23:49 commit with 'git show 8f4e11b'.";
        } else if (l2.step === 3) {
            textEl.textContent = "🎯 Step 3: Laser grid was disabled! Undo it cleanly with 'git revert 8f4e11b'.";
        } else if (l2.step === 4) {
            textEl.textContent = "🎯 Step 4: Audit who tampered with the silent alarm using 'git blame alarm.js'.";
        } else if (l2.step === 5) {
            textEl.textContent = "🧩 Step 5: Fill in the accomplice's username from git blame and click VERIFY.";
        } else {
            textEl.textContent = "🎯 Step 6: Revert v.kane's alarm sabotage commit ('git revert 2c7b63e').";
        }
        return;
    }

    const allKeys = Object.keys(state.evidenceFiles);
    const mergedCount = allKeys.filter(k => state.branches[k] && state.branches[k].merged).length;
    const allSolved = mergedCount === allKeys.length;
    const trainingWheelsOff = mergedCount >= 2;

    if (allSolved) {
        textEl.textContent = "🏆 CASE #104 SOLVED! All 4 evidence leads verified and merged into main.";
        banner.classList.replace("border-[#e1b12c]", "border-[#2ea44f]");
        textEl.classList.replace("text-[#fde047]", "text-[#2ea44f]");
        if (winBtn) winBtn.classList.remove("hidden");
        return;
    }

    if (winBtn) winBtn.classList.add("hidden");
    banner.classList.replace("border-[#2ea44f]", "border-[#e1b12c]");
    textEl.classList.replace("text-[#2ea44f]", "text-[#fde047]");

    if (state.currentView === "DESK") {
        textEl.textContent = "🎯 Step 1: Type 'git status' to inspect the Corkboard.";
        return;
    }

    if (state.currentView === "EVIDENCE_PORTAL") {
        const ev = state.evidenceFiles[state.activeBranch];
        if (ev && !ev.puzzleSolved) {
            textEl.textContent = `🧩 Fill in the missing code value for '${state.activeBranch}' and click VERIFY.`;
        } else if (ev && !ev.taskCompleted) {
            textEl.textContent = "💾 Code verified! Type 'git commit' to log your commit message.";
        } else {
            textEl.textContent = trainingWheelsOff
                ? "🎯 Findings committed! Return to the main corkboard to merge."
                : "🎯 Findings committed! Return to the corkboard by typing 'git checkout main'.";
        }
        return;
    }

    const readyToMerge = allKeys.find(k => state.branches[k] && state.evidenceFiles[k].taskCompleted && !state.branches[k].merged);
    if (readyToMerge) {
        textEl.textContent = `🎯 File verified lead into main case by typing 'git merge ${readyToMerge}'.`;
        return;
    }

    const nextLead = allKeys.find(k => !state.branches[k] || !state.branches[k].merged);
    if (nextLead) {
        if (trainingWheelsOff) {
            const remaining = allKeys.filter(k => !state.branches[k] || !state.branches[k].merged);
            textEl.textContent = `🕵️ Training Wheels Off (${mergedCount}/4): Isolate & investigate '${remaining.join(", ")}' on your own!`;
        } else if (!state.branches[nextLead]) {
            textEl.textContent = `🎯 Lead ${mergedCount + 1}/4: Pin the lead by typing 'git branch ${nextLead}'.`;
        } else {
            textEl.textContent = `🎯 Lead ${mergedCount + 1}/4: Investigate lead by typing 'git checkout ${nextLead}'.`;
        }
    }
}

// ==================== LEVEL 02 GIT HANDLER ====================
function resolveLevel2Hash(inputHash) {
    if (!inputHash || inputHash.length < 4) return null;
    const clean = inputHash.toLowerCase();
    const validHashes = ["8f4e11b", "2c7b63e", "5d2a90c", "a19c204"];
    return validHashes.find(h => h.startsWith(clean)) || null;
}

function handleLevel2GitCommand(subCmd, args) {
    const l2 = window.GameState.level2;

    if (subCmd === "status") {
        const remaining = (l2.laserReverted ? 0 : 1) + (l2.alarmReverted ? 0 : 1);
        window.writeOutput(`On branch main\nUnreverted sabotage commits remaining: ${remaining}`);
        showHelperCard("status");
        return;
    }

    if (subCmd === "log") {
        l2.paneMode = "LOG";
        if (l2.step === 1) l2.step = 2;
        updateInstructionBanner();
        saveProgress();

        const summary = l2.commits
            .map(c => `${c.hash.replace("rev-", "")} (${c.time}) <${c.author}> ${c.message}`)
            .join("\n");
        window.writeOutput(summary, "text-[#fde047]");
        showHelperCard("log");
        return;
    }

    if (subCmd === "show") {
        const target = resolveLevel2Hash(args[0]);
        if (!target) {
            return window.writeOutput("fatal: bad object. Run 'git log' and pass a valid commit hash (e.g., git show 8f4e11b).", "text-red-400");
        }

        l2.paneMode = "SHOW";
        l2.inspectedHash = target;
        if (l2.step <= 2 && target === "8f4e11b") {
            l2.step = 3;
        }
        updateInstructionBanner();
        saveProgress();

        const diff = l2.diffs[target];
        window.writeOutput(`commit ${target} | file: ${diff.file}\n${diff.lines.map(l => l.text).join("\n")}`, "text-[#58a6ff]");
        showHelperCard("show");
        return;
    }

    if (subCmd === "blame") {
        const fileArg = (args[0] || "").toLowerCase();
        if (!fileArg) {
            return window.writeOutput("usage: git blame <file>  (hint: check Subsystem 02's filename: alarm.js)", "text-yellow-400");
        }
        if (fileArg !== "alarm.js" && fileArg !== "laser_grid.js") {
            return window.writeOutput(`fatal: no such path '${args[0]}' in HEAD. Try 'git blame alarm.js'.`, "text-red-400");
        }

        l2.paneMode = "BLAME";
        l2.blameChecked = true;
        if (l2.step <= 4) {
            l2.step = 5;
        }
        syncCodePuzzleOverlay();
        updateInstructionBanner();
        saveProgress();

        window.writeOutput("2c7b63e (v.kane 23:58 3) const alarmDelayMs = 999999;", "text-[#fde047]");
        showHelperCard("blame");
        return;
    }

    if (subCmd === "revert") {
        const target = resolveLevel2Hash(args[0]);
        if (!target) {
            return window.writeOutput("fatal: bad revision. Specify a valid commit hash (e.g., git revert 8f4e11b).", "text-red-400");
        }

        if (target === "8f4e11b") {
            if (l2.laserReverted) {
                return window.writeOutput("Commit 8f4e11b has already been reverted.", "text-yellow-400");
            }
            l2.laserReverted = true;
            l2.paneMode = "LOG";
            l2.commits.unshift({
                hash: "rev-9e1f001",
                author: "detective",
                time: "00:12",
                message: "Revert \"Routine laser grid maintenance\"",
                file: "laser_grid.js",
                suspicious: false
            });
            if (l2.step <= 3) l2.step = 4;
            updateInstructionBanner();
            saveProgress();

            window.writeOutput("[main 9e1f001] Revert \"Routine laser grid maintenance\"", "text-[#2ea44f]");
            showHelperCard("revert");
            return;
        }

        if (target === "2c7b63e") {
            if (!l2.puzzleSolved) {
                playBeep(220, "sawtooth", 0.14);
                return window.writeOutput("error: run 'git blame alarm.js' and verify the accomplice ID in the analyzer first!", "text-red-400");
            }
            if (l2.alarmReverted) {
                return window.writeOutput("Commit 2c7b63e has already been reverted.", "text-yellow-400");
            }
            l2.alarmReverted = true;
            l2.paneMode = "LOG";
            l2.step = 7;
            l2.commits.unshift({
                hash: "rev-4d8a712",
                author: "detective",
                time: "00:15",
                message: "Revert \"Optimize silent alarm threshold\"",
                file: "alarm.js",
                suspicious: false
            });
            syncCodePuzzleOverlay();
            updateInstructionBanner();
            saveProgress();

            window.writeOutput("[main 4d8a712] Revert \"Optimize silent alarm threshold\"", "text-[#2ea44f]");
            window.writeOutput("CASE #208 SOLVED: All gallery security systems restored!", "text-[#2ea44f] font-bold");
            showHelperCard("revert");
            triggerLevelCompletionWin(2);
            return;
        }

        return window.writeOutput(`warning: commit ${target} is a legitimate maintenance commit—do not revert it!`, "text-yellow-400");
    }

    window.writeOutput(`git: '${subCmd}' is not needed for this forensic audit. Use: git log | git show <hash> | git blame <file> | git revert <hash>`, "text-gray-400");
}

// ==================== LEVEL 01 GIT HANDLER ====================
function handleGitCommand(subCmd, args, rawCmd) {
    const state = window.GameState;
    if (state.activeLevel === 2) {
        return handleLevel2GitCommand(subCmd, args);
    }

    if (subCmd === "status") {
        if (state.currentView === "DESK") {
            window.triggerScreenFade(() => {
                state.currentView = "CORKBOARD";
                if (state.currentStep === 1) state.currentStep = 2;
            });
        } else {
            saveProgress();
        }
        const unpinned = Object.keys(state.evidenceFiles).filter(k => !state.branches[k]);
        window.writeOutput(`On branch ${state.activeBranch}\nUnpinned leads remaining: ${unpinned.length > 0 ? unpinned.join(", ") : "none"}`);
        showHelperCard("status");
        return;
    }

    if (subCmd === "branch" && (args[0] === "-a" || !args[0])) {
        const branchList = Object.keys(state.branches).map(b => (b === state.activeBranch ? `* ${b}` : `  ${b}`)).join("\n");
        window.writeOutput(branchList, "text-[#58a6ff]");
        return;
    }

    if (subCmd === "branch") {
        const name = args[0];
        if (!state.evidenceFiles[name]) {
            return window.writeOutput(`fatal: '${name}' is not a valid lead. Available: atTheScene, videologs, witness1, witness2`, "text-red-400");
        }
        if (state.branches[name]) {
            return window.writeOutput(`fatal: A branch named '${name}' already exists.`, "text-yellow-400");
        }

        state.branches[name] = { pinned: true, merged: false };
        if (state.currentView === "DESK") state.currentView = "CORKBOARD";
        if (state.currentStep === 2 && name === "atTheScene") state.currentStep = 3;
        updateInstructionBanner();
        saveProgress();

        window.writeOutput(`Created branch '${name}' from main.`, "text-[#fde047]");
        showHelperCard("branch");
        return;
    }

    if (subCmd === "checkout") {
        const target = args[0];
        if (!target) return window.writeOutput("error: switch `checkout' requires a branch name", "text-red-400");

        if (target === "main") {
            state.activeBranch = "main";
            window.triggerScreenFade(() => {
                state.currentView = "CORKBOARD";
                if (state.currentStep === 5) state.currentStep = 6;
            });
            window.writeOutput("Switched to branch 'main'", "text-[#2ea44f]");
            showHelperCard("checkout");
            return;
        }

        if (!state.evidenceFiles[target]) {
            return window.writeOutput(`error: pathspec '${target}' did not match any known lead`, "text-red-400");
        }
        if (!state.branches[target]) {
            return window.writeOutput(`error: branch '${target}' does not exist yet. Create it first with 'git branch ${target}'.`, "text-red-400");
        }

        state.activeBranch = target;
        window.triggerScreenFade(() => {
            state.currentView = "EVIDENCE_PORTAL";
            if ((state.currentStep === 2 || state.currentStep === 3) && target === "atTheScene") {
                state.currentStep = 4;
            }
        });

        window.writeOutput(`Switched to branch '${target}'`, "text-[#58a6ff]");
        showHelperCard("checkout");
        return;
    }

    if (subCmd === "commit") {
        if (state.activeBranch === "main") {
            return window.writeOutput("On branch main — nothing to commit, working tree clean", "text-yellow-400");
        }

        const ev = state.evidenceFiles[state.activeBranch];
        if (ev && !ev.puzzleSolved) {
            playBeep(220, "sawtooth", 0.14);
            return window.writeOutput("error: forensic script has an unsolved blank. Solve and verify the code puzzle first!", "text-red-400");
        }

        const mMatch = rawCmd.match(/git\s+commit\s+-m\s+["'](.+?)["']/);
        if (mMatch && mMatch[1].trim().length >= 3) {
            finalizeCommit(mMatch[1].trim());
            return;
        }

        openCommitModal();
        return;
    }

    if (subCmd === "merge") {
        const target = args[0];
        if (!target) return window.writeOutput("fatal: No branch specified for merge.", "text-red-400");
        if (state.activeBranch !== "main") return window.writeOutput("error: Switch to 'main' before merging a lead branch.", "text-yellow-400");
        if (!state.branches[target]) return window.writeOutput(`merge: ${target} - not something we can merge`, "text-red-400");

        const ev = state.evidenceFiles[target];
        if (!ev || !ev.taskCompleted) {
            return window.writeOutput(`error: '${target}' has no committed findings to merge.`, "text-red-400");
        }

        state.branches[target].merged = true;
        if (state.currentView === "DESK") state.currentView = "CORKBOARD";
        if (state.currentStep === 6 && target === "atTheScene") state.currentStep = 7;
        updateInstructionBanner();
        saveProgress();

        window.writeOutput(`Updating 1a4b802..7c3e91a — Fast-forward: merged '${target}' into main.`, "text-[#eb3b5a]");
        showHelperCard("merge");

        const allMerged = Object.keys(state.evidenceFiles).every(k => state.branches[k] && state.branches[k].merged);
        if (allMerged) {
            window.writeOutput("CASE #104 SOLVED: All 4 leads verified and merged into main!", "text-[#2ea44f] font-bold");
            triggerLevelCompletionWin(1);
        }
        return;
    }

    window.writeOutput(`git: '${subCmd}' is not a git command. See 'help'.`, "text-gray-400");
}

function submitTerminalInput() {
    if (isAnyModalOpen() || !isGameActive) return;

    const input = document.getElementById("terminal-input");
    const rawCmd = input.value.trim();
    input.value = "";
    if (!rawCmd) return;

    window.writeOutput(`detective@case-files:~$ ${rawCmd}`, "text-[#58a6ff] font-bold");

    const parts = rawCmd.split(/\s+/);
    const mainCmd = parts[0];
    const subCmd = parts[1];

    if (mainCmd === "admin") {
        openAdminModal();
    } else if (mainCmd === "clear") {
        document.getElementById("terminal-history").innerHTML = "";
    } else if (mainCmd === "help") {
        if (window.GameState.activeLevel === 2) {
            window.writeOutput("Level 02 commands: git status | git log | git show <hash> | git blame <file> | git revert <hash> | clear");
        } else {
            window.writeOutput("Level 01 commands: git status | git branch <lead> | git checkout <branch> | git commit | git merge <lead> | clear");
        }
    } else if (mainCmd === "git") {
        if (!subCmd) {
            window.writeOutput("usage: git [status | branch | checkout | commit | merge | log | show | blame | revert]");
        } else {
            handleGitCommand(subCmd, parts.slice(2), rawCmd);
        }
    } else {
        window.writeOutput(`bash: ${mainCmd}: command not found`, "text-gray-400");
    }
}

function mainLoop() {
    if (isWinScreenOpen && typeof renderWinTrophyFrame === "function") {
        renderWinTrophyFrame();
    }
    if (isGameActive) {
        if (window.GameState.activeLevel === 2) {
            renderLevel2CleanFrame();
        } else {
            renderCanvasFrame();
        }
    } else if (typeof renderHomeBgFrame === "function") {
        renderHomeBgFrame();
    }
    requestAnimationFrame(mainLoop);
}

document.addEventListener("DOMContentLoaded", () => {
    loadProgress();
    refreshHomeScreen();
    syncCodePuzzleOverlay();
    updateInstructionBanner();

    const input = document.getElementById("terminal-input");
    const commitMsgInput = document.getElementById("commit-msg-input");
    const certNameInput = document.getElementById("cert-detective-name");
    const adminPassInput = document.getElementById("admin-password-input");

    document.addEventListener("keydown", (e) => {
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "a") {
            e.preventDefault();
            if (isAdminModalOpen) {
                closeAdminModal();
            } else if (!isAnyModalOpen()) {
                openAdminModal();
            }
            return;
        }

        if (e.key === "Escape") {
            if (isAdminModalOpen) {
                e.preventDefault();
                closeAdminModal();
            } else if (isWinScreenOpen) {
                e.preventDefault();
                closeWinScreen();
            } else if (isCommitModalOpen) {
                e.preventDefault();
                closeCommitModal();
            } else if (isHintOpen) {
                e.preventDefault();
                closeHintModal();
            } else if (isHelperOpen) {
                e.preventDefault();
                closeHelperCard();
            } else if (!isGameActive) {
                const titleView = document.getElementById("title-menu-view");
                if (titleView && titleView.classList.contains("hidden")) {
                    e.preventDefault();
                    openSubView("TITLE");
                }
            }
        }
    });

    if (adminPassInput) {
        adminPassInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                verifyAdminPassword();
            }
        });
    }

    if (certNameInput) {
        certNameInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                downloadCertificate();
            }
        });
    }

    if (commitMsgInput) {
        commitMsgInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                submitCommitMessage();
            }
        });
    }

    input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            submitTerminalInput();
        }
    });

    mainLoop();
});