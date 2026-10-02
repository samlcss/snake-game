// game.js - Neo Snake Arcade Game Engine
(function() {
    'use strict';

    // Canvas & Context
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // UI Elements
    const currentScoreEl = document.getElementById('currentScore');
    const highScoreEl = document.getElementById('highScore');
    const comboMultiplierEl = document.getElementById('comboMultiplier');
    
    // Screens / Overlays
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const pauseScreen = document.getElementById('pauseScreen');
    
    // Buttons
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');
    const resumeBtn = document.getElementById('resumeBtn');
    const pauseBtn = document.getElementById('pauseBtn');
    const soundToggleBtn = document.getElementById('soundToggleBtn');
    const bgmToggleBtn = document.getElementById('bgmToggleBtn');

    // Stats modal elements
    const finalScoreEl = document.getElementById('finalScore');
    const finalFoodsEl = document.getElementById('finalFoods');
    const finalComboEl = document.getElementById('finalCombo');
    const newRecordBadge = document.getElementById('newRecordBadge');

    // Virtual Arrow Keys
    const keyUp = document.getElementById('keyUp');
    const keyDown = document.getElementById('keyDown');
    const keyLeft = document.getElementById('keyLeft');
    const keyRight = document.getElementById('keyRight');
    const virtualKeys = {
        'ArrowUp': keyUp,
        'ArrowDown': keyDown,
        'ArrowLeft': keyLeft,
        'ArrowRight': keyRight
    };

    // Difficulty settings (tick interval in ms)
    const SPEEDS = {
        easy: 125,
        normal: 90,
        hard: 65
    };
    let currentDifficulty = 'normal';

    // Grid configuration
    const GRID_SIZE = 22; // 22 x 22 cells
    let cellSize = 20;

    // Game state
    const STATE = {
        START: 'START',
        PLAYING: 'PLAYING',
        PAUSED: 'PAUSED',
        GAMEOVER: 'GAMEOVER'
    };
    let gameState = STATE.START;

    // Game variables
    let snake = [];
    let direction = { x: 1, y: 0 };
    let inputQueue = [];
    let food = { x: 0, y: 0, type: 'normal' };
    let goldenFood = null;
    let goldenFoodTimer = null;
    let goldenTimeLeft = 0;
    let goldenMaxTime = 70; // ticks
    let foodsEatenCount = 0;

    let score = 0;
    let highScore = parseInt(localStorage.getItem('neo_snake_highscore') || '0', 10);
    let combo = 1;
    let maxCombo = 1;
    let lastEatTime = 0;
    const COMBO_WINDOW_MS = 3500;

    let gameLoopTimeout = null;
    let lastTickTime = 0;

    // Particle & Floating Text Systems
    let particles = [];
    let floatingTexts = [];

    // Initialize High Score UI
    highScoreEl.textContent = highScore;

    // Responsive Canvas Resizing with Retina crispness
    function resizeCanvas() {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const size = Math.floor(rect.width);
        
        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.resetTransform();
        ctx.scale(dpr, dpr);

        cellSize = size / GRID_SIZE;
    }

    window.addEventListener('resize', resizeCanvas);

    // Audio status sync
    function updateAudioButtons() {
        if (window.soundCtrl) {
            soundToggleBtn.innerHTML = window.soundCtrl.muted ? '🔇' : '🔊';
            soundToggleBtn.classList.toggle('active', !window.soundCtrl.muted);
            bgmToggleBtn.innerHTML = window.soundCtrl.bgmMuted ? '🎵 OFF' : '🎵 ON';
            bgmToggleBtn.classList.toggle('active', !window.soundCtrl.bgmMuted);
        }
    }

    soundToggleBtn.addEventListener('click', () => {
        window.soundCtrl.init();
        window.soundCtrl.toggleMute();
        updateAudioButtons();
    });

    bgmToggleBtn.addEventListener('click', () => {
        window.soundCtrl.init();
        window.soundCtrl.toggleBgm();
        updateAudioButtons();
    });

    // Difficulty buttons
    document.querySelectorAll('.diff-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentDifficulty = e.target.dataset.diff;
        });
    });

    // Initialize Snake Game
    function resetGame() {
        const mid = Math.floor(GRID_SIZE / 2);
        snake = [
            { x: mid, y: mid },
            { x: mid - 1, y: mid },
            { x: mid - 2, y: mid }
        ];
        direction = { x: 1, y: 0 };
        inputQueue = [];
        score = 0;
        combo = 1;
        maxCombo = 1;
        foodsEatenCount = 0;
        particles = [];
        floatingTexts = [];
        goldenFood = null;
        goldenTimeLeft = 0;

        currentScoreEl.textContent = '0';
        comboMultiplierEl.textContent = '1x';
        comboMultiplierEl.parentElement.classList.remove('combo-active');

        spawnFood();
    }

    function spawnFood() {
        let emptyCells = [];
        for (let x = 0; x < GRID_SIZE; x++) {
            for (let y = 0; y < GRID_SIZE; y++) {
                const onSnake = snake.some(seg => seg.x === x && seg.y === y);
                const onGolden = goldenFood && goldenFood.x === x && goldenFood.y === y;
                if (!onSnake && !onGolden) {
                    emptyCells.push({ x, y });
                }
            }
        }

        if (emptyCells.length === 0) return; // Board complete!

        const spot = emptyCells[Math.floor(Math.random() * emptyCells.length)];
        food = {
            x: spot.x,
            y: spot.y,
            type: 'normal',
            pulse: 0
        };

        // Every 5 foods eaten, chance to spawn a bonus Golden Apple
        if (foodsEatenCount > 0 && foodsEatenCount % 5 === 0 && !goldenFood) {
            spawnGoldenFood(emptyCells.filter(c => c.x !== spot.x || c.y !== spot.y));
        }
    }

    function spawnGoldenFood(availableCells) {
        if (availableCells.length === 0) return;
        const spot = availableCells[Math.floor(Math.random() * availableCells.length)];
        goldenFood = {
            x: spot.x,
            y: spot.y,
            type: 'golden'
        };
        goldenTimeLeft = goldenMaxTime;
    }

    // Input Controller
    function handleDirectionInput(newDir, keyName) {
        window.soundCtrl.init();

        // Highlight virtual key
        if (keyName && virtualKeys[keyName]) {
            virtualKeys[keyName].classList.add('active');
            setTimeout(() => virtualKeys[keyName].classList.remove('active'), 120);
        }

        if (gameState !== STATE.PLAYING) return;

        const lastQueuedDir = inputQueue.length > 0 ? inputQueue[inputQueue.length - 1] : direction;

        // Disallow 180-degree reversing
        if (newDir.x + lastQueuedDir.x === 0 && newDir.y + lastQueuedDir.y === 0) {
            return;
        }

        // Avoid adding duplicate identical directions
        if (newDir.x === lastQueuedDir.x && newDir.y === lastQueuedDir.y) {
            return;
        }

        // Buffer up to 2 moves for instant responsiveness
        if (inputQueue.length < 2) {
            inputQueue.push(newDir);
            window.soundCtrl.playTurn();
        }
    }

    // Keyboard Events
    window.addEventListener('keydown', (e) => {
        // Spacebar to pause / unpause / restart
        if (e.code === 'Space') {
            e.preventDefault();
            if (gameState === STATE.PLAYING) {
                pauseGame();
            } else if (gameState === STATE.PAUSED) {
                resumeGame();
            } else if (gameState === STATE.GAMEOVER || gameState === STATE.START) {
                startGame();
            }
            return;
        }

        // P key to pause / resume
        if (e.code === 'KeyP') {
            if (gameState === STATE.PLAYING) pauseGame();
            else if (gameState === STATE.PAUSED) resumeGame();
            return;
        }

        // M key to toggle sound
        if (e.code === 'KeyM') {
            window.soundCtrl.toggleMute();
            updateAudioButtons();
            return;
        }

        switch (e.code) {
            case 'ArrowUp':
            case 'KeyW':
                e.preventDefault();
                handleDirectionInput({ x: 0, y: -1 }, 'ArrowUp');
                break;
            case 'ArrowDown':
            case 'KeyS':
                e.preventDefault();
                handleDirectionInput({ x: 0, y: 1 }, 'ArrowDown');
                break;
            case 'ArrowLeft':
            case 'KeyA':
                e.preventDefault();
                handleDirectionInput({ x: -1, y: 0 }, 'ArrowLeft');
                break;
            case 'ArrowRight':
            case 'KeyD':
                e.preventDefault();
                handleDirectionInput({ x: 1, y: 0 }, 'ArrowRight');
                break;
        }
    });

    // Touch / Click on Virtual Keys
    keyUp.addEventListener('click', () => handleDirectionInput({ x: 0, y: -1 }, 'ArrowUp'));
    keyDown.addEventListener('click', () => handleDirectionInput({ x: 0, y: 1 }, 'ArrowDown'));
    keyLeft.addEventListener('click', () => handleDirectionInput({ x: -1, y: 0 }, 'ArrowLeft'));
    keyRight.addEventListener('click', () => handleDirectionInput({ x: 1, y: 0 }, 'ArrowRight'));

    // Main Game Loop (Tick-based movement + 60fps rendering)
    function gameTick() {
        if (gameState !== STATE.PLAYING) return;

        // Apply buffered direction
        if (inputQueue.length > 0) {
            direction = inputQueue.shift();
        }

        const head = snake[0];
        const newHead = {
            x: head.x + direction.x,
            y: head.y + direction.y
        };

        // Wall Collision
        if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
            triggerGameOver();
            return;
        }

        // Self Collision
        if (snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)) {
            triggerGameOver();
            return;
        }

        // Move Snake
        snake.unshift(newHead);

        // Check Food Collision
        let ateFood = false;

        // Golden food timer
        if (goldenFood) {
            goldenTimeLeft--;
            if (goldenTimeLeft <= 0) {
                goldenFood = null;
            } else if (newHead.x === goldenFood.x && newHead.y === goldenFood.y) {
                // Ate golden food!
                ateFood = true;
                const bonusPoints = 50 * combo;
                score += bonusPoints;
                addFloatingText(`+${bonusPoints} OURO!`, goldenFood.x, goldenFood.y, '#ffd700');
                createExplosion(goldenFood.x, goldenFood.y, '#ffd700', 30);
                window.soundCtrl.playGolden();
                goldenFood = null;
            }
        }

        if (newHead.x === food.x && newHead.y === food.y) {
            ateFood = true;
            foodsEatenCount++;

            // Combo system
            const now = performance.now();
            if (now - lastEatTime < COMBO_WINDOW_MS) {
                combo = Math.min(combo + 1, 8);
                if (combo > maxCombo) maxCombo = combo;
                if (combo >= 3) {
                    window.soundCtrl.playCombo();
                }
            } else {
                combo = 1;
            }
            lastEatTime = now;

            const pointsEarned = 10 * combo;
            score += pointsEarned;

            // Score bump animation
            currentScoreEl.textContent = score;
            currentScoreEl.classList.add('score-bump');
            setTimeout(() => currentScoreEl.classList.remove('score-bump'), 150);

            comboMultiplierEl.textContent = `${combo}x`;

            addFloatingText(`+${pointsEarned}${combo > 1 ? ` (${combo}x)` : ''}`, food.x, food.y, '#00f0ff');
            createExplosion(food.x, food.y, '#ff007f', 18);
            window.soundCtrl.playEat(combo);

            spawnFood();
        }

        if (!ateFood) {
            snake.pop(); // Remove tail segment
        }

        // Dynamic speed based on score
        const baseSpeed = SPEEDS[currentDifficulty];
        const speedBoost = Math.min(Math.floor(score / 50) * 2, 35);
        const currentTickInterval = Math.max(baseSpeed - speedBoost, 45);

        gameLoopTimeout = setTimeout(gameTick, currentTickInterval);
    }

    // Particle FX
    function createExplosion(gridX, gridY, color, count = 20) {
        const px = (gridX + 0.5) * cellSize;
        const py = (gridY + 0.5) * cellSize;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 1.5;
            particles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 3 + 1.5,
                color: color,
                alpha: 1,
                decay: Math.random() * 0.03 + 0.02
            });
        }
    }

    function addFloatingText(text, gridX, gridY, color) {
        floatingTexts.push({
            text: text,
            x: (gridX + 0.5) * cellSize,
            y: (gridY + 0.2) * cellSize,
            vy: -1.2,
            alpha: 1,
            color: color
        });
    }

    // Render Canvas Loop (60 FPS)
    function render(timestamp) {
        const width = canvas.width / (window.devicePixelRatio || 1);
        const height = canvas.height / (window.devicePixelRatio || 1);

        // Clear Screen with deep slate background
        ctx.fillStyle = '#080b18';
        ctx.fillRect(0, 0, width, height);

        // Draw Subtle Glowing Grid Lines
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= GRID_SIZE; i++) {
            ctx.beginPath();
            ctx.moveTo(i * cellSize, 0);
            ctx.lineTo(i * cellSize, height);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * cellSize);
            ctx.lineTo(width, i * cellSize);
            ctx.stroke();
        }

        // Draw Food (Pulsing Apple)
        if (food) {
            const fx = food.x * cellSize;
            const fy = food.y * cellSize;
            const cx = fx + cellSize / 2;
            const cy = fy + cellSize / 2;
            const pulse = Math.sin(timestamp * 0.008) * 1.5;
            const r = (cellSize / 2.6) + pulse;

            // Food Glow
            ctx.save();
            ctx.shadowColor = '#ff007f';
            ctx.shadowBlur = 16;
            ctx.fillStyle = '#ff007f';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            // Fruit Leaf
            ctx.shadowBlur = 0;
            ctx.fillStyle = '#00ff88';
            ctx.beginPath();
            ctx.ellipse(cx + 2, cy - r + 1, 3.5, 2, Math.PI / 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw Golden Bonus Food with countdown ring
        if (goldenFood) {
            const gx = goldenFood.x * cellSize;
            const gy = goldenFood.y * cellSize;
            const cx = gx + cellSize / 2;
            const cy = gy + cellSize / 2;
            const pulse = Math.sin(timestamp * 0.012) * 2;
            const r = (cellSize / 2.4) + pulse;

            ctx.save();
            // Countdown ring
            const pct = goldenTimeLeft / goldenMaxTime;
            ctx.strokeStyle = 'rgba(255, 215, 0, 0.6)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(cx, cy, cellSize * 0.48, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
            ctx.stroke();

            // Glowing Star Center
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 20;
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.fill();

            // Star Sparkle
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(cx - 2, cy - 2, r * 0.35, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw Snake
        for (let i = snake.length - 1; i >= 0; i--) {
            const seg = snake[i];
            const sx = seg.x * cellSize;
            const sy = seg.y * cellSize;
            const isHead = i === 0;

            ctx.save();
            if (isHead) {
                // Head with glowing cyan aura
                ctx.shadowColor = '#00f0ff';
                ctx.shadowBlur = 18;
                ctx.fillStyle = '#00f0ff';
                ctx.beginPath();
                ctx.roundRect(sx + 1, sy + 1, cellSize - 2, cellSize - 2, 7);
                ctx.fill();

                // Eyes looking towards direction
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#070913';
                const eyeOffset = cellSize * 0.28;
                const eyeR = cellSize * 0.14;

                let ex1 = sx + cellSize / 2;
                let ey1 = sy + cellSize / 2;
                let ex2 = sx + cellSize / 2;
                let ey2 = sy + cellSize / 2;

                if (direction.x === 1) { // Moving Right
                    ex1 = sx + cellSize - 6; ey1 = sy + eyeOffset;
                    ex2 = sx + cellSize - 6; ey2 = sy + cellSize - eyeOffset;
                } else if (direction.x === -1) { // Left
                    ex1 = sx + 6; ey1 = sy + eyeOffset;
                    ex2 = sx + 6; ey2 = sy + cellSize - eyeOffset;
                } else if (direction.y === -1) { // Up
                    ex1 = sx + eyeOffset; ey1 = sy + 6;
                    ex2 = sx + cellSize - eyeOffset; ey2 = sy + 6;
                } else { // Down
                    ex1 = sx + eyeOffset; ey1 = sy + cellSize - 6;
                    ex2 = sx + cellSize - eyeOffset; ey2 = sy + cellSize - 6;
                }

                ctx.beginPath();
                ctx.arc(ex1, ey1, eyeR, 0, Math.PI * 2);
                ctx.arc(ex2, ey2, eyeR, 0, Math.PI * 2);
                ctx.fill();

                // Glowing pupils
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.arc(ex1, ey1, eyeR * 0.5, 0, Math.PI * 2);
                ctx.arc(ex2, ey2, eyeR * 0.5, 0, Math.PI * 2);
                ctx.fill();

            } else {
                // Body segments with color gradient from cyan to purple to magenta
                const progress = i / snake.length;
                // Interpolate gradient
                ctx.fillStyle = `hsl(${185 - progress * 110}, 100%, ${55 - progress * 10}%)`;
                ctx.shadowColor = 'rgba(0, 240, 255, 0.2)';
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.roundRect(sx + 2, sy + 2, cellSize - 4, cellSize - 4, 5);
                ctx.fill();
            }
            ctx.restore();
        }

        // Draw and update particles
        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vx *= 0.94;
            p.vy *= 0.94;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                particles.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw and update floating texts
        for (let i = floatingTexts.length - 1; i >= 0; i--) {
            const ft = floatingTexts[i];
            ft.y += ft.vy;
            ft.alpha -= 0.02;

            if (ft.alpha <= 0) {
                floatingTexts.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = ft.alpha;
            ctx.font = 'bold 13px "Outfit", sans-serif';
            ctx.fillStyle = ft.color;
            ctx.shadowColor = ft.color;
            ctx.shadowBlur = 8;
            ctx.textAlign = 'center';
            ctx.fillText(ft.text, ft.x, ft.y);
            ctx.restore();
        }

        requestAnimationFrame(render);
    }

    // State Transitions
    function startGame() {
        window.soundCtrl.init();
        window.soundCtrl.playStart();
        if (!window.soundCtrl.bgmMuted) {
            window.soundCtrl.startBgm();
        }

        startScreen.classList.remove('visible');
        gameOverScreen.classList.remove('visible');
        pauseScreen.classList.remove('visible');

        gameState = STATE.PLAYING;
        resetGame();

        if (gameLoopTimeout) clearTimeout(gameLoopTimeout);
        gameLoopTimeout = setTimeout(gameTick, SPEEDS[currentDifficulty]);
    }

    function pauseGame() {
        if (gameState !== STATE.PLAYING) return;
        gameState = STATE.PAUSED;
        if (gameLoopTimeout) clearTimeout(gameLoopTimeout);
        pauseScreen.classList.add('visible');
    }

    function resumeGame() {
        if (gameState !== STATE.PAUSED) return;
        pauseScreen.classList.remove('visible');
        gameState = STATE.PLAYING;
        gameLoopTimeout = setTimeout(gameTick, SPEEDS[currentDifficulty]);
    }

    function triggerGameOver() {
        gameState = STATE.GAMEOVER;
        if (gameLoopTimeout) clearTimeout(gameLoopTimeout);

        window.soundCtrl.playGameOver();

        // Break snake into particles
        snake.forEach(seg => {
            createExplosion(seg.x, seg.y, '#00f0ff', 6);
        });

        // High score check
        const isNewRecord = score > highScore;
        if (isNewRecord) {
            highScore = score;
            localStorage.setItem('neo_snake_highscore', highScore);
            highScoreEl.textContent = highScore;
            newRecordBadge.style.display = 'inline-flex';
        } else {
            newRecordBadge.style.display = 'none';
        }

        // Fill modal stats
        finalScoreEl.textContent = score;
        finalFoodsEl.textContent = foodsEatenCount;
        finalComboEl.textContent = `${maxCombo}x`;

        setTimeout(() => {
            gameOverScreen.classList.add('visible');
        }, 350);
    }

    // Event Listeners for UI Buttons
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);
    resumeBtn.addEventListener('click', resumeGame);
    pauseBtn.addEventListener('click', () => {
        if (gameState === STATE.PLAYING) pauseGame();
        else if (gameState === STATE.PAUSED) resumeGame();
    });

    // Boot
    resizeCanvas();
    updateAudioButtons();
    startScreen.classList.add('visible');
    requestAnimationFrame(render);

})();
