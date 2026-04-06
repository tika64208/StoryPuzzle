const levelRepo = require('../services/level-repo');
const logger = require('../services/logger');
const release = require('../services/release');
const gameEngine = require('../utils/game');
const storage = require('../utils/storage');

function resetTouchTracking(app) {
  app.touchStart = null;
  app.touchScroll = null;
}

function getScrollableScreen(app) {
  if (app.screen === 'chapters') {
    return 'chapters';
  }
  if (app.screen === 'levels' && !(app.overlay && app.overlay.type === 'chapter')) {
    return 'levels';
  }
  return '';
}

function updateScrollableLayout(app, scrollScreen, deltaY) {
  if (!scrollScreen || !deltaY) {
    return;
  }
  if (!app.screenScroll) {
    app.screenScroll = {
      chapters: 0,
      levels: 0
    };
  }
  app.screenScroll[scrollScreen] = (app.screenScroll[scrollScreen] || 0) + deltaY;
  if (scrollScreen === 'chapters') {
    app.buildChapterLayout();
    return;
  }
  if (scrollScreen === 'levels') {
    app.buildLevelLayout();
  }
}

function clearPressState(app) {
  app.uiPressState = null;
}

function capturePressState(app, x, y, helpers) {
  const { clamp, hitButton } = helpers;

  if (app.screen === 'home' && app.homeMeta) {
    const homeButton = app.homeButtons
      .concat(app.homeMiniButtons, app.homeIconButtons)
      .find((item) => hitButton(item, x, y));
    if (homeButton) {
      app.uiPressState = {
        screen: 'home',
        key: homeButton.key
      };
      return;
    }

    const hero = app.homeMeta;
    if (x >= hero.heroX && x <= hero.heroX + hero.heroW && y >= hero.heroY && y <= hero.heroY + hero.heroH) {
      app.uiPressState = {
        screen: 'home',
        key: 'hero',
        tiltX: clamp((x - (hero.heroX + hero.heroW / 2)) / Math.max(hero.heroW / 2, 1), -1, 1),
        tiltY: clamp((y - (hero.heroY + hero.heroH / 2)) / Math.max(hero.heroH / 2, 1), -1, 1)
      };
      return;
    }
  }

  if (app.screen === 'levels') {
    const difficultyButton = app.chapterDifficultyButtons.find((item) => hitButton(item, x, y));
    if (difficultyButton) {
      app.uiPressState = {
        screen: 'levels',
        key: difficultyButton.key
      };
      return;
    }

    const levelButton = app.levelButtons.find((item) => hitButton(item, x, y));
    if (levelButton) {
      app.uiPressState = {
        screen: 'levels',
        key: levelButton.key
      };
      return;
    }
  }

  if (app.screen === 'leaderboard') {
    const actionButton = app.leaderboardButtons.find((item) => hitButton(item, x, y));
    if (actionButton) {
      app.uiPressState = {
        screen: 'leaderboard',
        key: actionButton.key
      };
      return;
    }
  }

  app.uiPressState = null;
}

function handleTouchStart(app, x, y, helpers) {
  const { clamp } = helpers;
  if (app.screen === 'levels' && app.overlay) {
    app.touchStart = { x, y };
    app.touchScroll = null;
    clearPressState(app);
    return;
  }

  const scrollScreen = getScrollableScreen(app);
  if (scrollScreen) {
    app.touchStart = { x, y };
    app.touchScroll = {
      screen: scrollScreen,
      startX: x,
      startY: y,
      lastY: y,
      moved: false
    };
    app.capturePressState(x, y);
    return;
  }

  if (
    app.screen === 'home' ||
    app.screen === 'custom' ||
    app.screen === 'supply' ||
    app.screen === 'leaderboard' ||
    app.screen === 'settings' ||
    app.screen === 'legal'
  ) {
    app.touchStart = { x, y };
    app.touchScroll = null;
    app.capturePressState(x, y);
    return;
  }

  if (app.screen !== 'puzzle') {
    resetTouchTracking(app);
    clearPressState(app);
    return;
  }

  if (app.overlay) {
    app.touchStart = { x, y };
    app.touchScroll = null;
    clearPressState(app);
    return;
  }

  const board = app.boardRect;
  if (!board) {
    return;
  }

  if (x >= board.x && x <= board.x + board.w && y >= board.y && y <= board.y + board.h) {
    const col = clamp(Math.floor((x - board.x) / board.cell), 0, app.currentLevel.cols - 1);
    const row = clamp(Math.floor((y - board.y) / board.cell), 0, app.currentLevel.rows - 1);
    const slot = row * app.currentLevel.cols + col + 1;
    const pieceId = app.gameState.slots[slot];
    const piece = app.gameState.pieces[pieceId];
    if (!piece) {
      return;
    }
    if (piece.locked) {
      app.showToast('这块碎片已经被定格了');
      return;
    }
    clearPressState(app);
    const group = app.gameState.groups[piece.groupId];
    app.drag = {
      pieceId,
      groupId: piece.groupId,
      startX: x,
      startY: y,
      dx: 0,
      dy: 0,
      groupPieceIds: group ? group.pieceIds.slice() : [pieceId]
    };
    return;
  }

  app.touchStart = { x, y };
  app.touchScroll = null;
  clearPressState(app);
}

function handleTouchMove(app, x, y) {
  if (!app.drag) {
    if (app.touchScroll) {
      const deltaX = x - app.touchScroll.startX;
      const deltaY = y - app.touchScroll.startY;
      if (!app.touchScroll.moved) {
        if (Math.abs(deltaY) > 10 && Math.abs(deltaY) >= Math.abs(deltaX)) {
          app.touchScroll.moved = true;
          clearPressState(app);
        } else if (
          app.uiPressState &&
          (Math.abs(deltaX) > 12 || Math.abs(deltaY) > 12)
        ) {
          clearPressState(app);
        }
      }

      if (app.touchScroll.moved) {
        const frameDeltaY = y - app.touchScroll.lastY;
        app.touchScroll.lastY = y;
        updateScrollableLayout(app, app.touchScroll.screen, frameDeltaY);
      }
      return;
    }

    if (
      app.uiPressState &&
      app.touchStart &&
      (Math.abs(x - app.touchStart.x) > 12 || Math.abs(y - app.touchStart.y) > 12)
    ) {
      clearPressState(app);
    }
    return;
  }

  app.drag.dx = x - app.drag.startX;
  app.drag.dy = y - app.drag.startY;
}

function handleTouchEnd(app, x, y) {
  const didScroll = !!(app.touchScroll && app.touchScroll.moved);
  resetTouchTracking(app);

  if (app.screen === 'home') {
    clearPressState(app);
    app.handleHomeTap(x, y);
    return;
  }

  if (app.screen === 'chapters') {
    clearPressState(app);
    if (didScroll) {
      return;
    }
    app.handleChapterTap(x, y);
    return;
  }

  if (app.screen === 'levels') {
    clearPressState(app);
    if (didScroll) {
      return;
    }
    app.handleLevelTap(x, y);
    return;
  }

  if (app.screen === 'custom') {
    clearPressState(app);
    app.handleCustomTap(x, y);
    return;
  }

  if (app.screen === 'supply') {
    clearPressState(app);
    app.handleSupplyTap(x, y);
    return;
  }

  if (app.screen === 'leaderboard') {
    clearPressState(app);
    app.handleLeaderboardTap(x, y);
    return;
  }

  if (app.screen === 'settings') {
    clearPressState(app);
    app.handleSettingsTap(x, y);
    return;
  }

  if (app.screen === 'legal') {
    clearPressState(app);
    app.handleLegalTap(x, y);
    return;
  }

  if (app.screen !== 'puzzle') {
    clearPressState(app);
    return;
  }

  if (app.overlay) {
    clearPressState(app);
    app.handleOverlayTap(x, y);
    return;
  }

  if (app.drag) {
    const board = app.boardRect;
    const draggedPieceId = app.drag.pieceId;
    const beforePieceSlots = app.capturePieceSlotSnapshot();
    const dragSnapshot = {
      dx: app.drag.dx,
      dy: app.drag.dy,
      groupPieceIds: app.drag.groupPieceIds ? app.drag.groupPieceIds.slice() : [draggedPieceId]
    };
    const feedbackBeforeMove = app.capturePuzzleFeedback(draggedPieceId);
    const rowDelta = Math.round(app.drag.dy / board.cell);
    const colDelta = Math.round(app.drag.dx / board.cell);
    const moved = gameEngine.moveGroup(
      app.currentLevel,
      app.gameState,
      draggedPieceId,
      rowDelta,
      colDelta
    );
    app.drag = null;
    if (moved) {
      app.guideHint = null;
      app.startSettleAnimation(dragSnapshot, rowDelta, colDelta);
      app.startPassiveSettleAnimations(beforePieceSlots, dragSnapshot.groupPieceIds);
      app.triggerMoveFeedback(feedbackBeforeMove, draggedPieceId);
      logger.trackEvent('minigame_group_drag', {
        levelId: app.currentLevel.levelId,
        rowDelta,
        colDelta
      });
      if (gameEngine.isComplete(app.gameState)) {
        app.playSuccessCelebration();
        app.openSuccessOverlay();
      }
    }
    return;
  }

  app.handlePuzzleTap(x, y);
}

function handleHomeTap(app, x, y, helpers) {
  const { hitButton } = helpers;
  const button = app.homeButtons.concat(app.homeMiniButtons, app.homeIconButtons).find((item) => hitButton(item, x, y));
  if (!button) {
    return;
  }

  if (button.key === 'continue') {
    const levelId = levelRepo.getContinueLevelId(app.progress);
    logger.trackEvent('minigame_home_continue', { levelId });
    app.openLevel(levelId, true);
    return;
  }

  if (button.key === 'start') {
    const levelId = levelRepo.getFirstLevelId();
    logger.trackEvent('minigame_home_start', { levelId });
    app.openLevel(levelId, true);
    return;
  }

  if (button.key === 'chapter') {
    logger.trackEvent('minigame_open_chapters');
    app.switchToChapters();
    return;
  }

  if (button.key === 'custom') {
    logger.trackEvent('minigame_open_custom');
    app.switchToCustom();
    return;
  }

  if (button.key === 'settings' || button.key === 'settings-icon') {
    logger.trackEvent('minigame_open_settings');
    app.switchToSettings();
    return;
  }

  if (button.key === 'supply') {
    logger.trackEvent('minigame_open_supply');
    app.switchToSupply();
    return;
  }

  if (button.key === 'leaderboard') {
    logger.trackEvent('minigame_open_leaderboard');
    app.switchToLeaderboard();
    return;
  }

  if (button.key === 'share') {
    app.triggerShare('home');
    return;
  }

  if (button.key === 'signin') {
    const result = storage.claimDailySignIn();
    app.refreshProfile();
    if (!result.ok) {
      app.showToast('今天已经签到过了');
    } else {
      logger.trackEvent('minigame_sign_in');
      app.showToast('+3体力 +1定格符 +1引路符');
    }
    return;
  }

  if (button.key === 'privacy') {
    logger.trackEvent('minigame_open_privacy');
    app.switchToLegal('privacy');
    return;
  }

  if (button.key === 'agreement') {
    logger.trackEvent('minigame_open_agreement');
    app.switchToLegal('agreement');
    return;
  }

  if (button.key === 'more') {
    app.handleMoreTools();
    return;
  }

  if (button.key === 'release') {
    logger.trackEvent('minigame_open_release_check');
    const checklist = release.getReleaseChecklist();
    const pendingText = checklist.blockingItems
      .slice(0, 4)
      .map((item) => `- ${item.label}`)
      .join('\n');
    wx.showModal({
      title: checklist.summary.canRelease
        ? `发布检查可提审 ${checklist.summary.ready}/${checklist.summary.total}`
        : `发布检查阻塞 ${checklist.summary.blocking} 项`,
      content: pendingText || '当前没有阻塞项，发布条件已满足。',
      showCancel: false
    });
    return;
  }

  if (button.key === 'logs') {
    logger.trackEvent('minigame_copy_logs');
    wx.setClipboardData({
      data: logger.buildExportText(80),
      success: () => {
        app.showToast('运行日志已复制');
      }
    });
  }
}

function handleChapterTap(app, x, y, helpers) {
  const { hitButton } = helpers;
  const shareButton = app.chapterShareButtons.find((item) => hitButton(item, x, y));
  if (shareButton) {
    logger.trackEvent('minigame_share_chapter_from_list', {
      chapterId: shareButton.chapterId
    });
    app.triggerShare('chapter', shareButton.chapterId);
    return;
  }

  const button = app.chapterButtons.find((item) => hitButton(item, x, y));
  if (!button) {
    return;
  }

  if (button.key === 'back') {
    logger.trackEvent('minigame_back_home_from_chapters');
    app.switchToHome();
    return;
  }

  logger.trackEvent('minigame_select_chapter', {
    chapterId: button.chapter.chapterId
  });
  app.switchToLevels(button.chapter.chapterId);
}

function handleLevelTap(app, x, y, helpers) {
  const { hitButton } = helpers;

  if (app.overlay && app.overlay.type === 'chapter') {
    app.handleOverlayTap(x, y);
    return;
  }

  if (hitButton(app.levelShareButton, x, y)) {
    const chapterId = app.selectedChapter && app.selectedChapter.chapterId;
    if (chapterId) {
      logger.trackEvent('minigame_share_chapter_from_levels', {
        chapterId
      });
      app.triggerShare('chapter', chapterId);
    }
    return;
  }

  const difficultyButton = app.chapterDifficultyButtons.find((item) => hitButton(item, x, y));
  if (difficultyButton) {
    app.updateSelectedChapterDifficulty(difficultyButton.stars);
    return;
  }

  const button = app.levelButtons.find((item) => hitButton(item, x, y));
  if (!button) {
    return;
  }

  if (button.key === 'back') {
    logger.trackEvent('minigame_back_chapters_from_levels', {
      chapterId: app.selectedChapter && app.selectedChapter.chapterId
    });
    app.switchToChapters();
    return;
  }

  const level = button.level;
  if (!level) {
    return;
  }

  if (!level.unlocked) {
    app.showToast('这一关还没有解锁');
    return;
  }

  logger.trackEvent('minigame_select_level', {
    chapterId: level.chapterId,
    levelId: level.levelId
  });
  app.openLevel(level.levelId, true);
}

function handleCustomTap(app, x, y, helpers) {
  const { hitButton } = helpers;
  const actionButton = app.customButtons.find((item) => hitButton(item, x, y));
  if (actionButton) {
    if (actionButton.key === 'use-default') {
      app.handleCustomUseDefault();
      return;
    }
    if (actionButton.key === 'pick-image') {
      app.handleCustomChooseImage();
      return;
    }
    if (actionButton.key === 'layout') {
      app.handleCustomChooseLayout();
      return;
    }
    if (actionButton.key === 'create') {
      app.handleCustomCreateLevel();
      return;
    }
    if (actionButton.key === 'import') {
      app.handleCustomImportCode();
      return;
    }
    if (actionButton.key === 'back-home') {
      app.switchToHome();
    }
    return;
  }

  const itemButton = app.customItemButtons
    .slice()
    .reverse()
    .find((item) => hitButton(item, x, y));
  if (!itemButton) {
    return;
  }

  if (itemButton.action === 'play') {
    logger.trackEvent('minigame_custom_play_level', { levelId: itemButton.levelId });
    app.openLevel(itemButton.levelId, true);
    return;
  }

  if (itemButton.action === 'share') {
    app.handleCustomCopyCode(itemButton.levelId);
    return;
  }

  if (itemButton.action === 'delete') {
    app.handleCustomDelete(itemButton.levelId);
  }
}

function handlePuzzleTap(app, x, y, helpers) {
  const { hitButton } = helpers;
  const button = app.puzzleButtons.find((item) => hitButton(item, x, y));
  if (!button) {
    return;
  }

  if (button.key === 'hint') {
    app.useHint();
    return;
  }

  if (button.key === 'lock') {
    app.useLockTool();
    return;
  }

  if (button.key === 'guide') {
    app.useGuideTool();
    return;
  }

  if (button.key === 'reset') {
    wx.showModal({
      title: '重置当前谜境',
      content: '会回到本局初始状态，是否继续？',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        gameEngine.resetBoard(app.currentLevel, app.gameState);
        app.timeLeft = app.currentLevel.timeLimit;
        app.guideHint = null;
        app.clearPuzzleEffects();
        logger.trackEvent('minigame_reset_level', {
          levelId: app.currentLevel.levelId
        });
        app.showToast('谜境已经重置');
      }
    });
    return;
  }

  if (button.key === 'home') {
    logger.trackEvent('minigame_back_home_from_game', {
      levelId: app.currentLevel.levelId
    });
    app.switchToHome();
  }
}

module.exports = {
  clearPressState,
  capturePressState,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  handleHomeTap,
  handleChapterTap,
  handleLevelTap,
  handleCustomTap,
  handlePuzzleTap
};
