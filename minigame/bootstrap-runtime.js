function initializeApp(app, helpers) {
  const {
    clamp,
    DEFAULT_CUSTOM_IMAGE_PATH,
    DEFAULT_CUSTOM_TITLE,
    storage
  } = helpers;
  const systemInfo = wx.getSystemInfoSync();
  const now = Date.now();
  const canvas = wx.createCanvas();

  app.viewWidth = systemInfo.windowWidth;
  app.viewHeight = systemInfo.windowHeight;
  app.pixelRatio = clamp(systemInfo.pixelRatio || 1, 1, 2);
  app.canvas = canvas;
  app.ctx = canvas.getContext('2d');
  app.images = {};
  app.screen = 'loading';
  app.loadingText = '正在整理谜境线索...';
  app.toast = null;
  app.homeButtons = [];
  app.homeMiniButtons = [];
  app.homeIconButtons = [];
  app.chapterButtons = [];
  app.chapterShareButtons = [];
  app.levelButtons = [];
  app.chapterDifficultyButtons = [];
  app.chapterOverlayDifficultyButtons = [];
  app.levelShareButton = null;
  app.customButtons = [];
  app.customItemButtons = [];
  app.supplyButtons = [];
  app.settingsButtons = [];
  app.leaderboardButtons = [];
  app.leaderboardEntries = [];
  app.legalButtons = [];
  app.legalTabButtons = [];
  app.puzzleButtons = [];
  app.overlayButtons = [];
  app.profile = storage.getProfile();
  app.progress = storage.getProgress();
  app.currentLevel = null;
  app.currentImage = null;
  app.gameState = null;
  app.timeLeft = 0;
  app.lastTick = now;
  app.drag = null;
  app.guideHint = null;
  app.overlay = null;
  app.successResult = null;
  app.snapPulses = [];
  app.fxParticles = [];
  app.settleAnimations = [];
  app.screenScroll = {
    chapters: 0,
    levels: 0
  };
  app.touchStart = null;
  app.touchScroll = null;
  app.uiPressState = null;
  app.screenMotion = {
    screen: 'loading',
    startedAt: now
  };
  app.boardRect = null;
  app.selectedChapter = null;
  app.customLevels = [];
  app.customDraft = {
    imagePath: DEFAULT_CUSTOM_IMAGE_PATH,
    isDefault: true,
    title: DEFAULT_CUSTOM_TITLE,
    layoutIndex: 1,
    shareReady: false
  };
  app.customPreviewImage = null;
  app.uiSyncAt = 0;
  app.shareState = {
    lastIncomingKey: '',
    lastHandledAt: 0
  };
  app.playerIdentity = {
    nickname: '我',
    avatarUrl: '',
    source: 'fallback'
  };
  app.successShareButton = null;
  app.leaderboardState = {
    loading: false,
    error: '',
    hint: '',
    updatedAt: 0
  };
  app.legalState = {
    type: 'privacy',
    title: '隐私说明',
    pages: [],
    pageIndex: 0
  };
}

function resizeCanvas(app) {
  app.canvas.width = app.viewWidth * app.pixelRatio;
  app.canvas.height = app.viewHeight * app.pixelRatio;
}

function bindTouches(app) {
  wx.onTouchStart((event) => {
    const touch = event.touches && event.touches[0];
    if (!touch) {
      return;
    }
    app.handleTouchStart(touch.clientX, touch.clientY);
  });

  wx.onTouchMove((event) => {
    const touch = event.touches && event.touches[0];
    if (!touch) {
      return;
    }
    app.handleTouchMove(touch.clientX, touch.clientY);
  });

  wx.onTouchEnd((event) => {
    const touch =
      (event.changedTouches && event.changedTouches[0]) ||
      (event.touches && event.touches[0]) ||
      { clientX: 0, clientY: 0 };
    app.handleTouchEnd(touch.clientX, touch.clientY);
  });
}

module.exports = {
  bindTouches,
  initializeApp,
  resizeCanvas
};
