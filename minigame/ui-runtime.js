function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function drawBackground(app) {
  const ctx = app.ctx;
  const gradient = ctx.createLinearGradient(0, 0, 0, app.viewHeight);
  gradient.addColorStop(0, '#04131f');
  gradient.addColorStop(0.45, '#0a2c3a');
  gradient.addColorStop(1, '#04111d');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, app.viewWidth, app.viewHeight);

  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#73f0ff';
  ctx.beginPath();
  ctx.arc(app.viewWidth * 0.18, 120, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2a96ff';
  ctx.beginPath();
  ctx.arc(app.viewWidth * 0.82, 220, 120, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawLoading(app, helpers) {
  const { drawText } = helpers;
  drawText(app.ctx, '谜境拼图', app.viewWidth / 2, app.viewHeight * 0.32, 34, '#e6fbff', 'center', 'bold');
  drawText(app.ctx, app.loadingText, app.viewWidth / 2, app.viewHeight * 0.44, 16, 'rgba(230,251,255,0.82)', 'center');
}

function getHomeHeroParallax(app) {
  const baseTime = Date.now() / 1000;
  const press = app.uiPressState && app.uiPressState.screen === 'home' && app.uiPressState.key === 'hero'
    ? app.uiPressState
    : null;
  const pressX = press ? press.tiltX * 8 : 0;
  const pressY = press ? press.tiltY * 6 : 0;

  return {
    imageX: Math.sin(baseTime * 0.42) * 5 + pressX,
    imageY: Math.cos(baseTime * 0.36) * 4 + pressY,
    orbX: Math.cos(baseTime * 0.34) * 14 + pressX * 1.5,
    orbY: Math.sin(baseTime * 0.28) * 10 + pressY * 1.2,
    orbX2: Math.sin(baseTime * 0.22) * 10 - pressX * 0.9,
    orbY2: Math.cos(baseTime * 0.31) * 8 - pressY * 0.7
  };
}

function triggerScreenMotion(app, screen) {
  app.screenMotion = {
    screen,
    startedAt: Date.now()
  };
}

function getScreenMotion(app, screen, staggerIndex) {
  const active = app.screenMotion && app.screenMotion.screen === screen ? app.screenMotion : null;
  const delay = Math.max(0, staggerIndex || 0) * 78;
  const age = active ? Math.max(0, Date.now() - active.startedAt - delay) : 9999;
  const enter = clamp(age / 420, 0, 1);
  const eased = 1 - Math.pow(1 - enter, 3);
  return {
    enter,
    eased,
    alpha: clamp(0.16 + eased * 0.84, 0, 1),
    offsetY: (1 - eased) * 14,
    glow: 0.45 + 0.55 * Math.sin(Date.now() / 620),
    floatY: Math.sin(Date.now() / 560) * 2.6
  };
}

function drawMotionMotes(app, screen, bounds, options) {
  if (!bounds) {
    return;
  }

  const nextOptions = options || {};
  const count = Math.max(1, nextOptions.count || 4);
  const tint = nextOptions.tint || '111,245,255';
  const alphaScale = typeof nextOptions.alphaScale === 'number' ? nextOptions.alphaScale : 0.2;
  const radiusBase = typeof nextOptions.radius === 'number' ? nextOptions.radius : 1.8;
  const seed = typeof nextOptions.seed === 'number' ? nextOptions.seed : 0;
  const motion = getScreenMotion(app, screen, seed);
  const time = Date.now() / 1000;
  const driftX = typeof nextOptions.driftX === 'number' ? nextOptions.driftX : 4;
  const driftY = typeof nextOptions.driftY === 'number' ? nextOptions.driftY : 6;
  const rise = typeof nextOptions.rise === 'number' ? nextOptions.rise : 8;
  const ctx = app.ctx;

  for (let index = 0; index < count; index += 1) {
    const anchorX = ((index * 37 + seed * 13) % 100) / 100;
    const anchorY = ((index * 29 + seed * 17) % 100) / 100;
    const phase = time * (0.6 + index * 0.08) + seed * 0.7 + index * 1.3;
    const x = bounds.x + bounds.w * anchorX + Math.sin(phase) * driftX;
    const y = bounds.y + bounds.h * anchorY + Math.cos(phase * 1.2) * driftY - (1 - motion.eased) * rise;
    const alpha = (0.08 + (Math.sin(phase * 1.8) * 0.5 + 0.5) * 0.14) * alphaScale * motion.alpha;
    const radius = radiusBase + (Math.sin(phase * 1.5) * 0.5 + 0.5) * 1.4;

    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = `rgba(${tint}, ${alpha * 1.6})`;
    ctx.fillStyle = `rgba(${tint}, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function isButtonPressed(app, button) {
  if (!button || !app.uiPressState) {
    return false;
  }
  return app.uiPressState.screen === app.screen && app.uiPressState.key === button.key;
}

function drawButton(app, button, primary, compact, helpers) {
  const { drawText, fillRoundRect } = helpers;
  const ctx = app.ctx;
  const pressed = isButtonPressed(app, button);
  const inset = pressed ? 1.5 : 0;
  const drawX = button.x + inset;
  const drawY = button.y + inset;
  const drawW = button.w - inset * 2;
  const drawH = button.h - inset * 2;
  ctx.save();
  ctx.shadowColor = pressed
    ? 'rgba(122, 244, 255, 0.34)'
    : primary
      ? 'rgba(79, 227, 255, 0.22)'
      : 'rgba(31, 71, 92, 0.18)';
  ctx.shadowBlur = pressed ? 28 : primary ? 24 : 14;
  fillRoundRect(
    ctx,
    drawX,
    drawY,
    drawW,
    drawH,
    compact ? 18 : 22,
    pressed
      ? primary
        ? 'rgba(79, 192, 209, 0.44)'
        : 'rgba(10, 37, 56, 0.68)'
      : primary
        ? 'rgba(57, 161, 177, 0.35)'
        : 'rgba(8, 29, 44, 0.52)',
    pressed
      ? 'rgba(168, 250, 255, 0.5)'
      : primary
        ? 'rgba(123, 247, 255, 0.42)'
        : 'rgba(142, 235, 255, 0.12)'
  );
  ctx.restore();
  drawText(
    ctx,
    button.label,
    button.x + button.w / 2,
    button.y + (compact ? (pressed ? 13 : 12) : pressed ? 16 : 15),
    compact ? 15 : 17,
    '#eafcff',
    'center',
    'bold'
  );
}

function drawScreenFade(app) {
  if (!app.screenMotion || app.screenMotion.screen !== app.screen) {
    return;
  }

  const motion = getScreenMotion(app, app.screen);
  if (motion.enter >= 1) {
    return;
  }

  const ctx = app.ctx;
  const alpha = (1 - motion.eased) * 0.28;
  ctx.save();
  ctx.fillStyle = `rgba(3, 12, 20, ${alpha})`;
  ctx.fillRect(0, 0, app.viewWidth, app.viewHeight);
  ctx.restore();
}

function drawToast(app, helpers) {
  const { drawText, fillRoundRect } = helpers;
  if (!app.toast) {
    return;
  }

  const ctx = app.ctx;
  const width = Math.min(app.viewWidth - 44, 280);
  const x = (app.viewWidth - width) / 2;
  const y = app.viewHeight - 168;
  fillRoundRect(ctx, x, y, width, 40, 20, 'rgba(6, 24, 36, 0.82)', 'rgba(124, 229, 245, 0.14)');
  drawText(ctx, app.toast.message, x + width / 2, y + 10, 14, '#effdff', 'center');
}

module.exports = {
  drawBackground,
  drawLoading,
  getHomeHeroParallax,
  triggerScreenMotion,
  getScreenMotion,
  drawMotionMotes,
  isButtonPressed,
  drawButton,
  drawScreenFade,
  drawToast
};
