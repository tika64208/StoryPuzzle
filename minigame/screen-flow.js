const levelRepo = require('../services/level-repo');

function ensureScreenScroll(app) {
  if (!app.screenScroll) {
    app.screenScroll = {
      chapters: 0,
      levels: 0
    };
  }
  return app.screenScroll;
}

function clampScrollOffset(value, minOffset, maxOffset) {
  const numeric = Number(value) || 0;
  return Math.min(maxOffset, Math.max(minOffset, numeric));
}

function clearTouchTracking(app) {
  app.touchStart = null;
  app.touchScroll = null;
}

function switchToHome(app) {
  app.refreshProfile();
  app.screen = 'home';
  app.loadingText = '';
  app.overlay = null;
  app.triggerScreenMotion('home');
  app.syncScreenAudio();
  app.clearPuzzleEffects();
  app.drag = null;
  app.currentLevel = null;
  app.currentImage = null;
  app.gameState = null;
  app.selectedChapter = null;
  clearTouchTracking(app);
  app.buildHomeLayout();
  app.refreshHomeQuickActions();
  app.pruneImageCache(true);
  app.syncScreenAudio();
}

function buildHomeLayout(app, helpers) {
  const { getSafeLevelTitle } = helpers;
  const cardX = 22;
  const cardW = app.viewWidth - 44;
  const heroY = 118;
  const buttonY = 356;
  const buttonH = 54;
  const gap = 14;
  const miniTop = buttonY + buttonH * 3 + gap * 3;
  const miniGap = 12;
  const miniW = Math.floor((cardW - miniGap) / 2);
  const miniH = 46;

  const continueLevel = levelRepo.getLevelById(levelRepo.getContinueLevelId(app.progress));
  const firstLevel = levelRepo.getLevelById(levelRepo.getFirstLevelId());

  app.homeButtons = [
    {
      key: 'continue',
      label: continueLevel ? `继续入局 · ${getSafeLevelTitle(continueLevel)}` : '继续入局',
      x: cardX,
      y: buttonY,
      w: cardW,
      h: buttonH,
      primary: true
    },
    {
      key: 'start',
      label: firstLevel ? `从首章开始 · ${getSafeLevelTitle(firstLevel)}` : '从首章开始',
      x: cardX,
      y: buttonY + buttonH + gap,
      w: cardW,
      h: buttonH,
      primary: false
    },
    {
      key: 'settings',
      label: '设置系统',
      x: cardX,
      y: buttonY + (buttonH + gap) * 2,
      w: cardW,
      h: buttonH,
      primary: false
    }
  ];

  app.homeMeta = {
    heroX: cardX,
    heroY,
    heroW: cardW,
    heroH: 214,
    continueLevel
  };

  app.homeIconButtons = [
    {
      key: 'settings-icon',
      x: cardX + cardW - 56,
      y: heroY + 16,
      w: 38,
      h: 38
    }
  ];

  app.homeMiniButtons = [
    { key: 'chapter', label: '章节选关', x: cardX, y: miniTop, w: miniW, h: miniH },
    { key: 'custom', label: '自定义谜境', x: cardX + miniW + miniGap, y: miniTop, w: miniW, h: miniH },
    { key: 'supply', label: '谜境补给站', x: cardX, y: miniTop + miniH + miniGap, w: miniW, h: miniH },
    { key: 'leaderboard', label: '好友排行', x: cardX + miniW + miniGap, y: miniTop + miniH + miniGap, w: miniW, h: miniH }
  ];
}

function refreshHomeQuickActions(app) {
  const cardX = 22;
  const cardW = app.viewWidth - 44;
  const miniTop = 560;
  const miniGap = 12;
  const miniW = Math.floor((cardW - miniGap) / 2);
  const miniH = 46;

  app.homeMiniButtons = [
    { key: 'chapter', label: '章节选关', x: cardX, y: miniTop, w: miniW, h: miniH },
    { key: 'custom', label: '自定义谜境', x: cardX + miniW + miniGap, y: miniTop, w: miniW, h: miniH },
    { key: 'supply', label: '谜境补给站', x: cardX, y: miniTop + miniH + miniGap, w: miniW, h: miniH },
    { key: 'leaderboard', label: '好友排行', x: cardX + miniW + miniGap, y: miniTop + miniH + miniGap, w: miniW, h: miniH }
  ];
}

function switchToSettings(app) {
  app.refreshProfile();
  app.screen = 'settings';
  app.overlay = null;
  app.drag = null;
  clearTouchTracking(app);
  app.triggerScreenMotion('settings');
  app.buildSettingsLayout();
  app.pruneImageCache(true);
  app.syncScreenAudio();
}

function buildSettingsLayout(app) {
  const width = app.viewWidth - 44;
  const half = Math.floor((width - 12) / 2);
  const gap = 10;
  const rowH = 42;
  const startY = Math.max(386, app.viewHeight - 176);

  app.settingsButtons = [
    {
      key: 'sound',
      label: app.profile.soundEnabled ? '关闭音效' : '开启音效',
      x: 22,
      y: startY,
      w: half,
      h: rowH
    },
    {
      key: 'vibration',
      label: app.profile.vibrationEnabled === false ? '开启震动' : '关闭震动',
      x: 22 + half + gap,
      y: startY,
      w: half,
      h: rowH
    },
    {
      key: 'supply',
      label: '前往补给站',
      x: 22,
      y: startY + rowH + gap,
      w: half,
      h: rowH
    },
    {
      key: 'back-home',
      label: '返回首页',
      x: 22 + half + gap,
      y: startY + rowH + gap,
      w: half,
      h: rowH
    }
  ];
}

function switchToLeaderboard(app) {
  app.refreshProfile();
  app.screen = 'leaderboard';
  app.overlay = null;
  app.drag = null;
  clearTouchTracking(app);
  app.triggerScreenMotion('leaderboard');
  app.buildLeaderboardLayout();
  app.pruneImageCache(true);
  app.syncScreenAudio();
  app.loadFriendLeaderboard();
}

function buildLeaderboardLayout(app) {
  const width = app.viewWidth - 44;
  const gap = 12;
  const half = Math.floor((width - gap) / 2);
  const y = app.viewHeight - 66;

  app.leaderboardButtons = [
    {
      key: 'refresh',
      label: '刷新排行',
      x: 22,
      y,
      w: half,
      h: 46
    },
    {
      key: 'back-home',
      label: '返回首页',
      x: 22 + half + gap,
      y,
      w: half,
      h: 46
    }
  ];
}

function switchToChapters(app) {
  app.refreshProfile();
  app.screen = 'chapters';
  app.overlay = null;
  app.drag = null;
  app.selectedChapter = null;
  ensureScreenScroll(app).chapters = 0;
  clearTouchTracking(app);
  app.triggerScreenMotion('chapters');
  app.buildChapterLayout();
  app.pruneImageCache(true);
  app.syncScreenAudio();
}

function switchToLevels(app, chapterId, helpers) {
  const { getChaptersWithDifficulty } = helpers;
  const chapters = getChaptersWithDifficulty(app.progress, app.profile);
  const chapter = chapters.find((item) => item.chapterId === chapterId);
  if (!chapter) {
    app.showToast('没有找到这个章节');
    return;
  }

  app.selectedChapter = chapter;
  app.screen = 'levels';
  app.overlay = null;
  app.drag = null;
  ensureScreenScroll(app).levels = 0;
  clearTouchTracking(app);
  app.triggerScreenMotion('levels');
  app.buildLevelLayout();
  app.openChapterOverlay(chapter);
  app.pruneImageCache(true);
  app.syncScreenAudio();
}

function buildChapterLayout(app) {
  const chapters = levelRepo.getChaptersWithProgress(app.progress);
  const width = app.viewWidth - 44;
  const startY = 120;
  const cardH = 96;
  const gap = 12;
  const backGap = 8;
  const backH = 48;
  const visibleBottom = app.viewHeight - 24;
  const naturalBackY = startY + chapters.length * (cardH + gap) + backGap;
  const contentBottom = naturalBackY + backH;
  const scroll = ensureScreenScroll(app);
  const minOffset = Math.min(0, visibleBottom - contentBottom);
  const scrollOffset = clampScrollOffset(scroll.chapters, minOffset, 0);

  scroll.chapters = scrollOffset;

  app.chapterShareButtons = [];
  app.chapterButtons = chapters.map((chapter, index) => ({
    key: chapter.chapterId,
    chapter,
    x: 22,
    y: startY + scrollOffset + index * (cardH + gap),
    w: width,
    h: cardH
  }));

  app.chapterButtons.forEach((button) => {
    if (!button.chapter) {
      return;
    }
    app.chapterShareButtons.push({
      key: `share:${button.chapter.chapterId}`,
      chapterId: button.chapter.chapterId,
      x: button.x + button.w - 84,
      y: button.y + button.h - 34,
      w: 64,
      h: 22
    });
  });

  app.chapterButtons.push({
    key: 'back',
    x: 22,
    y: naturalBackY + scrollOffset,
    w: width,
    h: backH
  });
}

function buildLevelLayout(app, helpers) {
  const { CHAPTER_DIFFICULTY_OPTIONS, getChapterDifficultyStars } = helpers;
  if (!app.selectedChapter) {
    app.levelButtons = [];
    app.chapterDifficultyButtons = [];
    app.levelShareButton = null;
    return;
  }

  const width = app.viewWidth - 44;
  const difficultyGap = 10;
  const difficultyButtonY = 188;
  const difficultyButtonH = 34;
  const difficultyButtonW = Math.floor((width - difficultyGap * 2) / 3);
  const startY = difficultyButtonY + difficultyButtonH + 40;
  const nodeW = 148;
  const nodeH = 132;
  const nodeGap = 28;
  const nodeStepY = nodeH + nodeGap;
  const backGap = 6;
  const backH = 48;
  const visibleBottom = app.viewHeight - 24;
  const selectedStars = getChapterDifficultyStars(app.profile, app.selectedChapter.chapterId);
  const scroll = ensureScreenScroll(app);
  const naturalBackY = startY + app.selectedChapter.levels.length * nodeStepY + backGap;
  const contentBottom = naturalBackY + backH;
  const minOffset = Math.min(0, visibleBottom - contentBottom);
  const scrollOffset = clampScrollOffset(scroll.levels, minOffset, 0);
  const centerX = Math.floor((app.viewWidth - nodeW) / 2);
  const rightX = app.viewWidth - 30 - nodeW;
  const leftX = 30;
  const lanePattern = [centerX, rightX, leftX, centerX];

  scroll.levels = scrollOffset;

  app.chapterDifficultyButtons = CHAPTER_DIFFICULTY_OPTIONS.map((item, index) => ({
    key: `difficulty-${item.stars}`,
    chapterId: app.selectedChapter.chapterId,
    stars: item.stars,
    label: item.label,
    x: 22 + index * (difficultyButtonW + difficultyGap),
    y: difficultyButtonY,
    w: difficultyButtonW,
    h: difficultyButtonH,
    active: item.stars === selectedStars
  }));

  app.levelButtons = app.selectedChapter.levels.map((level, index) => ({
    key: level.levelId,
    level,
    x: lanePattern[index % lanePattern.length],
    y: startY + scrollOffset + index * nodeStepY,
    w: nodeW,
    h: nodeH,
    centerX: lanePattern[index % lanePattern.length] + nodeW / 2,
    centerY: startY + scrollOffset + index * nodeStepY + nodeH / 2,
    laneIndex: index % lanePattern.length,
    index
  }));

  app.levelButtons.push({
    key: 'back',
    x: 22,
    y: naturalBackY + scrollOffset,
    w: width,
    h: backH
  });
  app.levelShareButton = null;
}

function switchToSupply(app) {
  app.refreshProfile();
  app.screen = 'supply';
  app.overlay = null;
  app.drag = null;
  clearTouchTracking(app);
  app.triggerScreenMotion('supply');
  app.buildSupplyLayout();
  app.pruneImageCache(true);
  app.syncScreenAudio();
}

function buildSupplyLayout(app) {
  const width = app.viewWidth - 44;
  const half = Math.floor((width - 12) / 2);
  const gap = 10;
  const rowH = 42;
  const rowCount = 6;
  const totalHeight = rowH * rowCount + gap * (rowCount - 1);
  const startY = Math.max(286, app.viewHeight - totalHeight - 70);

  app.supplyButtons = [
    { key: 'signin', label: '立即签到', x: 22, y: startY, w: half, h: rowH },
    { key: 'energy-ad', label: '广告补 2 体力', x: 22 + half + gap, y: startY, w: half, h: rowH },
    { key: 'unlock-ad', label: '广告补 1 定格符', x: 22, y: startY + rowH + gap, w: half, h: rowH },
    { key: 'guide-ad', label: '广告补 1 引路符', x: 22 + half + gap, y: startY + rowH + gap, w: half, h: rowH },
    { key: 'sound', label: app.profile.soundEnabled ? '关闭音效' : '开启音效', x: 22, y: startY + (rowH + gap) * 2, w: half, h: rowH },
    { key: 'custom', label: '前往自定义谜境', x: 22 + half + gap, y: startY + (rowH + gap) * 2, w: half, h: rowH },
    { key: 'privacy', label: '隐私摘要', x: 22, y: startY + (rowH + gap) * 3, w: half, h: rowH },
    { key: 'agreement', label: '用户协议', x: 22 + half + gap, y: startY + (rowH + gap) * 3, w: half, h: rowH },
    { key: 'release', label: '发布检查', x: 22, y: startY + (rowH + gap) * 4, w: half, h: rowH },
    { key: 'copy-logs', label: '复制运行日志', x: 22 + half + gap, y: startY + (rowH + gap) * 4, w: half, h: rowH },
    { key: 'clear-logs', label: '清空日志', x: 22, y: startY + (rowH + gap) * 5, w: half, h: rowH },
    { key: 'back-home', label: '返回首页', x: 22 + half + gap, y: startY + (rowH + gap) * 5, w: half, h: rowH }
  ];
}

module.exports = {
  switchToHome,
  buildHomeLayout,
  refreshHomeQuickActions,
  switchToSettings,
  buildSettingsLayout,
  switchToLeaderboard,
  buildLeaderboardLayout,
  switchToChapters,
  switchToLevels,
  buildChapterLayout,
  buildLevelLayout,
  switchToSupply,
  buildSupplyLayout
};
