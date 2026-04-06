const adService = require('../services/ad');
const logger = require('../services/logger');
const {
  CHAPTER_DIFFICULTY_OPTIONS,
  getChapterDifficultyConfig,
  getChapterDifficultyStars
} = require('../services/challenge');
const storage = require('../utils/storage');

function closeOverlay(app) {
  app.overlay = null;
  app.overlayButtons = [];
}

function getChapterOverlayMetrics(app) {
  const cardX = 18;
  const cardW = app.viewWidth - 36;
  const cardH = 360;
  const cardY = Math.max(118, Math.floor((app.viewHeight - cardH) / 2));
  const innerX = cardX + 14;
  const innerW = cardW - 28;
  const chipW = Math.floor((cardW - 48) / 3);
  const chipY = cardY + 196;
  const difficultyY = cardY + 252;

  return {
    cardX,
    cardY,
    cardW,
    cardH,
    innerX,
    innerW,
    chipW,
    chipY,
    difficultyY
  };
}

function getSuccessOverlayMetrics(app) {
  const isStory = app.overlay && app.overlay.type === 'success' && app.overlay.storyPhase === 'story';
  const cardX = 18;
  const cardW = app.viewWidth - 36;
  const cardH = isStory ? 252 : 214;
  const cardY = app.viewHeight - cardH - 24;
  const innerX = cardX + 14;
  const innerW = cardW - 28;
  const chipY = cardY + (isStory ? 148 : 112);

  return {
    isStory,
    cardX,
    cardY,
    cardW,
    cardH,
    innerX,
    innerW,
    chipY,
    chipW: Math.floor((cardW - 48) / 3)
  };
}

function buildLinearOverlayButtons(app, layout) {
  const { innerX, innerW, cardY, cardH } = layout;
  const buttonGap = 12;
  const count = app.overlay.buttons.length;
  const buttonW = count === 1 ? innerW : Math.floor((innerW - buttonGap) / 2);
  const y = cardY + cardH - 62;

  app.overlayButtons = app.overlay.buttons.map((item, index) => ({
    key: item.key,
    label: item.label,
    x: innerX + (count === 1 ? 0 : index * (buttonW + buttonGap)),
    y,
    w: buttonW,
    h: 48
  }));
}

function buildPrimarySecondaryOverlayButtons(app, layout) {
  const { innerX, innerW, cardY, cardH } = layout;
  const buttonGap = 12;
  const secondaryW = Math.min(124, Math.max(104, Math.floor(innerW * 0.32)));
  const primaryW = innerW - secondaryW - buttonGap;
  const y = cardY + cardH - 62;

  app.overlayButtons = app.overlay.buttons.map((item, index) => ({
    key: item.key,
    label: item.label,
    x: index === 0 ? innerX : innerX + primaryW + buttonGap,
    y,
    w: index === 0 ? primaryW : secondaryW,
    h: 48
  }));
}

function buildSuccessOverlayButtons(app) {
  buildPrimarySecondaryOverlayButtons(app, getSuccessOverlayMetrics(app));
}

function buildIntroOverlayButtons(app) {
  const cardX = 18;
  const cardW = app.viewWidth - 36;
  const cardH = 244;
  const cardY = app.viewHeight - cardH - 24;
  const innerX = cardX + 14;
  const innerW = cardW - 28;

  buildPrimarySecondaryOverlayButtons(app, {
    innerX,
    innerW,
    cardY,
    cardH
  });
}

function buildOverlayButtons(app) {
  if (!app.overlay) {
    app.overlayButtons = [];
    return;
  }

  if (app.overlay.type === 'success') {
    buildSuccessOverlayButtons(app);
    return;
  }

  if (app.overlay.type === 'intro') {
    buildIntroOverlayButtons(app);
    return;
  }

  if (app.overlay.type === 'chapter') {
    buildChapterOverlayButtons(app);
    return;
  }

  const cardX = 18;
  const cardW = app.viewWidth - 36;
  const cardH = app.overlay.type === 'success' ? 214 : 232;
  const cardY = app.viewHeight - cardH - 24;
  const innerX = cardX + 14;
  const innerW = cardW - 28;
  const buttonGap = 12;

  if (app.overlay.buttons.length === 2) {
    buildPrimarySecondaryOverlayButtons(app, { innerX, innerW, cardY, cardH });
    return;
  }

  if (app.overlay.buttons.length < 2) {
    buildLinearOverlayButtons(app, { innerX, innerW, cardY, cardH });
    return;
  }

  const halfW = Math.floor((innerW - buttonGap) / 2);
  const topY = cardY + cardH - 122;
  const bottomY = cardY + cardH - 62;
  app.overlayButtons = [
    {
      key: app.overlay.buttons[1].key,
      label: app.overlay.buttons[1].label,
      x: innerX,
      y: topY,
      w: halfW,
      h: 42
    },
    {
      key: app.overlay.buttons[2].key,
      label: app.overlay.buttons[2].label,
      x: innerX + halfW + buttonGap,
      y: topY,
      w: halfW,
      h: 42
    },
    {
      key: app.overlay.buttons[0].key,
      label: app.overlay.buttons[0].label,
      x: innerX,
      y: bottomY,
      w: innerW,
      h: 48
    }
  ];
}

function activateSuccessStoryOverlay(app) {
  if (!app.overlay || app.overlay.type !== 'success') {
    return;
  }

  const storyText = (app.currentLevel && app.currentLevel.outroText) || '';
  if (!storyText || app.overlay.storyPhase === 'story') {
    return;
  }

  app.overlay.storyPhase = 'story';
  app.overlay.title = '这一回故事';
  app.overlay.desc = storyText;
  app.overlay.buttons = [
    { key: 'next', label: app.successResult && app.successResult.nextLevelId ? '进入下一回' : '返回首页' },
    { key: 'home', label: '留在主界面' }
  ];
  buildOverlayButtons(app);
  logger.trackEvent('minigame_story_revealed', {
    levelId: app.currentLevel && app.currentLevel.levelId
  });
}

function buildChapterOverlayButtons(app) {
  const metrics = getChapterOverlayMetrics(app);
  const { cardY, cardH, innerX, innerW, difficultyY } = metrics;
  const buttonGap = 12;
  const count = app.overlay.buttons.length;
  const buttonW = count === 1 ? innerW : Math.floor((innerW - buttonGap) / 2);
  const y = cardY + cardH - 62;
  const difficultyGap = 10;
  const difficultyW = Math.floor((innerW - difficultyGap * 2) / 3);
  const selectedStars = getChapterDifficultyStars(
    app.profile,
    app.selectedChapter && app.selectedChapter.chapterId
  );

  app.chapterOverlayDifficultyButtons = CHAPTER_DIFFICULTY_OPTIONS.map((item, index) => ({
    key: `chapter-overlay-difficulty-${item.stars}`,
    stars: item.stars,
    label: item.label,
    x: innerX + index * (difficultyW + difficultyGap),
    y: difficultyY,
    w: difficultyW,
    h: 34,
    active: item.stars === selectedStars
  }));

  if (count === 2) {
    buildPrimarySecondaryOverlayButtons(app, { innerX, innerW, cardY, cardH });
    return;
  }

  app.overlayButtons = app.overlay.buttons.map((item, index) => ({
    key: item.key,
    label: item.label,
    x: innerX + (count === 1 ? 0 : index * (buttonW + buttonGap)),
    y,
    w: buttonW,
    h: 48
  }));
}

function openChapterOverlay(app, chapter, helpers) {
  const { getChapterSummary, getSafeChapterTitle } = helpers;
  if (!chapter) {
    app.overlay = null;
    app.overlayButtons = [];
    return;
  }

  app.overlay = {
    type: 'chapter',
    title: getSafeChapterTitle(chapter),
    desc: getChapterSummary(chapter),
    chapterId: chapter.chapterId,
    buttons: [
      { key: 'start', label: '开始挑战' },
      { key: 'back', label: '返回章节' }
    ]
  };
  buildOverlayButtons(app);
  logger.trackEvent('minigame_chapter_overlay_show', {
    chapterId: chapter.chapterId
  });
}

function drawChapterNarrativeOverlay(app, helpers) {
  const {
    drawGlassCard,
    drawImageCover,
    drawParagraph,
    drawText,
    fillRoundRect,
    getChapterCoverLevel,
    getSafeChapterTitle,
    resolvePreviewImage
  } = helpers;
  const ctx = app.ctx;
  const chapter = app.selectedChapter;
  const total = chapter ? chapter.levels.length : 0;
  const completed = chapter ? chapter.levels.filter((item) => item.completed).length : 0;
  const coverLevel = getChapterCoverLevel(chapter);
  const coverImage = app.getResolvedImage(resolvePreviewImage(coverLevel));
  const metrics = getChapterOverlayMetrics(app);
  const { cardX, cardY, cardW, cardH, chipW, chipY, difficultyY } = metrics;
  const difficultyStars = getChapterDifficultyStars(
    app.profile,
    chapter && chapter.chapterId
  );
  const difficultyConfig = getChapterDifficultyConfig(difficultyStars);

  ctx.save();
  ctx.fillStyle = 'rgba(1, 9, 16, 0.62)';
  ctx.fillRect(0, 0, app.viewWidth, app.viewHeight);
  ctx.restore();

  drawGlassCard(ctx, cardX, cardY, cardW, cardH, 28);
  fillRoundRect(ctx, cardX + 16, cardY + 16, 108, 22, 11, 'rgba(143, 246, 255, 0.22)', 'rgba(143, 246, 255, 0.55)');
  drawText(ctx, '章节概览', cardX + 70, cardY + 20, 11, '#eaffff', 'center', 'bold');

  if (coverImage) {
    drawImageCover(ctx, coverImage, cardX + 16, cardY + 48, 100, 92, 18);
    fillRoundRect(ctx, cardX + 16, cardY + 48, 100, 92, 18, 'rgba(3, 12, 22, 0.16)');
  } else {
    fillRoundRect(ctx, cardX + 16, cardY + 48, 100, 92, 18, 'rgba(6, 24, 36, 0.78)', 'rgba(142, 235, 255, 0.14)');
  }

  drawText(
    ctx,
    app.overlay.title || (chapter ? getSafeChapterTitle(chapter) : '章节概览'),
    cardX + 132,
    cardY + 52,
    22,
    '#f3fdff',
    'left',
    'bold'
  );
  drawParagraph(ctx, app.overlay.desc || '', cardX + 132, cardY + 84, cardW - 148, 14, 'rgba(230,251,255,0.82)', 20, 3);

  const chips = [
    { label: '总回目', value: `${total} 回` },
    { label: '已揭卷', value: `${completed}/${total}` },
    { label: '挑战规格', value: `${difficultyConfig.rows}x${difficultyConfig.cols}` }
  ];

  chips.forEach((chip, index) => {
    const x = cardX + 12 + index * (chipW + 6);
    fillRoundRect(ctx, x, chipY, chipW, 34, 14, 'rgba(7, 24, 36, 0.72)', 'rgba(124, 229, 245, 0.12)');
    drawText(ctx, chip.label, x + 12, chipY + 8, 10, 'rgba(230,251,255,0.58)', 'left');
    drawText(ctx, chip.value, x + 12, chipY + 20, 14, '#b9fff7', 'left', 'bold');
  });

  buildChapterOverlayButtons(app);
  fillRoundRect(
    ctx,
    cardX + 16,
    difficultyY - 24,
    cardW - 32,
    18,
    9,
    'rgba(8, 29, 44, 0.42)',
    'rgba(145, 235, 255, 0.08)'
  );
  drawText(ctx, '选择本章挑战规格', cardX + 28, difficultyY - 21, 11, 'rgba(230,251,255,0.62)', 'left');
  app.chapterOverlayDifficultyButtons.forEach((button) => {
    app.drawButton(button, button.stars === difficultyStars, true);
  });
  app.overlayButtons.forEach((button, index) => app.drawButton(button, index === 0, index !== 0));
}

function drawOverlay(app, helpers) {
  const {
    drawGlassCard,
    drawParagraph,
    drawText,
    fillRoundRect,
    formatTime
  } = helpers;
  const ctx = app.ctx;
  if (app.overlay && app.overlay.type === 'success') {
    app.drawSuccessNarrativeOverlay();
    return;
  }
  app.successShareButton = null;
  if (app.overlay && app.overlay.type === 'intro') {
    app.drawIntroNarrativeOverlay();
    return;
  }
  if (app.overlay && app.overlay.type === 'chapter') {
    app.drawChapterNarrativeOverlay();
    return;
  }
  const isSuccess = app.overlay.type === 'success';
  const isIntro = app.overlay.type === 'intro';
  const cardX = 18;
  const cardW = app.viewWidth - 36;
  const cardH = isSuccess ? 214 : 232;
  const cardY = app.viewHeight - cardH - 24;
  const accent = isSuccess ? '#8ff6ff' : isIntro ? '#8ff6ff' : '#ffd38e';
  const title = isSuccess ? '谜境已经拼合' : '谜境暂未揭晓';
  const desc = isSuccess
    ? '完整画面已经浮现。你可以先停在这一刻欣赏原图，再决定是否继续进入下一段谜境。'
    : app.gameState.revived
      ? '这一次复活机会已经用过了。你可以整理思路重新入局，或者先回到首页。'
      : '距离揭晓只差一点。可以用一次复活多争取 15 秒，也可以重新整理这局谜境。';
  const pieces = Object.values(app.gameState.pieces || {});
  const lockedCount = pieces.filter((piece) => piece.locked).length;
  const chipY = cardY + (isSuccess ? 112 : 120);
  const chipW = Math.floor((cardW - 48) / 3);

  ctx.save();
  ctx.fillStyle = 'rgba(1, 9, 16, 0.42)';
  ctx.fillRect(0, 0, app.viewWidth, app.viewHeight);
  ctx.restore();

  drawGlassCard(ctx, cardX, cardY, cardW, cardH, 28);
  fillRoundRect(ctx, cardX + 16, cardY + 16, 96, 22, 11, `${accent}22`, `${accent}55`);
  drawText(ctx, isSuccess ? '拼合完成' : '线索中断', cardX + 64, cardY + 20, 11, '#eaffff', 'center', 'bold');
  drawText(ctx, title, cardX + 16, cardY + 48, 24, '#f3fdff', 'left', 'bold');
  drawParagraph(ctx, desc, cardX + 16, cardY + 80, cardW - 32, 14, 'rgba(230,251,255,0.8)', 20, 2);

  const chips = isSuccess
    ? [
        { label: '金币奖励', value: `+${(app.successResult && app.successResult.rewards.coins) || 0}` },
        { label: '谜境评级', value: `${(app.successResult && app.successResult.rewards.stars) || 0} 星` },
        { label: '剩余时间', value: formatTime(app.timeLeft) }
      ]
    : [
        { label: '当前步数', value: `${app.gameState.moves}` },
        { label: '已定格', value: `${lockedCount} 块` },
        { label: '复活状态', value: app.gameState.revived ? '已用过' : '可使用' }
      ];

  chips.forEach((chip, index) => {
    const x = cardX + 12 + index * (chipW + 6);
    fillRoundRect(ctx, x, chipY, chipW, 34, 14, 'rgba(7, 24, 36, 0.72)', 'rgba(124, 229, 245, 0.12)');
    drawText(ctx, chip.label, x + 12, chipY + 8, 10, 'rgba(230,251,255,0.58)', 'left');
    drawText(ctx, chip.value, x + 12, chipY + 20, 14, isSuccess ? '#b9fff7' : '#ffe0a8', 'left', 'bold');
  });

  buildOverlayButtons(app);
  app.overlayButtons.forEach((button, index) => app.drawButton(button, index === 0, index !== 0));
}

function drawSuccessNarrativeOverlay(app, helpers) {
  const {
    drawGlassCard,
    drawParagraph,
    drawText,
    fillRoundRect,
    formatTime,
    getSafeLevelTitle
  } = helpers;
  const ctx = app.ctx;
  const metrics = getSuccessOverlayMetrics(app);
  const title = app.overlay.title || '谜境已经拼合';
  const desc = app.overlay.desc || '完整画面已经回到眼前。';
  const shareAction = app.getSuccessShareAction();
  const chips = metrics.isStory
    ? [
        { label: '故事场景', value: (app.currentLevel && app.currentLevel.sceneName) || getSafeLevelTitle(app.currentLevel) },
        { label: '线索标签', value: (app.currentLevel && app.currentLevel.clueTag) || '剧情' },
        { label: '剩余时间', value: formatTime(app.timeLeft) }
      ]
    : [
        { label: '金币奖励', value: `+${(app.successResult && app.successResult.rewards.coins) || 0}` },
        { label: '挑战得分', value: `+${(app.successResult && app.successResult.rewards.challengeScore) || 0}` },
        { label: '总挑战分', value: `${(app.successResult && app.successResult.rewards.totalChallengeScore) || (app.profile.challengeScore || 0)}` }
      ];

  ctx.save();
  ctx.fillStyle = 'rgba(1, 9, 16, 0.42)';
  ctx.fillRect(0, 0, app.viewWidth, app.viewHeight);
  ctx.restore();

  drawGlassCard(ctx, metrics.cardX, metrics.cardY, metrics.cardW, metrics.cardH, 28);
  fillRoundRect(ctx, metrics.cardX + 16, metrics.cardY + 16, 108, 22, 11, 'rgba(143, 246, 255, 0.22)', 'rgba(143, 246, 255, 0.55)');
  drawText(ctx, metrics.isStory ? '剧情揭晓' : '拼合完成', metrics.cardX + 70, metrics.cardY + 20, 11, '#eaffff', 'center', 'bold');
  app.successShareButton = null;
  if (shareAction) {
    const shareW = shareAction.label === '谜境码' ? 68 : 60;
    const shareX = metrics.cardX + metrics.cardW - shareW - 16;
    const shareY = metrics.cardY + 16;
    fillRoundRect(ctx, shareX, shareY, shareW, 22, 11, 'rgba(76, 200, 219, 0.18)', 'rgba(143, 246, 255, 0.45)');
    drawText(ctx, shareAction.label, shareX + shareW / 2, shareY + 4, 11, '#eaffff', 'center', 'bold');
    app.successShareButton = {
      key: shareAction.key,
      x: shareX,
      y: shareY,
      w: shareW,
      h: 22
    };
  }
  drawText(ctx, title, metrics.cardX + 16, metrics.cardY + 48, 24, '#f3fdff', 'left', 'bold');
  drawParagraph(ctx, desc, metrics.cardX + 16, metrics.cardY + 80, metrics.cardW - 32, 14, 'rgba(230,251,255,0.82)', 20, metrics.isStory ? 3 : 2);

  chips.forEach((chip, index) => {
    const x = metrics.cardX + 12 + index * (metrics.chipW + 6);
    fillRoundRect(ctx, x, metrics.chipY, metrics.chipW, 34, 14, 'rgba(7, 24, 36, 0.72)', 'rgba(124, 229, 245, 0.12)');
    drawText(ctx, chip.label, x + 12, metrics.chipY + 8, 10, 'rgba(230,251,255,0.58)', 'left');
    drawText(ctx, chip.value, x + 12, metrics.chipY + 20, 14, metrics.isStory ? '#f7e6b0' : '#b9fff7', 'left', 'bold');
  });

  buildOverlayButtons(app);
  app.overlayButtons.forEach((button, index) => app.drawButton(button, index === 0, index !== 0));
}

function drawIntroNarrativeOverlay(app, helpers) {
  const {
    drawGlassCard,
    drawParagraph,
    drawText,
    fillRoundRect,
    formatTime,
    getSafeLevelTitle
  } = helpers;
  const ctx = app.ctx;
  const cardX = 18;
  const cardW = app.viewWidth - 36;
  const cardH = 244;
  const cardY = app.viewHeight - cardH - 24;
  const chipW = Math.floor((cardW - 48) / 3);
  const chipY = cardY + 146;

  ctx.save();
  ctx.fillStyle = 'rgba(1, 9, 16, 0.42)';
  ctx.fillRect(0, 0, app.viewWidth, app.viewHeight);
  ctx.restore();

  drawGlassCard(ctx, cardX, cardY, cardW, cardH, 28);
  fillRoundRect(ctx, cardX + 16, cardY + 16, 108, 22, 11, 'rgba(143, 246, 255, 0.22)', 'rgba(143, 246, 255, 0.55)');
  drawText(ctx, '剧情开场', cardX + 70, cardY + 20, 11, '#eaffff', 'center', 'bold');
  drawText(ctx, app.overlay.title || '这一回开场', cardX + 16, cardY + 48, 24, '#f3fdff', 'left', 'bold');
  drawParagraph(ctx, app.overlay.desc || '', cardX + 16, cardY + 80, cardW - 32, 14, 'rgba(230,251,255,0.82)', 20, 3);

  const chips = [
    { label: '当前回目', value: getSafeLevelTitle(app.currentLevel) },
    { label: '线索标签', value: app.currentLevel.clueTag || '剧情' },
    { label: '倒计时', value: formatTime(app.timeLeft) }
  ];

  chips.forEach((chip, index) => {
    const x = cardX + 12 + index * (chipW + 6);
    fillRoundRect(ctx, x, chipY, chipW, 34, 14, 'rgba(7, 24, 36, 0.72)', 'rgba(124, 229, 245, 0.12)');
    drawText(ctx, chip.label, x + 12, chipY + 8, 10, 'rgba(230,251,255,0.58)', 'left');
    drawText(ctx, chip.value, x + 12, chipY + 20, 14, '#b9fff7', 'left', 'bold');
  });

  buildOverlayButtons(app);
  app.overlayButtons.forEach((button, index) => app.drawButton(button, index === 0, index !== 0));
}

function handleOverlayTap(app, x, y, helpers) {
  const { hitButton } = helpers;
  if (app.overlay && app.overlay.type === 'success' && hitButton(app.successShareButton, x, y)) {
    app.handleSuccessShareAction();
    return;
  }

  if (app.overlay && app.overlay.type === 'chapter') {
    const difficultyButton = app.chapterOverlayDifficultyButtons.find((item) => hitButton(item, x, y));
    if (difficultyButton) {
      app.updateSelectedChapterDifficulty(difficultyButton.stars);
      buildChapterOverlayButtons(app);
      return;
    }
  }

  const button = app.overlayButtons.find((item) => hitButton(item, x, y));
  if (!button) {
    return;
  }

  if (app.overlay.type === 'intro') {
    if (button.key === 'start') {
      logger.trackEvent('minigame_intro_confirm', {
        levelId: app.currentLevel && app.currentLevel.levelId
      });
      closeOverlay(app);
      return;
    }

    if (button.key === 'home') {
      app.switchToHome();
    }
    return;
  }

  if (app.overlay.type === 'chapter') {
    if (button.key === 'start') {
      logger.trackEvent('minigame_chapter_overlay_confirm', {
        chapterId: app.selectedChapter && app.selectedChapter.chapterId,
        difficultyStars: getChapterDifficultyStars(
          app.profile,
          app.selectedChapter && app.selectedChapter.chapterId
        )
      });
      closeOverlay(app);
      return;
    }

    if (button.key === 'back') {
      app.switchToChapters();
    }
    return;
  }

  if (app.overlay.type === 'fail') {
    if (button.key === 'revive') {
      adService.showRewardedAction('15 秒加时').then((granted) => {
        if (!granted) {
          app.showToast('没有获得复活奖励');
          return;
        }
        app.gameState.revived = true;
        app.timeLeft += 15;
        closeOverlay(app);
        logger.trackEvent('minigame_revive_success', {
          levelId: app.currentLevel.levelId
        });
      });
      return;
    }

    if (button.key === 'retry') {
      logger.trackEvent('minigame_retry_level', {
        levelId: app.currentLevel.levelId
      });
      app.openLevel(app.currentLevel.levelId, true);
      return;
    }

    if (button.key === 'home') {
      app.switchToHome();
    }
    return;
  }

  if (app.overlay.type === 'success') {
    if (button.key === 'story') {
      activateSuccessStoryOverlay(app);
      return;
    }

    if (button.key === 'next') {
      const nextLevelId = app.successResult && app.successResult.nextLevelId;
      if (nextLevelId) {
        logger.trackEvent('minigame_next_level', {
          levelId: app.currentLevel.levelId,
          nextLevelId
        });
        app.openLevel(nextLevelId, true);
      } else {
        app.switchToHome();
      }
      return;
    }

    if (button.key === 'home') {
      app.switchToHome();
    }
  }
}

function openSuccessOverlay(app) {
  if (app.overlay && app.overlay.type === 'success') {
    return;
  }

  const result = storage.updateLevelResult({
    levelId: app.currentLevel.levelId,
    levelMeta: app.currentLevel,
    success: true,
    moves: app.gameState.moves,
    remainingTime: Math.ceil(app.timeLeft)
  });
  app.refreshProfile();
  app.syncChallengeScoreToCloud({ silent: true });
  app.successResult = result;
  app.overlay = {
    type: 'success',
    title: '谜境已经拼合',
    desc: '完整画面已经回到眼前。你可以先停留欣赏，再决定是否进入下一段谜境。',
    buttons: [
      { key: 'next', label: result.nextLevelId ? '进入下一关' : '返回首页' },
      { key: 'home', label: '留在主界面' }
    ]
  };
  logger.trackEvent('minigame_level_success', {
    levelId: app.currentLevel.levelId,
    moves: app.gameState.moves,
    timeLeft: Math.ceil(app.timeLeft),
    stars: result.rewards.stars
  });
  buildOverlayButtons(app);
}

function openFailOverlay(app) {
  logger.trackEvent('minigame_level_fail', {
    levelId: app.currentLevel.levelId,
    moves: app.gameState.moves
  });
  const buttons = [];
  if (!app.gameState.revived) {
    buttons.push({ key: 'revive', label: '复活 +15 秒' });
  }
  buttons.push({ key: 'retry', label: '重新入局' });
  buttons.push({ key: 'home', label: '回到首页' });

  app.overlay = {
    type: 'fail',
    title: '谜境暂未揭晓',
    desc: '时间已经耗尽。你可以复活继续，也可以重新整理这一局的线索。',
    buttons
  };
  app.playFeedbackCue('fail');
  buildOverlayButtons(app);
}

module.exports = {
  activateSuccessStoryOverlay,
  drawOverlay,
  buildOverlayButtons,
  buildChapterOverlayButtons,
  drawChapterNarrativeOverlay,
  drawIntroNarrativeOverlay,
  drawSuccessNarrativeOverlay,
  handleOverlayTap,
  openChapterOverlay,
  openSuccessOverlay,
  openFailOverlay
};
