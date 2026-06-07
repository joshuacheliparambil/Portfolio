const menu = document.getElementById("mobileMenu");
const menuButton = document.getElementById("menuButton");
const imageModal = document.getElementById("imageModal");
const modalImage = document.getElementById("modalImage");
const canvas = document.getElementById("bugGame");
const ctx = canvas ? canvas.getContext("2d") : null;
const scoreEl = document.getElementById("gameScore");
const timeEl = document.getElementById("gameTime");
const statusEl = document.getElementById("gameStatus");
const heroIntel = document.getElementById("heroIntel");

function toggleMenu() {
  const isHidden = menu.classList.toggle("hidden");
  menuButton.setAttribute("aria-expanded", String(!isHidden));
}

function closeMenu() {
  menu.classList.add("hidden");
  menuButton.setAttribute("aria-expanded", "false");
}

function openImageModal(src, alt) {
  modalImage.src = src;
  modalImage.alt = alt;
  imageModal.classList.remove("hidden");
  imageModal.classList.add("flex");
  imageModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  playUiSound("click");
}

function closeImageModal() {
  imageModal.classList.add("hidden");
  imageModal.classList.remove("flex");
  imageModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  modalImage.src = "";
}

function handleImageKey(event, src, alt) {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openImageModal(src, alt);
  }
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !imageModal.classList.contains("hidden")) {
    closeImageModal();
  }
});

let audioContext;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playUiSound(type = "hover") {
  const ctxAudio = getAudioContext();
  if (ctxAudio.state === "suspended") {
    ctxAudio.resume();
  }

  const oscillator = ctxAudio.createOscillator();
  const gain = ctxAudio.createGain();
  const now = ctxAudio.currentTime;
  const settings = {
    hover: [740, 620, 0.018, 0.07, "sine"],
    click: [520, 360, 0.045, 0.12, "triangle"],
    score: [860, 1140, 0.055, 0.14, "sine"],
    hit: [180, 90, 0.06, 0.18, "sawtooth"],
    win: [660, 1320, 0.05, 0.24, "triangle"]
  }[type] || [650, 520, 0.02, 0.08, "sine"];

  oscillator.type = settings[4];
  oscillator.frequency.setValueAtTime(settings[0], now);
  oscillator.frequency.exponentialRampToValueAtTime(settings[1], now + settings[3]);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(settings[2], now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + settings[3]);
  oscillator.connect(gain);
  gain.connect(ctxAudio.destination);
  oscillator.start(now);
  oscillator.stop(now + settings[3] + 0.02);
}

function wireUiSounds() {
  const soundTargets = document.querySelectorAll("a, button, .image-pop, .skill-card, .project-card");
  soundTargets.forEach((target) => {
    target.addEventListener("pointerenter", () => playUiSound("hover"));
    target.addEventListener("click", () => playUiSound("click"));
  });
}

function wireHeroIntelDrag() {
  if (!heroIntel) return;

  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  heroIntel.addEventListener("pointerdown", (event) => {
    if (window.matchMedia("(max-width: 767px)").matches) return;

    dragging = true;
    const rect = heroIntel.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;
    heroIntel.classList.add("is-dragging");
    heroIntel.setPointerCapture(event.pointerId);
    playUiSound("click");
  });

  heroIntel.addEventListener("pointermove", (event) => {
    if (!dragging) return;

    const hero = heroIntel.closest(".hero-shell");
    if (!hero) return;

    const heroRect = hero.getBoundingClientRect();
    const panelRect = heroIntel.getBoundingClientRect();
    const minX = 16;
    const minY = 96;
    const maxX = heroRect.width - panelRect.width - 16;
    const maxY = heroRect.height - panelRect.height - 16;
    const nextX = event.clientX - heroRect.left - offsetX;
    const nextY = event.clientY - heroRect.top - offsetY;

    heroIntel.style.left = `${Math.max(minX, Math.min(maxX, nextX))}px`;
    heroIntel.style.top = `${Math.max(minY, Math.min(maxY, nextY))}px`;
    heroIntel.style.transform = "none";
  });

  function stopDrag(event) {
    if (!dragging) return;
    dragging = false;
    heroIntel.classList.remove("is-dragging");
    if (heroIntel.hasPointerCapture(event.pointerId)) {
      heroIntel.releasePointerCapture(event.pointerId);
    }
  }

  heroIntel.addEventListener("pointerup", stopDrag);
  heroIntel.addEventListener("pointercancel", stopDrag);
}

const game = {
  running: false,
  score: 0,
  time: 30,
  player: { x: 56, y: 185, size: 34, speed: 24 },
  commit: { x: 610, y: 96, size: 24 },
  bugs: [],
  lastTick: 0,
  timerId: null,
  frameId: null
};

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function resetEntities() {
  game.player.x = 56;
  game.player.y = 185;
  game.commit.x = randomBetween(190, 660);
  game.commit.y = randomBetween(60, 340);
  game.bugs = [
    { x: 250, y: 70, vx: 2.2, vy: 1.4, size: 26 },
    { x: 470, y: 260, vx: -2.5, vy: 1.7, size: 30 },
    { x: 600, y: 150, vx: -1.8, vy: -2.1, size: 24 }
  ];
}

function updateGameUi() {
  scoreEl.textContent = `Score ${game.score}`;
  timeEl.textContent = `Time ${game.time}`;
}

function drawGame() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#0b1220");
  gradient.addColorStop(0.48, "#102a56");
  gradient.addColorStop(1, "#0f3d33");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#00c853";
  ctx.beginPath();
  ctx.arc(game.commit.x, game.commit.y, game.commit.size, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#062814";
  ctx.font = "900 18px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillText("OK", game.commit.x, game.commit.y + 6);

  game.bugs.forEach((bug) => {
    ctx.fillStyle = "#ff5a5f";
    ctx.beginPath();
    ctx.roundRect(bug.x - bug.size / 2, bug.y - bug.size / 2, bug.size, bug.size, 8);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "900 16px ui-monospace, monospace";
    ctx.fillText("!", bug.x, bug.y + 6);
  });

  ctx.fillStyle = "#fbbc04";
  ctx.beginPath();
  ctx.roundRect(game.player.x, game.player.y, game.player.size, game.player.size, 10);
  ctx.fill();
  ctx.fillStyle = "#0b1220";
  ctx.font = "900 18px ui-monospace, monospace";
  ctx.fillText("J", game.player.x + game.player.size / 2, game.player.y + 23);

  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "700 14px ui-monospace, monospace";
  ctx.fillText("collect commits, avoid bugs", 18, 28);
}

function collidesCircleRect(circle, rect) {
  const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.size));
  const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.size));
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy < circle.size * circle.size;
}

function collidesRects(a, b) {
  return a.x < b.x + b.size && a.x + a.size > b.x && a.y < b.y + b.size && a.y + a.size > b.y;
}

function updateGame() {
  game.bugs.forEach((bug) => {
    bug.x += bug.vx;
    bug.y += bug.vy;
    if (bug.x < 20 || bug.x > canvas.width - 20) bug.vx *= -1;
    if (bug.y < 20 || bug.y > canvas.height - 20) bug.vy *= -1;
  });

  if (collidesCircleRect(game.commit, game.player)) {
    game.score += 10;
    game.commit.x = randomBetween(160, 680);
    game.commit.y = randomBetween(50, 360);
    statusEl.textContent = "Clean commit";
    playUiSound("score");
  }

  const playerRect = game.player;
  for (const bug of game.bugs) {
    const bugRect = { x: bug.x - bug.size / 2, y: bug.y - bug.size / 2, size: bug.size };
    if (collidesRects(playerRect, bugRect)) {
      game.score = Math.max(0, game.score - 5);
      game.player.x = 56;
      game.player.y = 185;
      statusEl.textContent = "Bug hit";
      playUiSound("hit");
      break;
    }
  }

  updateGameUi();
}

function loop(timestamp) {
  if (!game.running) return;
  if (timestamp - game.lastTick > 16) {
    updateGame();
    drawGame();
    game.lastTick = timestamp;
  }
  game.frameId = requestAnimationFrame(loop);
}

function startGame() {
  resetGame();
  game.running = true;
  statusEl.textContent = "Running";
  game.timerId = setInterval(() => {
    game.time -= 1;
    updateGameUi();
    if (game.time <= 0) {
      endGame();
    }
  }, 1000);
  game.frameId = requestAnimationFrame(loop);
  playUiSound("click");
}

function endGame() {
  game.running = false;
  clearInterval(game.timerId);
  cancelAnimationFrame(game.frameId);
  statusEl.textContent = game.score >= 60 ? "Shipped" : "Try again";
  playUiSound(game.score >= 60 ? "win" : "hit");
  drawGame();
}

function resetGame() {
  game.running = false;
  clearInterval(game.timerId);
  cancelAnimationFrame(game.frameId);
  game.score = 0;
  game.time = 30;
  resetEntities();
  statusEl.textContent = "Ready";
  updateGameUi();
  drawGame();
}

function movePlayer(direction) {
  if (!canvas) return;
  const step = game.player.speed;
  if (direction === "left") game.player.x -= step;
  if (direction === "right") game.player.x += step;
  if (direction === "up") game.player.y -= step;
  if (direction === "down") game.player.y += step;
  game.player.x = Math.max(8, Math.min(canvas.width - game.player.size - 8, game.player.x));
  game.player.y = Math.max(42, Math.min(canvas.height - game.player.size - 8, game.player.y));
  drawGame();
}

document.addEventListener("keydown", (event) => {
  const keys = {
    ArrowLeft: "left",
    a: "left",
    ArrowRight: "right",
    d: "right",
    ArrowUp: "up",
    w: "up",
    ArrowDown: "down",
    s: "down"
  };
  if (keys[event.key]) {
    event.preventDefault();
    movePlayer(keys[event.key]);
  }
});

if (canvas && typeof CanvasRenderingContext2D !== "undefined" && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function roundRect(x, y, width, height, radius) {
    this.beginPath();
    this.moveTo(x + radius, y);
    this.arcTo(x + width, y, x + width, y + height, radius);
    this.arcTo(x + width, y + height, x, y + height, radius);
    this.arcTo(x, y + height, x, y, radius);
    this.arcTo(x, y, x + width, y, radius);
    this.closePath();
    return this;
  };
}

wireUiSounds();
wireHeroIntelDrag();
resetGame();
