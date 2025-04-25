const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameContainer = document.getElementById('game-container');
const uiElement = document.getElementById('ui');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const levelEl = document.getElementById('level');
const highScoreEl = document.getElementById('highScore');
const messageOverlay = document.getElementById('message-overlay');
const messageTitle = document.getElementById('message-title');
const messageText = document.getElementById('message-text');
const actionButton = document.getElementById('action-button');
const settingsButton = document.getElementById('settings-button');
const settingsModal = document.getElementById('settings-modal');
const closeModalButton = settingsModal.querySelector('.close-button');
const themeSelect = document.getElementById('theme-select');
const ballColorSelect = document.getElementById('ball-color-select');
const speedSelect = document.getElementById('speed-select');

const NATIVE_WIDTH = 800;
const NATIVE_HEIGHT = 600;
const ASPECT_RATIO = NATIVE_WIDTH / NATIVE_HEIGHT;

const BASE_PADDLE_WIDTH = 110;
const BASE_PADDLE_HEIGHT = 18;
const BASE_PADDLE_MARGIN_BOTTOM = 35;
const BASE_BALL_RADIUS = 11;
const BASE_BRICK_ROW_COUNT = [3, 4, 4, 5, 5, 6, 6, 7, 7, 8];
const BASE_BRICK_COLUMN_COUNT = 9;
const BASE_BRICK_WIDTH = 70;
const BASE_BRICK_HEIGHT = 22;
const BASE_BRICK_PADDING = 8;
const BASE_BRICK_OFFSET_TOP = 50;
const BASE_BRICK_OFFSET_LEFT = 30;
const BASE_POWERUP_SIZE = 18;
const BASE_POWERUP_SPEED = 2.5;
const MAX_SPEED_MULTIPLIER = 2.0;

const POWERUP_CHANCE = 0.18;
const POWERUP_TYPES = {
    WIDER_PADDLE: 'widerPaddle',
    MULTI_BALL: 'multiBall',
};
const BRICK_TYPES = {
    NORMAL: 1,
    MULTI_HIT_2: 2,
    MULTI_HIT_3: 3,
    INDESTRUCTIBLE: 0
};
const MULTI_HIT_CHANCE = 0.25;
const INDESTRUCTIBLE_CHANCE = 0.08;

const PARTICLE_COUNT = 8;
const PARTICLE_SPEED = 2;
const PARTICLE_LIFESPAN = 40;

let scale = 1;
let paddleWidth, paddleHeight, paddleMarginBottom;
let ballRadius;
let brickRowCount, brickColumnCount, brickWidth, brickHeight, brickPadding, brickOffsetTop, brickOffsetLeft;
let powerupSize, powerupSpeed;
let baseBallSpeedConfig = { base: 4.2, increase: 0.08 };
let baseBallSpeedScaled;

let paddleX;
let balls = [];
let bricks = [];
let powerups = [];
let particles = [];
let score;
let lives;
let currentLevel;
let gamePaused = false;
let gameOver = false;
let gameStarted = false;
let rightPressed = false;
let leftPressed = false;
let currentPaddleWidth;
let highScore = localStorage.getItem('brickBreakerAdvancedHighScore') || 0;
let currentTheme = localStorage.getItem('brickBreakerTheme') || 'light';
let currentBallColor = localStorage.getItem('brickBreakerBallColor') || 'red';
let currentSpeedSetting = localStorage.getItem('brickBreakerSpeed') || 'normal';

const sounds = {
    brickHit: new Audio('sounds/brick_hit.wav'),
    brickBreak: new Audio('sounds/brick_break.wav'),
    brickHitHard: new Audio('sounds/brick_hit_hard.wav'),
    paddleHit: new Audio('sounds/paddle_hit.wav'),
    wallHit: new Audio('sounds/wall_hit.wav'),
    loseLife: new Audio('sounds/lose_life.wav'),
    powerupCollect: new Audio('sounds/powerup_collect.wav'),
    powerupSpawn: new Audio('sounds/powerup_spawn.wav'),
    levelComplete: new Audio('sounds/level_complete.wav'),
    gameOver: new Audio('sounds/game_over.wav'),
    multiBall: new Audio('sounds/multi_ball.wav'),
};

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

function getCssVariable(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

function hexToRgb(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length == 7) {
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }
    return `${r}, ${g}, ${b}`;
}

function applySettings() {
    currentTheme = localStorage.getItem('brickBreakerTheme') || 'light';
    currentBallColor = localStorage.getItem('brickBreakerBallColor') || 'red';
    currentSpeedSetting = localStorage.getItem('brickBreakerSpeed') || 'normal';

    document.body.className = currentTheme === 'dark' ? 'dark-theme' : '';
    themeSelect.value = currentTheme;
    ballColorSelect.value = currentBallColor;
    speedSelect.value = currentSpeedSetting;

    if (currentSpeedSetting === 'slow') {
        baseBallSpeedConfig = { base: 3.6, increase: 0.06 };
    } else if (currentSpeedSetting === 'fast') {
        baseBallSpeedConfig = { base: 5.0, increase: 0.10 };
    } else {
        baseBallSpeedConfig = { base: 4.3, increase: 0.08 };
    }
    baseBallSpeedScaled = baseBallSpeedConfig.base * scale;
}

function resizeAndScaleGame() {
    const uiHeight = uiElement.offsetHeight;
    const availableWidth = window.innerWidth;
    const availableHeight = window.innerHeight - uiHeight;

    let newWidth, newHeight;
    if (availableWidth / availableHeight > ASPECT_RATIO) {
        newHeight = availableHeight;
        newWidth = newHeight * ASPECT_RATIO;
    } else {
        newWidth = availableWidth;
        newHeight = newWidth / ASPECT_RATIO;
    }

    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
    canvas.width = Math.round(newWidth);
    canvas.height = Math.round(newHeight);

    scale = canvas.width / NATIVE_WIDTH;

    paddleWidth = BASE_PADDLE_WIDTH * scale;
    paddleHeight = BASE_PADDLE_HEIGHT * scale;
    paddleMarginBottom = BASE_PADDLE_MARGIN_BOTTOM * scale;
    ballRadius = BASE_BALL_RADIUS * scale;
    brickWidth = BASE_BRICK_WIDTH * scale;
    brickHeight = BASE_BRICK_HEIGHT * scale;
    brickPadding = BASE_BRICK_PADDING * scale;
    brickOffsetTop = BASE_BRICK_OFFSET_TOP * scale;
    brickOffsetLeft = BASE_BRICK_OFFSET_LEFT * scale;
    powerupSize = BASE_POWERUP_SIZE * scale;
    powerupSpeed = BASE_POWERUP_SPEED * scale;
    baseBallSpeedScaled = baseBallSpeedConfig.base * scale;

    currentPaddleWidth = (currentPaddleWidth > paddleWidth) ? paddleWidth * 1.5 : paddleWidth;

    if (gameStarted && !gameOver && !gamePaused) {
        const prevWidth = canvas.previousWidth || canvas.width;
        const prevHeight = canvas.previousHeight || canvas.height;
        const scaleX = canvas.width / prevWidth;
        const scaleY = canvas.height / prevHeight;

        paddleX *= scaleX;
        balls.forEach(ball => {
            ball.x *= scaleX;
            ball.y *= scaleY;
            ball.radius = ballRadius;
        });
        powerups.forEach(p => { p.x *= scaleX; p.y *= scaleY; });
        particles.forEach(p => { p.x *= scaleX; p.y *= scaleY; });

        if (paddleX + currentPaddleWidth > canvas.width) paddleX = canvas.width - currentPaddleWidth;
        if (paddleX < 0) paddleX = 0;

        recreateBricksLayout();
    } else if (gameStarted) {
        paddleX = (canvas.width - currentPaddleWidth) / 2;
        if (balls.length > 0) {
            balls.forEach(ball => {
                 ball.x = canvas.width / 2;
                 ball.y = canvas.height - paddleMarginBottom - paddleHeight - ballRadius - (5 * scale);
                 ball.radius = ballRadius;
            });
        }
    }

    canvas.previousWidth = canvas.width;
    canvas.previousHeight = canvas.height;

     if (gameStarted) {
        draw();
    } else {
        drawInitialScreen();
    }
}

function drawInitialScreen() {
     ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function getCurrentBallColors() {
    const colorPrefix = `--ball-${currentBallColor}-`;
    return {
        start: getCssVariable(colorPrefix + 'start'),
        end: getCssVariable(colorPrefix + 'end')
    }
}


function initGameVariables(level) {
    currentLevel = level;
    score = (level === 1) ? 0 : score;
    lives = (level === 1) ? 3 : lives;

    const speedMultiplier = Math.min(
        1 + (level - 1) * baseBallSpeedConfig.increase,
        MAX_SPEED_MULTIPLIER
    );
    const currentBallSpeed = baseBallSpeedScaled * speedMultiplier;

    currentPaddleWidth = paddleWidth;
    paddleX = (canvas.width - currentPaddleWidth) / 2;

    const ballColors = getCurrentBallColors();
    balls = [];
    balls.push({
        x: canvas.width / 2,
        y: canvas.height - paddleMarginBottom - paddleHeight - ballRadius - (5 * scale),
        dx: currentBallSpeed * (Math.random() < 0.5 ? 1 : -1),
        dy: -currentBallSpeed,
        radius: ballRadius,
        colorStart: ballColors.start,
        colorEnd: ballColors.end
    });

    bricks = [];
    powerups = [];
    particles = [];
    gamePaused = false;
    gameOver = false;
    updateUI();
    createBricks();
}

function createBricks() {
    bricks = [];
    const rows = BASE_BRICK_ROW_COUNT[currentLevel - 1] || BASE_BRICK_ROW_COUNT[BASE_BRICK_ROW_COUNT.length - 1];
    brickRowCount = rows;
    brickColumnCount = BASE_BRICK_COLUMN_COUNT;
    recreateBricksLayout();
}

function recreateBricksLayout() {
    bricks = [];
    const rows = brickRowCount;
    const cols = brickColumnCount;
    const hit3Color = getCssVariable('--brick-hit3-color');
    const hit2Color = getCssVariable('--brick-hit2-color');
    const hit1Color = getCssVariable('--brick-hit1-color');

    for (let c = 0; c < cols; c++) {
        bricks[c] = [];
        for (let r = 0; r < rows; r++) {
            const brickX = c * (brickWidth + brickPadding) + brickOffsetLeft;
            const brickY = r * (brickHeight + brickPadding) + brickOffsetTop;

            let brickType = BRICK_TYPES.NORMAL;
            let hitsLeft = 1;
            let color = hit1Color;
            let status = 1;

            const rand = Math.random();
            if (rand < INDESTRUCTIBLE_CHANCE) {
                brickType = BRICK_TYPES.INDESTRUCTIBLE;
                hitsLeft = Infinity;
                color = getCssVariable('--indestructible-color');
                status = BRICK_TYPES.INDESTRUCTIBLE;
            } else if (rand < INDESTRUCTIBLE_CHANCE + MULTI_HIT_CHANCE) {
                hitsLeft = Math.random() < 0.5 ? 2 : 3;
                brickType = (hitsLeft === 2) ? BRICK_TYPES.MULTI_HIT_2 : BRICK_TYPES.MULTI_HIT_3;
                color = (hitsLeft === 3) ? hit3Color : hit2Color;
            }

            bricks[c][r] = {
                x: brickX,
                y: brickY,
                status: status,
                type: brickType,
                hitsLeft: hitsLeft,
                color: color
            };
        }
    }
}

function drawPaddle() {
    ctx.fillStyle = getCssVariable('--paddle-color');
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 5 * scale;
    ctx.shadowOffsetX = 2 * scale;
    ctx.shadowOffsetY = 2 * scale;
    ctx.fillRect(paddleX, canvas.height - paddleMarginBottom - paddleHeight, currentPaddleWidth, paddleHeight);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
}

function drawBalls() {
    balls.forEach(ball => {
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(ball.x, ball.y, ball.radius * 0.1, ball.x, ball.y, ball.radius);
        gradient.addColorStop(0, ball.colorStart);
        gradient.addColorStop(1, ball.colorEnd);
        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 4 * scale;
        ctx.shadowOffsetX = 1 * scale;
        ctx.shadowOffsetY = 1 * scale;

        ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.closePath();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    });
}

function drawBricks() {
     const hit3Color = getCssVariable('--brick-hit3-color');
     const hit2Color = getCssVariable('--brick-hit2-color');
     const hit1Color = getCssVariable('--brick-hit1-color');
     const indestructibleColor = getCssVariable('--indestructible-color');

    for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < bricks[c]?.length; r++) {
             const brick = bricks[c][r];
            if (brick.status !== -1) {
                 if (brick.status === BRICK_TYPES.INDESTRUCTIBLE) {
                    ctx.fillStyle = indestructibleColor;
                } else if (brick.hitsLeft === 3) {
                    ctx.fillStyle = hit3Color;
                } else if (brick.hitsLeft === 2) {
                    ctx.fillStyle = hit2Color;
                } else {
                    ctx.fillStyle = hit1Color;
                }

                ctx.beginPath();
                ctx.rect(brick.x, brick.y, brickWidth, brickHeight);
                ctx.fill();
                ctx.closePath();

                 if (brick.type !== BRICK_TYPES.INDESTRUCTIBLE && brick.hitsLeft < brick.type && brick.hitsLeft > 0) {
                    drawCracks(brick);
                 }
            }
        }
    }
}

function drawCracks(brick) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    if (brick.type === BRICK_TYPES.MULTI_HIT_3 && brick.hitsLeft === 2) {
        ctx.moveTo(brick.x + brickWidth * 0.2, brick.y + brickHeight * 0.3);
        ctx.lineTo(brick.x + brickWidth * 0.8, brick.y + brickHeight * 0.7);
    } else {
        ctx.moveTo(brick.x + brickWidth * 0.2, brick.y + brickHeight * 0.3);
        ctx.lineTo(brick.x + brickWidth * 0.8, brick.y + brickHeight * 0.7);
        ctx.moveTo(brick.x + brickWidth * 0.8, brick.y + brickHeight * 0.3);
        ctx.lineTo(brick.x + brickWidth * 0.2, brick.y + brickHeight * 0.7);
    }
    ctx.stroke();
    ctx.closePath();
}


function drawPowerups() {
    const powerupColor = getCssVariable('--powerup-color');
    powerups.forEach(powerup => {
        ctx.fillStyle = powerupColor;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 8 * scale;
        ctx.fillRect(powerup.x, powerup.y, powerupSize, powerupSize);

        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.max(10, 12 * scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        let symbol = '?';
        if (powerup.type === POWERUP_TYPES.WIDER_PADDLE) symbol = 'W';
        else if (powerup.type === POWERUP_TYPES.MULTI_BALL) symbol = '3';
        ctx.fillText(symbol, powerup.x + powerupSize / 2, powerup.y + powerupSize / 2 + 1*scale);
    });
}

function drawParticles() {
     const particleColor = getCssVariable('--particle-color');
     const rgbColor = hexToRgb(particleColor);
    particles.forEach((p, index) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgbColor}, ${p.lifespan / PARTICLE_LIFESPAN})`;
        ctx.fill();
        ctx.closePath();
    });
}

function updateUI() {
    scoreEl.textContent = score;
    livesEl.textContent = lives;
    levelEl.textContent = currentLevel;
    highScoreEl.textContent = highScore;
}

function collisionDetection() {
    balls.forEach((ball, ballIndex) => {
        let bounced = false;
        for (let c = 0; c < brickColumnCount && !bounced; c++) {
            for (let r = 0; r < bricks[c]?.length && !bounced; r++) {
                const brick = bricks[c][r];

                if (brick.status !== -1) {
                    if (
                        ball.x + ball.radius > brick.x &&
                        ball.x - ball.radius < brick.x + brickWidth &&
                        ball.y + ball.radius > brick.y &&
                        ball.y - ball.radius < brick.y + brickHeight
                    ) {
                        if (brick.status === BRICK_TYPES.INDESTRUCTIBLE) {
                            ball.dy = -ball.dy;
                            if (ball.y < brick.y + brickHeight / 2) ball.y = brick.y - ball.radius;
                            else ball.y = brick.y + brickHeight + ball.radius;
                            playSound(sounds.brickHitHard);
                        } else {
                            brick.hitsLeft--;
                            if (brick.hitsLeft <= 0) {
                                brick.status = -1;
                                score += 10 * brick.type;
                                createParticles(brick.x + brickWidth / 2, brick.y + brickHeight / 2);
                                playSound(sounds.brickBreak);
                                updateUI();
                                if (Math.random() < POWERUP_CHANCE) {
                                    spawnPowerup(brick.x + brickWidth / 2, brick.y);
                                }
                            } else {
                                playSound(sounds.brickHit);
                            }
                            ball.dy = -ball.dy;
                            if (isLevelComplete()) {
                                handleLevelComplete();
                                return;
                             }
                        }
                        bounced = true;
                    }
                }
            }
        }
    });
}


function isLevelComplete() {
     for (let c = 0; c < brickColumnCount; c++) {
        for (let r = 0; r < bricks[c]?.length; r++) {
            if (bricks[c][r].status === 1) {
                return false;
            }
        }
    }
    return true;
}

function spawnPowerup(x, y) {
    const typeValues = Object.values(POWERUP_TYPES);
    const randomType = typeValues[Math.floor(Math.random() * typeValues.length)];
    powerups.push({
        x: x - powerupSize / 2,
        y: y,
        type: randomType
    });
    playSound(sounds.powerupSpawn);
}

function powerupCollision() {
    powerups.forEach((powerup, index) => {
        powerup.y += powerupSpeed;
        const paddleTopY = canvas.height - paddleMarginBottom - paddleHeight;
        if (
            powerup.x < paddleX + currentPaddleWidth &&
            powerup.x + powerupSize > paddleX &&
            powerup.y + powerupSize > paddleTopY &&
            powerup.y < paddleTopY + paddleHeight
        ) {
            activatePowerup(powerup.type);
            powerups.splice(index, 1);
            playSound(sounds.powerupCollect);
        } else if (powerup.y > canvas.height) {
            powerups.splice(index, 1);
        }
    });
}

function activatePowerup(type) {
    if (type === POWERUP_TYPES.WIDER_PADDLE) {
        if (currentPaddleWidth === paddleWidth) {
             currentPaddleWidth = paddleWidth * 1.5;
             setTimeout(() => {
                 currentPaddleWidth = paddleWidth;
             }, 12000);
        }
    } else if (type === POWERUP_TYPES.MULTI_BALL) {
        playSound(sounds.multiBall);
        if (balls.length > 0 && balls.length < 10) {
            const originalBall = balls[Math.floor(Math.random() * balls.length)];
            const speedMultiplier = Math.min(1 + (currentLevel - 1) * baseBallSpeedConfig.increase, MAX_SPEED_MULTIPLIER);
            const currentBallSpeed = baseBallSpeedScaled * speedMultiplier;
            const ballColors = getCurrentBallColors();

            for (let i = 0; i < 2; i++) {
                const angleOffset = (Math.PI / 6) * (i === 0 ? -1 : 1);
                const refDx = originalBall.dx;
                const refDy = originalBall.dy;
                const magnitude = Math.sqrt(refDx*refDx + refDy*refDy) || currentBallSpeed;
                const normDx = refDx / magnitude;
                const normDy = refDy / magnitude;

                const newDx = (normDx * Math.cos(angleOffset) - normDy * Math.sin(angleOffset)) * currentBallSpeed;
                const newDy = (normDx * Math.sin(angleOffset) + normDy * Math.cos(angleOffset)) * currentBallSpeed;

                balls.push({
                    x: originalBall.x + (Math.random() - 0.5) * 5,
                    y: originalBall.y,
                    dx: newDx,
                    dy: newDy,
                    radius: ballRadius,
                    colorStart: ballColors.start,
                    colorEnd: ballColors.end
                });
            }
        }
    }
}

function createParticles(x, y) {
     const particleBaseColor = getCssVariable('--particle-color');
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * PARTICLE_SPEED + 1) * scale;
        particles.push({
            x: x,
            y: y,
            dx: Math.cos(angle) * speed,
            dy: Math.sin(angle) * speed,
            lifespan: PARTICLE_LIFESPAN,
            color: particleBaseColor,
            size: (Math.random() * 2 + 1) * scale
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.dx;
        p.y += p.dy;
        p.lifespan--;
        if (p.lifespan <= 0) {
            particles.splice(i, 1);
        }
    }
}

function movePaddle() {
    const paddleSpeed = 8 * scale;
    if (rightPressed) {
        paddleX += paddleSpeed;
    } else if (leftPressed) {
        paddleX -= paddleSpeed;
    }
     if (paddleX < 0) paddleX = 0;
     if (paddleX + currentPaddleWidth > canvas.width) {
         paddleX = canvas.width - currentPaddleWidth;
     }
}

function moveBalls() {
    balls.forEach((ball, index) => {
        ball.x += ball.dx;
        ball.y += ball.dy;

        if (ball.x + ball.radius > canvas.width || ball.x - ball.radius < 0) {
            ball.dx = -ball.dx;
            ball.x = (ball.x + ball.radius > canvas.width) ? canvas.width - ball.radius : ball.radius;
            playSound(sounds.wallHit);
        }

        if (ball.y - ball.radius < 0) {
            ball.dy = -ball.dy;
            ball.y = ball.radius;
            playSound(sounds.wallHit);
        }

        const paddleTopY = canvas.height - paddleMarginBottom - paddleHeight;
        if (ball.dy > 0 &&
            ball.y + ball.radius >= paddleTopY &&
            ball.y - ball.radius <= paddleTopY + paddleHeight &&
            ball.x + ball.radius >= paddleX &&
            ball.x - ball.radius <= paddleX + currentPaddleWidth)
        {
            playSound(sounds.paddleHit);
            let collidePoint = ball.x - (paddleX + currentPaddleWidth / 2);
            collidePoint = collidePoint / (currentPaddleWidth / 2);
            let maxBounceAngle = Math.PI / 2.8;
            let angle = collidePoint * maxBounceAngle;

            const speedMultiplier = Math.min(1 + (currentLevel - 1) * baseBallSpeedConfig.increase, MAX_SPEED_MULTIPLIER);
            const currentBallSpeed = baseBallSpeedScaled * speedMultiplier;

            ball.dx = currentBallSpeed * Math.sin(angle);
            ball.dy = -currentBallSpeed * Math.cos(angle);
            ball.y = paddleTopY - ball.radius;

            const minDyRatio = 0.15;
            if (Math.abs(ball.dy) < currentBallSpeed * minDyRatio) {
                 ball.dy = (ball.dy < 0 ? -1 : 1) * currentBallSpeed * minDyRatio;
                 ball.dx = Math.sqrt(currentBallSpeed * currentBallSpeed - ball.dy * ball.dy) * Math.sign(ball.dx || 1);
             }
        }
        else if (ball.y + ball.radius > canvas.height) {
            balls.splice(index, 1);
            if (balls.length === 0 && gameStarted && !gameOver) {
                handleLifeLoss();
            }
        }
    });
}

function handleLifeLoss() {
    lives--;
    playSound(sounds.loseLife);
    powerups = [];
    particles = [];
    currentPaddleWidth = paddleWidth;

    if (lives <= 0) {
        handleGameOver();
    } else {
        paddleX = (canvas.width - currentPaddleWidth) / 2;
        const speedMultiplier = Math.min(1 + (currentLevel - 1) * baseBallSpeedConfig.increase, MAX_SPEED_MULTIPLIER);
        const currentBallSpeed = baseBallSpeedScaled * speedMultiplier;
        const ballColors = getCurrentBallColors();

        balls = [];
        balls.push({
            x: canvas.width / 2,
            y: canvas.height - paddleMarginBottom - paddleHeight - ballRadius - (5 * scale),
            dx: currentBallSpeed * (Math.random() < 0.5 ? 1 : -1),
            dy: -currentBallSpeed,
            radius: ballRadius,
            colorStart: ballColors.start,
            colorEnd: ballColors.end
        });

        updateUI();
        gamePaused = true;
        showMessage("Try Again!", `Lives left: ${lives}`, "Continue", () => {
            gamePaused = false;
            hideMessage();
            requestAnimationFrame(gameLoop);
        });
    }
}

function handleGameOver() {
    playSound(sounds.gameOver);
    gameOver = true;
    updateHighScore();
    showMessage("Game Over", `Your Score: ${score}. High Score: ${highScore}`, "Play Again?", startGame);
}

function handleLevelComplete() {
     playSound(sounds.levelComplete);
     particles = [];
     powerups = [];
     balls = [];

     const maxLevel = BASE_BRICK_ROW_COUNT.length;
     if (currentLevel < maxLevel) {
        currentLevel++;
        showMessage(`Level ${currentLevel - 1} Complete!`, `Get ready for Level ${currentLevel}`, "Next Level", () => {
            initGameVariables(currentLevel);
            hideMessage();
            requestAnimationFrame(gameLoop);
        });
    } else {
        updateHighScore();
        showMessage("Congratulations!", `You beat all ${maxLevel} levels! Final Score: ${score}`, "Play Again?", startGame);
        gameOver = true;
    }
}

function updateHighScore() {
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('brickBreakerAdvancedHighScore', highScore);
        updateUI();
    }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBricks();
    drawPaddle();
    drawPowerups();
    drawParticles();
    drawBalls();
}

function gameLoop(timestamp) {
    if (gameOver || gamePaused) {
        return;
    }
    movePaddle();
    moveBalls();
    collisionDetection();
    powerupCollision();
    updateParticles();
    draw();
    requestAnimationFrame(gameLoop);
}

function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
        x: (evt.clientX - rect.left) * scaleX,
        y: (evt.clientY - rect.top) * scaleY
    };
}
function getTouchPos(evt) {
     const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touch = evt.touches[0];
    return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
    };
}

function movePaddleTo(x) {
      paddleX = x - currentPaddleWidth / 2;
     if (paddleX < 0) paddleX = 0;
     if (paddleX + currentPaddleWidth > canvas.width) {
         paddleX = canvas.width - currentPaddleWidth;
     }
}

function mouseMoveHandler(e) {
      if (!gamePaused && gameStarted && !gameOver) {
       const mousePos = getMousePos(e);
       movePaddleTo(mousePos.x);
    }
}

function touchMoveHandler(e) {
      if (!gamePaused && gameStarted && !gameOver) {
        e.preventDefault();
        const touchPos = getTouchPos(e);
        movePaddleTo(touchPos.x);
    }
}

function touchStartHandler(e) {
      if (!gamePaused && gameStarted && !gameOver) {
         const touchPos = getTouchPos(e);
         movePaddleTo(touchPos.x);
     }
     try { playSound(sounds.wallHit); } catch(e){}
}

function keyDownHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = true;
    else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = true;
}
function keyUpHandler(e) {
    if (e.key === 'Right' || e.key === 'ArrowRight') rightPressed = false;
    else if (e.key === 'Left' || e.key === 'ArrowLeft') leftPressed = false;
}
function pauseHandler(e) {
    if (!gameOver && gameStarted && (e.key === 'p' || e.key === 'P' || e.key === 'Escape')) {
        if (settingsModal.style.display === 'flex') return;
        togglePause();
    } else if (e.key === 'Escape' && settingsModal.style.display === 'flex') {
        closeSettingsModal();
    }
}

function togglePause() {
     if (gameOver || !gameStarted) return;
    gamePaused = !gamePaused;
    if (gamePaused) {
        showMessage("Paused", "Press 'P' / 'Esc' or click Resume", "Resume", togglePause);
    } else {
        hideMessage();
        requestAnimationFrame(gameLoop);
    }
}

function showMessage(title, text, buttonText, buttonAction) {
     messageTitle.textContent = title;
    messageText.textContent = text;
    actionButton.textContent = buttonText;
    actionButton.onclick = buttonAction;
    messageOverlay.style.display = 'flex';
}
function hideMessage() {
     messageOverlay.style.display = 'none';
}

function playSound(sound) {
     if (sound && sound.readyState >= 2) {
        sound.currentTime = 0;
        sound.play().catch(error => {
             console.warn("Sound playback failed:", error);
        });
    } else {
         // console.warn("Sound not ready or not found:", sound);
    }
}

function openSettingsModal() {
    settingsModal.style.display = 'flex';
    if(gameStarted && !gameOver && !gamePaused) {
        togglePause();
    }
}

function closeSettingsModal() {
    settingsModal.style.display = 'none';
     if(gameStarted && !gameOver && gamePaused && messageTitle.textContent !== "Paused") {
         // If game was paused specifically for settings, resume if user closes modal
         // But don't resume if it was paused manually before opening settings
         // This logic might need refinement depending on desired UX
     } else if (gamePaused && messageTitle.textContent === "Paused") {
         // If it was already paused, keep it paused.
     }
}

function handleSettingsChange() {
    localStorage.setItem('brickBreakerTheme', themeSelect.value);
    localStorage.setItem('brickBreakerBallColor', ballColorSelect.value);
    localStorage.setItem('brickBreakerSpeed', speedSelect.value);
    applySettings();
    if (gameStarted && !gameOver) {
       const ballColors = getCurrentBallColors();
       balls.forEach(b => {
           b.colorStart = ballColors.start;
           b.colorEnd = ballColors.end;
       });
       // Speed changes will apply fully on next level/restart
       baseBallSpeedScaled = baseBallSpeedConfig.base * scale;
    }
     // Optional: Redraw immediately if game is paused
     if (gamePaused) draw();
}

function startGame() {
    applySettings();
    hideMessage();
    gameStarted = true;
    initGameVariables(1);
    requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', keyDownHandler, false);
document.addEventListener('keyup', keyUpHandler, false);
canvas.addEventListener('touchstart', touchStartHandler, { passive: false });
canvas.addEventListener('touchmove', touchMoveHandler, { passive: false });
document.addEventListener('mousemove', mouseMoveHandler, false);
document.addEventListener('keydown', pauseHandler, false);
settingsButton.addEventListener('click', openSettingsModal);
closeModalButton.addEventListener('click', closeSettingsModal);
window.addEventListener('click', (event) => {
    if (event.target == settingsModal) {
        closeSettingsModal();
    }
});
themeSelect.addEventListener('change', handleSettingsChange);
ballColorSelect.addEventListener('change', handleSettingsChange);
speedSelect.addEventListener('change', handleSettingsChange);


const debouncedResize = debounce(resizeAndScaleGame, 100);
window.addEventListener('resize', debouncedResize);

applySettings();
resizeAndScaleGame();
updateUI();
showMessage("Brick Breaker", "Use Mouse, Touch, or Arrow Keys. Break the bricks!", "Start Game", startGame);