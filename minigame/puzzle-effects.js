const gameEngine = require('../utils/game');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function startSettleAnimation(app, dragSnapshot, rowDelta, colDelta) {
  if (!dragSnapshot || !app.boardRect || !dragSnapshot.groupPieceIds || !dragSnapshot.groupPieceIds.length) {
    return;
  }

  const cell = app.boardRect.cell;
  let offsetX = dragSnapshot.dx - colDelta * cell;
  let offsetY = dragSnapshot.dy - rowDelta * cell;

  if (Math.abs(offsetX) < 2 && Math.abs(offsetY) < 2) {
    offsetX = colDelta ? -Math.sign(colDelta) * Math.min(12, cell * 0.14) : 0;
    offsetY = rowDelta ? -Math.sign(rowDelta) * Math.min(12, cell * 0.14) : 0;
  }

  if (Math.abs(offsetX) < 0.5 && Math.abs(offsetY) < 0.5) {
    return;
  }

  const duration = 150;
  dragSnapshot.groupPieceIds.forEach((pieceId) => {
    app.settleAnimations = app.settleAnimations.filter((item) => item.pieceId !== pieceId);
    app.settleAnimations.push({
      pieceId,
      fromX: offsetX,
      fromY: offsetY,
      variant: 'active',
      age: 0,
      duration
    });
  });
}

function capturePieceSlotSnapshot(app) {
  const snapshot = {};
  if (!app.gameState || !app.gameState.pieces) {
    return snapshot;
  }

  Object.keys(app.gameState.pieces).forEach((pieceId) => {
    const piece = app.gameState.pieces[pieceId];
    snapshot[piece.id] = piece.currentSlot;
  });
  return snapshot;
}

function startPassiveSettleAnimations(app, beforePieceSlots, excludePieceIds) {
  if (!beforePieceSlots || !app.boardRect || !app.currentLevel || !app.gameState || !app.gameState.pieces) {
    return;
  }

  const excludedLookup = {};
  (excludePieceIds || []).forEach((pieceId) => {
    excludedLookup[pieceId] = true;
  });

  const cell = app.boardRect.cell;
  const duration = 150;
  Object.keys(app.gameState.pieces).forEach((pieceKey) => {
    const piece = app.gameState.pieces[pieceKey];
    if (!piece || excludedLookup[piece.id]) {
      return;
    }

    const previousSlot = beforePieceSlots[piece.id];
    if (!previousSlot || previousSlot === piece.currentSlot) {
      return;
    }

    const previousCoords = gameEngine.slotToRowCol(previousSlot, app.currentLevel.cols);
    const currentCoords = gameEngine.slotToRowCol(piece.currentSlot, app.currentLevel.cols);
    const fromX = (previousCoords.col - currentCoords.col) * cell;
    const fromY = (previousCoords.row - currentCoords.row) * cell;

    if (Math.abs(fromX) < 0.5 && Math.abs(fromY) < 0.5) {
      return;
    }

    app.settleAnimations = app.settleAnimations.filter((item) => item.pieceId !== piece.id);
    app.settleAnimations.push({
      pieceId: piece.id,
      fromX,
      fromY,
      variant: 'passiveSwap',
      age: 0,
      duration
    });
  });
}

function getSettleEffect(app, pieceId) {
  return app.settleAnimations.find((item) => item.pieceId === pieceId) || null;
}

function getSettleOffset(app, pieceId) {
  const effect = getSettleEffect(app, pieceId);
  if (!effect) {
    return null;
  }

  const progress = clamp(effect.age / effect.duration, 0, 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  return {
    x: effect.fromX * (1 - eased),
    y: effect.fromY * (1 - eased)
  };
}

function drawSettleTrail(app, effect, baseX, baseY, drawX, drawY, cell, helpers) {
  const { fillRoundRect } = helpers;
  const deltaX = drawX - baseX;
  const deltaY = drawY - baseY;
  if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
    return;
  }

  const progress = clamp(effect.age / effect.duration, 0, 1);
  const alpha = (1 - progress) * 0.28;
  const ctx = app.ctx;

  ctx.save();
  ctx.shadowBlur = 16 + (1 - progress) * 10;
  ctx.shadowColor = `rgba(111, 245, 255, ${alpha * 0.95})`;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    const left = Math.min(baseX, drawX) + 8;
    const width = cell - 16 + Math.abs(deltaX);
    const y = baseY + 12;
    const height = cell - 24;
    const gradient = ctx.createLinearGradient(left, 0, left + width, 0);
    if (deltaX > 0) {
      gradient.addColorStop(0, `rgba(111, 245, 255, ${alpha * 0.12})`);
      gradient.addColorStop(0.68, `rgba(111, 245, 255, ${alpha * 0.28})`);
      gradient.addColorStop(1, 'rgba(111, 245, 255, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(111, 245, 255, 0)');
      gradient.addColorStop(0.32, `rgba(111, 245, 255, ${alpha * 0.28})`);
      gradient.addColorStop(1, `rgba(111, 245, 255, ${alpha * 0.12})`);
    }
    fillRoundRect(ctx, left, y, width, height, 16, gradient);
  } else {
    const top = Math.min(baseY, drawY) + 8;
    const height = cell - 16 + Math.abs(deltaY);
    const x = baseX + 12;
    const width = cell - 24;
    const gradient = ctx.createLinearGradient(0, top, 0, top + height);
    if (deltaY > 0) {
      gradient.addColorStop(0, `rgba(111, 245, 255, ${alpha * 0.12})`);
      gradient.addColorStop(0.68, `rgba(111, 245, 255, ${alpha * 0.28})`);
      gradient.addColorStop(1, 'rgba(111, 245, 255, 0)');
    } else {
      gradient.addColorStop(0, 'rgba(111, 245, 255, 0)');
      gradient.addColorStop(0.32, `rgba(111, 245, 255, ${alpha * 0.28})`);
      gradient.addColorStop(1, `rgba(111, 245, 255, ${alpha * 0.12})`);
    }
    fillRoundRect(ctx, x, top, width, height, 16, gradient);
  }

  ctx.restore();
}

function capturePuzzleFeedback(app, pieceId) {
  const pieces = Object.values((app.gameState && app.gameState.pieces) || {});
  const groups = Object.values((app.gameState && app.gameState.groups) || {});
  const piece = pieceId && app.gameState ? app.gameState.pieces[pieceId] : null;
  const activeGroup = piece && piece.groupId ? app.gameState.groups[piece.groupId] : null;

  return {
    correctCount: pieces.filter((item) => item.currentSlot === item.correctSlot).length,
    largestGroupSize: groups.reduce((max, group) => Math.max(max, group.pieceIds.length), 1),
    activeGroupSize: activeGroup ? activeGroup.pieceIds.length : piece ? 1 : 0
  };
}

function getGroupBounds(app, group) {
  if (!group || !group.pieceIds || !group.pieceIds.length || !app.boardRect || !app.currentLevel) {
    return null;
  }

  let minRow = app.currentLevel.rows;
  let minCol = app.currentLevel.cols;
  let maxRow = 0;
  let maxCol = 0;

  group.pieceIds.forEach((pieceId) => {
    const piece = app.gameState.pieces[pieceId];
    if (!piece) {
      return;
    }
    const coords = gameEngine.slotToRowCol(piece.currentSlot, app.currentLevel.cols);
    minRow = Math.min(minRow, coords.row);
    minCol = Math.min(minCol, coords.col);
    maxRow = Math.max(maxRow, coords.row);
    maxCol = Math.max(maxCol, coords.col);
  });

  const cell = app.boardRect.cell;
  const x = app.boardRect.x + minCol * cell;
  const y = app.boardRect.y + minRow * cell;
  const w = (maxCol - minCol + 1) * cell;
  const h = (maxRow - minRow + 1) * cell;
  return {
    x,
    y,
    w,
    h,
    cx: x + w / 2,
    cy: y + h / 2
  };
}

function addSnapPulse(app, bounds, tone, expandBoost) {
  if (!bounds) {
    return;
  }

  const palettes = {
    cyan: { rgb: '111,245,255', glow: 0.62 },
    gold: { rgb: '255,225,132', glow: 0.58 },
    success: { rgb: '173,255,247', glow: 0.68 }
  };
  const palette = palettes[tone] || palettes.cyan;
  app.snapPulses.push({
    x: bounds.x,
    y: bounds.y,
    w: bounds.w,
    h: bounds.h,
    age: 0,
    duration: tone === 'success' ? 980 : 480,
    rgb: palette.rgb,
    glow: palette.glow,
    expand: expandBoost || (tone === 'success' ? 26 : 16),
    radius: Math.min(26, Math.max(16, app.boardRect ? app.boardRect.cell * 0.28 : 18))
  });

  if (app.snapPulses.length > 10) {
    app.snapPulses.splice(0, app.snapPulses.length - 10);
  }
}

function spawnBurstParticles(app, x, y, count, palette, options) {
  const config = Object.assign(
    {
      angleStart: -Math.PI * 0.9,
      angleRange: Math.PI * 1.8,
      speedMin: 80,
      speedMax: 180,
      gravity: 220,
      durationMin: 520,
      durationMax: 980,
      sizeMin: 2,
      sizeMax: 5
    },
    options || {}
  );

  for (let index = 0; index < count; index += 1) {
    const angle = config.angleStart + Math.random() * config.angleRange;
    const speed = config.speedMin + Math.random() * (config.speedMax - config.speedMin);
    const duration = config.durationMin + Math.random() * (config.durationMax - config.durationMin);
    const size = config.sizeMin + Math.random() * (config.sizeMax - config.sizeMin);
    const rgb = palette[index % palette.length];
    app.fxParticles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      gravity: config.gravity,
      duration,
      age: 0,
      size,
      alpha: 0.96,
      rgb
    });
  }

  if (app.fxParticles.length > 160) {
    app.fxParticles.splice(0, app.fxParticles.length - 160);
  }
}

function triggerMoveFeedback(app, beforeMove, pieceId) {
  if (!beforeMove || !pieceId || !app.gameState) {
    return;
  }

  const afterMove = capturePuzzleFeedback(app, pieceId);
  const movedPiece = app.gameState.pieces[pieceId];
  const movedGroup = movedPiece ? app.gameState.groups[movedPiece.groupId] : null;
  if (!movedGroup) {
    return;
  }

  const grew = afterMove.activeGroupSize > beforeMove.activeGroupSize;
  const improved = afterMove.correctCount > beforeMove.correctCount;
  if (!grew && !improved) {
    return;
  }

  const bounds = getGroupBounds(app, movedGroup);
  if (!bounds) {
    return;
  }

  const tone = grew ? 'cyan' : 'gold';
  const palette = grew
    ? ['111,245,255', '170,255,248', '224,255,255']
    : ['255,225,132', '255,244,204', '111,245,255'];
  addSnapPulse(app, bounds, tone, grew ? 18 : 12);
  spawnBurstParticles(app, bounds.cx, bounds.cy, grew ? Math.min(16, movedGroup.pieceIds.length * 2 + 4) : 8, palette, {
    angleStart: -Math.PI * 0.95,
    angleRange: Math.PI * 1.9,
    speedMin: 60,
    speedMax: grew ? 170 : 130,
    gravity: 210,
    durationMin: 360,
    durationMax: 720,
    sizeMin: 2,
    sizeMax: grew ? 4.5 : 3.5
  });
  app.playFeedbackCue(grew ? 'merge' : 'improve', {
    hapticType: gameEngine.isComplete(app.gameState) ? '' : 'light'
  });
}

function playSuccessCelebration(app) {
  if (!app.boardRect) {
    return;
  }

  const board = app.boardRect;
  addSnapPulse(
    app,
    {
      x: board.x - 6,
      y: board.y - 6,
      w: board.w + 12,
      h: board.h + 12
    },
    'success',
    28
  );

  spawnBurstParticles(app, board.x + board.w * 0.28, board.y + board.h * 0.16, 18, ['173,255,247', '111,245,255', '255,244,204'], {
    angleStart: -Math.PI * 0.95,
    angleRange: Math.PI * 0.9,
    speedMin: 120,
    speedMax: 240,
    gravity: 220,
    durationMin: 820,
    durationMax: 1450,
    sizeMin: 2.5,
    sizeMax: 5.5
  });
  spawnBurstParticles(app, board.x + board.w * 0.72, board.y + board.h * 0.16, 18, ['173,255,247', '111,245,255', '255,225,132'], {
    angleStart: -Math.PI * 0.95,
    angleRange: Math.PI * 0.9,
    speedMin: 120,
    speedMax: 240,
    gravity: 220,
    durationMin: 820,
    durationMax: 1450,
    sizeMin: 2.5,
    sizeMax: 5.5
  });
  spawnBurstParticles(app, board.x + board.w * 0.5, board.y + board.h * 0.08, 14, ['255,225,132', '111,245,255', '224,255,255'], {
    angleStart: -Math.PI,
    angleRange: Math.PI,
    speedMin: 90,
    speedMax: 210,
    gravity: 210,
    durationMin: 900,
    durationMax: 1600,
    sizeMin: 2,
    sizeMax: 4.5
  });

  app.playFeedbackCue('success');
}

function updateAnimationEffects(app, delta) {
  const safeDelta = Math.max(0, delta || 0);

  if (app.settleAnimations.length) {
    app.settleAnimations = app.settleAnimations.filter((effect) => {
      effect.age += safeDelta;
      return effect.age < effect.duration;
    });
  }

  if (app.snapPulses.length) {
    app.snapPulses = app.snapPulses.filter((effect) => {
      effect.age += safeDelta;
      return effect.age < effect.duration;
    });
  }

  if (app.fxParticles.length) {
    const deltaSeconds = safeDelta / 1000;
    app.fxParticles = app.fxParticles.filter((particle) => {
      particle.age += safeDelta;
      particle.x += particle.vx * deltaSeconds;
      particle.y += particle.vy * deltaSeconds;
      particle.vy += particle.gravity * deltaSeconds;
      return particle.age < particle.duration;
    });
  }
}

function drawBoardEffects(app, helpers) {
  const { roundRectPath } = helpers;
  const ctx = app.ctx;

  app.snapPulses.forEach((effect) => {
    const progress = clamp(effect.age / effect.duration, 0, 1);
    const eased = 1 - (1 - progress) * (1 - progress);
    const alpha = 1 - progress;
    const expand = effect.expand * eased;
    const x = effect.x - expand;
    const y = effect.y - expand;
    const w = effect.w + expand * 2;
    const h = effect.h + expand * 2;

    ctx.save();
    ctx.shadowBlur = 14 + alpha * 16;
    ctx.shadowColor = `rgba(${effect.rgb}, ${effect.glow * alpha})`;
    ctx.lineWidth = 2 + alpha * 1.6;
    ctx.strokeStyle = `rgba(${effect.rgb}, ${0.95 * alpha})`;
    roundRectPath(ctx, x, y, w, h, effect.radius + expand * 0.22);
    ctx.stroke();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(${effect.rgb}, ${0.45 * alpha})`;
    roundRectPath(ctx, x - 4, y - 4, w + 8, h + 8, effect.radius + 6 + expand * 0.18);
    ctx.stroke();
    ctx.restore();
  });

  app.fxParticles.forEach((particle) => {
    const progress = clamp(particle.age / particle.duration, 0, 1);
    const alpha = particle.alpha * (1 - progress);
    const size = Math.max(0.8, particle.size * (1 - progress * 0.25));

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = `rgba(${particle.rgb}, ${alpha * 0.72})`;
    ctx.fillStyle = `rgba(${particle.rgb}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

module.exports = {
  startSettleAnimation,
  capturePieceSlotSnapshot,
  startPassiveSettleAnimations,
  getSettleEffect,
  getSettleOffset,
  drawSettleTrail,
  capturePuzzleFeedback,
  getGroupBounds,
  addSnapPulse,
  spawnBurstParticles,
  triggerMoveFeedback,
  playSuccessCelebration,
  updateAnimationEffects,
  drawBoardEffects
};
