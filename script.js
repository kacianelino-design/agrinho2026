const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const worldWidth = 6000; 
const groundHeight = 100; 
const finishLineX = 5750; 

// Propriedades do Sonic (Adicionado Vida e Frames de Invencibilidade)
const sonic = {
    x: 100,
    y: 0, 
    width: 30,
    height: 45,
    speed: 4,
    dx: 0,
    vy: 0,              
    gravity: 0.6,       
    jumpForce: -13,     
    isJumping: false,   
    direction: 'right',
    walkCycle: 0,
    health: 5,               // 5 Corações iniciais
    invincibilityFrames: 0   // Tempo piscando sem tomar dano seguido
};

// Câmera e Estados de Jogo
const camera = { x: 0 };
let gameWon = false;
let gameOver = false;

// Sistema de Economia Permanente
let trashCollected = 0;
let level = 1;
let coins = 0;
let score = 0;
let speedUpgradeCost = 30;

// Gerador de lista inicial de inimigos (para poder resetar nas mortes)
function initEnemies() {
    return [
        { x: 700, y: 0, width: 35, height: 25, speed: 1.5, minX: 550, maxX: 900 },
        { x: 1600, y: 0, width: 35, height: 25, speed: -1.2, minX: 1400, maxX: 1800 },
        { x: 2600, y: 0, width: 35, height: 25, speed: 2, minX: 2450, maxX: 2850 },  
        { x: 3800, y: 0, width: 35, height: 25, speed: -1.8, minX: 3600, maxX: 4000 },
        { x: 4800, y: 0, width: 35, height: 25, speed: 2.5, minX: 4600, maxX: 5100 }, 
    ];
}
let enemies = initEnemies();

// Nuvens Parallax
let clouds = [];
function generateClouds() {
    clouds = [];
    for (let i = 0; i < 35; i++) {
        clouds.push({
            x: Math.random() * worldWidth,
            y: Math.random() * (canvas.height * 0.4) + 30,
            size: Math.random() * 15 + 15
        });
    }
}

// Lixo Coletável
function generateTrash() {
    const types = [
        { type: 'garrafa', color: '#4fa3e3', width: 14, height: 24 },
        { type: 'lata', color: '#c0c0c0', width: 16, height: 18 }
    ];
    const chosen = types[Math.floor(Math.random() * types.length)];
    let targetX = Math.random() * (finishLineX - 300) + 100;
    let extraHeight = 0;

    obstacles = [
        { x: 450, width: 80, height: 40 },
        { x: 1200, width: 120, height: 50 },
        { x: 2300, width: 140, height: 60 }, 
        { x: 3400, width: 100, height: 40 }, 
        { x: 4500, width: 90, height: 70 },  
        { x: 5200, width: 120, height: 50 }  
    ];

    obstacles.forEach(obs => {
        if (targetX > obs.x - 10 && targetX < obs.x + obs.width + 10) {
            extraHeight = obs.height;
        }
    });

    return { x: targetX, onPlatformHeight: extraHeight, ...chosen };
}

let obstacles = [
    { x: 450, width: 80, height: 40 },
    { x: 1200, width: 120, height: 50 },
    { x: 2300, width: 140, height: 60 }, 
    { x: 3400, width: 100, height: 40 }, 
    { x: 4500, width: 90, height: 70 },  
    { x: 5200, width: 120, height: 50 }  
];

let trashItems = [];
for (let i = 0; i < 18; i++) { trashItems.push(generateTrash()); }

// Controles por Teclado
const keys = { right: false, left: false, up: false };
window.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { keys.right = true; sonic.direction = 'right'; }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { keys.left = true; sonic.direction = 'left'; }
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') { keys.up = true; }
});
window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keys.right = false;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keys.left = false;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') keys.up = false;
});

function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Atualiza os Textos e Corações da Interface
function updateUI() {
    document.getElementById('trash-val').innerText = String(trashCollected).padStart(2, '0');
    document.getElementById('level-val').innerText = level;
    document.getElementById('coin-val').innerText = coins;
    document.getElementById('score-val').innerText = score;
    
    // Renderiza corações cheios e vazios de forma dinâmica
    document.getElementById('health-val').innerText = "❤️".repeat(sonic.health) + "🖤".repeat(Math.max(0, 5 - sonic.health));
}

function drawSonic(ctx, x, y, dir, isMoving, cycle) {
    // Efeito visual de piscar se estiver invencível (tomou dano recente)
    if (sonic.invincibilityFrames > 0 && Math.floor(sonic.invincibilityFrames / 5) % 2 === 0) {
        return; 
    }

    ctx.save();
    ctx.translate(x + 15, y + 22);
    if (dir === 'left') ctx.scale(-1, 1);
    ctx.fillStyle = '#0055ff';
    ctx.beginPath();
    ctx.moveTo(-10, -15); ctx.lineTo(-25, -12); ctx.lineTo(-12, -4);
    ctx.moveTo(-12, -4);  ctx.lineTo(-28, -2);  ctx.lineTo(-10, 6);
    ctx.moveTo(-10, 6);   ctx.lineTo(-22, 8);   ctx.lineTo(-5, 14);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -6, 12, 0, Math.PI * 2); ctx.fillRect(-8, 2, 14, 16); ctx.fill();
    ctx.fillStyle = '#f9cc9d';
    ctx.beginPath(); ctx.arc(5, -4, 7, 0, Math.PI * 2); ctx.arc(-1, 4, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(4, -12, 5, 8);         
    ctx.fillStyle = '#000000'; ctx.fillRect(7, -10, 2, 5);          
    ctx.fillStyle = '#e74c3c'; 
    let legOffset = isMoving ? Math.sin(cycle * 0.5) * 6 : 0;
    ctx.fillRect(-6, 18, 5, 6); ctx.fillRect(-8 + legOffset, 24, 10, 5); 
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-8 + legOffset, 22, 10, 2); 
    ctx.fillStyle = '#e74c3c'; ctx.fillRect(2, 18, 5, 6); ctx.fillRect(0 - legOffset, 24, 10, 5);  
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0 - legOffset, 22, 10, 2);  
    ctx.restore();
}

function drawTurtle(ctx, x, y, speed) {
    ctx.save();
    ctx.translate(x + 17, y + 12);
    if (speed < 0) ctx.scale(-1, 1);
    ctx.fillStyle = '#27ae60'; ctx.beginPath(); ctx.arc(0, 4, 16, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#1e7e43'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 4, 10, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = '#f1c40f'; ctx.beginPath(); ctx.arc(16, 0, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.fillRect(17, -2, 2, 2);
    ctx.fillStyle = '#f1c40f';
    let step = Math.sin(Date.now() * 0.01) * 3;
    ctx.fillRect(-12 + step, 10, 5, 6); ctx.fillRect(6 - step, 10, 5, 6);
    ctx.restore();
}

function update() {
    if (gameWon || gameOver) return;

    // Reduz frames de invencibilidade gradualmente
    if (sonic.invincibilityFrames > 0) sonic.invincibilityFrames--;

    // Linha de Chegada
    if (sonic.x >= finishLineX) {
        gameWon = true;
        level += 1;
        let levelBonus = level * 100;
        coins += levelBonus;
        score += 1500;
        updateUI();
        document.getElementById('game-ui').style.display = 'none';
        document.getElementById('shop-container').style.display = 'none';
        document.getElementById('win-rewards').innerHTML = `🌟 <b>+100 XP Adquiridos!</b> 🌟<br>Você avançou para o <b>NÍVEL ${level}</b>!<br>Recompensa em Dinheiro: <b>+${levelBonus} Moedas</b>!`;
        document.getElementById('win-screen').style.display = 'flex';
        return;
    }

    sonic.vy += sonic.gravity;
    
    if (keys.up && !sonic.isJumping) {
        sonic.vy = sonic.jumpForce;
        sonic.isJumping = true;
    }

    sonic.dx = 0;
    let isMoving = false;
    if (keys.right) { sonic.dx = sonic.speed; isMoving = true; }
    if (keys.left) { sonic.dx = -sonic.speed; isMoving = true; }

    sonic.x += sonic.dx;
    sonic.y += sonic.vy; 
    
    if (isMoving) sonic.walkCycle += 1; 

    const defaultGroundY = canvas.height - groundHeight - sonic.height;
    if (sonic.y >= defaultGroundY) {
        sonic.y = defaultGroundY;
        sonic.vy = 0;
        sonic.isJumping = false;
    }

    // Colisões com Paredes e Obstáculos
    obstacles.forEach(obs => {
        obs.y = canvas.height - groundHeight - obs.height;
        if (sonic.x + sonic.width > obs.x && sonic.x < obs.x + obs.width) {
            if (sonic.y + sonic.height <= obs.y + 12 && sonic.y + sonic.height + sonic.vy >= obs.y) {
                sonic.y = obs.y - sonic.height;
                sonic.vy = 0;
                sonic.isJumping = false;
            } 
            else if (sonic.y + sonic.height > obs.y + 4) {
                if (sonic.dx > 0 && sonic.x < obs.x) sonic.x = obs.x - sonic.width;
                if (sonic.dx < 0 && sonic.x > obs.x) sonic.x = obs.x + obs.width;
            }
        }
    });

    // 🌟 MECÂNICA ATUALIZADA DOS INIMIGOS (Dano por Coração e Sem Respawn)
    enemies.forEach((enemy, index) => {
        enemy.y = canvas.height - groundHeight - enemy.height;
        enemy.x += enemy.speed;
        if (enemy.x <= enemy.minX || enemy.x + enemy.width >= enemy.maxX) {
            enemy.speed *= -1;
        }

        if (checkCollision(sonic, enemy)) {
            // Se o Sonic cair por cima da cabeça da tartaruga: MATA E NÃO RESPÁWNA!
            if (sonic.vy > 0 && (sonic.y + sonic.height) <= enemy.y + 16) {
                sonic.vy = -11; 
                score += 200;
                coins += 15;
                
                // Remove a tartaruga permanentemente do array de simulação ativa!
                enemies.splice(index, 1);
                updateUI();
            } 
            // Se bater lateralmente: Toma dano de 1 CORAÇÃO se não estiver piscando
            else if (sonic.invincibilityFrames === 0) {
                sonic.health -= 1; // Perde 1 coração
                sonic.invincibilityFrames = 60; // Fica invencível por 1 segundo (60 frames)
                
                // Repulsão física do impacto
                sonic.x += (sonic.x < enemy.x) ? -45 : 45;
                if (coins >= 5) coins -= 5;
                
                updateUI();

                // Tela de Game Over caso zere a vida
                if (sonic.health <= 0) {
                    gameOver = true;
                    document.getElementById('game-ui').style.display = 'none';
                    document.getElementById('shop-container').style.display = 'none';
                    document.getElementById('game-over-screen').style.display = 'flex';
                }
            }
        }
    });

    if (sonic.x < 0) sonic.x = 0;
    if (sonic.x + sonic.width > worldWidth) sonic.x = worldWidth - sonic.width;

    camera.x = sonic.x - canvas.width / 2;
    if (camera.x < 0) camera.x = 0;
    if (camera.x > worldWidth - canvas.width) camera.x = worldWidth - canvas.width;

    // Coleta de Lixo
    trashItems.forEach((trash) => {
        trash.y = canvas.height - groundHeight - trash.height - trash.onPlatformHeight;
        if (checkCollision(sonic, trash)) {
            trashCollected++;
            coins += 10;
            score += 100;
            Object.assign(trash, generateTrash());
            updateUI();
        }
    });
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Render dos Mundos
    ctx.fillStyle = '#5c94fc'; ctx.fillRect(0 - camera.x, 0, 2000, canvas.height); 
    ctx.fillStyle = '#e67e22'; ctx.fillRect(2000 - camera.x, 0, 2000, canvas.height); 
    ctx.fillStyle = '#1a0033'; ctx.fillRect(4000 - camera.x, 0, 2000, canvas.height); 

    // Estrelas M3
    ctx.fillStyle = '#ffffff';
    for (let s = 4100; s < 6000; s += 180) {
        ctx.fillRect(s - camera.x, 80, 3, 3); ctx.fillRect(s + 50 - camera.x, 180, 2, 2);
    }

    // Nuvens
    clouds.forEach(cloud => {
        let cloudX = cloud.x - camera.x * 0.3;
        if (cloud.x < 2000) ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
        else if (cloud.x >= 2000 && cloud.x < 4000) ctx.fillStyle = 'rgba(243, 156, 18, 0.6)';
        else ctx.fillStyle = 'rgba(142, 68, 173, 0.5)';
        ctx.beginPath(); ctx.arc(cloudX, cloud.y, cloud.size, 0, Math.PI * 2);
        ctx.arc(cloudX + cloud.size * 0.6, cloud.y - cloud.size * 0.4, cloud.size * 0.8, 0, Math.PI * 2);
        ctx.arc(cloudX + cloud.size * 1.2, cloud.y, cloud.size * 0.6, 0, Math.PI * 2); ctx.fill();
    });

    // Obstáculos
    obstacles.forEach(obs => {
        ctx.fillStyle = (obs.x < 2000) ? '#b85c00' : (obs.x < 4000) ? '#d35400' : '#2c3e50';
        ctx.fillRect(obs.x - camera.x, obs.y, obs.width, obs.height);
        ctx.fillStyle = (obs.x < 2000) ? '#00cc00' : (obs.x < 4000) ? '#f1c40f' : '#9b59b6';
        ctx.fillRect(obs.x - camera.x, obs.y, obs.width, 6);
    });

    // Chãos Específicos
    ctx.fillStyle = '#008800'; ctx.fillRect(0 - camera.x, canvas.height - groundHeight, 2000, groundHeight);
    ctx.fillStyle = '#e67e22'; ctx.fillRect(0 - camera.x, canvas.height - groundHeight, 2000, 8);
    ctx.fillStyle = '#e67e22'; ctx.fillRect(2000 - camera.x, canvas.height - groundHeight, 2000, groundHeight);
    ctx.fillStyle = '#f1c40f'; ctx.fillRect(2000 - camera.x, canvas.height - groundHeight, 2000, 8);
    ctx.fillStyle = '#4a00e0'; ctx.fillRect(4000 - camera.x, canvas.height - groundHeight, 2000, groundHeight);
    ctx.fillStyle = '#00f2fe'; ctx.fillRect(4000 - camera.x, canvas.height - groundHeight, 2000, 8);

    // Linha de Chegada
    let fx = finishLineX - camera.x;
    ctx.fillStyle = '#ffffff'; ctx.fillRect(fx, canvas.height - groundHeight - 140, 12, 140); 
    ctx.fillStyle = '#000000'; ctx.fillRect(fx + 12, canvas.height - groundHeight - 140, 50, 36);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(fx + 12, canvas.height - groundHeight - 140, 25, 18);
    ctx.fillRect(fx + 37, canvas.height - groundHeight - 122, 25, 18);

    // Inimigos Restantes e Lixos
    enemies.forEach(enemy => drawTurtle(ctx, enemy.x - camera.x, enemy.y, enemy.speed));
    trashItems.forEach((trash) => {
        ctx.fillStyle = trash.color; ctx.fillRect(trash.x - camera.x, trash.y, trash.width, trash.height);
    });

    let isMoving = keys.right || keys.left;
    drawSonic(ctx, sonic.x - camera.x, sonic.y, sonic.direction, isMoving, sonic.walkCycle);
}

// Loja de Upgrades
document.getElementById('btn-speed').addEventListener('click', () => {
    if (coins >= speedUpgradeCost) {
        coins -= speedUpgradeCost;
        sonic.speed += 1.5; 
        speedUpgradeCost = Math.floor(speedUpgradeCost * 1.6);
        updateUI();
        document.getElementById('speed-cost').innerText = speedUpgradeCost;
    } else {
        alert("❌ Moedas insuficientes!");
    }
});

// Começar o Jogo
document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    document.getElementById('gameCanvas').style.display = 'block';
    document.getElementById('shop-container').style.display = 'block';
    updateUI(); resizeCanvas(); generateClouds(); gameLoop();
});

// Auxiliar comum de reinício das rodadas
function cleanRoundReset() {
    sonic.x = 100;
    sonic.y = 0;
    sonic.vy = 0;
    sonic.health = 5; // Recarrega os 5 corações
    sonic.invincibilityFrames = 0;
    sonic.isJumping = false;
    
    enemies = initEnemies(); // Repopula o mapa com as tartarugas vivas
    trashItems.forEach(t => Object.assign(t, generateTrash()));

    gameWon = false;
    gameOver = false;
    
    updateUI();
    document.getElementById('game-ui').style.display = 'block';
    document.getElementById('shop-container').style.display = 'block';
}

// 🔄 Ação ao Ganhar (Mantém as Moedas e o Nível)
document.getElementById('btn-restart').addEventListener('click', () => {
    document.getElementById('win-screen').style.display = 'none';
    cleanRoundReset();
});

// 🔄 Ação ao Perder (Tentar de novo mantendo o progresso RPG)
document.getElementById('btn-over-restart').addEventListener('click', () => {
    document.getElementById('game-over-screen').style.display = 'none';
    cleanRoundReset();
});

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}
