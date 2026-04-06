function getLaunchOptions(app, helpers) {
  const { logger } = helpers;
  try {
    if (!wx.getLaunchOptionsSync) {
      return {};
    }
    return wx.getLaunchOptionsSync() || {};
  } catch (error) {
    logger.captureError('minigame_get_launch_options', error);
    return {};
  }
}

function start(app, helpers) {
  const {
    audioService,
    getAccountInfo,
    logger,
    storage
  } = helpers;

  if (wx.setPreferredFPS) {
    try {
      wx.setPreferredFPS(60);
    } catch (error) {
      logger.captureError('minigame_set_fps', error);
    }
  }

  storage.bootstrap();
  app.profile = storage.getProfile();
  app.progress = storage.getProgress();
  audioService.preload();
  app.switchToHome();
  app.syncChallengeScoreToCloud({ silent: true });
  app.setupSharing();
  app.handleIncomingShareOptions(app.getLaunchOptions(), 'launch');
  logger.trackEvent('minigame_boot', {
    appId: getAccountInfo().appId || ''
  });
  app.loop();
}

function loop(app) {
  const now = Date.now();
  const delta = Math.min(100, now - app.lastTick);
  app.lastTick = now;
  app.update(delta);
  app.render();

  const raf =
    app.canvas.requestAnimationFrame ||
    (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);

  if (raf) {
    raf.call(app.canvas, () => app.loop());
  } else {
    setTimeout(() => app.loop(), 16);
  }
}

function update(app, delta) {
  if (app.toast && app.toast.expireAt <= Date.now()) {
    app.toast = null;
  }

  app.updateAnimationEffects(delta);

  if (Date.now() - app.uiSyncAt >= 1000 && app.screen !== 'loading') {
    app.uiSyncAt = Date.now();
    app.refreshProfile();
    if (app.screen === 'custom') {
      app.refreshCustomData();
      app.buildCustomLayout();
    } else if (app.screen === 'supply') {
      app.buildSupplyLayout();
    }
  }

  if (app.screen === 'puzzle' && app.overlay === null) {
    app.timeLeft -= delta / 1000;
    if (app.timeLeft <= 0) {
      app.timeLeft = 0;
      app.openFailOverlay();
    }
  }
}

function showToast(app, message) {
  app.toast = {
    message,
    expireAt: Date.now() + 1800
  };
}

function refreshProfile(app, helpers) {
  const { storage } = helpers;
  app.profile = storage.getProfile();
  app.progress = storage.getProgress();
}

function refreshSelectedChapter(app, helpers) {
  const { getChaptersWithDifficulty } = helpers;
  if (!app.selectedChapter || !app.selectedChapter.chapterId) {
    return;
  }

  const chapters = getChaptersWithDifficulty(app.progress, app.profile);
  app.selectedChapter =
    chapters.find((item) => item.chapterId === app.selectedChapter.chapterId) || app.selectedChapter;
}

function render(app) {
  const ctx = app.ctx;
  if (ctx.setTransform) {
    ctx.setTransform(app.pixelRatio, 0, 0, app.pixelRatio, 0, 0);
  }
  ctx.clearRect(0, 0, app.viewWidth, app.viewHeight);
  app.drawBackground();

  if (app.screen === 'loading') {
    app.drawLoading();
  } else if (app.screen === 'home') {
    app.drawHome();
  } else if (app.screen === 'chapters') {
    app.drawChapters();
  } else if (app.screen === 'levels') {
    app.drawLevels();
  } else if (app.screen === 'custom') {
    app.drawCustom();
  } else if (app.screen === 'supply') {
    app.drawSupplyPanel();
  } else if (app.screen === 'leaderboard') {
    app.drawLeaderboardPanel();
  } else if (app.screen === 'settings') {
    app.drawSettingsPanel();
  } else if (app.screen === 'legal') {
    app.drawLegalPanel();
  } else if (app.screen === 'puzzle') {
    app.drawPuzzle();
  }

  app.drawScreenFade();
  app.drawToast();
}

module.exports = {
  getLaunchOptions,
  loop,
  refreshProfile,
  refreshSelectedChapter,
  render,
  showToast,
  start,
  update
};
