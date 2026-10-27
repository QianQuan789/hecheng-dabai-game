(() => {
  "use strict";

  const W = 400;
  const H = 600;
  const DANGER_Y = 92;
  const DROP_PAD = 9;
  const GRAVITY = 1850;
  const DT = 1 / 120;
  const MAX_STEPS = 5;
  const SOLVER_ITERATIONS = 7;
  const RESTITUTION = 0.22;
  const RESTITUTION_THRESHOLD = 55;
  const FRICTION = 0.42;
  const AIR_DRAG = 0.16;
  const ANGULAR_DAMP = 1.8;
  const SLOP = 0.18;
  const MAX_CORRECTION = 5.5;
  const MAX_SPEED = 1850;
  const DROP_COOLDOWN = 0.24;
  const NEW_FRUIT_GRACE = 0.55;
  const DANGER_LIMIT = 1.45;
  const TAU = Math.PI * 2;

  const FRUITS = [
    { name: "急救包", r: 14, color: "#c65b47", light: "#f3a98f", dark: "#842f27" },
    { name: "弹药包", r: 18, color: "#7a7e62", light: "#bcc2a4", dark: "#4f543e" },
    { name: "霰弹枪", r: 24, color: "#68645f", light: "#aaa69d", dark: "#3d3c39" },
    { name: "突击步枪", r: 30, color: "#60676b", light: "#a7b1b5", dark: "#333b3e" },
    { name: "盾牌干员", r: 37, color: "#45574f", light: "#82978d", dark: "#283730" },
    { name: "报纸勇士", r: 44, color: "#bda77a", light: "#efe0bc", dark: "#876e45" },
    { name: "大白", r: 52, color: "#dce7e5", light: "#ffffff", dark: "#aeb9b8" },
    { name: "大白出击", r: 60, color: "#d1e2e1", light: "#ffffff", dark: "#9fb1b1" },
    { name: "婚纱干员", r: 69, color: "#65aeca", light: "#a8d9e9", dark: "#39768f" },
    { name: "双萃大白", r: 78, color: "#f3c84e", light: "#fff0a3", dark: "#d79a24" }
  ];

  // 把同名资源放进 assets/images 即可自动替换占位图。
  const IMAGE_PATHS = FRUITS.map((_, index) =>
    `assets/images/fruit-${String(index + 1).padStart(2, "0")}.png`
  );

  // 把同名音频放进 assets/audio 即可自动替换内置合成音效。
  const SOUND_PATHS = {
    drop: "assets/audio/drop.mp3",
    merge: "assets/audio/merge.m4a",
    bonus: "assets/audio/bonus.mp3",
    over: "assets/audio/game-over.mp3"
  };

  // 背景音乐：放入 assets/audio/bgm.mp3（缺失时自动静音跳过）。
  const BGM_PATH = "assets/audio/bgm.mp3";

  // 顶部歌词（与背景音乐同步滚动显示）。
  const LYRICS = [
    "你一句别怂 我就敢往前冲",
    "白老鼠老师 我还记得你",
    "一局一局 吸干我的哈哈币",
    "白老鼠老师 我还记得你",
    "那些得吃的梦 你替我扛起",
    "巅峰赛的第一盾 勇敢者随便做",
    "你笑着说下把吃 别先把自己看轻",
    "多少个深夜上车 我还在做得吃梦",
    "你说过的每句话 都在我心里立起",
    "后来风吹过来 我也学会了",
    "不躲不退 卡好战备去吸血",
    "白老鼠老师 我还记得你",
    "一局一局 吸干我的哈哈币",
    "白老鼠老师 我还记得你",
    "那些得吃的梦 你替我扛起",
    "如果有一天 我真得吃了",
    "也会想起 曾经的盾牌老祖",
    "想起你卡好战备 说别怕亏币",
    "说下一把 总会有人能得吃",
    "白老鼠老师 我还记得你",
    "一局一局 吸干我的哈哈币",
    "白老鼠老师 我还记得你",
    "那些得吃的梦 你替我扛起",
    "白老鼠老师 我还记得你",
    "亏再多 我也会继续上车",
    "白老鼠老师 我还记得你",
    "你给过的痛苦 我一直放在心里"
  ];

  const SCORE_TABLE = [0, 1, 3, 6, 10, 15, 21, 28, 36, 45];
  const STORAGE_BEST = "suikaLobby.best.v1";
  const STORAGE_MUTED = "suikaLobby.muted.v1";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  const nextPreview = document.getElementById("nextPreview");
  const nextCtx = nextPreview.getContext("2d");
  const resultPreview = document.getElementById("resultPreview");
  const resultCtx = resultPreview.getContext("2d");
  const gameFrame = document.getElementById("gameFrame");
  const overlay = document.getElementById("gameOverOverlay");
  const scoreValue = document.getElementById("scoreValue");
  const bestValue = document.getElementById("bestValue");
  const finalScore = document.getElementById("finalScore");
  const resultTitle = document.getElementById("resultTitle");
  const resultNote = document.getElementById("resultNote");
  const dangerLabel = document.getElementById("dangerLabel");
  const soundButton = document.getElementById("soundButton");
  const soundIcon = document.getElementById("soundIcon");
  const restartButton = document.getElementById("restartButton");
  const playAgainButton = document.getElementById("playAgainButton");
  const controlHint = document.getElementById("controlHint");
  const levelLegend = document.getElementById("levelLegend");
  const liveRegion = document.getElementById("liveRegion");
  const lyricsPrev = document.getElementById("lyricsPrev");
  const lyricsCurrent = document.getElementById("lyricsCurrent");
  const lyricsNext = document.getElementById("lyricsNext");

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const random = (min, max) => min + Math.random() * (max - min);
  const readStore = (key, fallback) => {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value;
    } catch {
      return fallback;
    }
  };
  const writeStore = (key, value) => {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // 隐私模式或 file:// 禁用存储时不影响游戏。
    }
  };

  let best = Number.parseInt(readStore(STORAGE_BEST, "0"), 10) || 0;
  let muted = readStore(STORAGE_MUTED, "0") === "1";
  let state = "playing";
  let score = 0;
  let pendingLevel = randomSpawnLevel();
  let nextLevel = randomSpawnLevel();
  let aimX = W / 2;
  let pointerActive = false;
  let activePointerId = null;
  let cooldown = 0;
  let dangerTime = 0;
  let highestLevel = 0;
  let newRecord = false;
  let dropClock = 0;
  let accumulator = 0;
  let lastFrameTime = performance.now();
  let lastScoreShown = 0;

  let balls = [];
  let mergeQueue = [];
  let particles = [];
  let ripples = [];
  let floaters = [];
  let renderScale = 1;

  const images = IMAGE_PATHS.map((path, index) => {
    const image = new Image();
    image.decoding = "async";
    image.dataset.level = String(index);
    image.src = path;
    image.addEventListener("load", () => {
      if (image.naturalWidth > 0) refreshPreviews();
    });
    return image;
  });

  const audioProbes = {};
  let audioContext = null;
  let bgm = null;
  let lyricsLive = false;
  let lastLyricsIndex = -1;

  function randomSpawnLevel() {
    return Math.floor(Math.random() * 5);
  }

  function imageReady(level) {
    const image = images[level];
    return Boolean(image && image.complete && image.naturalWidth > 0);
  }

  function initAudioProbes() {
    for (const [name, path] of Object.entries(SOUND_PATHS)) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.volume = name === "over" ? 0.42 : 0.52;
      audio.src = path;
      audioProbes[name] = audio;
    }
  }

  function initBackgroundMusic() {
    if (!bgm) {
      bgm = new Audio();
      bgm.preload = "auto";
      bgm.loop = true;
      bgm.volume = 0.45;
      bgm.src = BGM_PATH;
    }
  }

  function startBackgroundMusic() {
    if (!bgm || muted) return;
    if (bgm.paused) {
      bgm.play().catch(() => {});
    }
  }

  function stopBackgroundMusic() {
    if (!bgm) return;
    bgm.pause();
  }

  function unlockAudio() {
    if (muted) return;
    if (!audioContext) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioContext = new AudioContextClass();
      }
    }
    if (audioContext && audioContext.state === "suspended") {
      audioContext.resume().catch(() => {});
    }
    startBackgroundMusic();
  }

  function currentLyricsIndex() {
    if (!bgm || !isFinite(bgm.duration) || bgm.duration <= 0) return 0;
    const progress = clamp(bgm.currentTime / bgm.duration, 0, 1);
    return Math.min(LYRICS.length - 1, Math.floor(progress * LYRICS.length));
  }

  function updateLyrics() {
    const started =
      bgm && isFinite(bgm.duration) && bgm.duration > 0 && bgm.currentTime > 0;
    if (!lyricsLive) {
      if (!started) return;
      lyricsLive = true;
    }

    const index = currentLyricsIndex();
    if (index === lastLyricsIndex) return;
    lastLyricsIndex = index;

    lyricsPrev.textContent = index > 0 ? LYRICS[index - 1] : "";
    lyricsCurrent.textContent = LYRICS[index];
    lyricsNext.textContent = index < LYRICS.length - 1 ? LYRICS[index + 1] : "";
  }

  function playFileSound(name) {
    if (muted) return false;
    const source = audioProbes[name];
    if (!source || source.readyState < 2) return false;

    const player = source.cloneNode();
    player.volume = source.volume;
    player.play().catch(() => {});
    return true;
  }

  function playTone(frequency, duration, options = {}) {
    if (muted || !audioContext) return;
    const {
      type = "sine",
      gain = 0.035,
      delay = 0,
      endFrequency = frequency
    } = options;
    const startTime = audioContext.currentTime + delay;
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(35, endFrequency),
      startTime + duration
    );
    volume.gain.setValueAtTime(0.0001, startTime);
    volume.gain.exponentialRampToValueAtTime(gain, startTime + 0.012);
    volume.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(volume);
    volume.connect(audioContext.destination);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.02);
  }

  function playSound(name, level = 0) {
    if (muted) return;
    unlockAudio();
    if (playFileSound(name)) return;

    if (name === "drop") {
      playTone(250, 0.12, {
        type: "sine",
        gain: 0.025,
        endFrequency: 150
      });
      return;
    }

    if (name === "merge") {
      const base = 310 + level * 64;
      playTone(base, 0.15, { type: "sine", gain: 0.04, endFrequency: base * 1.22 });
      playTone(base * 1.5, 0.19, {
        type: "triangle",
        gain: 0.022,
        delay: 0.045,
        endFrequency: base * 1.68
      });
      return;
    }

    if (name === "bonus") {
      [440, 554, 659, 880].forEach((frequency, index) => {
        playTone(frequency, 0.24, {
          type: "sine",
          gain: 0.035,
          delay: index * 0.055,
          endFrequency: frequency * 1.04
        });
      });
      return;
    }

    if (name === "over") {
      [390, 330, 277, 220].forEach((frequency, index) => {
        playTone(frequency, 0.31, {
          type: "triangle",
          gain: 0.028,
          delay: index * 0.09,
          endFrequency: frequency * 0.9
        });
      });
    }
  }

  function updateSoundButton() {
    soundButton.classList.toggle("muted", muted);
    soundIcon.textContent = muted ? "×" : "♪";
    soundButton.setAttribute("aria-label", muted ? "开启音效" : "关闭音效");
    soundButton.title = muted ? "开启音效" : "关闭音效";
  }

  function announce(text) {
    liveRegion.textContent = "";
    requestAnimationFrame(() => {
      liveRegion.textContent = text;
    });
  }

  function refreshScoreDisplay(force = false) {
    if (!force && lastScoreShown === score) return;
    lastScoreShown = score;
    scoreValue.textContent = String(score);
    bestValue.textContent = String(best);
    scoreValue.classList.remove("bump");
    void scoreValue.offsetWidth;
    scoreValue.classList.add("bump");
  }

  function addScore(points, x, y) {
    score += points;
    const wasRecord = score <= best;
    if (score > best) {
      best = score;
      newRecord = true;
      writeStore(STORAGE_BEST, best);
    }

    refreshScoreDisplay();
    if (typeof x === "number" && typeof y === "number") {
      floaters.push({
        x: clamp(x + random(-9, 9), 32, W - 32),
        y: clamp(y, DANGER_Y + 15, H - 24),
        text: `+${points}`,
        color: wasRecord ? "#dc657e" : "#df9d32",
        life: 1,
        size: points >= 30 ? 19 : 15
      });
    }
  }

  function burstParticles(x, y, color, count, strength = 1) {
    for (let index = 0; index < count; index += 1) {
      const angle = random(0, TAU);
      const speed = random(55, 220) * strength;
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 55,
        radius: random(2, 5) * Math.sqrt(strength),
        color,
        life: 1,
        decay: random(1.05, 1.8)
      });
    }
  }

  function addRipple(x, y, startRadius, maxRadius, color) {
    ripples.push({
      x,
      y,
      radius: startRadius,
      maxRadius,
      color,
      life: 1
    });
  }

  function createBall(x, y, level, velocityX = 0, velocityY = 0) {
    const fruit = FRUITS[level];
    const mass = fruit.r * fruit.r;
    return {
      x,
      y,
      vx: velocityX,
      vy: velocityY,
      r: fruit.r,
      level,
      mass,
      invMass: 1 / mass,
      angle: random(-0.08, 0.08),
      omega: 0,
      age: 0,
      dead: false,
      pop: 0,
      glow: 0,
      squash: 0,
      squashX: 0,
      squashY: 1,
      contactX: 0,
      contactY: 0,
      touching: false,
      restTime: 0
    };
  }

  function getAimLimits(level = pendingLevel) {
    const radius = FRUITS[level].r;
    return {
      min: radius + 2,
      max: W - radius - 2
    };
  }

  function setAimFromClientX(clientX) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width) return;
    const logicalX = ((clientX - rect.left) / rect.width) * W;
    const limits = getAimLimits();
    aimX = clamp(logicalX, limits.min, limits.max);
  }

  function dropFruit() {
    if (state !== "playing" || cooldown > 0) return;
    const limits = getAimLimits();
    const dropX = clamp(aimX, limits.min, limits.max);
    const fruit = FRUITS[pendingLevel];
    const ball = createBall(dropX, fruit.r + DROP_PAD, pendingLevel, 0, 105);
    balls.push(ball);

    cooldown = DROP_COOLDOWN;
    pendingLevel = nextLevel;
    nextLevel = randomSpawnLevel();

    const newLimits = getAimLimits();
    aimX = clamp(aimX, newLimits.min, newLimits.max);
    playSound("drop");
    refreshPreviews();
    controlHint.textContent = "同样的角色碰在一起，就能升级";
  }

  function queueMerge(first, second) {
    if (first.dead || second.dead) return;
    first.dead = true;
    second.dead = true;
    mergeQueue.push([first, second]);
  }

  function processMerges() {
    if (!mergeQueue.length) return;
    const queued = mergeQueue;
    mergeQueue = [];

    for (const [first, second] of queued) {
      const centerX = (first.x + second.x) / 2;
      const centerY = (first.y + second.y) / 2;

      if (first.level === FRUITS.length - 1) {
        addScore(100, centerX, centerY);
        burstParticles(centerX, centerY, FRUITS[first.level].color, 28, 1.5);
        addRipple(
          centerX,
          centerY,
          FRUITS[first.level].r * 0.5,
          FRUITS[first.level].r * 2.7,
          FRUITS[first.level].color
        );
        floaters.push({
          x: centerX,
          y: centerY - 20,
          text: "双星消除！",
          color: "#df657f",
          life: 1,
          size: 19
        });
        playSound("bonus");
        announce("两个最高级角色相撞，额外获得一百分");
        continue;
      }

      const newLevel = first.level + 1;
      const newFruit = FRUITS[newLevel];
      const merged = createBall(
        centerX,
        centerY,
        newLevel,
        (first.vx + second.vx) * 0.5,
        (first.vy + second.vy) * 0.5 - 48
      );
      merged.angle = (first.angle + second.angle) * 0.5;
      merged.omega = (first.omega + second.omega) * 0.5;
      merged.pop = 1;
      merged.glow = 1;
      balls.push(merged);

      highestLevel = Math.max(highestLevel, newLevel);
      addScore(SCORE_TABLE[newLevel], centerX, centerY);
      burstParticles(centerX, centerY, newFruit.color, 8 + newLevel, 1);
      addRipple(centerX, centerY, newFruit.r * 0.38, newFruit.r * 1.85, newFruit.color);
      playSound("merge", newLevel);
      announce(`合成了${newFruit.name}，当前 ${score} 分`);
    }

    balls = balls.filter((ball) => !ball.dead);
  }

  function collideWall(ball) {
    if (ball.x - ball.r < 0) {
      hitWall(ball, 1, 0, ball.r - ball.x);
    }
    if (ball.x + ball.r > W) {
      hitWall(ball, -1, 0, ball.x + ball.r - W);
    }
    if (ball.y + ball.r > H) {
      hitWall(ball, 0, -1, ball.y + ball.r - H);
    }
  }

  function hitWall(ball, normalX, normalY, penetration) {
    ball.x += normalX * penetration;
    ball.y += normalY * penetration;
    ball.contactX -= normalX;
    ball.contactY -= normalY;
    ball.touching = true;

    const normalVelocity = ball.vx * normalX + ball.vy * normalY;
    if (normalVelocity >= 0) return;

    const bounce = -normalVelocity > RESTITUTION_THRESHOLD ? RESTITUTION : 0;
    const impulse = -(1 + bounce) * normalVelocity * ball.mass;
    ball.vx += impulse * normalX * ball.invMass;
    ball.vy += impulse * normalY * ball.invMass;

    addImpact(ball, -normalX, -normalY, impulse * ball.invMass);

    const tangentX = -normalY;
    const tangentY = normalX;
    const tangentVelocity = ball.vx * tangentX + ball.vy * tangentY;
    let tangentImpulse = -tangentVelocity * ball.mass;
    const maxFriction = FRICTION * Math.abs(impulse);
    tangentImpulse = clamp(tangentImpulse, -maxFriction, maxFriction);
    ball.vx += tangentImpulse * tangentX * ball.invMass;
    ball.vy += tangentImpulse * tangentY * ball.invMass;
  }

  function addImpact(ball, directionX, directionY, speedChange) {
    if (speedChange < 40) return;
    const strength = Math.min(1, (speedChange - 40) / 360);
    if (strength > ball.squash) {
      ball.squash = strength;
      ball.squashX = directionX;
      ball.squashY = directionY;
    }
  }

  function collidePair(first, second, allowMerge) {
    if (first.dead || second.dead) return;

    const dx = second.x - first.x;
    const dy = second.y - first.y;
    const radiusSum = first.r + second.r;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared >= radiusSum * radiusSum) return;

    let distance = Math.sqrt(distanceSquared);
    let normalX;
    let normalY;
    if (distance < 0.0001) {
      normalX = 0;
      normalY = -1;
      distance = 0.0001;
    } else {
      normalX = dx / distance;
      normalY = dy / distance;
    }

    if (allowMerge && first.level === second.level) {
      queueMerge(first, second);
      return;
    }

    const penetration = radiusSum - distance;
    const inverseMassSum = first.invMass + second.invMass;
    const correction =
      Math.min(Math.max(penetration - SLOP, 0) * 0.82, MAX_CORRECTION) /
      inverseMassSum;

    first.x -= normalX * correction * first.invMass;
    first.y -= normalY * correction * first.invMass;
    second.x += normalX * correction * second.invMass;
    second.y += normalY * correction * second.invMass;

    first.contactX += normalX;
    first.contactY += normalY;
    first.touching = true;
    second.contactX -= normalX;
    second.contactY -= normalY;
    second.touching = true;

    const relativeVelocityX = second.vx - first.vx;
    const relativeVelocityY = second.vy - first.vy;
    const normalVelocity =
      relativeVelocityX * normalX + relativeVelocityY * normalY;
    if (normalVelocity > 0) return;

    const bounce = -normalVelocity > RESTITUTION_THRESHOLD ? RESTITUTION : 0;
    const normalImpulse =
      (-(1 + bounce) * normalVelocity) / inverseMassSum;

    first.vx -= normalImpulse * normalX * first.invMass;
    first.vy -= normalImpulse * normalY * first.invMass;
    second.vx += normalImpulse * normalX * second.invMass;
    second.vy += normalImpulse * normalY * second.invMass;

    addImpact(first, -normalX, -normalY, normalImpulse * first.invMass);
    addImpact(second, normalX, normalY, normalImpulse * second.invMass);

    const tangentX = -normalY;
    const tangentY = normalX;
    const tangentVelocity =
      relativeVelocityX * tangentX + relativeVelocityY * tangentY;
    let tangentImpulse = -tangentVelocity / inverseMassSum;
    const frictionLimit = FRICTION * Math.abs(normalImpulse);
    tangentImpulse = clamp(tangentImpulse, -frictionLimit, frictionLimit);
    first.vx -= tangentImpulse * tangentX * first.invMass;
    first.vy -= tangentImpulse * tangentY * first.invMass;
    second.vx += tangentImpulse * tangentX * second.invMass;
    second.vy += tangentImpulse * tangentY * second.invMass;
  }

  function physicsStep(delta) {
    for (const ball of balls) {
      if (ball.dead) continue;

      ball.vy += GRAVITY * delta;
      const drag = Math.max(0, 1 - AIR_DRAG * delta);
      ball.vx *= drag;
      ball.vy *= drag;

      if (ball.restTime > 0.2) {
        const restDrag = Math.max(0, 1 - 5.5 * delta);
        ball.vx *= restDrag;
        ball.vy *= restDrag;
      }

      ball.x += ball.vx * delta;
      ball.y += ball.vy * delta;

      const speedSquared = ball.vx * ball.vx + ball.vy * ball.vy;
      if (speedSquared > MAX_SPEED * MAX_SPEED) {
        const scale = MAX_SPEED / Math.sqrt(speedSquared);
        ball.vx *= scale;
        ball.vy *= scale;
      }

      ball.angle += ball.omega * delta;
      ball.omega *= Math.max(0, 1 - ANGULAR_DAMP * delta);
      ball.age += delta;
      ball.pop = Math.max(0, ball.pop - delta * 3.4);
      ball.glow = Math.max(0, ball.glow - delta * 2.1);
      ball.squash = Math.max(0, ball.squash - delta * 7.5);
      ball.contactX = 0;
      ball.contactY = 0;
      ball.touching = false;
    }

    for (let iteration = 0; iteration < SOLVER_ITERATIONS; iteration += 1) {
      for (const ball of balls) {
        if (!ball.dead) collideWall(ball);
      }

      for (let firstIndex = 0; firstIndex < balls.length; firstIndex += 1) {
        const first = balls[firstIndex];
        if (first.dead) continue;
        for (
          let secondIndex = firstIndex + 1;
          secondIndex < balls.length;
          secondIndex += 1
        ) {
          const second = balls[secondIndex];
          if (second.dead) continue;
          collidePair(first, second, iteration === 0);
        }
      }

      for (const ball of balls) {
        if (!ball.dead) collideWall(ball);
      }
    }

    processMerges();

    for (const ball of balls) {
      const speed = Math.hypot(ball.vx, ball.vy);
      if (ball.touching && speed < 19 && Math.abs(ball.omega) < 1.2) {
        ball.restTime += delta;
      } else {
        ball.restTime = 0;
      }

      if (ball.touching) {
        const contactLength = Math.hypot(ball.contactX, ball.contactY);
        if (contactLength > 0.0001) {
          const contactNormalX = ball.contactX / contactLength;
          const contactNormalY = ball.contactY / contactLength;
          const targetOmega =
            (ball.vx * contactNormalY - ball.vy * contactNormalX) / ball.r;
          ball.omega += (targetOmega - ball.omega) * Math.min(1, 8 * delta);
        }
      }
    }
  }

  function checkDanger(delta) {
    if (state !== "playing") return;

    let inDanger = false;
    for (const ball of balls) {
      if (ball.dead || ball.age < NEW_FRUIT_GRACE) continue;
      const speed = Math.hypot(ball.vx, ball.vy);
      if (ball.y - ball.r < DANGER_Y && speed < 105) {
        inDanger = true;
        break;
      }
    }

    if (inDanger) {
      dangerTime += delta;
    } else {
      dangerTime = Math.max(0, dangerTime - delta * 1.8);
    }

    dangerLabel.classList.toggle("show", dangerTime > 0.18);
    if (dangerTime >= DANGER_LIMIT) finishGame();
  }

  function finishGame() {
    if (state !== "playing") return;
    state = "over";
    pointerActive = false;
    activePointerId = null;
    dangerLabel.classList.remove("show");

    finalScore.textContent = String(score);
    const resultLevel = Math.max(
      highestLevel,
      ...balls.filter((ball) => !ball.dead).map((ball) => ball.level),
      0
    );
    resultTitle.textContent =
      resultLevel > 0
        ? `本局最高合成了${FRUITS[resultLevel].name}`
        : "差一点就合成了";
    resultNote.textContent = newRecord
      ? "新纪录！你的空间利用得很漂亮。"
      : `历史最高 ${best} 分，再试一次吧。`;

    drawPreview(resultPreview, resultCtx, resultLevel, 128, 48);
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
    gameFrame.classList.add("shake");
    window.setTimeout(() => gameFrame.classList.remove("shake"), 480);
    playSound("over");
    announce(`游戏结束，得分 ${score}`);
    window.setTimeout(() => playAgainButton.focus(), 280);
  }

  function beginGame() {
    balls = [];
    mergeQueue = [];
    particles = [];
    ripples = [];
    floaters = [];
    score = 0;
    lastScoreShown = -1;
    pendingLevel = randomSpawnLevel();
    nextLevel = randomSpawnLevel();
    aimX = W / 2;
    pointerActive = false;
    activePointerId = null;
    cooldown = 0;
    dangerTime = 0;
    highestLevel = 0;
    newRecord = false;
    dropClock = 0;
    accumulator = 0;
    state = "playing";
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
    dangerLabel.classList.remove("show");
    gameFrame.classList.remove("shake");
    controlHint.textContent = "按住拖动瞄准，松开投放";
    refreshScoreDisplay(true);
    refreshPreviews();
    canvas.focus({ preventScroll: true });
  }

  function updateEffects(delta) {
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.vy += 1180 * delta;
      particle.vx *= Math.max(0, 1 - 1.3 * delta);
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.life -= particle.decay * delta;
      if (particle.life <= 0 || particle.y > H + 25) {
        particles.splice(index, 1);
      }
    }

    for (let index = ripples.length - 1; index >= 0; index -= 1) {
      const ripple = ripples[index];
      ripple.radius +=
        (ripple.maxRadius - ripple.radius) * Math.min(1, 7.5 * delta);
      ripple.life -= 2.1 * delta;
      if (ripple.life <= 0) ripples.splice(index, 1);
    }

    for (let index = floaters.length - 1; index >= 0; index -= 1) {
      const floater = floaters[index];
      floater.y -= 34 * delta;
      floater.life -= 1.05 * delta;
      if (floater.life <= 0) floaters.splice(index, 1);
    }
  }

  function resizeCanvas() {
    const dpr = clamp(window.devicePixelRatio || 1, 1, 2.25);
    const targetWidth = Math.round(W * dpr);
    const targetHeight = Math.round(H * dpr);
    renderScale = dpr;
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }
  }

  function drawBackdrop(context) {
    const background = context.createLinearGradient(0, 0, 0, H);
    background.addColorStop(0, "#fffdf7");
    background.addColorStop(0.45, "#fff8f8");
    background.addColorStop(1, "#eef9fc");
    context.fillStyle = background;
    context.fillRect(0, 0, W, H);

    context.fillStyle = "rgba(174, 151, 165, 0.13)";
    for (let y = 17; y < H - 8; y += 30) {
      for (let x = 15; x < W - 4; x += 30) {
        context.beginPath();
        context.arc(x + ((y / 30) % 2 ? 15 : 0), y, 1.25, 0, TAU);
        context.fill();
      }
    }

    const sideGradient = context.createLinearGradient(0, 0, 28, 0);
    sideGradient.addColorStop(0, "rgba(255,255,255,0.84)");
    sideGradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = sideGradient;
    context.fillRect(0, 0, 28, H);

    const oppositeGradient = context.createLinearGradient(W, 0, W - 28, 0);
    oppositeGradient.addColorStop(0, "rgba(255,255,255,0.84)");
    oppositeGradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = oppositeGradient;
    context.fillRect(W - 28, 0, 28, H);

    const floorGradient = context.createLinearGradient(0, H - 55, 0, H);
    floorGradient.addColorStop(0, "rgba(131,185,207,0)");
    floorGradient.addColorStop(1, "rgba(131,185,207,0.16)");
    context.fillStyle = floorGradient;
    context.fillRect(0, H - 55, W, 55);
    context.strokeStyle = "rgba(126,174,199,0.55)";
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(0, H - 1.5);
    context.lineTo(W, H - 1.5);
    context.stroke();
  }

  const backdrop = document.createElement("canvas");
  backdrop.width = W;
  backdrop.height = H;
  drawBackdrop(backdrop.getContext("2d"));

  function drawDangerLine(context) {
    const dangerRatio = clamp(dangerTime / DANGER_LIMIT, 0, 1);
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 190);

    if (dangerRatio > 0.02) {
      const glow = context.createLinearGradient(
        0,
        DANGER_Y - 26,
        0,
        DANGER_Y + 30
      );
      glow.addColorStop(0, "rgba(255, 76, 112, 0)");
      glow.addColorStop(
        0.5,
        `rgba(255, 76, 112, ${0.08 + dangerRatio * 0.18 * (0.7 + pulse * 0.3)})`
      );
      glow.addColorStop(1, "rgba(255, 76, 112, 0)");
      context.fillStyle = glow;
      context.fillRect(0, DANGER_Y - 26, W, 56);
    }

    context.save();
    context.setLineDash([9, 9]);
    context.lineWidth = 2.2;
    context.lineCap = "round";
    context.strokeStyle =
      dangerRatio > 0.02
        ? `rgba(239, 70, 105, ${0.38 + dangerRatio * 0.46 * (0.7 + pulse * 0.3)})`
        : "rgba(161, 146, 174, 0.42)";
    context.beginPath();
    context.moveTo(7, DANGER_Y);
    context.lineTo(W - 7, DANGER_Y);
    context.stroke();
    context.restore();
  }

  function drawFallbackFruit(context, x, y, radius, level, angle, scale = 1) {
    const fruit = FRUITS[level];
    context.save();
    context.translate(x, y);
    context.rotate(angle);
    context.scale(scale, scale);

    const gradient = context.createRadialGradient(
      -radius * 0.34,
      -radius * 0.4,
      radius * 0.08,
      0,
      0,
      radius * 1.04
    );
    gradient.addColorStop(0, fruit.light);
    gradient.addColorStop(0.48, fruit.color);
    gradient.addColorStop(1, fruit.dark);

    context.beginPath();
    context.arc(0, 0, radius, 0, TAU);
    context.fillStyle = gradient;
    context.fill();
    context.lineWidth = Math.max(1.2, radius * 0.055);
    context.strokeStyle = "rgba(255,255,255,0.74)";
    context.stroke();

    // 小叶子
    if (level > 0 && radius > 15) {
      context.save();
      context.translate(radius * 0.16, -radius * 0.91);
      context.rotate(0.42);
      context.beginPath();
      context.ellipse(0, 0, radius * 0.24, radius * 0.11, 0, 0, TAU);
      context.fillStyle = level % 2 ? "#71b55e" : "#82c96d";
      context.fill();
      context.restore();
    }

    // 眼睛和嘴保持简洁，资源替换后会自动隐藏。
    const faceScale = Math.max(0.65, Math.min(1.25, radius / 25));
    context.save();
    context.scale(faceScale, faceScale);
    context.fillStyle = "rgba(75, 52, 58, 0.76)";
    context.beginPath();
    context.ellipse(-radius * 0.25 / faceScale, -radius * 0.05 / faceScale, 1.75, 2.45, 0, 0, TAU);
    context.ellipse(radius * 0.23 / faceScale, -radius * 0.05 / faceScale, 1.75, 2.45, 0, 0, TAU);
    context.fill();

    context.strokeStyle = "rgba(75, 52, 58, 0.62)";
    context.lineWidth = 1.5;
    context.lineCap = "round";
    context.beginPath();
    context.arc(
      -radius * 0.02 / faceScale,
      radius * 0.12 / faceScale,
      radius * 0.14 / faceScale,
      0.2,
      Math.PI - 0.2
    );
    context.stroke();

    context.fillStyle = "rgba(255, 255, 255, 0.4)";
    context.beginPath();
    context.ellipse(
      -radius * 0.38 / faceScale,
      -radius * 0.43 / faceScale,
      radius * 0.2 / faceScale,
      radius * 0.11 / faceScale,
      -0.55,
      0,
      TAU
    );
    context.fill();
    context.restore();

    context.restore();
  }

  function drawFruit(context, ball) {
    const fruit = FRUITS[ball.level];
    const popScale = 1 + Math.sin(ball.pop * Math.PI) * 0.13;

    context.save();
    context.globalAlpha = 0.13;
    context.fillStyle = "#5b4355";
    context.beginPath();
    context.ellipse(
      ball.x,
      ball.y + ball.r * 0.67,
      ball.r * 0.67,
      ball.r * 0.19,
      0,
      0,
      TAU
    );
    context.fill();
    context.restore();

    if (ball.glow > 0) {
      context.save();
      context.globalAlpha = ball.glow * 0.46;
      context.fillStyle = fruit.light;
      context.beginPath();
      context.arc(ball.x, ball.y, ball.r * (1.05 + (1 - ball.glow) * 0.32), 0, TAU);
      context.fill();
      context.restore();
    }

    context.save();
    context.translate(ball.x, ball.y);
    context.scale(popScale, popScale);
    if (ball.squash > 0.01) {
      const angle = Math.atan2(ball.squashY, ball.squashX);
      const amount = ball.squash * 0.12;
      context.rotate(angle);
      context.scale(1 - amount, 1 + amount);
      context.rotate(-angle);
    }
    context.translate(-ball.x, -ball.y);

    if (imageReady(ball.level)) {
      // 图片、遮挡区域与物理碰撞使用完全相同的圆形半径。
      const size = ball.r * 2;
      context.save();
      context.translate(ball.x, ball.y);
      context.rotate(clamp(ball.angle, -0.45, 0.45));
      context.beginPath();
      context.arc(0, 0, ball.r, 0, TAU);
      context.clip();
      context.drawImage(images[ball.level], -size / 2, -size / 2, size, size);
      context.restore();
    } else {
      drawFallbackFruit(context, ball.x, ball.y, ball.r, ball.level, clamp(ball.angle, -0.45, 0.45));
    }
    context.restore();
  }

  function drawAim(context) {
    if (state !== "playing") return;
    const fruit = FRUITS[pendingLevel];
    const limits = getAimLimits();
    const previewX = clamp(aimX, limits.min, limits.max);
    const previewY = fruit.r + DROP_PAD + Math.sin(dropClock * 3.2) * 2.1;
    const ready = cooldown <= 0;

    context.save();
    context.globalAlpha = pointerActive ? 0.72 : 0.26;
    context.setLineDash([6, 11]);
    context.lineDashOffset = -dropClock * 26;
    context.lineWidth = pointerActive ? 2.5 : 1.8;
    context.strokeStyle = fruit.color;
    context.beginPath();
    context.moveTo(previewX, previewY + fruit.r + 7);
    context.lineTo(previewX, H - 15);
    context.stroke();
    context.restore();

    context.save();
    context.globalAlpha = ready ? 1 : 0.28;
    const previewBall = {
      x: previewX,
      y: previewY,
      r: fruit.r,
      level: pendingLevel,
      angle: 0,
      pop: 0,
      glow: 0,
      squash: 0,
      squashX: 0,
      squashY: 1
    };
    drawFruit(context, previewBall);
    context.restore();
  }

  function drawEffects(context) {
    for (const ripple of ripples) {
      context.save();
      context.globalAlpha = ripple.life * 0.58;
      context.lineWidth = 1 + ripple.life * 3;
      context.strokeStyle = ripple.color;
      context.beginPath();
      context.arc(ripple.x, ripple.y, ripple.radius, 0, TAU);
      context.stroke();
      context.restore();
    }

    for (const particle of particles) {
      context.save();
      context.globalAlpha = Math.max(0, particle.life);
      context.fillStyle = particle.color;
      context.beginPath();
      context.arc(
        particle.x,
        particle.y,
        particle.radius * (0.45 + particle.life * 0.7),
        0,
        TAU
      );
      context.fill();
      context.restore();
    }

    context.textAlign = "center";
    context.textBaseline = "middle";
    for (const floater of floaters) {
      context.save();
      context.globalAlpha = Math.min(1, floater.life * 1.7);
      context.font = `800 ${floater.size}px "PingFang SC", "Microsoft YaHei", sans-serif`;
      context.lineWidth = 3.2;
      context.strokeStyle = "rgba(255,255,255,0.94)";
      context.strokeText(floater.text, floater.x, floater.y);
      context.fillStyle = floater.color;
      context.fillText(floater.text, floater.x, floater.y);
      context.restore();
    }
  }

  function render() {
    const scaleX = canvas.width / W;
    const scaleY = canvas.height / H;
    ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(backdrop, 0, 0);
    drawDangerLine(ctx);

    const sortedBalls = balls.slice().sort((first, second) => first.y - second.y);
    for (const ball of sortedBalls) {
      if (!ball.dead) drawFruit(ctx, ball);
    }

    drawAim(ctx);
    drawEffects(ctx);
  }

  function drawPreview(previewCanvas, previewContext, level, logicalSize, radius) {
    previewContext.setTransform(1, 0, 0, 1, 0, 0);
    previewContext.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    const scale = previewCanvas.width / logicalSize;
    previewContext.setTransform(scale, 0, 0, scale, 0, 0);
    const x = logicalSize / 2;
    const y = logicalSize / 2;

    previewContext.globalAlpha = 0.12;
    previewContext.fillStyle = "#664a55";
    previewContext.beginPath();
    previewContext.ellipse(x, y + radius * 0.72, radius * 0.6, radius * 0.17, 0, 0, TAU);
    previewContext.fill();
    previewContext.globalAlpha = 1;

    if (imageReady(level)) {
      const size = radius * 2;
      previewContext.save();
      previewContext.beginPath();
      previewContext.arc(x, y, radius, 0, TAU);
      previewContext.clip();
      previewContext.drawImage(images[level], x - size / 2, y - size / 2, size, size);
      previewContext.restore();
    } else {
      drawFallbackFruit(previewContext, x, y, radius, level, 0);
    }
  }

  function refreshPreviews() {
    drawPreview(nextPreview, nextCtx, nextLevel, 72, 22);
    if (state === "over") {
      const currentMax = Math.max(
        highestLevel,
        ...balls.map((ball) => ball.level),
        0
      );
      drawPreview(resultPreview, resultCtx, currentMax, 128, 48);
    }
  }

  function buildLegend() {
    const fragment = document.createDocumentFragment();
    FRUITS.forEach((fruit, index) => {
      const item = document.createElement("span");
      item.className = "legend-item";
      const dot = document.createElement("span");
      dot.className = "legend-dot";
      dot.style.background = fruit.color;
      const label = document.createElement("span");
      label.textContent = fruit.name;
      item.append(dot, label);
      fragment.append(item);

      if (index < FRUITS.length - 1) {
        const arrow = document.createElement("span");
        arrow.className = "legend-arrow";
        arrow.textContent = "›";
        fragment.append(arrow);
      }
    });
    levelLegend.replaceChildren(fragment);
  }

  function frame(timestamp) {
    requestAnimationFrame(frame);
    const elapsed = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
    lastFrameTime = timestamp;
    dropClock += elapsed;
    updateLyrics();

    if (state === "playing" && !document.hidden) {
      cooldown = Math.max(0, cooldown - elapsed);
      accumulator += elapsed;
      let steps = 0;
      while (accumulator >= DT && steps < MAX_STEPS) {
        physicsStep(DT);
        checkDanger(DT);
        accumulator -= DT;
        steps += 1;
        if (state !== "playing") break;
      }
      if (steps >= MAX_STEPS) accumulator = 0;
    } else {
      accumulator = 0;
    }

    updateEffects(elapsed);
    render();
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (state !== "playing" || event.button !== 0) return;
    event.preventDefault();
    unlockAudio();
    pointerActive = true;
    activePointerId = event.pointerId;
    canvas.setPointerCapture(event.pointerId);
    setAimFromClientX(event.clientX);
    canvas.focus({ preventScroll: true });
  });

  canvas.addEventListener("pointermove", (event) => {
    if (state !== "playing") return;
    if (pointerActive && activePointerId === event.pointerId) {
      event.preventDefault();
      setAimFromClientX(event.clientX);
    } else if (event.pointerType === "mouse") {
      setAimFromClientX(event.clientX);
    }
  });

  canvas.addEventListener("pointerup", (event) => {
    if (state !== "playing" || !pointerActive) return;
    if (activePointerId !== null && event.pointerId !== activePointerId) return;
    event.preventDefault();
    setAimFromClientX(event.clientX);
    pointerActive = false;
    activePointerId = null;
    dropFruit();
  });

  canvas.addEventListener("pointercancel", () => {
    pointerActive = false;
    activePointerId = null;
  });

  canvas.addEventListener("keydown", (event) => {
    if (state !== "playing") return;
    const limits = getAimLimits();
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      aimX = clamp(aimX - 12, limits.min, limits.max);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      aimX = clamp(aimX + 12, limits.min, limits.max);
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      unlockAudio();
      dropFruit();
    }
  });

  soundButton.addEventListener("click", () => {
    muted = !muted;
    writeStore(STORAGE_MUTED, muted ? "1" : "0");
    updateSoundButton();
    if (!muted) {
      unlockAudio();
      playSound("drop");
    } else {
      stopBackgroundMusic();
    }
  });

  function requestRestart() {
    beginGame();
    announce("新的一局开始了");
  }

  restartButton.addEventListener("click", requestRestart);
  playAgainButton.addEventListener("click", requestRestart);

  window.addEventListener("resize", resizeCanvas);
  window.addEventListener("blur", () => {
    pointerActive = false;
    activePointerId = null;
    accumulator = 0;
  });
  document.addEventListener("visibilitychange", () => {
    lastFrameTime = performance.now();
    accumulator = 0;
  });

  buildLegend();
  updateSoundButton();
  initAudioProbes();
  initBackgroundMusic();
  resizeCanvas();
  refreshScoreDisplay(true);
  refreshPreviews();
  requestAnimationFrame(frame);

  // 调试与自动化测试接口，不影响正常游玩。
  window.SuikaGame = {
    restart: beginGame,
    spawn(level, x, y) {
      const safeLevel = clamp(Number(level) || 0, 0, FRUITS.length - 1);
      const radius = FRUITS[safeLevel].r;
      const ball = createBall(
        clamp(Number(x) || W / 2, radius, W - radius),
        clamp(Number(y) || radius + DROP_PAD, radius, H - radius),
        safeLevel
      );
      ball.age = NEW_FRUIT_GRACE + 1;
      balls.push(ball);
      return balls.length;
    },
    step(seconds = 0.1) {
      const iterations = Math.max(1, Math.round(seconds / DT));
      for (let index = 0; index < iterations; index += 1) {
        physicsStep(DT);
        checkDanger(DT);
      }
      render();
      return this.snapshot;
    },
    get snapshot() {
      return {
        state,
        score,
        best,
        pendingLevel,
        nextLevel,
        balls: balls.map(({ x, y, r, vx, vy, level }) => ({
          x,
          y,
          r,
          vx,
          vy,
          level
        })),
        highestLevel,
        dangerTime,
        assets: {
          images: images.map((image, level) => ({
            level: level + 1,
            loaded: imageReady(level),
            path: IMAGE_PATHS[level]
          })),
          sounds: Object.keys(SOUND_PATHS)
        }
      };
    }
  };
})();
