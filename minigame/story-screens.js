const levelRepo = require('../services/level-repo');

function drawChainPath(ctx, buttons, themeColor) {
  const points = (buttons || [])
    .filter((button) => button && button.level)
    .map((button) => ({
      x: button.centerX || (button.x + button.w / 2),
      y: button.centerY || (button.y + button.h / 2)
    }));

  if (points.length < 2) {
    return;
  }

  ctx.save();
  ctx.strokeStyle = themeColor || 'rgba(115, 240, 255, 0.22)';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowBlur = 16;
  ctx.shadowColor = themeColor || 'rgba(115, 240, 255, 0.16)';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const next = points[index];
    const controlY = prev.y + (next.y - prev.y) / 2;
    ctx.bezierCurveTo(prev.x, controlY, next.x, controlY, next.x, next.y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawStoryHome(app, helpers) {
  const {
    drawText,
    drawParagraph,
    fillRoundRect,
    drawGlassCard,
    drawImageCover,
    roundRectPath,
    drawSettingsGearIcon,
    resolvePreviewImage,
    getSafeLevelTitle,
    getSafeChapterTitle,
    getChapterDifficultyConfig,
    getChapterDifficultyStars
  } = helpers;
  const ctx = app.ctx;
  const hero = app.homeMeta;
  const continueLevel = hero.continueLevel;
  const continueImage = app.getResolvedImage(resolvePreviewImage(continueLevel));
  const themeColor = (continueLevel && continueLevel.themeColor) || '#61d5e8';
  const chapters = levelRepo.getChaptersWithProgress(app.progress);
  const customCount = levelRepo.getCustomLevelsWithProgress(app.progress).length;
  const totalLevels = chapters.reduce((sum, item) => sum + item.levels.length, 0);
  const titleMotion = app.getScreenMotion('home');
  const heroParallax = app.getHomeHeroParallax();
  const activeDifficulty = continueLevel
    ? getChapterDifficultyConfig(getChapterDifficultyStars(app.profile, continueLevel.chapterId))
    : getChapterDifficultyConfig();
  const titleAlpha = titleMotion.alpha;
  const titleY = 36 + titleMotion.offsetY * 0.35 + titleMotion.floatY;
  const accentWidth = 86 + titleMotion.glow * 26;

  ctx.save();
  ctx.shadowColor = `rgba(115, 240, 255, ${0.18 + titleMotion.glow * 0.12})`;
  ctx.shadowBlur = 14 + titleMotion.glow * 14;
  drawText(ctx, '谜境拼图', app.viewWidth / 2, titleY, 34, `rgba(234,252,255,${titleAlpha})`, 'center', 'bold');
  ctx.restore();
  drawText(
    ctx,
    '拼回《倩女幽魂》的十六幕旧梦',
    app.viewWidth / 2,
    78 + titleMotion.offsetY * 0.25,
    14,
    `rgba(230,251,255,${0.54 + titleAlpha * 0.28})`,
    'center'
  );
  fillRoundRect(
    ctx,
    app.viewWidth / 2 - accentWidth / 2,
    104 + titleMotion.offsetY * 0.18,
    accentWidth,
    4,
    2,
    `rgba(115, 240, 255, ${0.24 + titleMotion.glow * 0.18})`
  );

  drawGlassCard(ctx, hero.heroX, hero.heroY, hero.heroW, hero.heroH, 28);
  ctx.save();
  roundRectPath(ctx, hero.heroX + 8, hero.heroY + 8, hero.heroW - 16, hero.heroH - 16, 22);
  ctx.clip();
  ctx.fillStyle = 'rgba(6, 24, 36, 0.36)';
  ctx.fillRect(hero.heroX + 8, hero.heroY + 8, hero.heroW - 16, hero.heroH - 16);
  ctx.fillStyle = `rgba(111,245,255,${0.08 + titleMotion.glow * 0.05})`;
  ctx.beginPath();
  ctx.arc(hero.heroX + hero.heroW * 0.72 + heroParallax.orbX, hero.heroY + hero.heroH * 0.26 + heroParallax.orbY, 64, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,228,163,0.06)';
  ctx.beginPath();
  ctx.arc(hero.heroX + hero.heroW * 0.3 + heroParallax.orbX2, hero.heroY + hero.heroH * 0.72 + heroParallax.orbY2, 46, 0, Math.PI * 2);
  ctx.fill();
  if (continueImage) {
    ctx.globalAlpha = 0.34 + titleAlpha * 0.66;
    drawImageCover(
      ctx,
      continueImage,
      hero.heroX + heroParallax.imageX,
      hero.heroY + heroParallax.imageY,
      hero.heroW,
      hero.heroH,
      24
    );
  }
  app.drawMotionMotes('home', { x: hero.heroX + 8, y: hero.heroY + 8, w: hero.heroW - 16, h: hero.heroH - 16 }, {
    count: 9,
    tint: '143,246,255',
    alphaScale: 0.9,
    radius: 1.3,
    seed: 2,
    driftX: 3.4,
    driftY: 5.2,
    rise: 7
  });
  ctx.restore();
  fillRoundRect(ctx, hero.heroX + 8, hero.heroY + 8, hero.heroW - 16, hero.heroH - 16, 22, 'rgba(2, 12, 20, 0.42)');

  fillRoundRect(ctx, hero.heroX + 18, hero.heroY + 18, 76, 22, 11, `${themeColor}33`, `${themeColor}88`);
  drawText(ctx, '当前谜卷', hero.heroX + 56, hero.heroY + 22, 11, '#e9ffff', 'center', 'bold');
  app.homeIconButtons.forEach((button) => {
    const pressed = app.isButtonPressed(button);
    const inset = pressed ? 2 : 0;
    const drawX = button.x + inset;
    const drawY = button.y + inset;
    const drawW = button.w - inset * 2;
    const drawH = button.h - inset * 2;
    const centerX = drawX + drawW / 2;
    const centerY = drawY + drawH / 2;

    ctx.save();
    if (pressed) {
      ctx.shadowBlur = 18;
      ctx.shadowColor = 'rgba(111,245,255,0.28)';
    }
    fillRoundRect(
      ctx,
      drawX,
      drawY,
      drawW,
      drawH,
      drawH / 2,
      pressed ? 'rgba(24, 78, 102, 0.76)' : 'rgba(8, 29, 44, 0.66)',
      pressed ? 'rgba(163,249,255,0.44)' : 'rgba(145, 235, 255, 0.16)'
    );
    ctx.restore();
    drawSettingsGearIcon(ctx, centerX, centerY, 8.6, '#eafcff');
  });

  drawText(
    ctx,
    continueLevel ? getSafeLevelTitle(continueLevel) : '等待开启《暴雨古道》',
    hero.heroX + 18,
    hero.heroY + 56,
    24,
    '#f3ffff',
    'left',
    'bold'
  );
  drawText(
    ctx,
    continueLevel ? getSafeChapterTitle(continueLevel) : '倩女幽魂 · 第一卷',
    hero.heroX + 18,
    hero.heroY + 92,
    14,
    'rgba(230,251,255,0.74)'
  );
  drawText(
    ctx,
    `体力 ${app.profile.energy}/${app.profile.maxEnergy} · 金币 ${app.profile.coins} · 自定义 ${customCount}`,
    hero.heroX + 18,
    hero.heroY + 118,
    13,
    'rgba(230,251,255,0.84)'
  );
  drawParagraph(
    ctx,
    continueLevel
      ? '继续拼回当前剧情，沿着兰若旧梦一路追到《白首焚稿》。'
      : '从《暴雨古道》入局，沿着十六幕图像一步步拼回完整旧梦。',
    hero.heroX + 18,
    hero.heroY + 144,
    hero.heroW - 36,
    13,
    'rgba(230,251,255,0.76)',
    20,
    2
  );

  const chipY = hero.heroY + hero.heroH - 42;
  const chipW = 94;
  const chipH = 30;
  const chipData = [
    {
      label: '主线',
      value: `${totalLevels} 回`,
      fill: 'rgba(111, 245, 255, 0.14)',
      stroke: 'rgba(145, 235, 255, 0.22)'
    },
    {
      label: '难度',
      value: `${activeDifficulty.stars}星 ${activeDifficulty.rows}x${activeDifficulty.cols}`,
      fill: 'rgba(255, 221, 118, 0.12)',
      stroke: 'rgba(255, 221, 118, 0.2)'
    },
    {
      label: '挑战分',
      value: `${app.profile.challengeScore || 0}`,
      fill: 'rgba(120, 255, 194, 0.12)',
      stroke: 'rgba(120, 255, 194, 0.2)'
    }
  ];

  chipData.forEach((item, index) => {
    const x = hero.heroX + 18 + index * 110;
    fillRoundRect(ctx, x, chipY, chipW, chipH, 12, item.fill, item.stroke);
    drawText(ctx, item.label, x + 12, chipY + 6, 10, 'rgba(230,251,255,0.58)', 'left');
    drawText(ctx, item.value, x + 12, chipY + 18, 12, '#dffcff', 'left', 'bold');
  });

  app.homeButtons.forEach((button) => app.drawButton(button, button.primary));
  if (app.homeMiniButtons.length) {
    const quickY = app.homeMiniButtons[0].y - 20;
    drawText(ctx, '快速入口', 24, quickY, 12, '#aef7ff', 'left', 'bold');
    drawText(
      ctx,
      `${chapters.length} 卷主线 · ${customCount} 个自定义谜境`,
      app.viewWidth - 24,
      quickY,
      11,
      'rgba(174,247,255,0.72)',
      'right'
    );
  }
  app.homeMiniButtons.forEach((button) => app.drawButton(button, false, true));
}

function drawStoryChapters(app, helpers) {
  const {
    drawText,
    drawParagraph,
    fillRoundRect,
    drawGlassCard,
    drawImageCover,
    roundRectPath,
    resolvePreviewImage,
    getSafeChapterTitle,
    getChapterSummary,
    getChapterCoverLevel
  } = helpers;
  const ctx = app.ctx;
  const titleMotion = app.getScreenMotion('chapters');
  const titleY = 38 + titleMotion.offsetY * 0.28 + titleMotion.floatY * 0.7;
  const titleAlpha = titleMotion.alpha;

  ctx.save();
  ctx.shadowColor = `rgba(115, 240, 255, ${0.16 + titleMotion.glow * 0.1})`;
  ctx.shadowBlur = 12 + titleMotion.glow * 10;
  drawText(ctx, '幽魂剧卷', app.viewWidth / 2, titleY, 32, `rgba(234,252,255,${titleAlpha})`, 'center', 'bold');
  ctx.restore();
  drawText(
    ctx,
    '这一卷只写兰若旧梦，自《暴雨古道》起，至《白首焚稿》终。',
    app.viewWidth / 2,
    78 + titleMotion.offsetY * 0.22,
    14,
    `rgba(230,251,255,${0.54 + titleAlpha * 0.26})`,
    'center'
  );
  fillRoundRect(
    ctx,
    app.viewWidth / 2 - 52,
    102 + titleMotion.offsetY * 0.18,
    104 + titleMotion.glow * 18,
    4,
    2,
    `rgba(115, 240, 255, ${0.22 + titleMotion.glow * 0.16})`
  );

  let cardIndex = 0;
  app.chapterButtons.forEach((button) => {
    if (button.key === 'back') {
      app.drawButton(Object.assign({ label: '返回首页' }, button), false, true);
      return;
    }

    const chapter = button.chapter;
    const coverLevel = getChapterCoverLevel(chapter);
    const coverSrc = resolvePreviewImage(coverLevel);
    const coverImage = app.getResolvedImage(coverSrc);
    const total = chapter.levels.length;
    const completed = chapter.completedCount || 0;
    const unlockedCount = chapter.levels.filter((item) => item.unlocked).length;
    const progress = total ? completed / total : 0;
    const progressWidth = Math.max(0, Math.floor((button.w - 140) * progress));
    const themeColor = (coverLevel && coverLevel.themeColor) || '#73f0ff';
    const reveal = app.getScreenMotion('chapters', cardIndex + 1);
    cardIndex += 1;

    drawGlassCard(ctx, button.x, button.y, button.w, button.h, 24);
    fillRoundRect(ctx, button.x + 10, button.y + 10, 88, button.h - 20, 18, 'rgba(6, 24, 36, 0.78)', 'rgba(142, 235, 255, 0.14)');
    if (coverImage) {
      const coverShift = (1 - reveal.eased) * 7;
      ctx.save();
      roundRectPath(ctx, button.x + 10, button.y + 10, 88, button.h - 20, 18);
      ctx.clip();
      ctx.globalAlpha = reveal.alpha;
      drawImageCover(ctx, coverImage, button.x + 8 - coverShift * 0.2, button.y + 10 + coverShift, 92, button.h - 16, 18);
      app.drawMotionMotes('chapters', { x: button.x + 10, y: button.y + 10, w: 88, h: button.h - 20 }, {
        count: 5,
        tint: coverLevel && coverLevel.themeColor ? '143,246,255' : '111,245,255',
        alphaScale: 0.9,
        radius: 1.4,
        seed: cardIndex,
        driftX: 2.6,
        driftY: 4.2,
        rise: 6
      });
      ctx.restore();
      fillRoundRect(ctx, button.x + 10, button.y + 10, 88, button.h - 20, 18, `rgba(3, 12, 22, ${0.34 - reveal.eased * 0.16})`);
    }

    fillRoundRect(ctx, button.x + 110, button.y + 14, 72, 22, 11, `${themeColor}33`, `${themeColor}88`);
    drawText(ctx, `${completed}/${total} 已揭卷`, button.x + 146, button.y + 18, 11, '#e9ffff', 'center', 'bold');
    drawText(ctx, getSafeChapterTitle(chapter), button.x + 110, button.y + 42, 20, '#f3ffff', 'left', 'bold');
    drawText(
      ctx,
      unlockedCount > 0 ? `可进入 ${unlockedCount}/${total}` : '尚未入局',
      button.x + button.w - 16,
      button.y + 44,
      12,
      unlockedCount > 0 ? '#aef7ff' : 'rgba(230,251,255,0.48)',
      'right'
    );
    drawParagraph(
      ctx,
      getChapterSummary(chapter),
      button.x + 110,
      button.y + 64,
      button.w - 126,
      12,
      'rgba(230,251,255,0.68)',
      17,
      1
    );

    const ctaW = 54;
    const ctaX = button.x + button.w - ctaW - 16;
    fillRoundRect(
      ctx,
      ctaX,
      button.y + button.h - 32,
      ctaW,
      18,
      9,
      unlockedCount > 0 ? 'rgba(76, 200, 219, 0.18)' : 'rgba(255,255,255,0.04)',
      unlockedCount > 0 ? 'rgba(143, 246, 255, 0.32)' : 'rgba(255,255,255,0.08)'
    );
    drawText(
      ctx,
      unlockedCount > 0 ? '翻开' : '待解锁',
      ctaX + ctaW / 2,
      button.y + button.h - 29,
      10,
      unlockedCount > 0 ? '#eaffff' : 'rgba(230,251,255,0.42)',
      'center',
      'bold'
    );

    fillRoundRect(ctx, button.x + 110, button.y + button.h - 18, button.w - 126, 6, 3, 'rgba(255,255,255,0.08)');
    if (progressWidth > 0) {
      fillRoundRect(ctx, button.x + 110, button.y + button.h - 18, progressWidth, 6, 3, themeColor);
    }

    const shareButton = app.chapterShareButtons.find((item) => item.chapterId === chapter.chapterId);
    if (shareButton) {
      fillRoundRect(
        ctx,
        shareButton.x,
        shareButton.y,
        shareButton.w,
        shareButton.h,
        11,
        'rgba(76, 200, 219, 0.16)',
        'rgba(143, 246, 255, 0.3)'
      );
      drawText(ctx, '转发', shareButton.x + shareButton.w / 2, shareButton.y + 5, 10, '#eaffff', 'center', 'bold');
    }
  });
}

function drawStoryLevels(app, helpers) {
  const {
    drawText,
    drawParagraph,
    fillRoundRect,
    drawGlassCard,
    drawImageCover,
    resolvePreviewImage,
    getSafeLevelTitle,
    getSafeChapterTitle,
    getChapterSummary,
    getChapterCoverLevel,
    getChapterDifficultyConfig
  } = helpers;
  const ctx = app.ctx;
  const chapter = app.selectedChapter;
  if (!chapter) {
    app.drawStoryChapters();
    return;
  }

  const coverLevel = getChapterCoverLevel(chapter);
  const coverSrc = resolvePreviewImage(coverLevel);
  const coverImage = app.getResolvedImage(coverSrc);
  const themeColor = (coverLevel && coverLevel.themeColor) || '#73f0ff';
  const total = chapter.levels.length;
  const completed = chapter.levels.filter((item) => item.completed).length;
  const selectedDifficulty = getChapterDifficultyConfig(chapter.difficultyStars);
  const titleMotion = app.getScreenMotion('levels');

  ctx.save();
  ctx.shadowColor = `rgba(115, 240, 255, ${0.16 + titleMotion.glow * 0.1})`;
  ctx.shadowBlur = 12 + titleMotion.glow * 10;
  drawText(
    ctx,
    getSafeChapterTitle(chapter),
    app.viewWidth / 2,
    34 + titleMotion.offsetY * 0.22 + titleMotion.floatY * 0.5,
    30,
    `rgba(234,252,255,${titleMotion.alpha})`,
    'center',
    'bold'
  );
  ctx.restore();
  drawText(
    ctx,
    '沿着链路逐回进入场景，逐步拼回谜境世界的完整轮廓。',
    app.viewWidth / 2,
    70 + titleMotion.offsetY * 0.18,
    14,
    `rgba(230,251,255,${0.54 + titleMotion.alpha * 0.26})`,
    'center'
  );

  if (app.overlay && app.overlay.type === 'chapter') {
    app.drawOverlay();
    return;
  }

  const headerY = 102 + titleMotion.offsetY * 0.35;
  ctx.save();
  ctx.globalAlpha = titleMotion.alpha;
  drawGlassCard(ctx, 18, headerY, app.viewWidth - 36, 74, 24);
  if (coverImage) {
    drawImageCover(ctx, coverImage, 26, headerY + 8, 94, 58, 16);
    app.drawMotionMotes('levels', { x: 26, y: headerY + 8, w: 94, h: 58 }, {
      count: 6,
      tint: '111,245,255',
      alphaScale: 0.88,
      radius: 1.5,
      seed: 1,
      driftX: 2.8,
      driftY: 4.6,
      rise: 7
    });
    fillRoundRect(ctx, 26, headerY + 8, 94, 58, 16, 'rgba(3, 12, 22, 0.16)');
  } else {
    fillRoundRect(ctx, 26, headerY + 8, 94, 58, 16, 'rgba(6, 24, 36, 0.78)', 'rgba(142, 235, 255, 0.14)');
  }

  drawParagraph(ctx, getChapterSummary(chapter), 132, headerY + 12, app.viewWidth - 160, 13, 'rgba(230,251,255,0.78)', 18, 2);
  fillRoundRect(ctx, 132, headerY + 42, 92, 20, 10, `${themeColor}33`, `${themeColor}88`);
  drawText(ctx, `已完成 ${completed}/${total}`, 178, headerY + 46, 11, '#e9ffff', 'center', 'bold');
  drawText(
    ctx,
    `${selectedDifficulty.stars} 星 · ${selectedDifficulty.rows}x${selectedDifficulty.cols}`,
    app.viewWidth - 28,
    headerY + 46,
    11,
    'rgba(230,251,255,0.68)',
    'right'
  );

  app.levelShareButton = {
    key: 'share-chapter',
    x: app.viewWidth - 84,
    y: headerY + 12,
    w: 48,
    h: 20
  };
  fillRoundRect(
    ctx,
    app.levelShareButton.x,
    app.levelShareButton.y,
    app.levelShareButton.w,
    app.levelShareButton.h,
    10,
    'rgba(76, 200, 219, 0.18)',
    'rgba(143, 246, 255, 0.42)'
  );
  drawText(ctx, '转发', app.levelShareButton.x + app.levelShareButton.w / 2, app.levelShareButton.y + 4, 10, '#eaffff', 'center', 'bold');
  ctx.restore();

  const difficultyTitleY = app.chapterDifficultyButtons.length > 0
    ? app.chapterDifficultyButtons[0].y - 14
    : 176;
  drawText(ctx, '章节难度', 26, difficultyTitleY, 11, 'rgba(230,251,255,0.58)', 'left', 'bold');
  app.chapterDifficultyButtons.forEach((button) => {
    app.drawButton(button, button.stars === selectedDifficulty.stars, true);
  });

  drawChainPath(ctx, app.levelButtons, 'rgba(115, 240, 255, 0.22)');

  let rowIndex = 0;
  app.levelButtons.forEach((button) => {
    if (button.key === 'back') {
      app.drawButton(Object.assign({ label: '返回章节' }, button), false, true);
      return;
    }

    if (!app.isRectVisible(button.y, button.h, 120)) {
      return;
    }

    const level = button.level;
    const locked = !level.unlocked;
    const done = !!level.completed;
    const previewSrc = resolvePreviewImage(level);
    const previewImage = app.getResolvedImage(previewSrc);
    const reveal = app.getScreenMotion('levels', rowIndex + 1);
    const thumbPressed = !!(
      app.uiPressState &&
      app.uiPressState.screen === 'levels' &&
      app.uiPressState.key === button.key
    );
    rowIndex += 1;

    const rowY = button.y + reveal.offsetY * 0.72;
    const thumbInset = thumbPressed ? 2 : 0;
    const thumbX = button.x + 8 + thumbInset;
    const thumbY = rowY + 8 + thumbInset;
    const thumbW = button.w - 16 - thumbInset * 2;
    const thumbH = 72 - thumbInset * 2;
    const accentStroke = done
      ? 'rgba(185, 255, 217, 0.36)'
      : locked
        ? 'rgba(255,255,255,0.08)'
        : `${themeColor}66`;

    ctx.save();
    ctx.globalAlpha = reveal.alpha;
    ctx.shadowBlur = thumbPressed ? 20 : 10;
    ctx.shadowColor = thumbPressed ? 'rgba(111,245,255,0.28)' : 'rgba(11, 30, 46, 0.18)';
    fillRoundRect(
      ctx,
      button.x,
      rowY,
      button.w,
      button.h,
      24,
      locked ? 'rgba(7, 20, 31, 0.42)' : 'rgba(11, 30, 46, 0.62)',
      accentStroke
    );
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = reveal.alpha;

    fillRoundRect(
      ctx,
      button.centerX - 11,
      rowY - 16,
      22,
      22,
      11,
      locked ? 'rgba(255,255,255,0.08)' : `${themeColor}30`,
      locked ? 'rgba(255,255,255,0.1)' : `${themeColor}aa`
    );
    drawText(ctx, `${rowIndex}`.padStart(2, '0'), button.centerX, rowY - 12, 10, '#eaffff', 'center', 'bold');

    if (thumbPressed) {
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.shadowColor = 'rgba(111,245,255,0.26)';
      fillRoundRect(
        ctx,
        thumbX - 1,
        thumbY - 1,
        thumbW + 2,
        thumbH + 2,
        16,
        'rgba(9, 30, 45, 0.68)',
        'rgba(150,248,255,0.4)'
      );
      ctx.restore();
    }

    fillRoundRect(
      ctx,
      thumbX,
      thumbY,
      thumbW,
      thumbH,
      16,
      'rgba(6, 24, 36, 0.78)',
      thumbPressed ? 'rgba(163,249,255,0.42)' : 'rgba(142, 235, 255, 0.12)'
    );
    if (previewImage) {
      drawImageCover(ctx, previewImage, thumbX, thumbY, thumbW, thumbH, 16);
      app.drawMotionMotes('levels', { x: thumbX, y: thumbY, w: thumbW, h: thumbH }, {
        count: 3,
        tint: done ? '185,255,217' : '111,245,255',
        alphaScale: locked ? 0.3 : 0.6,
        radius: 1.1,
        seed: rowIndex + 2,
        driftX: 1.8,
        driftY: 2.8,
        rise: 5
      });
      fillRoundRect(
        ctx,
        thumbX,
        thumbY,
        thumbW,
        thumbH,
        16,
        thumbPressed
          ? 'rgba(150,248,255,0.1)'
          : locked
            ? 'rgba(2, 8, 14, 0.42)'
            : 'rgba(3, 12, 22, 0.18)'
      );
    } else {
      fillRoundRect(ctx, thumbX, thumbY, thumbW, thumbH, 16, 'rgba(6, 24, 36, 0.78)', 'rgba(142, 235, 255, 0.12)');
    }

    fillRoundRect(
      ctx,
      thumbX + 8,
      thumbY + 8,
      56,
      18,
      9,
      done ? 'rgba(120,255,194,0.18)' : `${themeColor}33`,
      done ? 'rgba(120,255,194,0.28)' : `${themeColor}88`
    );
    drawText(ctx, `第 ${String(rowIndex).padStart(2, '0')} 回`, thumbX + 36, thumbY + 11, 10, '#f3ffff', 'center', 'bold');

    drawText(
      ctx,
      getSafeLevelTitle(level),
      button.x + 12,
      rowY + 88,
      15,
      locked ? 'rgba(230,251,255,0.42)' : '#f3ffff',
      'left',
      'bold'
    );
    drawText(
      ctx,
      `${level.rows}x${level.cols} · ${level.timeLimit}s · 体力${level.energyCost}`,
      button.x + 12,
      rowY + 108,
      10,
      locked ? 'rgba(230,251,255,0.3)' : 'rgba(230,251,255,0.62)'
    );

    let statusText = '点击进入';
    let statusColor = '#aef7ff';
    if (locked) {
      statusText = '未解锁';
      statusColor = 'rgba(230,251,255,0.42)';
    } else if (done) {
      statusText = `已完成 · 评级 ${level.stars || 0} 星`;
      statusColor = '#b9ffd9';
    }

    drawText(ctx, statusText, button.x + 12, rowY + button.h - 23, 10, statusColor, 'left');
    fillRoundRect(
      ctx,
      button.x + button.w - 84,
      rowY + button.h - 30,
      72,
      18,
      9,
      locked ? 'rgba(255,255,255,0.05)' : `${themeColor}22`,
      locked ? 'rgba(255,255,255,0.08)' : `${themeColor}55`
    );
    drawText(
      ctx,
      done ? '已拼合' : locked ? '待入局' : '可挑战',
      button.x + button.w - 48,
      rowY + button.h - 27,
      10,
      '#eaffff',
      'center'
    );
    ctx.restore();
  });
}

module.exports = {
  drawStoryHome,
  drawStoryChapters,
  drawStoryLevels
};
