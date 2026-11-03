/**
 * CLEANING ROULETTE – WHO'S CLEANING TODAY?
 * High-performance interactive game logic
 */

(function () {
    'use strict';

    // Flat slice palette: background + legible label colour
    const WHEEL_COLORS = [
        { bg: '#e4572e', fg: '#fff8ee' }, // tomato
        { bg: '#f3b33d', fg: '#1b1a17' }, // mustard
        { bg: '#2e6b5e', fg: '#fff8ee' }, // teal
        { bg: '#f1e6d2', fg: '#1b1a17' }, // cream
        { bg: '#1f3a5f', fg: '#fff8ee' }  // navy
    ];
    const WHEEL_INK = '#1b1a17';

    // Cycle the palette, but never let the last slice match the first (they touch)
    function sliceColor(i, count) {
        const n = WHEEL_COLORS.length;
        let idx = i % n;
        if (i === count - 1 && count > 1 && idx === 0) idx = 2;
        return WHEEL_COLORS[idx];
    }

    // Default tasks matching prompt requirements
    const DEFAULT_ROOM_TASKS = [
        { id: 't1', text: 'Sweep the floor', icon: '🧹', enabled: true },
        { id: 't2', text: 'Mop the floor', icon: '🧽', enabled: true },
        { id: 't3', text: 'Clean the table', icon: '🪑', enabled: true },
        { id: 't4', text: 'Organize the wardrobe', icon: '👗', enabled: true },
        { id: 't5', text: 'Arrange the bed', icon: '🛏️', enabled: true },
        { id: 't6', text: 'Clean under the bed', icon: '📦', enabled: true },
        { id: 't7', text: 'Remove the dust', icon: '🪶', enabled: true },
        { id: 't8', text: 'Clean the windows', icon: '🪟', enabled: true },
        { id: 't9', text: 'Organize books & items', icon: '📚', enabled: true },
        { id: 't10', text: 'Empty the dustbin', icon: '🗑️', enabled: true },
        { id: 't11', text: 'Arrange shoes & slippers', icon: '👟', enabled: true },
        { id: 't12', text: 'Clean the corners', icon: '🕷️', enabled: true },
        { id: 't13', text: 'Organize the room', icon: '🧸', enabled: true },
        { id: 't14', text: 'Vacuum the floor', icon: '🔌', enabled: true },
        { id: 't15', text: 'Bathroom cleaning', icon: '🚽', enabled: true }, // Highlighted per user prompt
        { id: 't16', text: 'Surprise cleaning task', icon: '🎁', enabled: true }
    ];

    // Dedicated Bathroom Only mode preset
    const DEFAULT_BATHROOM_TASKS = [
        { id: 'b1', text: 'Scrub the toilet & rim', icon: '🚽', enabled: true },
        { id: 'b2', text: 'Scrub shower & tub', icon: '🚿', enabled: true },
        { id: 'b3', text: 'Wipe mirror & counter', icon: '🪞', enabled: true },
        { id: 'b4', text: 'Disinfect sink & faucets', icon: '🚰', enabled: true },
        { id: 'b5', text: 'Mop bathroom floor tiles', icon: '🧼', enabled: true },
        { id: 'b6', text: 'Empty bathroom trash bin', icon: '🗑️', enabled: true },
        { id: 'b7', text: 'Replace towels & mats', icon: '🧺', enabled: true },
        { id: 'b8', text: 'Scrub grout & tile walls', icon: '🧽', enabled: true }
    ];

    // Who Cleans: Team / Roommate members
    const DEFAULT_PEOPLE = [
        { id: 'p1', text: 'Thirupathi', icon: '👑', enabled: true },
        { id: 'p2', text: 'Ramanan', icon: '⚡', enabled: true },
        { id: 'p3', text: 'Hemnath', icon: '🌟', enabled: true },
        { id: 'p4', text: 'Vaseem', icon: '🔥', enabled: true },
        { id: 'p5', text: 'Hrabiullah', icon: '🚀', enabled: true },
        { id: 'p6', text: 'Sakthi', icon: '🎯', enabled: true },
        { id: 'p7', text: 'Dineshkumar', icon: '🧑', enabled: true }
    ];
    // Bump when DEFAULT_PEOPLE changes so saved wheels pick up the new squad once
    const PEOPLE_VERSION = '2';

    // Fun Surprise Tasks for the surprise slice
    const SURPRISE_TASKS = [
        'Disinfect every doorknob and light switch',
        'Clean inside the microwave and oven',
        'Dust the fan blades and lampshades',
        'Water the plants and wipe the window sills',
        'Wipe down phones, remotes and keyboards',
        'Clear expired food out of the fridge',
        'Scrub the bathroom grout with a toothbrush',
        'One song, full volume, speed clean until it ends'
    ];

    // State
    const state = {
        mode: 'tasks', // 'tasks' | 'bathroom' | 'people' | 'combo'
        tasks: [],
        bathroom: [],
        people: [],
        checklist: [],
        history: [],
        soundEnabled: true,
        theme: 'light',
        isTurbo: false,
        isSpinning: false,
        currentRotation: 0, // Radians
        lastPegIndex: -1,
        speedTimer: {
            totalSeconds: 900,
            remainingSeconds: 900,
            interval: null,
            endTime: 0,
            isRunning: false
        },
        // ── Monthly room expenses ──
        expenses: [],          // { id, item, amount, category: 'maintenance'|'utilities', paidBy, date: 'YYYY-MM-DD' }
        expenseBudget: 1000,   // monthly allocation in ₹
        expenseMonth: '',      // 'YYYY-MM' currently shown (not persisted)
        // ── Weekly Duty Roster Engine ──
        roster: {
            currentWeekNumber: 0,
            currentAssignment: null, // { week, dishes, floor, bathroom, penalties: [], timestamp }
            rotationHistory: [],     // array of past assignment objects
            fairness: {}             // { 'Hemnath': { dishes: 2, floor: 1, bathroom: 1, penalties: 0 }, ... }
        }
    };

    // DOM Elements
    const elements = {
        canvas: document.getElementById('wheelCanvas'),
        spinBtn: document.getElementById('spinBtn'),
        wheelPointer: document.getElementById('wheelPointer'),
        centerHubIcon: document.getElementById('centerHubIcon'),
        soundToggleBtn: document.getElementById('soundToggleBtn'),
        soundIcon: document.getElementById('soundIcon'),
        soundLabel: document.getElementById('soundLabel'),
        themeToggleBtn: document.getElementById('themeToggleBtn'),
        themeIcon: document.getElementById('themeIcon'),
        timerToggleBtn: document.getElementById('timerToggleBtn'),
        checklistBtn: document.getElementById('checklistBtn'),
        pendingBadge: document.getElementById('pendingBadge'),
        tabTasks: document.getElementById('tabTasks'),
        tabBathroom: document.getElementById('tabBathroom'),
        tabPeople: document.getElementById('tabPeople'),
        tabCombo: document.getElementById('tabCombo'),
        shuffleWheelBtn: document.getElementById('shuffleWheelBtn'),
        fastSpinBtn: document.getElementById('fastSpinBtn'),
        fastSpinIcon: document.getElementById('fastSpinIcon'),
        fastSpinState: document.getElementById('fastSpinState'),
        surpriseSpinBtn: document.getElementById('surpriseSpinBtn'),
        resetDefaultBtn: document.getElementById('resetDefaultBtn'),
        editorItemsContainer: document.getElementById('editorItemsContainer'),
        addItemForm: document.getElementById('addItemForm'),
        newItemInput: document.getElementById('newItemInput'),
        customizerTitle: document.getElementById('customizerTitle'),
        customizerIcon: document.getElementById('customizerIcon'),
        sliceCountBadge: document.getElementById('sliceCountBadge'),
        checklistContainer: document.getElementById('checklistContainer'),
        checklistProgressFill: document.getElementById('checklistProgressFill'),
        checklistProgressText: document.getElementById('checklistProgressText'),
        addChecklistForm: document.getElementById('addChecklistForm'),
        checklistInput: document.getElementById('checklistInput'),
        historyContainer: document.getElementById('historyContainer'),
        clearHistoryBtn: document.getElementById('clearHistoryBtn'),
        // Speed timer
        timerDisplay: document.getElementById('timerDisplay'),
        timerStartBtn: document.getElementById('timerStartBtn'),
        timerStartIcon: document.getElementById('timerStartIcon'),
        timerStartText: document.getElementById('timerStartText'),
        timerResetBtn: document.getElementById('timerResetBtn'),
        speedTimerPanel: document.getElementById('speedTimerPanel'),
        // Winner Modal
        winnerModal: document.getElementById('winnerModal'),
        winnerIcon: document.getElementById('winnerIcon'),
        winnerHeadline: document.getElementById('winnerHeadline'),
        winnerTaskText: document.getElementById('winnerTaskText'),
        winnerSubComment: document.getElementById('winnerSubComment'),
        modalAcceptBtn: document.getElementById('modalAcceptBtn'),
        modalSpinAgainBtn: document.getElementById('modalSpinAgainBtn'),
        modalShareBtn: document.getElementById('modalShareBtn'),
        toastNotice: document.getElementById('toastNotice'),
        toastIcon: document.getElementById('toastIcon'),
        toastMessage: document.getElementById('toastMessage'),
        // Weekly Duty Roster
        rosterWeekLabel: document.getElementById('rosterWeekLabel'),
        rosterDishes: document.getElementById('rosterDishes'),
        rosterFloor: document.getElementById('rosterFloor'),
        rosterBathroom: document.getElementById('rosterBathroom'),
        rosterBathroomNote: document.getElementById('rosterBathroomNote'),
        rosterPenaltyAlert: document.getElementById('rosterPenaltyAlert'),
        rosterPenaltyText: document.getElementById('rosterPenaltyText'),
        rosterGenerateBtn: document.getElementById('rosterGenerateBtn'),
        rosterAddChecklistBtn: document.getElementById('rosterAddChecklistBtn'),
        rosterShareBtn: document.getElementById('rosterShareBtn'),
        rosterResetHistBtn: document.getElementById('rosterResetHistBtn'),
        rosterFairnessGrid: document.getElementById('rosterFairnessGrid'),
        rosterHistoryList: document.getElementById('rosterHistoryList'),
        // Room expenses
        expPrevMonth: document.getElementById('expPrevMonth'),
        expNextMonth: document.getElementById('expNextMonth'),
        expMonthLabel: document.getElementById('expMonthLabel'),
        expSummary: document.querySelector('.budget-summary'),
        expSpent: document.getElementById('expSpent'),
        expBudgetLabel: document.getElementById('expBudgetLabel'),
        expLeft: document.getElementById('expLeft'),
        expLeftCaption: document.getElementById('expLeftCaption'),
        expBarFill: document.getElementById('expBarFill'),
        expMaintTotal: document.getElementById('expMaintTotal'),
        expUtilTotal: document.getElementById('expUtilTotal'),
        expenseForm: document.getElementById('expenseForm'),
        expItem: document.getElementById('expItem'),
        expAmount: document.getElementById('expAmount'),
        expCategory: document.getElementById('expCategory'),
        expPaidBy: document.getElementById('expPaidBy'),
        expDate: document.getElementById('expDate'),
        expenseList: document.getElementById('expenseList'),
        expBudgetInput: document.getElementById('expBudgetInput'),
        expShareBtn: document.getElementById('expShareBtn')
    };

    let ctx = null;
    let confetti = null;
    let lastWinnerResult = null;
    let toastTimer = null;
    let wheelSize = 0; // CSS px size the wheel bitmap was last drawn at
    let uidCounter = 0;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

    // Unique ids even when several items are created in the same millisecond
    function uid(prefix) {
        uidCounter++;
        return `${prefix}_${Date.now().toString(36)}_${uidCounter}`;
    }

    // Emoji live in saved data/icons; the UI shows plain text only
    const EMOJI_RE = /[\p{Extended_Pictographic}\p{Regional_Indicator}\u{1F3FB}-\u{1F3FF}️‍⃣]/gu;
    function stripEmoji(str) {
        return String(str).replace(EMOJI_RE, '').replace(/\s{2,}/g, ' ').replace(/\s+([!?.,:])/g, '$1').trim();
    }

    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function vibrate(pattern) {
        if (state.soundEnabled && navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch (e) { /* unsupported */ }
        }
    }

    // Changing slices mid-spin would desync the winner from where the wheel stops
    function wheelLocked() {
        if (state.isSpinning) {
            showToast('⏳ Wait for the wheel to stop!');
            return true;
        }
        return false;
    }

    /* -------------------------------------------------------------
       INITIALIZATION & STORAGE
    -------------------------------------------------------------- */
    function init() {
        ctx = elements.canvas.getContext('2d');
        confetti = new window.ConfettiManager('confettiCanvas');

        if (isCoarsePointer) document.documentElement.classList.add('touch');

        loadStateFromStorage();
        applyTheme(state.theme);
        applySound(state.soundEnabled);
        syncModeTabs();
        generateBackgroundBubbles();
        setupEventListeners();

        renderWheel();
        renderCustomizer();
        renderChecklist();
        renderHistory();
        updateTimerDisplay();
        loadRosterFromStorage();
        renderRoster();
        state.expenseMonth = monthKeyOf(todayISO());
        elements.expDate.value = todayISO();
        renderExpenses();

        // Redraw only when the wheel's actual width changes (mobile URL-bar
        // show/hide fires window resize constantly without changing it)
        if (window.ResizeObserver) {
            new ResizeObserver(() => {
                if (elements.canvas.clientWidth !== wheelSize) renderWheel();
            }).observe(elements.canvas);
        } else {
            window.addEventListener('resize', () => {
                if (elements.canvas.clientWidth !== wheelSize) renderWheel();
            });
        }

        // Canvas text is drawn once, so redraw after web fonts arrive
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => renderWheel(true));
        }
    }

    function syncModeTabs() {
        [elements.tabTasks, elements.tabBathroom, elements.tabPeople, elements.tabCombo].forEach(btn => {
            if (btn) {
                const active = btn.dataset.mode === state.mode;
                btn.classList.toggle('active', active);
                btn.setAttribute('aria-pressed', String(active));
            }
        });
    }

    function loadStateFromStorage() {
        try {
            const savedTasks = localStorage.getItem('cleaningRoulette_tasks');
            state.tasks = savedTasks ? JSON.parse(savedTasks) : JSON.parse(JSON.stringify(DEFAULT_ROOM_TASKS));

            const savedBathroom = localStorage.getItem('cleaningRoulette_bathroom');
            state.bathroom = savedBathroom ? JSON.parse(savedBathroom) : JSON.parse(JSON.stringify(DEFAULT_BATHROOM_TASKS));

            const savedPeople = localStorage.getItem('cleaningRoulette_people');
            if (savedPeople) {
                const parsed = JSON.parse(savedPeople);
                // Replace old sample lists, or any list saved before the current squad version
                const outdated = localStorage.getItem('cleaningRoulette_peopleVersion') !== PEOPLE_VERSION;
                if (outdated || parsed.some(p => p.text === 'Alex' || p.text === 'Person 1')) {
                    state.people = JSON.parse(JSON.stringify(DEFAULT_PEOPLE));
                    // Save only people: the rest of state isn't loaded yet, so saveState() would wipe it
                    localStorage.setItem('cleaningRoulette_people', JSON.stringify(state.people));
                    localStorage.setItem('cleaningRoulette_peopleVersion', PEOPLE_VERSION);
                } else {
                    state.people = parsed;
                }
            } else {
                state.people = JSON.parse(JSON.stringify(DEFAULT_PEOPLE));
            }

            const savedChecklist = localStorage.getItem('cleaningRoulette_checklist');
            state.checklist = savedChecklist ? JSON.parse(savedChecklist) : [
                { id: 'c1', text: 'Sweep the floor', assignedTo: 'Pending Spin', completed: false, timestamp: Date.now() },
                { id: 'c2', text: 'Clean the windows', assignedTo: 'Pending Spin', completed: true, timestamp: Date.now() - 3600000 }
            ];

            const savedHistory = localStorage.getItem('cleaningRoulette_history');
            state.history = savedHistory ? JSON.parse(savedHistory) : [];

            const savedMode = localStorage.getItem('cleaningRoulette_mode');
            if (['tasks', 'bathroom', 'people', 'combo'].includes(savedMode)) {
                state.mode = savedMode;
            }

            const savedExpenses = localStorage.getItem('cleaningRoulette_expenses');
            state.expenses = savedExpenses ? JSON.parse(savedExpenses) : [];

            const savedBudget = parseFloat(localStorage.getItem('cleaningRoulette_expenseBudget'));
            if (Number.isFinite(savedBudget) && savedBudget >= 0) state.expenseBudget = savedBudget;

            const savedTheme = localStorage.getItem('cleaningRoulette_theme');
            if (savedTheme) state.theme = savedTheme;

            const savedSound = localStorage.getItem('cleaningRoulette_sound');
            if (savedSound !== null) state.soundEnabled = savedSound === 'true';

        } catch (e) {
            console.warn('Storage read fallback to defaults:', e);
            state.tasks = JSON.parse(JSON.stringify(DEFAULT_ROOM_TASKS));
            state.bathroom = JSON.parse(JSON.stringify(DEFAULT_BATHROOM_TASKS));
            state.people = JSON.parse(JSON.stringify(DEFAULT_PEOPLE));
        }
    }

    function saveState() {
        try {
            localStorage.setItem('cleaningRoulette_tasks', JSON.stringify(state.tasks));
            localStorage.setItem('cleaningRoulette_bathroom', JSON.stringify(state.bathroom));
            localStorage.setItem('cleaningRoulette_people', JSON.stringify(state.people));
            localStorage.setItem('cleaningRoulette_peopleVersion', PEOPLE_VERSION);
            localStorage.setItem('cleaningRoulette_checklist', JSON.stringify(state.checklist));
            localStorage.setItem('cleaningRoulette_history', JSON.stringify(state.history));
            localStorage.setItem('cleaningRoulette_mode', state.mode);
            localStorage.setItem('cleaningRoulette_theme', state.theme);
            localStorage.setItem('cleaningRoulette_sound', String(state.soundEnabled));
            localStorage.setItem('cleaningRoulette_roster', JSON.stringify(state.roster));
            localStorage.setItem('cleaningRoulette_expenses', JSON.stringify(state.expenses));
            localStorage.setItem('cleaningRoulette_expenseBudget', String(state.expenseBudget));
        } catch (e) {
            console.error('Storage save error:', e);
        }
    }

    /* -------------------------------------------------------------
       CANVAS HIGH-DPI SETUP & RENDERING
    -------------------------------------------------------------- */
    function setupCanvasResolution() {
        // Cap DPR: a 3x bitmap costs 2.25x the memory/fill of 2x with no visible gain while spinning
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        // clientWidth ignores CSS transforms (getBoundingClientRect would grow while rotated)
        const displaySize = elements.canvas.clientWidth > 0 ? elements.canvas.clientWidth : 460;
        wheelSize = displaySize;

        elements.canvas.width = Math.round(displaySize * dpr);
        elements.canvas.height = Math.round(displaySize * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return displaySize;
    }

    // Spinning is a compositor-only CSS transform – no canvas redraw per frame
    function applyWheelRotation() {
        elements.canvas.style.transform = `rotate(${state.currentRotation}rad)`;
    }

    function getActiveItems() {
        let pool = [];
        if (state.mode === 'tasks') {
            pool = state.tasks;
        } else if (state.mode === 'bathroom') {
            pool = state.bathroom;
        } else if (state.mode === 'people') {
            pool = state.people;
        } else if (state.mode === 'combo') {
            // In combo mode, we spin people first or room tasks
            pool = state.tasks;
        }
        return pool.filter(item => item.enabled !== false);
    }

    function renderWheel() {
        const width = setupCanvasResolution();
        const height = width;
        const radius = width / 2;
        const cx = radius;
        const cy = radius;
        const hubRadius = Math.max(28, radius * 0.18);

        ctx.clearRect(0, 0, width, height);
        applyWheelRotation();

        const items = getActiveItems();
        const count = items.length;

        const fontFamily = "'Bricolage Grotesque', system-ui, sans-serif";

        if (count === 0) {
            elements.canvas.style.transform = 'none';
            ctx.beginPath();
            ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
            ctx.setLineDash([6, 6]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = 'rgba(122, 115, 102, 0.6)';
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = '#7a7366';
            ctx.font = `600 ${Math.max(13, Math.round(radius * 0.07))}px ${fontFamily}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('No active slices', cx, cy - radius * 0.3);
            ctx.fillText('Turn some on below', cx, cy + radius * 0.3);
            return;
        }

        const sliceAngle = (Math.PI * 2) / count;
        const rimWidth = Math.max(6, radius * 0.045);
        const faceRadius = radius - rimWidth;

        ctx.save();
        ctx.translate(cx, cy);

        // 1. Ink rim
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fillStyle = WHEEL_INK;
        ctx.fill();

        // 2. Flat slices with ink dividers
        ctx.lineWidth = Math.max(1.5, radius * 0.008);
        ctx.strokeStyle = WHEEL_INK;
        for (let i = 0; i < count; i++) {
            const startAngle = i * sliceAngle;
            const endAngle = startAngle + sliceAngle;
            const item = items[i];
            const color = sliceColor(i, count);

            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, faceRadius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = color.bg;
            ctx.fill();
            ctx.stroke();

            // 3. Label, reading outward from the hub
            ctx.save();
            ctx.rotate(startAngle + sliceAngle / 2);
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = color.fg;

            // Font scales with wheel size and slice count
            let fontSize = radius * 0.065;
            if (count > 16) fontSize *= 0.8;
            else if (count > 12) fontSize *= 0.9;
            else if (count <= 6) fontSize *= 1.2;
            // Slice must be tall enough at the text's midpoint to hold the glyphs
            const sliceHeight = 2 * (radius * 0.6) * Math.sin(sliceAngle / 2);
            fontSize = Math.max(9, Math.min(fontSize, sliceHeight * 0.55));

            const textEnd = faceRadius - Math.max(10, radius * 0.06);
            const maxTextWidth = textEnd - (hubRadius + 8);
            let text = stripEmoji(item.text);

            // Shrink, then truncate, until the label fits between hub and rim
            ctx.font = `600 ${fontSize}px ${fontFamily}`;
            while (ctx.measureText(text).width > maxTextWidth && fontSize > 9) {
                fontSize -= 0.5;
                ctx.font = `600 ${fontSize}px ${fontFamily}`;
            }
            if (ctx.measureText(text).width > maxTextWidth) {
                while (text.length > 1 && ctx.measureText(`${text}…`).width > maxTextWidth) {
                    text = text.slice(0, -1);
                }
                text = text.trimEnd() + '…';
            }

            ctx.fillText(text, textEnd, 0);
            ctx.restore();
        }

        // 4. Small paper studs on the rim at each divider (what the pointer "ticks" on)
        const studRadius = Math.max(2, rimWidth * 0.3);
        ctx.fillStyle = '#f3ede2';
        for (let i = 0; i < count; i++) {
            const a = i * sliceAngle;
            ctx.beginPath();
            ctx.arc(Math.cos(a) * (radius - rimWidth / 2), Math.sin(a) * (radius - rimWidth / 2), studRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore(); // Restore wheel translation
    }

    /* -------------------------------------------------------------
       WHEEL SPINNING & POINTER TICK PHYSICS
    -------------------------------------------------------------- */
    function spinWheel() {
        if (state.isSpinning || elements.winnerModal.classList.contains('open')) return;

        const items = getActiveItems();
        if (items.length < 2) {
            showToast('⚠️ Please enable at least 2 items to spin!');
            return;
        }

        state.isSpinning = true;
        elements.spinBtn.disabled = true;
        document.body.classList.add('is-spinning');
        elements.wheelPointer.classList.remove('pegging');

        window.soundEngine.init();
        window.soundEngine.playWhoosh();

        // Choose random winning index fairly
        const count = items.length;
        const targetIndex = Math.floor(Math.random() * count);
        const winningItem = items[targetIndex];

        // POINTER MATH:
        // Pointer is at 12 o'clock: P = 3*PI/2 radians (270 degrees)
        // Center of slice i is (i + 0.5) * sliceAngle
        // When wheel rotation is alpha:
        // (sliceCenter + alpha) % (2*PI) === P
        // Therefore, final target alpha_mod = (P - sliceCenter) mod 2*PI
        const sliceAngle = (Math.PI * 2) / count;
        const pointerAngle = (3 * Math.PI) / 2;
        const sliceCenter = (targetIndex + 0.5) * sliceAngle;

        let targetMod = (pointerAngle - sliceCenter) % (Math.PI * 2);
        if (targetMod < 0) targetMod += Math.PI * 2;

        // Minimum rotations: 5 to 8 full spins for excitement
        const fullSpins = state.isTurbo ? 3 : (5 + Math.floor(Math.random() * 4));
        const currentMod = state.currentRotation % (Math.PI * 2);
        let delta = targetMod - currentMod;
        if (delta <= 0) delta += Math.PI * 2;

        const startRotation = state.currentRotation;
        const totalDelta = (fullSpins * Math.PI * 2) + delta;
        const finalRotation = startRotation + totalDelta;

        const duration = state.isTurbo ? 2200 : 4800; // ms
        const startTime = performance.now();

        // Deceleration animation loop using Ease-Out Cubic
        function animate(now) {
            const elapsed = now - startTime;
            const progress = Math.min(1, elapsed / duration);

            // Smooth cubic ease out: 1 - (1 - t)^3
            const easeOut = 1 - Math.pow(1 - progress, 3.5);
            state.currentRotation = startRotation + totalDelta * easeOut;

            // Check if a peg hit the pointer for realistic click bounce & audio
            checkPointerPegTick(items.length);

            applyWheelRotation();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                // Normalize so the angle doesn't grow without bound across spins
                state.currentRotation = finalRotation % (Math.PI * 2);
                applyWheelRotation();
                state.isSpinning = false;
                elements.spinBtn.disabled = false;
                document.body.classList.remove('is-spinning');
                onSpinFinished(winningItem);
            }
        }

        requestAnimationFrame(animate);
    }

    function checkPointerPegTick(sliceCount) {
        // Calculate the slice currently passing 12 o'clock
        const sliceAngle = (Math.PI * 2) / sliceCount;
        const pointerAngle = (3 * Math.PI) / 2;
        let rot = (pointerAngle - state.currentRotation) % (Math.PI * 2);
        if (rot < 0) rot += Math.PI * 2;

        const currentPeg = Math.floor(rot / sliceAngle);
        if (currentPeg !== state.lastPegIndex) {
            state.lastPegIndex = currentPeg;
            window.soundEngine.playTick(1 + (Math.random() * 0.15 - 0.07));

            // Trigger physical pointer bounce (one pending timer at a time)
            elements.wheelPointer.classList.add('pegging');
            clearTimeout(checkPointerPegTick.timer);
            checkPointerPegTick.timer = setTimeout(() => {
                elements.wheelPointer.classList.remove('pegging');
            }, 60);
        }
    }

    /* -------------------------------------------------------------
       WINNER RESULT & MODAL CELEBRATION
    -------------------------------------------------------------- */
    function onSpinFinished(winningItem) {
        let assignedPerson = null;

        // In combo mode, pick a random person from the people pool
        if (state.mode === 'combo') {
            const activePeople = state.people.filter(p => p.enabled !== false);
            if (activePeople.length > 0) {
                const randomP = activePeople[Math.floor(Math.random() * activePeople.length)];
                assignedPerson = randomP.text;
            } else {
                assignedPerson = 'You';
            }
        }

        // Check if winning item is the surprise task
        let displayTitle = winningItem.text;
        let isSurprise = false;
        if (winningItem.text.toLowerCase().includes('surprise')) {
            isSurprise = true;
            const randomSurprise = SURPRISE_TASKS[Math.floor(Math.random() * SURPRISE_TASKS.length)];
            displayTitle = randomSurprise;
        }

        // A direct Surprise Spin is always a chore, even while the wheel holds people
        const resultMode = (winningItem.id === 'surprise_direct' && state.mode === 'people') ? 'tasks' : state.mode;

        lastWinnerResult = {
            item: winningItem,
            displayText: displayTitle,
            assignedPerson: assignedPerson,
            mode: resultMode,
            timestamp: Date.now()
        };

        // Record history
        recordHistory(lastWinnerResult);

        // Play sounds & Fire Confetti
        if (resultMode === 'people') {
            window.soundEngine.playEvilSelection();
        } else {
            window.soundEngine.playFanfare();
        }

        confetti.fire({
            count: 90,
            upwardBoost: true
        });
        vibrate([40, 60, 80]);

        // Populate Winner Popup Modal
        updateWinnerModal(lastWinnerResult);
        openWinnerModal();
    }

    function updateWinnerModal(result) {
        const { item, displayText, assignedPerson, mode } = result;

        const isSurprise = item.id === 'surprise_direct' || /surprise/i.test(item.text);

        if (mode === 'people') {
            elements.winnerHeadline.textContent = "Today's cleaner";
            elements.winnerTaskText.textContent = stripEmoji(item.text);
            elements.winnerSubComment.textContent = 'The wheel has spoken. No appeals.';
            elements.modalAcceptBtn.textContent = 'Accept';
        } else if (mode === 'combo') {
            elements.winnerHeadline.textContent = 'Assignment';
            elements.winnerTaskText.textContent = `${stripEmoji(assignedPerson)}: ${stripEmoji(displayText)}`;
            elements.winnerSubComment.textContent = `${stripEmoji(assignedPerson)} is up. Clock starts now.`;
            elements.modalAcceptBtn.textContent = 'Add to checklist';
        } else {
            elements.winnerHeadline.textContent = isSurprise ? 'Surprise chore' : (mode === 'bathroom' ? 'Bathroom duty' : "Today's chore");
            elements.winnerTaskText.textContent = stripEmoji(displayText);
            elements.winnerSubComment.textContent = mode === 'bathroom'
                ? 'Gloves on. Make it sparkle.'
                : 'The wheel has spoken. No arguments.';
            elements.modalAcceptBtn.textContent = 'Add to checklist';
        }
    }

    let modalReturnFocus = null;

    function openWinnerModal() {
        modalReturnFocus = document.activeElement;
        elements.winnerModal.classList.add('open');
        document.body.classList.add('modal-open');
        // Focus without scrolling so mobile browsers don't jump the page
        elements.modalAcceptBtn.focus({ preventScroll: true });
    }

    function closeWinnerModal() {
        elements.winnerModal.classList.remove('open');
        document.body.classList.remove('modal-open');
        if (modalReturnFocus && modalReturnFocus.focus) {
            modalReturnFocus.focus({ preventScroll: true });
        }
        modalReturnFocus = null;
    }

    /* -------------------------------------------------------------
       CLEANING CHECKLIST & COMPLETION TRACKER
    -------------------------------------------------------------- */
    function renderChecklist() {
        const total = state.checklist.length;
        const completedCount = state.checklist.filter(c => c.completed).length;

        // Update progress bar
        const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;
        elements.checklistProgressFill.style.width = `${percent}%`;
        elements.checklistProgressText.textContent = `${completedCount} / ${total} done`;
        elements.pendingBadge.textContent = String(total - completedCount);
        elements.pendingBadge.classList.toggle('is-zero', total - completedCount === 0);

        if (total === 0) {
            elements.checklistContainer.innerHTML = '<p class="empty-note">Nothing on the list. Spin the wheel or add a chore.</p>';
            return;
        }

        const xIcon = '<svg class="ico" aria-hidden="true"><use href="#i-x"/></svg>';

        // Build once as a string; row events are handled by one delegated listener
        elements.checklistContainer.innerHTML = state.checklist.map(task => `
            <div class="checklist-item ${task.completed ? 'completed' : ''}" data-id="${escapeHtml(task.id)}">
                <label class="task-info-col">
                    <input type="checkbox" class="checkbox-custom" ${task.completed ? 'checked' : ''} aria-label="Mark task done">
                    <span class="task-text">${escapeHtml(stripEmoji(task.text))}</span>
                    ${task.assignedTo ? `<span class="task-assigned-badge">${escapeHtml(stripEmoji(task.assignedTo))}</span>` : ''}
                </label>
                <button type="button" class="delete-task-btn" title="Delete chore" aria-label="Delete chore">${xIcon}</button>
            </div>
        `).join('');
    }

    function onChecklistChange(e) {
        const cb = e.target.closest('.checkbox-custom');
        if (!cb) return;
        const row = cb.closest('.checklist-item');
        const task = state.checklist.find(c => c.id === row.dataset.id);
        if (!task) return;

        task.completed = cb.checked;
        if (task.completed) {
            window.soundEngine.playTaskComplete();
            vibrate(25);
            // Burst from the row itself so it lines up on any layout
            const rect = row.getBoundingClientRect();
            confetti.fire({ count: 40, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
            showToast(`Done: ${task.text}`);
        }
        saveState();
        renderChecklist();
    }

    function onChecklistClick(e) {
        const delBtn = e.target.closest('.delete-task-btn');
        if (!delBtn) return;
        const row = delBtn.closest('.checklist-item');
        state.checklist = state.checklist.filter(c => c.id !== row.dataset.id);
        saveState();
        renderChecklist();
        showToast('Chore removed from checklist.');
    }

    function addChoreToChecklist(text, assignedTo = '', silent = false) {
        if (!text || !text.trim()) return;
        const newChore = {
            id: uid('c'),
            text: text.trim(),
            assignedTo: assignedTo,
            completed: false,
            timestamp: Date.now()
        };
        state.checklist.unshift(newChore);
        if (silent) return; // caller batches save/render/toast
        saveState();
        renderChecklist();
        showToast('✅ Added to today\'s cleaning checklist!');
    }

    /* -------------------------------------------------------------
       WHEEL CUSTOMIZER (ADD, EDIT, DELETE, TOGGLE)
    -------------------------------------------------------------- */
    function renderCustomizer() {
        elements.editorItemsContainer.innerHTML = '';
        let list = [];
        let title = '';

        if (state.mode === 'tasks') {
            list = state.tasks;
            title = 'Room chores';
        } else if (state.mode === 'bathroom') {
            list = state.bathroom;
            title = 'Bathroom chores';
        } else if (state.mode === 'people') {
            list = state.people;
            title = 'People';
        } else if (state.mode === 'combo') {
            list = state.tasks;
            title = 'Combo chores';
        }

        elements.customizerTitle.textContent = title;
        if (state.mode === 'people' && state.expenseMonth) populatePaidBy();

        const activeCount = list.filter(i => i.enabled !== false).length;
        elements.sliceCountBadge.textContent = `${activeCount} / ${list.length} on`;
        elements.centerHubIcon.textContent = String(activeCount);

        // Swatch matches the slice's colour on the wheel (only enabled items get slices)
        let activeIndex = 0;
        list.forEach((item) => {
            const enabled = item.enabled !== false;
            const color = enabled ? sliceColor(activeIndex++, activeCount).bg : 'transparent';
            const row = document.createElement('div');
            row.className = `editor-row ${enabled ? '' : 'disabled'}`;

            row.innerHTML = `
                <input type="checkbox" class="checkbox-custom" ${enabled ? 'checked' : ''} title="Include on wheel" aria-label="Include on wheel">
                <div class="editor-color-dot" style="background: ${color}; box-shadow: inset 0 0 0 1px rgba(27,26,23,0.25);"></div>
                <input type="text" class="editor-input-text" value="${escapeHtml(item.text)}" aria-label="Slice name" enterkeyhint="done">
                <button type="button" class="delete-task-btn" title="Delete slice" aria-label="Delete slice"><svg class="ico" aria-hidden="true"><use href="#i-x"/></svg></button>
            `;

            // Toggle enable / disable
            const cb = row.querySelector('.checkbox-custom');
            cb.addEventListener('change', () => {
                if (wheelLocked()) {
                    cb.checked = !cb.checked;
                    return;
                }
                item.enabled = cb.checked;
                saveState();
                renderWheel();
                renderCustomizer();
            });

            // Edit text inline
            const textInput = row.querySelector('.editor-input-text');
            textInput.addEventListener('change', () => {
                if (textInput.value.trim().length > 0) {
                    item.text = textInput.value.trim();
                    saveState();
                    if (!state.isSpinning) renderWheel();
                } else {
                    textInput.value = item.text;
                }
            });
            // "Done" on the mobile keyboard commits and closes the keyboard
            textInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') textInput.blur();
            });

            // Delete item
            const delBtn = row.querySelector('.delete-task-btn');
            delBtn.addEventListener('click', () => {
                if (wheelLocked()) return;
                if (list.length <= 2) {
                    showToast('⚠️ You need at least 2 slices on the wheel!');
                    return;
                }
                const idx = list.findIndex(x => x.id === item.id);
                if (idx > -1) {
                    list.splice(idx, 1);
                    saveState();
                    renderWheel();
                    renderCustomizer();
                    showToast('Slice deleted.');
                }
            });

            elements.editorItemsContainer.appendChild(row);
        });
    }

    function addNewCustomItem(text) {
        if (!text.trim() || wheelLocked()) return;
        let list = (state.mode === 'bathroom') ? state.bathroom :
                   (state.mode === 'people') ? state.people : state.tasks;

        const icons = ['✨', '🧼', '🧹', '🧽', '🧺', '📦', '🌟'];
        const randomIcon = (state.mode === 'people') ? '🧑' : icons[Math.floor(Math.random() * icons.length)];

        const newItem = {
            id: uid('item'),
            text: text.trim(),
            icon: randomIcon,
            enabled: true
        };

        list.push(newItem);
        saveState();
        renderWheel();
        renderCustomizer();
        showToast(`✨ Added "${newItem.text}" to wheel!`);
    }

    function resetCurrentModeToDefaults() {
        if (wheelLocked()) return;
        if (state.mode === 'tasks' || state.mode === 'combo') {
            state.tasks = JSON.parse(JSON.stringify(DEFAULT_ROOM_TASKS));
        } else if (state.mode === 'bathroom') {
            state.bathroom = JSON.parse(JSON.stringify(DEFAULT_BATHROOM_TASKS));
        } else if (state.mode === 'people') {
            state.people = JSON.parse(JSON.stringify(DEFAULT_PEOPLE));
        }
        saveState();
        renderWheel();
        renderCustomizer();
        showToast('🔄 Wheel slices reset to default!');
    }

    function shuffleSlices() {
        if (wheelLocked()) return;
        let list = (state.mode === 'bathroom') ? state.bathroom :
                   (state.mode === 'people') ? state.people : state.tasks;

        for (let i = list.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [list[i], list[j]] = [list[j], list[i]];
        }

        saveState();
        renderWheel();
        renderCustomizer();
        window.soundEngine.playWhoosh();
        showToast('🔀 Slices shuffled!');
    }

    /* -------------------------------------------------------------
       SPEED CLEAN 15-MINUTE COUNTDOWN TIMER
    -------------------------------------------------------------- */
    function updateTimerDisplay() {
        const mins = Math.floor(state.speedTimer.remainingSeconds / 60);
        const secs = state.speedTimer.remainingSeconds % 60;
        elements.timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Derived from a wall-clock end time, so it stays accurate when mobile
    // browsers throttle/suspend timers (screen lock, background tab)
    function tickTimer() {
        const t = state.speedTimer;
        if (!t.isRunning) return;
        const remaining = Math.max(0, Math.ceil((t.endTime - Date.now()) / 1000));
        if (remaining === t.remainingSeconds) return;

        t.remainingSeconds = remaining;
        updateTimerDisplay();

        // Ticking warning on final 5 seconds
        if (remaining <= 5 && remaining > 0) {
            window.soundEngine.playTick(1.5);
        }

        if (remaining === 0) {
            clearInterval(t.interval);
            t.isRunning = false;
            elements.timerStartIcon.textContent = '▶️';
            elements.timerStartText.textContent = 'Start';
            window.soundEngine.playFanfare();
            confetti.fire({ count: 120 });
            vibrate([200, 100, 200]);
            showToast('⏰ Time is up! Speed clean finished!');
            t.remainingSeconds = t.totalSeconds;
            setTimeout(updateTimerDisplay, 2500);
        }
    }

    function startTimer() {
        const t = state.speedTimer;
        if (t.isRunning) {
            // Pause
            clearInterval(t.interval);
            t.isRunning = false;
            t.remainingSeconds = Math.max(0, Math.ceil((t.endTime - Date.now()) / 1000));
            updateTimerDisplay();
            elements.timerStartIcon.textContent = '▶️';
            elements.timerStartText.textContent = 'Resume';
        } else {
            // Start
            window.soundEngine.init();
            window.soundEngine.playClick();
            if (t.remainingSeconds <= 0) t.remainingSeconds = t.totalSeconds;
            t.isRunning = true;
            t.endTime = Date.now() + t.remainingSeconds * 1000;
            elements.timerStartIcon.textContent = '⏸️';
            elements.timerStartText.textContent = 'Pause';
            t.interval = setInterval(tickTimer, 250);
        }
    }

    function resetTimer() {
        clearInterval(state.speedTimer.interval);
        state.speedTimer.isRunning = false;
        state.speedTimer.remainingSeconds = state.speedTimer.totalSeconds;
        elements.timerStartIcon.textContent = '▶️';
        elements.timerStartText.textContent = 'Start';
        updateTimerDisplay();
    }

    /* -------------------------------------------------------------
       SPIN HISTORY
    -------------------------------------------------------------- */
    /* -------------------------------------------------------------
       MONTHLY ROOM EXPENSES (maintenance + utility purchases)
    -------------------------------------------------------------- */
    const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const EXPENSE_CATEGORIES = {
        maintenance: { label: 'Maintenance', swatch: 'swatch-2' },
        utilities: { label: 'Utilities', swatch: 'swatch-3' }
    };
    const SHARED_FUND = 'Shared fund';

    // Local-time dates (toISOString would shift to UTC and can land on the wrong day in IST)
    function todayISO() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function monthKeyOf(isoDate) {
        return isoDate.slice(0, 7);
    }

    function shiftMonth(key, delta) {
        const [y, m] = key.split('-').map(Number);
        const d = new Date(y, m - 1 + delta, 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    function monthLabel(key) {
        const [y, m] = key.split('-').map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
    }

    function expensesForMonth(key) {
        return state.expenses
            .filter(x => monthKeyOf(x.date) === key)
            .sort((a, b) => (b.date.localeCompare(a.date)) || (b.createdAt || 0) - (a.createdAt || 0));
    }

    // Keep "Paid by" in sync with the people list, preserving the current choice
    function populatePaidBy() {
        if (!elements.expPaidBy) return;
        const current = elements.expPaidBy.value;
        const names = [SHARED_FUND, ...getActivePeopleNames().map(stripEmoji)];
        elements.expPaidBy.innerHTML = names.map(n => `<option value="${escapeHtml(n)}">${escapeHtml(n)}</option>`).join('');
        if (names.includes(current)) elements.expPaidBy.value = current;
    }

    function renderExpenses() {
        if (!state.expenseMonth) return;
        const key = state.expenseMonth;
        const list = expensesForMonth(key);
        const budget = state.expenseBudget;
        const spent = list.reduce((sum, x) => sum + x.amount, 0);
        const left = budget - spent;
        const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : (spent > 0 ? 100 : 0);

        elements.expMonthLabel.textContent = monthLabel(key);
        elements.expNextMonth.disabled = key >= monthKeyOf(todayISO());

        elements.expSpent.textContent = inr.format(spent);
        elements.expBudgetLabel.textContent = inr.format(budget);
        elements.expLeft.textContent = inr.format(Math.abs(left));
        elements.expLeftCaption.textContent = left >= 0 ? 'left this month' : 'over budget';
        elements.expBarFill.style.width = `${pct}%`;
        elements.expSummary.classList.toggle('over', left < 0);
        elements.expSummary.classList.toggle('warn', left >= 0 && pct >= 80);

        const byCat = cat => list.filter(x => x.category === cat).reduce((s, x) => s + x.amount, 0);
        elements.expMaintTotal.textContent = inr.format(byCat('maintenance'));
        elements.expUtilTotal.textContent = inr.format(byCat('utilities'));

        if (document.activeElement !== elements.expBudgetInput) {
            elements.expBudgetInput.value = String(budget);
        }
        populatePaidBy();

        if (list.length === 0) {
            elements.expenseList.innerHTML = `<p class="empty-note">No expenses logged for ${escapeHtml(monthLabel(key))}.</p>`;
            return;
        }

        const xIcon = '<svg class="ico" aria-hidden="true"><use href="#i-x"/></svg>';
        elements.expenseList.innerHTML = list.map(x => {
            const cat = EXPENSE_CATEGORIES[x.category] || EXPENSE_CATEGORIES.maintenance;
            const day = new Date(x.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
            return `
                <div class="expense-row" data-id="${escapeHtml(x.id)}">
                    <i class="split-dot ${cat.swatch}" aria-hidden="true"></i>
                    <div class="expense-info">
                        <div class="expense-name">${escapeHtml(x.item)}</div>
                        <div class="expense-meta">${cat.label} · ${escapeHtml(x.paidBy)} · ${day}</div>
                    </div>
                    <span class="expense-amount">${inr.format(x.amount)}</span>
                    <button type="button" class="delete-task-btn" title="Delete expense" aria-label="Delete expense">${xIcon}</button>
                </div>
            `;
        }).join('');
    }

    function addExpense() {
        const item = elements.expItem.value.trim();
        const amount = Math.round(parseFloat(elements.expAmount.value) * 100) / 100;
        const date = elements.expDate.value || todayISO();
        if (!item) return;
        if (!Number.isFinite(amount) || amount <= 0) {
            showToast('Enter an amount above ₹0');
            return;
        }

        state.expenses.push({
            id: uid('exp'),
            item,
            amount,
            category: elements.expCategory.value in EXPENSE_CATEGORIES ? elements.expCategory.value : 'maintenance',
            paidBy: elements.expPaidBy.value || SHARED_FUND,
            date,
            createdAt: Date.now()
        });
        saveState();

        // Jump to the month the expense belongs to so it's visible
        state.expenseMonth = monthKeyOf(date);
        elements.expItem.value = '';
        elements.expAmount.value = '';
        renderExpenses();

        const spent = expensesForMonth(state.expenseMonth).reduce((s, x) => s + x.amount, 0);
        const left = state.expenseBudget - spent;
        showToast(left < 0
            ? `Added ${inr.format(amount)}. ${inr.format(-left)} over this month's allocation`
            : `Added ${inr.format(amount)}. ${inr.format(left)} left this month`);
    }

    function shareExpenseMonth() {
        const key = state.expenseMonth;
        const list = expensesForMonth(key);
        if (list.length === 0) {
            showToast('No expenses to share for this month');
            return;
        }
        const spent = list.reduce((s, x) => s + x.amount, 0);
        const left = state.expenseBudget - spent;
        const byPerson = {};
        list.forEach(x => { byPerson[x.paidBy] = (byPerson[x.paidBy] || 0) + x.amount; });

        let text = `Room expenses, ${monthLabel(key)}\n`;
        text += `Allocation ${inr.format(state.expenseBudget)} · Spent ${inr.format(spent)} · ${left >= 0 ? 'Left' : 'Over'} ${inr.format(Math.abs(left))}\n\n`;
        list.slice().reverse().forEach(x => {
            text += `${x.date.slice(8)}/${x.date.slice(5, 7)}  ${x.item} (${EXPENSE_CATEGORIES[x.category].label}, ${x.paidBy})  ${inr.format(x.amount)}\n`;
        });
        text += `\nPaid by:\n`;
        Object.entries(byPerson).forEach(([who, amt]) => { text += `- ${who}: ${inr.format(amt)}\n`; });

        shareOrCopy(text, 'Expense summary copied', 'Could not copy the summary');
    }

    function recordHistory(result) {
        state.history.unshift(result);
        if (state.history.length > 20) {
            state.history.pop();
        }
        saveState();
        renderHistory();
    }

    function renderHistory() {
        elements.historyContainer.innerHTML = '';
        if (state.history.length === 0) {
            elements.historyContainer.innerHTML = `
                <p style="color: var(--text-muted); font-size: 0.85rem; text-align: center; padding: 12px;">
                    No spins yet. Give the wheel a whirl!
                </p>
            `;
            return;
        }

        elements.historyContainer.innerHTML = state.history.map(item => {
            const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            let label = item.displayText;
            if (item.assignedPerson) {
                label = `${item.assignedPerson}: ${item.displayText}`;
            }
            return `
                <div class="history-item">
                    <span class="history-label">${escapeHtml(stripEmoji(label))}</span>
                    <span class="history-time">${timeStr}</span>
                </div>
            `;
        }).join('');
    }

    /* -------------------------------------------------------------
       UI CONTROLS & THEME
    -------------------------------------------------------------- */
    function applyTheme(theme) {
        state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        // Icons swap via CSS on [data-theme]
        elements.themeToggleBtn.querySelector('.btn-label').textContent = theme === 'dark' ? 'Light' : 'Dark';
        const themeMeta = document.querySelector('meta[name="theme-color"]');
        if (themeMeta) themeMeta.setAttribute('content', theme === 'dark' ? '#141311' : '#f3ede2');
        saveState();
    }

    function applySound(enabled) {
        state.soundEnabled = enabled;
        window.soundEngine.setEnabled(enabled);
        elements.soundToggleBtn.classList.toggle('muted', !enabled);
        elements.soundToggleBtn.setAttribute('aria-pressed', String(enabled));
        elements.soundLabel.textContent = enabled ? 'Sound on' : 'Muted';
        saveState();
    }

    function showToast(message) {
        elements.toastMessage.textContent = stripEmoji(message);
        elements.toastNotice.classList.add('show');
        // Reset the timer so a new toast isn't hidden early by the previous one's timeout
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            elements.toastNotice.classList.remove('show');
        }, 2800);
    }

    // Native share sheet on phones, clipboard elsewhere, legacy copy as last resort
    async function shareOrCopy(text, copiedMsg, fallbackMsg) {
        if (navigator.share && isCoarsePointer) {
            try {
                await navigator.share({ text });
                return;
            } catch (e) {
                if (e && e.name === 'AbortError') return; // user closed the sheet
            }
        }
        try {
            await navigator.clipboard.writeText(text);
            showToast(copiedMsg);
            return;
        } catch (e) { /* clipboard API unavailable (file:// or http) */ }

        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        ta.remove();
        showToast(ok ? copiedMsg : fallbackMsg);
    }

    function generateBackgroundBubbles() {
        const container = document.getElementById('bgBubbles');
        if (!container) return;
        container.innerHTML = '';
        if (prefersReducedMotion) return;
        // Fewer animated layers on small / touch screens
        const count = (isCoarsePointer || window.innerWidth < 768) ? 7 : 18;
        for (let i = 0; i < count; i++) {
            const bubble = document.createElement('div');
            bubble.className = 'bubble-dec';
            const size = 20 + Math.random() * 50;
            bubble.style.width = `${size}px`;
            bubble.style.height = `${size}px`;
            bubble.style.left = `${Math.random() * 95}vw`;
            bubble.style.animationDuration = `${12 + Math.random() * 16}s`;
            bubble.style.animationDelay = `${Math.random() * 10}s`;
            container.appendChild(bubble);
        }
    }

    function switchMode(newMode, silent = false) {
        if (state.mode === newMode) return;
        if (wheelLocked()) return;
        state.mode = newMode;
        syncModeTabs();

        saveState();
        renderWheel();
        renderCustomizer();
        window.soundEngine.playClick();
        const modeNames = { tasks: 'Room', bathroom: 'Bathroom', people: 'People', combo: 'Combo' };
        if (!silent) showToast(`${modeNames[newMode]} wheel`);
    }

    /* -------------------------------------------------------------
       WEEKLY DUTY ROSTER – STRICT FAIR ROTATION ENGINE
       Rules:
       1. Bathroom rotates weekly – last week's person is EXCLUDED.
       2. Three MAJOR chores: Dishes, Floor, Bathroom.
       3. Refuse a major chore → you must do TWO major chores.
       4. Everyone takes responsibility – fair distribution enforced.
    -------------------------------------------------------------- */

    function loadRosterFromStorage() {
        try {
            const saved = localStorage.getItem('cleaningRoulette_roster');
            if (saved) {
                const parsed = JSON.parse(saved);
                state.roster = {
                    currentWeekNumber: parsed.currentWeekNumber || 0,
                    currentAssignment: parsed.currentAssignment || null,
                    rotationHistory: parsed.rotationHistory || [],
                    fairness: parsed.fairness || {}
                };
            }
        } catch (e) {
            console.warn('Roster storage load failed:', e);
        }
    }

    function getISOWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
        const week1 = new Date(d.getFullYear(), 0, 4);
        return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
    }

    function getActivePeopleNames() {
        return state.people.filter(p => p.enabled !== false).map(p => p.text);
    }

    function getLastBathroomPerson() {
        const history = state.roster.rotationHistory;
        if (history.length === 0) return null;
        return history[0].bathroom; // most recent entry
    }

    /**
     * Core fair assignment algorithm:
     * 1. Pick bathroom person: exclude last week's bathroom person.
     *    Among eligible, pick whoever has the fewest total bathroom assignments.
     *    Tie-break: random.
     * 2. Pick dishes person: from remaining pool (exclude bathroom person),
     *    pick whoever has fewest total dishes assignments.
     * 3. Pick floor person: from remaining pool (exclude bathroom + dishes),
     *    pick whoever has fewest total floor assignments.
     */
    function generateWeeklyRoster() {
        const people = getActivePeopleNames();
        if (people.length < 3) {
            showToast('⚠️ Need at least 3 people enabled to assign 3 major chores!');
            return null;
        }

        const lastBathroom = getLastBathroomPerson();
        const currentWeek = getISOWeekNumber(new Date());

        // Ensure fairness tracker has all people
        people.forEach(name => {
            if (!state.roster.fairness[name]) {
                state.roster.fairness[name] = { dishes: 0, floor: 0, bathroom: 0, penalties: 0 };
            }
        });

        // Helper: pick person with fewest assignments for a chore type, from a given pool
        function pickFairest(pool, choreType) {
            let minCount = Infinity;
            pool.forEach(name => {
                const count = state.roster.fairness[name][choreType] || 0;
                if (count < minCount) minCount = count;
            });
            const candidates = pool.filter(name => (state.roster.fairness[name][choreType] || 0) === minCount);
            return candidates[Math.floor(Math.random() * candidates.length)];
        }

        // Step 1: Bathroom – strict exclusion of last week's person
        let bathroomPool = people.filter(name => name !== lastBathroom);
        if (bathroomPool.length === 0) {
            // Edge case: only 1 person? Shouldn't happen with >=3 check, but fallback
            bathroomPool = [...people];
        }
        const bathroomPerson = pickFairest(bathroomPool, 'bathroom');

        // Step 2: Dishes – from remaining
        let dishesPool = people.filter(name => name !== bathroomPerson);
        const dishesPerson = pickFairest(dishesPool, 'dishes');

        // Step 3: Floor – from remaining (exclude both bathroom and dishes)
        let floorPool = people.filter(name => name !== bathroomPerson && name !== dishesPerson);
        const floorPerson = pickFairest(floorPool, 'floor');

        // Build assignment
        const assignment = {
            week: currentWeek,
            dishes: dishesPerson,
            floor: floorPerson,
            bathroom: bathroomPerson,
            penalties: [], // { person, originalChore, extraChore }
            timestamp: Date.now()
        };

        // Update fairness counts
        state.roster.fairness[dishesPerson].dishes++;
        state.roster.fairness[floorPerson].floor++;
        state.roster.fairness[bathroomPerson].bathroom++;

        // Save
        state.roster.currentWeekNumber = currentWeek;
        state.roster.currentAssignment = assignment;
        state.roster.rotationHistory.unshift(assignment);
        if (state.roster.rotationHistory.length > 30) {
            state.roster.rotationHistory.pop();
        }

        saveState();
        return assignment;
    }

    /**
     * Refuse a major chore → penalty: person must do TWO major chores.
     * Reassign the original chore to someone else, and assign the refuser a SECOND major chore.
     */
    function handleRefuseChore(choreType) {
        const assignment = state.roster.currentAssignment;
        if (!assignment) {
            showToast('⚠️ No roster generated yet! Generate one first.');
            return;
        }

        const refuser = assignment[choreType];
        if (!refuser || refuser === '— Not Assigned —') {
            showToast('⚠️ No one assigned to this chore yet.');
            return;
        }

        const people = getActivePeopleNames();

        // Already assigned people this week
        const assignedPeople = [assignment.dishes, assignment.floor, assignment.bathroom];

        // Find someone not assigned to any major chore to take over the refused chore
        let availableForChore = people.filter(name => name !== refuser && !assignedPeople.includes(name));

        if (availableForChore.length === 0) {
            // If everyone is assigned, pick the person with fewest total assignments (excluding refuser)
            availableForChore = people.filter(name => name !== refuser);
        }

        if (availableForChore.length === 0) {
            showToast('⚠️ No one else available to reassign. Everyone is occupied!');
            return;
        }

        // Pick fairest replacement for the refused chore
        function pickFairest(pool, type) {
            let minCount = Infinity;
            pool.forEach(name => {
                const count = (state.roster.fairness[name] && state.roster.fairness[name][type]) || 0;
                if (count < minCount) minCount = count;
            });
            const candidates = pool.filter(name => ((state.roster.fairness[name] && state.roster.fairness[name][type]) || 0) === minCount);
            return candidates[Math.floor(Math.random() * candidates.length)];
        }

        const replacement = pickFairest(availableForChore, choreType);

        // 1. Reassign the original chore to replacement
        assignment[choreType] = replacement;
        if (!state.roster.fairness[replacement]) {
            state.roster.fairness[replacement] = { dishes: 0, floor: 0, bathroom: 0, penalties: 0 };
        }
        state.roster.fairness[replacement][choreType]++;

        // Decrement refuser's count for original chore (they didn't do it)
        if (state.roster.fairness[refuser] && state.roster.fairness[refuser][choreType] > 0) {
            state.roster.fairness[refuser][choreType]--;
        }

        // 2. Penalty: refuser gets TWO major chores. Assign them a second different major chore.
        const majorChoreTypes = ['dishes', 'floor', 'bathroom'];
        const otherChores = majorChoreTypes.filter(c => c !== choreType);
        // Pick a random second chore type for penalty
        const penaltyChoreType = otherChores[Math.floor(Math.random() * otherChores.length)];
        const penaltyChoreLabels = { dishes: 'Wash the Dishes', floor: 'Clean the Floor', bathroom: 'Clean the Bathroom' };

        assignment.penalties.push({
            person: refuser,
            refused: choreType,
            penaltyChore1: penaltyChoreLabels[otherChores[0]],
            penaltyChore2: penaltyChoreLabels[otherChores[1]],
            description: `${refuser} refused "${penaltyChoreLabels[choreType]}" → Must do BOTH "${penaltyChoreLabels[otherChores[0]]}" AND "${penaltyChoreLabels[otherChores[1]]}"`
        });

        // Track penalty count
        if (!state.roster.fairness[refuser]) {
            state.roster.fairness[refuser] = { dishes: 0, floor: 0, bathroom: 0, penalties: 0 };
        }
        state.roster.fairness[refuser].penalties++;

        saveState();
        renderRoster();

        window.soundEngine.playEvilSelection();
        showToast(`🚫 ${refuser} refused! Penalty: must do TWO major chores instead!`);
    }

    function renderRoster() {
        const assignment = state.roster.currentAssignment;
        const currentWeek = getISOWeekNumber(new Date());

        // Week label
        if (elements.rosterWeekLabel) {
            elements.rosterWeekLabel.textContent = assignment ? `Week ${assignment.week}` : `Week ${currentWeek}`;
        }

        // Assignment slots
        if (assignment) {
            setRosterSlot(elements.rosterDishes, assignment.dishes);
            setRosterSlot(elements.rosterFloor, assignment.floor);
            setRosterSlot(elements.rosterBathroom, assignment.bathroom);

            // Bathroom rotation note
            const lastBath = getLastBathroomPerson();
            const historyLen = state.roster.rotationHistory.length;
            if (historyLen > 1) {
                const prevEntry = state.roster.rotationHistory[1]; // entry before current
                if (elements.rosterBathroomNote) {
                    elements.rosterBathroomNote.textContent = `Last week: ${prevEntry.bathroom} (excluded this week)`;
                }
            } else {
                if (elements.rosterBathroomNote) {
                    elements.rosterBathroomNote.textContent = 'First rotation — no one excluded';
                }
            }

            // Penalty alert
            if (assignment.penalties && assignment.penalties.length > 0) {
                if (elements.rosterPenaltyAlert) {
                    elements.rosterPenaltyAlert.classList.remove('hidden');
                    const penaltyTexts = assignment.penalties.map(p => escapeHtml(p.description));
                    if (elements.rosterPenaltyText) {
                        elements.rosterPenaltyText.innerHTML = penaltyTexts.join('<br>');
                    }
                }
            } else {
                if (elements.rosterPenaltyAlert) {
                    elements.rosterPenaltyAlert.classList.add('hidden');
                }
            }
        } else {
            setRosterSlot(elements.rosterDishes, null);
            setRosterSlot(elements.rosterFloor, null);
            setRosterSlot(elements.rosterBathroom, null);
            if (elements.rosterBathroomNote) elements.rosterBathroomNote.textContent = 'Last week: —';
            if (elements.rosterPenaltyAlert) elements.rosterPenaltyAlert.classList.add('hidden');
        }

        renderRosterFairness();
        renderRosterHistory();
    }

    function setRosterSlot(el, personName) {
        if (!el) return;
        if (personName) {
            el.textContent = stripEmoji(personName);
            el.className = 'roster-slot-person assigned';
        } else {
            el.textContent = 'Not assigned';
            el.className = 'roster-slot-person';
        }
    }

    function renderRosterFairness() {
        if (!elements.rosterFairnessGrid) return;
        elements.rosterFairnessGrid.innerHTML = '';

        const people = getActivePeopleNames();

        people.forEach(name => {
            const stats = state.roster.fairness[name] || { dishes: 0, floor: 0, bathroom: 0, penalties: 0 };

            const card = document.createElement('div');
            card.className = 'fairness-person-card';

            card.innerHTML = `
                <div class="fairness-person-name">${escapeHtml(stripEmoji(name))}</div>
                <div class="fairness-counts">
                    <span class="fairness-chip" title="Dishes">D ${stats.dishes}</span>
                    <span class="fairness-chip" title="Floor">F ${stats.floor}</span>
                    <span class="fairness-chip" title="Bathroom">B ${stats.bathroom}</span>
                    ${stats.penalties > 0 ? `<span class="fairness-chip penalty-chip" title="Refusals">R ${stats.penalties}</span>` : ''}
                </div>
            `;

            elements.rosterFairnessGrid.appendChild(card);
        });
    }

    function renderRosterHistory() {
        if (!elements.rosterHistoryList) return;
        elements.rosterHistoryList.innerHTML = '';

        const history = state.roster.rotationHistory;

        if (history.length === 0) {
            elements.rosterHistoryList.innerHTML = '<p class="empty-note">No roster yet. Generate one to start the rotation.</p>';
            return;
        }

        history.forEach(entry => {
            const div = document.createElement('div');
            div.className = 'roster-history-entry';

            const dateStr = new Date(entry.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

            let penaltyHtml = '';
            if (entry.penalties && entry.penalties.length > 0) {
                penaltyHtml = entry.penalties.map(p =>
                    `<span class="roster-history-penalty-tag">${escapeHtml(stripEmoji(p.person))} refused</span>`
                ).join(' ');
            }

            div.innerHTML = `
                <div class="roster-history-week">Week ${entry.week} <span>· ${dateStr}</span></div>
                <div class="roster-history-detail">
                    <span class="roster-history-chunk">Dishes <strong>${escapeHtml(stripEmoji(entry.dishes))}</strong></span>
                    <span class="roster-history-chunk">Floor <strong>${escapeHtml(stripEmoji(entry.floor))}</strong></span>
                    <span class="roster-history-chunk">Bathroom <strong>${escapeHtml(stripEmoji(entry.bathroom))}</strong></span>
                    ${penaltyHtml}
                </div>
            `;

            elements.rosterHistoryList.appendChild(div);
        });
    }

    /* -------------------------------------------------------------
       EVENT LISTENERS
    -------------------------------------------------------------- */
    function setupEventListeners() {
        // Spin Button
        elements.spinBtn.addEventListener('click', spinWheel);

        // Tap the wheel itself to spin (natural on touch screens)
        elements.canvas.addEventListener('click', spinWheel);

        // Keyboard: Space spins, Escape closes the winner popup
        window.addEventListener('keydown', (e) => {
            const modalOpen = elements.winnerModal.classList.contains('open');
            if (e.key === 'Escape' && modalOpen) {
                closeWinnerModal();
                return;
            }
            if (e.code !== 'Space' || e.repeat) return;
            // Let focused controls handle Space themselves (otherwise a focused button clicks AND spins)
            const tag = e.target.tagName;
            if (['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A', 'LABEL'].includes(tag) || e.target.isContentEditable) return;
            if (!state.isSpinning && !modalOpen) {
                e.preventDefault();
                spinWheel();
            }
        });

        // Checklist rows use delegated listeners (rows are re-rendered often)
        elements.checklistContainer.addEventListener('change', onChecklistChange);
        elements.checklistContainer.addEventListener('click', onChecklistClick);

        // Catch the timer up immediately when returning to the tab / unlocking the phone
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) tickTimer();
        });

        // Mode switch tabs
        elements.tabTasks.addEventListener('click', () => switchMode('tasks'));
        elements.tabBathroom.addEventListener('click', () => switchMode('bathroom'));
        elements.tabPeople.addEventListener('click', () => switchMode('people'));
        elements.tabCombo.addEventListener('click', () => switchMode('combo'));

        // Sound Toggle
        elements.soundToggleBtn.addEventListener('click', () => {
            applySound(!state.soundEnabled);
            if (state.soundEnabled) window.soundEngine.playClick();
        });

        // Theme Toggle
        elements.themeToggleBtn.addEventListener('click', () => {
            applyTheme(state.theme === 'light' ? 'dark' : 'light');
            window.soundEngine.playClick();
        });

        // Speed timer toggle scroll
        const scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';
        elements.timerToggleBtn.addEventListener('click', () => {
            elements.speedTimerPanel.scrollIntoView({ behavior: scrollBehavior, block: 'start' });
        });

        // Checklist jump
        elements.checklistBtn.addEventListener('click', () => {
            document.getElementById('checklistSection').scrollIntoView({ behavior: scrollBehavior, block: 'start' });
        });

        // Quick Actions
        elements.shuffleWheelBtn.addEventListener('click', shuffleSlices);
        elements.fastSpinBtn.addEventListener('click', () => {
            state.isTurbo = !state.isTurbo;
            elements.fastSpinState.textContent = state.isTurbo ? 'On' : 'Off';
            elements.fastSpinBtn.classList.toggle('active', state.isTurbo);
            showToast(state.isTurbo ? '⚡ Turbo Spin Activated!' : 'Normal Spin Speed');
            window.soundEngine.playClick();
        });

        elements.surpriseSpinBtn.addEventListener('click', () => {
            if (wheelLocked()) return;
            // Automatically spin with guaranteed surprise
            const surpriseTask = SURPRISE_TASKS[Math.floor(Math.random() * SURPRISE_TASKS.length)];
            onSpinFinished({
                id: 'surprise_direct',
                text: surpriseTask,
                icon: '🎁'
            });
        });

        elements.resetDefaultBtn.addEventListener('click', resetCurrentModeToDefaults);

        // Preset Quick Loaders in Customizer
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (wheelLocked()) return;
                const preset = btn.dataset.preset;
                if (preset === 'room') {
                    switchMode('tasks', true);
                    state.tasks = JSON.parse(JSON.stringify(DEFAULT_ROOM_TASKS));
                } else if (preset === 'bathroom') {
                    switchMode('bathroom', true);
                    state.bathroom = JSON.parse(JSON.stringify(DEFAULT_BATHROOM_TASKS));
                } else if (preset === 'roommates' || preset === 'squad') {
                    switchMode('people', true);
                    state.people = JSON.parse(JSON.stringify(DEFAULT_PEOPLE));
                }
                saveState();
                renderWheel();
                renderCustomizer();
                showToast(`Loaded "${preset}" preset!`);
            });
        });

        // Add custom item to wheel
        elements.addItemForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addNewCustomItem(elements.newItemInput.value);
            elements.newItemInput.value = '';
        });

        // Add item to checklist form
        elements.addChecklistForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addChoreToChecklist(elements.checklistInput.value, 'Manual');
            elements.checklistInput.value = '';
        });

        // Clear History
        elements.clearHistoryBtn.addEventListener('click', () => {
            state.history = [];
            saveState();
            renderHistory();
            showToast('History cleared.');
        });

        // Room expenses
        elements.expenseForm.addEventListener('submit', (e) => {
            e.preventDefault();
            addExpense();
        });
        elements.expPrevMonth.addEventListener('click', () => {
            state.expenseMonth = shiftMonth(state.expenseMonth, -1);
            renderExpenses();
        });
        elements.expNextMonth.addEventListener('click', () => {
            state.expenseMonth = shiftMonth(state.expenseMonth, 1);
            renderExpenses();
        });
        elements.expenseList.addEventListener('click', (e) => {
            const btn = e.target.closest('.delete-task-btn');
            if (!btn) return;
            const id = btn.closest('.expense-row').dataset.id;
            const removed = state.expenses.find(x => x.id === id);
            state.expenses = state.expenses.filter(x => x.id !== id);
            saveState();
            renderExpenses();
            if (removed) showToast(`Removed ${removed.item} (${inr.format(removed.amount)})`);
        });
        elements.expBudgetInput.addEventListener('change', () => {
            const val = Math.round(parseFloat(elements.expBudgetInput.value));
            if (!Number.isFinite(val) || val < 0) {
                elements.expBudgetInput.value = String(state.expenseBudget);
                return;
            }
            state.expenseBudget = val;
            saveState();
            renderExpenses();
            showToast(`Monthly allocation set to ${inr.format(val)}`);
        });
        elements.expShareBtn.addEventListener('click', shareExpenseMonth);

        // Speed Clean Timer Controls
        elements.timerStartBtn.addEventListener('click', startTimer);
        elements.timerResetBtn.addEventListener('click', resetTimer);

        document.querySelectorAll('.timer-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.timer-preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const secs = parseInt(btn.dataset.time, 10);
                state.speedTimer.totalSeconds = secs;
                resetTimer();
            });
        });

        // Winner Modal Actions
        elements.modalAcceptBtn.addEventListener('click', () => {
            if (lastWinnerResult) {
                let assigned = lastWinnerResult.assignedPerson || '';
                if (lastWinnerResult.mode === 'people') {
                    assigned = lastWinnerResult.item.text;
                    addChoreToChecklist(`Room Cleaning Duty`, assigned);
                } else {
                    addChoreToChecklist(lastWinnerResult.displayText, assigned);
                }
            }
            closeWinnerModal();
        });

        elements.modalSpinAgainBtn.addEventListener('click', () => {
            closeWinnerModal();
            setTimeout(() => {
                spinWheel();
            }, 300);
        });

        elements.modalShareBtn.addEventListener('click', () => {
            if (!lastWinnerResult) return;
            const textToShare = `Cleaning Roulette\n${elements.winnerHeadline.textContent}: ${elements.winnerTaskText.textContent}\nThe wheel has spoken.`;
            shareOrCopy(textToShare,
                '📋 Copied result to clipboard! Ready to share in chat!',
                'Result: ' + elements.winnerTaskText.textContent);
        });

        // Click outside modal card to close
        elements.winnerModal.addEventListener('click', (e) => {
            if (e.target === elements.winnerModal) {
                closeWinnerModal();
            }
        });

        // ── Weekly Duty Roster Event Listeners ──

        // Generate this week's roster
        if (elements.rosterGenerateBtn) {
            elements.rosterGenerateBtn.addEventListener('click', () => {
                const result = generateWeeklyRoster();
                if (result) {
                    renderRoster();
                    window.soundEngine.playFanfare();
                    confetti.fire({ count: 80 });
                    showToast(`📅 Week ${result.week} roster generated! No arguments — it's final!`);
                }
            });
        }

        // Refuse buttons
        document.querySelectorAll('.roster-refuse-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const choreType = btn.dataset.chore;
                if (choreType) {
                    handleRefuseChore(choreType);
                }
            });
        });

        // Push all roster chores to checklist
        if (elements.rosterAddChecklistBtn) {
            elements.rosterAddChecklistBtn.addEventListener('click', () => {
                const assignment = state.roster.currentAssignment;
                if (!assignment) {
                    showToast('⚠️ Generate a roster first!');
                    return;
                }
                // Batch: one save + one render instead of one per chore
                addChoreToChecklist('Wash the Dishes', assignment.dishes, true);
                addChoreToChecklist('Clean the Floor', assignment.floor, true);
                addChoreToChecklist('Clean the Bathroom', assignment.bathroom, true);

                // Add penalty chores to checklist too
                if (assignment.penalties && assignment.penalties.length > 0) {
                    assignment.penalties.forEach(p => {
                        addChoreToChecklist(p.penaltyChore1, p.person + ' (PENALTY)', true);
                        addChoreToChecklist(p.penaltyChore2, p.person + ' (PENALTY)', true);
                    });
                }

                saveState();
                renderChecklist();
                showToast('📋 All roster chores pushed to checklist!');
            });
        }

        // Copy roster to clipboard
        if (elements.rosterShareBtn) {
            elements.rosterShareBtn.addEventListener('click', () => {
                const assignment = state.roster.currentAssignment;
                if (!assignment) {
                    showToast('⚠️ No roster to share yet!');
                    return;
                }
                let text = `Cleaning roster, week ${assignment.week}\n\n`;
                text += `Dishes: ${assignment.dishes}\n`;
                text += `Floor: ${assignment.floor}\n`;
                text += `Bathroom: ${assignment.bathroom}\n`;

                if (assignment.penalties.length > 0) {
                    text += `\nPenalties:\n`;
                    assignment.penalties.forEach(p => {
                        text += `- ${p.description}\n`;
                    });
                }

                text += `\nNo arguments. Everyone does their share.`;

                shareOrCopy(text,
                    '📤 Roster copied to clipboard!',
                    'Roster: ' + assignment.dishes + ', ' + assignment.floor + ', ' + assignment.bathroom);
            });
        }

        // Reset roster rotation history
        if (elements.rosterResetHistBtn) {
            elements.rosterResetHistBtn.addEventListener('click', () => {
                state.roster.currentAssignment = null;
                state.roster.rotationHistory = [];
                state.roster.fairness = {};
                state.roster.currentWeekNumber = 0;
                saveState();
                renderRoster();
                showToast('🗑️ Rotation history cleared. Fresh start!');
            });
        }
    }

    // Launch application on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
