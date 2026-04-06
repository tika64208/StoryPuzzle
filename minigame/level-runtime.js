const audioService = require('../services/audio');
const logger = require('../services/logger');
const storage = require('../utils/storage');
const gameEngine = require('../utils/game');

async function openLevel(app, levelId, consumeEnergy, helpers) {
  const {
    getLevelByIdWithDifficulty,
    getSafeLevelTitle,
    resolvePreviewImage
  } = helpers;
  const level = getLevelByIdWithDifficulty(levelId, app.profile);
  if (!level) {
    app.showToast('没有找到这段谜境');
    return;
  }

  if (consumeEnergy && level.energyCost > 0) {
    const consumeResult = storage.consumeEnergy(level.energyCost);
    if (!consumeResult.ok) {
      app.refreshProfile();
      app.showToast('体力不足，先回补给吧');
      return;
    }
  }

  app.refreshProfile();
  app.screen = 'loading';
  app.loadingText = `正在进入 ${getSafeLevelTitle(level)}...`;
  audioService.stopAll();
  app.syncScreenAudio();
  app.triggerScreenMotion('loading');
  app.currentLevel = level;
  app.gameState = gameEngine.createInitialState(level);
  app.guideHint = null;
  app.overlay = null;
  app.successResult = null;
  app.clearPuzzleEffects();
  app.timeLeft = level.timeLimit;
  storage.setCurrentLevel(level.levelId);
  logger.trackEvent('minigame_game_start', {
    levelId: level.levelId,
    rows: level.rows,
    cols: level.cols
  });

  app.currentImage = await app.loadImage(resolvePreviewImage(level));
  app.screen = 'puzzle';
  app.buildPuzzleLayout();
  app.syncScreenAudio();
  app.triggerScreenMotion('puzzle');
  app.openIntroOverlay();
}

function openIntroOverlay(app, helpers) {
  const { getSafeLevelTitle } = helpers;
  if (!app.currentLevel || !app.currentLevel.introText) {
    app.overlay = null;
    app.overlayButtons = [];
    return;
  }

  app.overlay = {
    type: 'intro',
    title: `${getSafeLevelTitle(app.currentLevel)} · 开场`,
    desc: app.currentLevel.introText,
    buttons: [
      { key: 'start', label: '进入谜境' },
      { key: 'home', label: '返回首页' }
    ]
  };
  app.buildOverlayButtons();
  logger.trackEvent('minigame_intro_show', {
    levelId: app.currentLevel.levelId
  });
}

module.exports = {
  openLevel,
  openIntroOverlay
};
