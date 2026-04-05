const legal = require('../config/legal');
const release = require('../services/release');
const logger = require('../services/logger');
const audioService = require('../services/audio');
const adService = require('../services/ad');
const levelRepo = require('../services/level-repo');
const customLevels = require('../services/custom-levels');
const gameEngine = require('../utils/game');
const imageUtil = require('../utils/image');
const storage = require('../utils/storage');

const DISPLAY_CHAPTERS = {
  ch01: '深夜旧宅',
  ch02: '废弃剧场',
  ch03: '雨夜码头',
  ch04: '倩女幽魂'
};

const DISPLAY_LEVELS = {
  'ch04-lv01': '雨夜古道',
  'ch04-lv02': '横梁倒悬',
  'ch04-lv03': '枯井红衣',
  'ch04-lv04': '利爪试探',
  'ch04-lv05': '金锁书符',
  'ch04-lv06': '树根地劫',
  'ch04-lv07': '幽魂别离'
};

const DEFAULT_CUSTOM_IMAGE_PATH = 'assets/default-custom.jpg';
const DEFAULT_CUSTOM_TITLE = '海边谜境';
const CUSTOM_SHARE_BASE64_LIMIT = 220 * 1024;
const CUSTOM_LAYOUT_OPTIONS = [
  { label: '3 x 3 轻松', rows: 3, cols: 3, timeLimit: 90, hints: 3 },
  { label: '4 x 4 标准', rows: 4, cols: 4, timeLimit: 140, hints: 2 },
  { label: '5 x 5 进阶', rows: 5, cols: 5, timeLimit: 200, hints: 1 },
  { label: '3 x 4 竖版', rows: 3, cols: 4, timeLimit: 120, hints: 2 },
  { label: '4 x 5 挑战', rows: 4, cols: 5, timeLimit: 180, hints: 1 }
];

const DISPLAY_CHAPTER_SUMMARIES = {
  ch01: '从深夜旧宅的残痕里，拼回第一组案件线索。',
  ch02: '废弃剧场还留着最后一场演出的余温与证词。',
  ch03: '冷风、雨幕和集装箱阴影，把真相引向真正的交易地点。',
  ch04: '暴雨古道、荒寺夜灯与千年槐影，拼成倩女幽魂的完整故事。'
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundRectPath(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function fillRoundRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle) {
  ctx.save();
  roundRectPath(ctx, x, y, width, height, radius);
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
  ctx.restore();
}

function drawGlassCard(ctx, x, y, width, height, radius) {
  ctx.save();
  ctx.shadowColor = 'rgba(76, 202, 233, 0.18)';
  ctx.shadowBlur = 28;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 10;
  fillRoundRect(ctx, x, y, width, height, radius, 'rgba(11, 30, 46, 0.62)', 'rgba(145, 235, 255, 0.16)');
  ctx.restore();
}

function drawImageCover(ctx, image, x, y, width, height, radius) {
  if (!image) {
    return;
  }

  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  let srcX = 0;
  let srcY = 0;
  let srcW = image.width;
  let srcH = image.height;

  if (sourceRatio > targetRatio) {
    srcW = image.height * targetRatio;
    srcX = (image.width - srcW) / 2;
  } else {
    srcH = image.width / targetRatio;
    srcY = (image.height - srcH) / 2;
  }

  ctx.save();
  roundRectPath(ctx, x, y, width, height, radius);
  ctx.clip();
  ctx.drawImage(image, srcX, srcY, srcW, srcH, x, y, width, height);
  ctx.restore();
}

function drawText(ctx, text, x, y, size, color, align, weight) {
  ctx.save();
  ctx.font = `${weight || 'normal'} ${size}px sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x, y);
  ctx.restore();
}

function wrapText(ctx, text, maxWidth, size) {
  ctx.save();
  ctx.font = `normal ${size}px sans-serif`;
  const lines = [];
  let current = '';
  String(text || '').split('').forEach((char) => {
    const next = current + char;
    if (ctx.measureText(next).width > maxWidth && current) {
      lines.push(current);
      current = char;
    } else {
      current = next;
    }
  });
  if (current) {
    lines.push(current);
  }
  ctx.restore();
  return lines;
}

function drawParagraph(ctx, text, x, y, maxWidth, size, color, lineHeight, maxLines) {
  const lines = wrapText(ctx, text, maxWidth, size).slice(0, maxLines || 99);
  lines.forEach((line, index) => {
    drawText(ctx, line, x, y + index * lineHeight, size, color, 'left');
  });
}

function hitButton(button, x, y) {
  return (
    !!button &&
    x >= button.x &&
    x <= button.x + button.w &&
    y >= button.y &&
    y <= button.y + button.h
  );
}

function formatTime(seconds) {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const minutes = `${Math.floor(safe / 60)}`.padStart(2, '0');
  const remain = `${safe % 60}`.padStart(2, '0');
  return `${minutes}:${remain}`;
}

function getTodayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function chunkArray(list, size) {
  const result = [];
  const safeSize = Math.max(1, size || 1);
  for (let index = 0; index < list.length; index += safeSize) {
    result.push(list.slice(index, index + safeSize));
  }
  return result;
}

function chooseImagePromise() {
  return new Promise((resolve, reject) => {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: resolve,
      fail: reject
    });
  });
}

function compressImagePromise(src, quality) {
  return new Promise((resolve, reject) => {
    if (!wx.compressImage) {
      resolve({ tempFilePath: src });
      return;
    }
    wx.compressImage({
      src,
      quality,
      success: resolve,
      fail: reject
    });
  });
}

function actionSheetPromise(itemList) {
  return new Promise((resolve, reject) => {
    wx.showActionSheet({
      itemList,
      success: resolve,
      fail: reject
    });
  });
}

function modalPromise(options) {
  return new Promise((resolve) => {
    wx.showModal(
      Object.assign(
        {
          showCancel: true
        },
        options,
        {
          success: resolve,
          fail: () => resolve({ confirm: false, cancel: true })
        }
      )
    );
  });
}

function getClipboardDataPromise() {
  return new Promise((resolve, reject) => {
    wx.getClipboardData({
      success: resolve,
      fail: reject
    });
  });
}

function resolvePreviewImage(level) {
  if (!level) {
    return '';
  }

  if (level.sceneAssetPath) {
    return level.sceneAssetPath;
  }

  if (level.customMeta && level.customMeta.imagePath) {
    return level.customMeta.imagePath;
  }

  const rawStyle = String(level.sceneStyle || '');
  const match = rawStyle.match(/url\(["']?(.*?)["']?\)/i);
  return match ? match[1] : '';
}

function getMiniGameImageCandidates(src) {
  const source = String(src || '').trim();
  if (!source) {
    return [];
  }

  const candidates = [];
  const isSpecialPath =
    /^(https?:)?\/\//i.test(source) ||
    /^wxfile:\/\//i.test(source) ||
    /^data:/i.test(source) ||
    /^[a-z]+:\/\//i.test(source) ||
    /^[A-Za-z]:[\\/]/.test(source);

  if (!isSpecialPath) {
    const trimmed = source.replace(/^\/+/, '');
    if (trimmed !== source) {
      candidates.push(trimmed);
      candidates.push(`./${trimmed}`);
      candidates.push(source);
    } else if (!/^\.\.?\//.test(source)) {
      candidates.push(source);
      candidates.push(`./${source}`);
    } else {
      candidates.push(source);
    }
  } else {
    candidates.push(source);
  }

  return candidates.filter((candidate, index) => candidates.indexOf(candidate) === index);
}

function getLevelTitle(level) {
  if (!level) {
    return '';
  }
  if (DISPLAY_LEVELS[level.levelId]) {
    return DISPLAY_LEVELS[level.levelId];
  }
  const match = String(level.levelId || '').match(/lv(\d+)/i);
  return match ? `第 ${Number(match[1])} 关` : level.levelId;
}

function getChapterTitle(level) {
  if (!level) {
    return '';
  }
  return DISPLAY_CHAPTERS[level.chapterId] || level.chapterId;
}

function getSafeLevelTitle(level) {
  if (!level) {
    return '';
  }
  return level.title || getLevelTitle(level);
}

function getSafeChapterTitle(level) {
  if (!level) {
    return '';
  }
  return level.chapterTitle || getChapterTitle(level);
}

function getChapterSummary(chapter) {
  if (!chapter) {
    return '';
  }
  return DISPLAY_CHAPTER_SUMMARIES[chapter.chapterId] || chapter.summary || '等待进入这一段谜境。';
}

function getChapterCoverLevel(chapter) {
  if (!chapter || !Array.isArray(chapter.levels) || chapter.levels.length === 0) {
    return null;
  }
  return chapter.levels.find((level) => resolvePreviewImage(level)) || chapter.levels[0];
}

function getAccountInfo() {
  try {
    if (!wx.getAccountInfoSync) {
      return {};
    }
    const account = wx.getAccountInfoSync();
    return account.miniGame || account.miniProgram || {};
  } catch (error) {
    return {};
  }
}

function buildLegalPreview(sections, limit) {
  return (sections || [])
    .slice(0, limit || 2)
    .map((section) => {
      const paragraph = Array.isArray(section.paragraphs) ? section.paragraphs[0] : '';
      return `${section.title}\n${paragraph}`;
    })
    .join('\n\n');
}

class MiniGameApp {
  constructor() {
    const systemInfo = wx.getSystemInfoSync();
    this.viewWidth = systemInfo.windowWidth;
    this.viewHeight = systemInfo.windowHeight;
    this.pixelRatio = clamp(systemInfo.pixelRatio || 1, 1, 2);
    this.canvas = wx.createCanvas();
    this.ctx = this.canvas.getContext('2d');
    this.images = {};
    this.screen = 'loading';
    this.loadingText = '正在初始化小游戏...';
    this.toast = null;
    this.homeButtons = [];
    this.homeMiniButtons = [];
    this.chapterButtons = [];
    this.levelButtons = [];
    this.customButtons = [];
    this.customItemButtons = [];
    this.supplyButtons = [];
    this.legalButtons = [];
    this.legalTabButtons = [];
    this.puzzleButtons = [];
    this.overlayButtons = [];
    this.profile = storage.getProfile();
    this.progress = storage.getProgress();
    this.currentLevel = null;
    this.currentImage = null;
    this.gameState = null;
    this.timeLeft = 0;
    this.lastTick = Date.now();
    this.drag = null;
    this.guideHint = null;
    this.overlay = null;
    this.successResult = null;
    this.snapPulses = [];
    this.fxParticles = [];
    this.settleAnimations = [];
    this.uiPressState = null;
    this.screenMotion = {
      screen: 'loading',
      startedAt: Date.now()
    };
    this.boardRect = null;
    this.selectedChapter = null;
    this.customLevels = [];
    this.customDraft = {
      imagePath: DEFAULT_CUSTOM_IMAGE_PATH,
      isDefault: true,
      title: DEFAULT_CUSTOM_TITLE,
      layoutIndex: 1,
      shareReady: false
    };
    this.customPreviewImage = null;
    this.uiSyncAt = 0;
    this.legalState = {
      type: 'privacy',
      title: '隐私政策',
      pages: [],
      pageIndex: 0
    };

    this.resizeCanvas();
    this.bindTouches();
  }

  resizeCanvas() {
    this.canvas.width = this.viewWidth * this.pixelRatio;
    this.canvas.height = this.viewHeight * this.pixelRatio;
  }

  bindTouches() {
    wx.onTouchStart((event) => {
      const touch = event.touches && event.touches[0];
      if (!touch) {
        return;
      }
      this.handleTouchStart(touch.clientX, touch.clientY);
    });

    wx.onTouchMove((event) => {
      const touch = event.touches && event.touches[0];
      if (!touch) {
        return;
      }
      this.handleTouchMove(touch.clientX, touch.clientY);
    });

    wx.onTouchEnd((event) => {
      const touch =
        (event.changedTouches && event.changedTouches[0]) ||
        (event.touches && event.touches[0]) ||
        { clientX: 0, clientY: 0 };
      this.handleTouchEnd(touch.clientX, touch.clientY);
    });
  }

  start() {
    if (wx.setPreferredFPS) {
      try {
        wx.setPreferredFPS(60);
      } catch (error) {
        logger.captureError('minigame_set_fps', error);
      }
    }

    storage.bootstrap();
    this.profile = storage.getProfile();
    this.progress = storage.getProgress();
    audioService.preload();
    this.switchToHome();
    logger.trackEvent('minigame_boot', {
      appId: getAccountInfo().appId || ''
    });
    this.loop();
  }

  loop() {
    const now = Date.now();
    const delta = Math.min(100, now - this.lastTick);
    this.lastTick = now;
    this.update(delta);
    this.render();

    const raf =
      this.canvas.requestAnimationFrame ||
      (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);

    if (raf) {
      raf.call(this.canvas, () => this.loop());
    } else {
      setTimeout(() => this.loop(), 16);
    }
  }

  update(delta) {
    if (this.toast && this.toast.expireAt <= Date.now()) {
      this.toast = null;
    }

    this.updateAnimationEffects(delta);

    if (Date.now() - this.uiSyncAt >= 1000 && this.screen !== 'loading') {
      this.uiSyncAt = Date.now();
      this.refreshProfile();
      if (this.screen === 'custom') {
        this.refreshCustomData();
        this.buildCustomLayout();
      } else if (this.screen === 'supply') {
        this.buildSupplyLayout();
      }
    }

    if (this.screen === 'puzzle' && this.overlay === null) {
      this.timeLeft -= delta / 1000;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.openFailOverlay();
      }
    }
  }

  showToast(message) {
    this.toast = {
      message,
      expireAt: Date.now() + 1800
    };
  }

  refreshProfile() {
    this.profile = storage.getProfile();
    this.progress = storage.getProgress();
  }

  switchToHome() {
    this.refreshProfile();
    this.screen = 'home';
    this.loadingText = '';
    this.overlay = null;
    this.triggerScreenMotion('home');
    audioService.stopAll();
    this.syncScreenAudio();
    this.clearPuzzleEffects();
    this.drag = null;
    this.currentLevel = null;
    this.currentImage = null;
    this.gameState = null;
    this.selectedChapter = null;
    this.buildHomeLayout();
    this.refreshHomeQuickActions();
    this.syncScreenAudio();
  }

  buildHomeLayout() {
    const cardX = 22;
    const cardW = this.viewWidth - 44;
    const heroY = 118;
    const buttonY = 356;
    const buttonH = 54;
    const gap = 14;
    const miniTop = 486;
    const miniGap = 12;
    const miniW = Math.floor((cardW - miniGap) / 2);
    const miniH = 46;

    const continueLevel = levelRepo.getLevelById(levelRepo.getContinueLevelId(this.progress));
    const firstLevel = levelRepo.getLevelById(levelRepo.getFirstLevelId());

    this.homeButtons = [
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
      }
    ];

    this.homeMiniButtons = [
      { key: 'signin', label: '每日签到', x: cardX, y: miniTop, w: miniW, h: miniH },
      { key: 'privacy', label: '隐私摘要', x: cardX + miniW + miniGap, y: miniTop, w: miniW, h: miniH },
      { key: 'agreement', label: '用户协议', x: cardX, y: miniTop + miniH + miniGap, w: miniW, h: miniH },
      {
        key: 'release',
        label: '发布检查',
        x: cardX + miniW + miniGap,
        y: miniTop + miniH + miniGap,
        w: miniW,
        h: miniH
      },
      {
        key: 'logs',
        label: '复制运行日志',
        x: cardX,
        y: miniTop + (miniH + miniGap) * 2,
        w: cardW,
        h: miniH
      }
    ];

    this.homeMeta = {
      heroX: cardX,
      heroY,
      heroW: cardW,
      heroH: 214,
      continueLevel
    };

    this.homeMiniButtons = [
      { key: 'chapter', label: '章节选关', x: cardX, y: miniTop, w: miniW, h: miniH },
      { key: 'custom', label: '自定义谜境', x: cardX + miniW + miniGap, y: miniTop, w: miniW, h: miniH },
      { key: 'signin', label: '每日签到', x: cardX, y: miniTop + miniH + miniGap, w: miniW, h: miniH },
      { key: 'privacy', label: '隐私摘要', x: cardX + miniW + miniGap, y: miniTop + miniH + miniGap, w: miniW, h: miniH },
      { key: 'agreement', label: '用户协议', x: cardX, y: miniTop + (miniH + miniGap) * 2, w: miniW, h: miniH },
      { key: 'more', label: '更多工具', x: cardX + miniW + miniGap, y: miniTop + (miniH + miniGap) * 2, w: miniW, h: miniH }
    ];

    this.homeMiniButtons = [
      { key: 'chapter', label: '章节选关', x: cardX, y: miniTop, w: miniW, h: miniH },
      { key: 'signin', label: '每日签到', x: cardX + miniW + miniGap, y: miniTop, w: miniW, h: miniH },
      { key: 'privacy', label: '隐私摘要', x: cardX, y: miniTop + miniH + miniGap, w: miniW, h: miniH },
      { key: 'agreement', label: '用户协议', x: cardX + miniW + miniGap, y: miniTop + miniH + miniGap, w: miniW, h: miniH },
      { key: 'release', label: '发布检查', x: cardX, y: miniTop + (miniH + miniGap) * 2, w: miniW, h: miniH },
      { key: 'logs', label: '复制日志', x: cardX + miniW + miniGap, y: miniTop + (miniH + miniGap) * 2, w: miniW, h: miniH }
    ];
  }

  overrideHomeMiniButtons() {
    const cardX = 22;
    const cardW = this.viewWidth - 44;
    const miniTop = 486;
    const miniGap = 12;
    const miniW = Math.floor((cardW - miniGap) / 2);
    const miniH = 46;

    this.homeMiniButtons = [
      { key: 'chapter', label: '章节选关', x: cardX, y: miniTop, w: miniW, h: miniH },
      { key: 'custom', label: '自定义谜境', x: cardX + miniW + miniGap, y: miniTop, w: miniW, h: miniH },
      { key: 'signin', label: '每日签到', x: cardX, y: miniTop + miniH + miniGap, w: miniW, h: miniH },
      { key: 'privacy', label: '隐私摘要', x: cardX + miniW + miniGap, y: miniTop + miniH + miniGap, w: miniW, h: miniH },
      { key: 'agreement', label: '用户协议', x: cardX, y: miniTop + (miniH + miniGap) * 2, w: miniW, h: miniH },
      { key: 'more', label: '更多工具', x: cardX + miniW + miniGap, y: miniTop + (miniH + miniGap) * 2, w: miniW, h: miniH }
    ];
  }

  refreshHomeQuickActions() {
    const cardX = 22;
    const cardW = this.viewWidth - 44;
    const miniTop = 486;
    const miniGap = 12;
    const miniW = Math.floor((cardW - miniGap) / 2);
    const miniH = 46;

    this.homeMiniButtons = [
      { key: 'chapter', label: '章节选关', x: cardX, y: miniTop, w: miniW, h: miniH },
      { key: 'custom', label: '自定义谜境', x: cardX + miniW + miniGap, y: miniTop, w: miniW, h: miniH },
      { key: 'supply', label: '谜境补给站', x: cardX, y: miniTop + miniH + miniGap, w: miniW, h: miniH },
      { key: 'signin', label: '每日签到', x: cardX + miniW + miniGap, y: miniTop + miniH + miniGap, w: miniW, h: miniH },
      { key: 'privacy', label: '隐私摘要', x: cardX, y: miniTop + (miniH + miniGap) * 2, w: miniW, h: miniH },
      { key: 'agreement', label: '用户协议', x: cardX + miniW + miniGap, y: miniTop + (miniH + miniGap) * 2, w: miniW, h: miniH }
    ];
  }

  switchToChapters() {
    this.refreshProfile();
    this.screen = 'chapters';
    this.overlay = null;
    this.drag = null;
    this.selectedChapter = null;
    this.triggerScreenMotion('chapters');
    this.buildChapterLayout();
    this.syncScreenAudio();
  }

  switchToLevels(chapterId) {
    const chapters = levelRepo.getChaptersWithProgress(this.progress);
    const chapter = chapters.find((item) => item.chapterId === chapterId);
    if (!chapter) {
      this.showToast('没有找到这个章节');
      return;
    }

    this.selectedChapter = chapter;
    this.screen = 'levels';
    this.overlay = null;
    this.drag = null;
    this.triggerScreenMotion('levels');
    this.buildLevelLayout();
    this.openChapterOverlay(chapter);
    this.syncScreenAudio();
  }

  openChapterOverlay(chapter) {
    if (!chapter) {
      this.overlay = null;
      this.overlayButtons = [];
      return;
    }

    this.overlay = {
      type: 'chapter',
      title: `${getSafeChapterTitle(chapter)} · 卷首旁白`,
      desc: getChapterSummary(chapter),
      chapterId: chapter.chapterId,
      buttons: [
        { key: 'start', label: '翻开这一卷' },
        { key: 'back', label: '返回章节' }
      ]
    };
    this.buildOverlayButtons();
    logger.trackEvent('minigame_chapter_overlay_show', {
      chapterId: chapter.chapterId
    });
  }

  buildChapterLayout() {
    const chapters = levelRepo.getChaptersWithProgress(this.progress);
    const width = this.viewWidth - 44;
    const startY = 120;
    const cardH = 94;
    const gap = 10;

    this.chapterButtons = chapters.map((chapter, index) => ({
      key: chapter.chapterId,
      chapter,
      x: 22,
      y: startY + index * (cardH + gap),
      w: width,
      h: cardH
    }));

    this.chapterButtons.push({
      key: 'back',
      x: 22,
      y: Math.min(this.viewHeight - 70, startY + chapters.length * (cardH + gap) + 8),
      w: width,
      h: 48
    });
  }

  buildLevelLayout() {
    if (!this.selectedChapter) {
      this.levelButtons = [];
      return;
    }

    const width = this.viewWidth - 44;
    const startY = 188;
    const rowH = 50;
    const gap = 8;

    this.levelButtons = this.selectedChapter.levels.map((level, index) => ({
      key: level.levelId,
      level,
      x: 22,
      y: startY + index * (rowH + gap),
      w: width,
      h: rowH
    }));

    this.levelButtons.push({
      key: 'back',
      x: 22,
      y: Math.min(this.viewHeight - 70, startY + this.selectedChapter.levels.length * (rowH + gap) + 6),
      w: width,
      h: 48
    });
  }

  refreshCustomData() {
    this.customLevels = levelRepo.getCustomLevelsWithProgress(this.progress);
  }

  ensureCustomPreview(path) {
    if (!path) {
      this.customPreviewImage = null;
      return;
    }

    this.loadImage(path)
      .then((image) => {
        if (this.customDraft && this.customDraft.imagePath === path) {
          this.customPreviewImage = image;
        }
      })
      .catch((error) => {
        logger.captureError('minigame_custom_preview', error, { path });
      });
  }

  switchToCustom() {
    this.refreshProfile();
    this.refreshCustomData();
    this.screen = 'custom';
    this.overlay = null;
    this.drag = null;
    this.selectedChapter = null;
    this.triggerScreenMotion('custom');
    if (!this.customDraft) {
      this.customDraft = {
        imagePath: DEFAULT_CUSTOM_IMAGE_PATH,
        isDefault: true,
        title: DEFAULT_CUSTOM_TITLE,
        layoutIndex: 1,
        shareReady: false
      };
    }
    this.ensureCustomPreview(this.customDraft.imagePath);
    this.buildCustomLayout();
    this.syncScreenAudio();
  }

  buildCustomLayout() {
    const width = this.viewWidth - 44;
    const rowGap = 12;
    const rowWidth = Math.floor((width - 12) / 2);
    const startY = 336;

    this.customButtons = [
      { key: 'use-default', label: '使用默认图', x: 22, y: startY, w: rowWidth, h: 48 },
      { key: 'pick-image', label: '相册选图', x: 22 + rowWidth + 12, y: startY, w: rowWidth, h: 48 },
      { key: 'layout', label: '切片规格', x: 22, y: startY + 48 + rowGap, w: rowWidth, h: 48 },
      { key: 'create', label: '生成谜境', x: 22 + rowWidth + 12, y: startY + 48 + rowGap, w: rowWidth, h: 48 },
      { key: 'import', label: '导入谜境码', x: 22, y: startY + (48 + rowGap) * 2, w: rowWidth, h: 48 },
      { key: 'back-home', label: '返回首页', x: 22 + rowWidth + 12, y: startY + (48 + rowGap) * 2, w: rowWidth, h: 48 }
    ];

    const listStartY = startY + (48 + rowGap) * 3 + 22;
    const cardH = 82;
    const listGap = 12;
    const visibleCount = Math.max(1, Math.min(3, Math.floor((this.viewHeight - listStartY - 30) / (cardH + listGap))));
    const visibleLevels = this.customLevels.slice(0, visibleCount);

    this.customItemButtons = [];
    visibleLevels.forEach((level, index) => {
      const y = listStartY + index * (cardH + listGap);
      this.customItemButtons.push({
        key: `play:${level.levelId}`,
        action: 'play',
        levelId: level.levelId,
        x: 22,
        y,
        w: width,
        h: cardH
      });
      this.customItemButtons.push({
        key: `share:${level.levelId}`,
        action: 'share',
        levelId: level.levelId,
        x: 22 + width - 146,
        y: y + 46,
        w: 64,
        h: 24
      });
      this.customItemButtons.push({
        key: `delete:${level.levelId}`,
        action: 'delete',
        levelId: level.levelId,
        x: 22 + width - 74,
        y: y + 46,
        w: 52,
        h: 24
      });
    });
  }

  switchToSupply() {
    this.refreshProfile();
    this.screen = 'supply';
    this.overlay = null;
    this.drag = null;
    this.triggerScreenMotion('supply');
    this.buildSupplyLayout();
    this.syncScreenAudio();
  }

  buildSupplyLayout() {
    const width = this.viewWidth - 44;
    const half = Math.floor((width - 12) / 2);
    const gap = 10;
    const rowH = 42;
    const rowCount = 6;
    const totalHeight = rowH * rowCount + gap * (rowCount - 1);
    const startY = Math.max(286, this.viewHeight - totalHeight - 70);

    this.supplyButtons = [
      { key: 'signin', label: '立即签到', x: 22, y: startY, w: half, h: rowH },
      { key: 'sound', label: this.profile.soundEnabled ? '关闭音效' : '开启音效', x: 22 + half + gap, y: startY, w: half, h: rowH },
      { key: 'energy-ad', label: '广告补 2 体力', x: 22, y: startY + rowH + gap, w: half, h: rowH },
      { key: 'unlock-ad', label: '广告补 1 定格符', x: 22 + half + gap, y: startY + rowH + gap, w: half, h: rowH },
      { key: 'guide-ad', label: '广告补 1 引路符', x: 22, y: startY + (rowH + gap) * 2, w: half, h: rowH },
      { key: 'custom', label: '前往自定义谜境', x: 22 + half + gap, y: startY + (rowH + gap) * 2, w: half, h: rowH },
      { key: 'privacy', label: '隐私摘要', x: 22, y: startY + (rowH + gap) * 3, w: half, h: rowH },
      { key: 'agreement', label: '用户协议', x: 22 + half + gap, y: startY + (rowH + gap) * 3, w: half, h: rowH },
      { key: 'release', label: '发布检查', x: 22, y: startY + (rowH + gap) * 4, w: half, h: rowH },
      { key: 'copy-logs', label: '复制运行日志', x: 22 + half + gap, y: startY + (rowH + gap) * 4, w: half, h: rowH },
      { key: 'clear-logs', label: '清空日志', x: 22, y: startY + (rowH + gap) * 5, w: half, h: rowH },
      { key: 'back-home', label: '返回首页', x: 22 + half + gap, y: startY + (rowH + gap) * 5, w: half, h: rowH }
    ];
  }

  switchToLegal(type) {
    this.refreshProfile();
    this.screen = 'legal';
    this.overlay = null;
    this.drag = null;
    this.triggerScreenMotion('legal');
    this.buildLegalLayout(type || 'privacy', 0);
    this.syncScreenAudio();
  }

  buildLegalLayout(type, pageIndex) {
    const safeType = ['privacy', 'agreement', 'release'].includes(type) ? type : 'privacy';
    const tabs = [
      { key: 'privacy', label: '隐私政策' },
      { key: 'agreement', label: '用户协议' },
      { key: 'release', label: '发布检查' }
    ];
    const titleMap = {
      privacy: '隐私政策',
      agreement: '用户协议',
      release: '发布检查'
    };

    const pages = this.buildLegalPages(safeType);
    const safePageIndex = clamp(pageIndex || 0, 0, Math.max(0, pages.length - 1));

    this.legalState = {
      type: safeType,
      title: titleMap[safeType],
      pages,
      pageIndex: safePageIndex
    };

    const tabY = 110;
    const gap = 12;
    const width = this.viewWidth - 44;
    const tabW = Math.floor((width - gap * 2) / 3);
    this.legalTabButtons = tabs.map((item, index) => ({
      key: item.key,
      label: item.label,
      x: 22 + index * (tabW + gap),
      y: tabY,
      w: tabW,
      h: 38
    }));

    const buttonY = this.viewHeight - 110;
    const half = Math.floor((width - gap) / 2);
    this.legalButtons = [
      { key: 'prev', label: '上一页', x: 22, y: buttonY, w: half, h: 44 },
      { key: 'next', label: '下一页', x: 22 + half + gap, y: buttonY, w: half, h: 44 },
      { key: 'copy', label: safeType === 'release' ? '复制摘要' : '复制联系', x: 22, y: buttonY + 56, w: half, h: 44 },
      { key: 'back', label: '返回补给站', x: 22 + half + gap, y: buttonY + 56, w: half, h: 44 }
    ];
  }

  buildLegalPages(type) {
    if (type === 'privacy' || type === 'agreement') {
      const sections = type === 'privacy' ? legal.privacyPolicy : legal.userAgreement;
      const pages = [
        {
          heading: type === 'privacy' ? '隐私政策概览' : '用户协议概览',
          lines: [
            `品牌：${legal.appName}`,
            `主体：${legal.companyName}`,
            `邮箱：${legal.contactEmail}`,
            `客服：${legal.supportWechat}`,
            `生效日期：${legal.effectiveDate}`
          ]
        }
      ];

      sections.forEach((section) => {
        pages.push({
          heading: section.title,
          lines: section.paragraphs || []
        });
      });
      return pages;
    }

    const checklist = release.getReleaseChecklist();
    const pages = [
      {
        heading: '检查汇总',
        lines: [
          `已就绪 ${checklist.summary.ready} / ${checklist.summary.total}`,
          `待补齐 ${checklist.summary.pending} 项`,
          '提审前请先补齐待办，再回到微信公众平台走审核流程。'
        ]
      }
    ];

    chunkArray(checklist.pendingItems, 3).forEach((group, index) => {
      pages.push({
        heading: `待补齐 ${index + 1}`,
        lines: group.map((item) => `${item.label}：${item.detail}`)
      });
    });
    chunkArray(checklist.readyItems, 3).forEach((group, index) => {
      pages.push({
        heading: `已就绪 ${index + 1}`,
        lines: group.map((item) => `${item.label}：${item.detail}`)
      });
    });
    pages.push({
      heading: '发布提醒',
      lines: checklist.tips || []
    });

    return pages;
  }

  async handleMoreTools() {
    try {
      const result = await actionSheetPromise(['发布检查', '复制运行日志']);
      if (result.tapIndex === 0) {
        logger.trackEvent('minigame_open_release_check');
        const checklist = release.getReleaseChecklist();
        const pendingText = checklist.pendingItems
          .slice(0, 4)
          .map((item) => `- ${item.label}`)
          .join('\n');
        wx.showModal({
          title: `发布检查 ${checklist.summary.ready}/${checklist.summary.total}`,
          content: pendingText || '当前关键项都已就绪，可以继续提审流程。',
          showCancel: false
        });
        return;
      }

      logger.trackEvent('minigame_copy_logs');
      wx.setClipboardData({
        data: logger.buildExportText(80),
        success: () => {
          this.showToast('运行日志已复制');
        }
      });
    } catch (error) {
      if (error && error.errMsg && error.errMsg.indexOf('cancel') > -1) {
        return;
      }
      logger.captureError('minigame_more_tools', error);
    }
  }

  async handleCustomUseDefault() {
    this.customDraft = Object.assign({}, this.customDraft, {
      imagePath: DEFAULT_CUSTOM_IMAGE_PATH,
      isDefault: true,
      title: DEFAULT_CUSTOM_TITLE,
      shareReady: false
    });
    this.customPreviewImage = null;
    this.ensureCustomPreview(this.customDraft.imagePath);
    this.showToast('已切回默认样图');
  }

  async handleCustomChooseImage() {
    try {
      const result = await chooseImagePromise();
      const filePath = result.tempFilePaths && result.tempFilePaths[0];
      if (!filePath) {
        return;
      }
      this.customDraft = Object.assign({}, this.customDraft, {
        imagePath: filePath,
        isDefault: false,
        title: `相册谜境 ${new Date().toLocaleDateString()}`,
        shareReady: false
      });
      this.customPreviewImage = null;
      this.ensureCustomPreview(filePath);
      logger.trackEvent('minigame_custom_choose_image');
      this.showToast('已选中新的相册图片');
    } catch (error) {
      if (error && error.errMsg && error.errMsg.indexOf('cancel') > -1) {
        return;
      }
      logger.captureError('minigame_custom_choose_image', error);
      this.showToast('选图失败');
    }
  }

  async handleCustomChooseLayout() {
    try {
      const result = await actionSheetPromise(CUSTOM_LAYOUT_OPTIONS.map((item) => item.label));
      this.customDraft = Object.assign({}, this.customDraft, {
        layoutIndex: result.tapIndex
      });
      this.buildCustomLayout();
      this.showToast(`已切换到 ${CUSTOM_LAYOUT_OPTIONS[result.tapIndex].label}`);
    } catch (error) {
      if (error && error.errMsg && error.errMsg.indexOf('cancel') > -1) {
        return;
      }
      logger.captureError('minigame_custom_choose_layout', error);
    }
  }

  async handleCustomCreateLevel() {
    const draft = this.customDraft;
    if (!draft || !draft.imagePath) {
      this.showToast('先选一张图片');
      return;
    }

    const layout = CUSTOM_LAYOUT_OPTIONS[draft.layoutIndex || 0] || CUSTOM_LAYOUT_OPTIONS[0];
    const createdAt = Date.now();
    wx.showLoading({
      title: '生成谜境中'
    });

    try {
      let sourcePath = draft.imagePath;
      if (!draft.isDefault) {
        try {
          const compressed = await compressImagePromise(draft.imagePath, 45);
          sourcePath = compressed.tempFilePath || sourcePath;
        } catch (error) {
          logger.captureError('minigame_custom_compress_image', error);
        }
      }

      let savedImagePath = '';
      try {
        savedImagePath = await imageUtil.persistTempFile(sourcePath, `custom_level_${createdAt}`);
      } catch (error) {
        if (!draft.isDefault) {
          throw error;
        }
        savedImagePath = sourcePath;
      }
      let shareImageBase64 = '';
      try {
        const rawBase64 = imageUtil.readFileBase64(savedImagePath);
        shareImageBase64 = rawBase64.length <= CUSTOM_SHARE_BASE64_LIMIT ? rawBase64 : '';
      } catch (error) {
        logger.captureError('minigame_custom_read_base64', error);
      }

      const level = customLevels.buildCustomLevel({
        title: draft.title || DEFAULT_CUSTOM_TITLE,
        rows: layout.rows,
        cols: layout.cols,
        timeLimit: layout.timeLimit,
        hints: layout.hints,
        imagePath: savedImagePath,
        shareImageBase64,
        authorName: '本地玩家',
        sourceType: draft.isDefault ? 'default' : 'album',
        createdAt
      });

      customLevels.upsertCustomLevel(level);
      this.customDraft = Object.assign({}, draft, {
        imagePath: savedImagePath,
        title: level.title,
        shareReady: !!shareImageBase64
      });
      this.customPreviewImage = null;
      this.ensureCustomPreview(savedImagePath);
      storage.setCurrentLevel(level.levelId);
      this.refreshProfile();
      this.refreshCustomData();
      this.buildCustomLayout();
      logger.trackEvent('minigame_custom_create_level', {
        levelId: level.levelId,
        rows: layout.rows,
        cols: layout.cols,
        shareReady: !!shareImageBase64
      });
      wx.hideLoading();

      const result = await modalPromise({
        title: '谜境已生成',
        content: shareImageBase64
          ? '新谜境已经保存。你可以立即入局，也可以稍后复制谜境码分享给朋友。'
          : '新谜境已经保存。当前图片较大，小游戏版暂时不建议生成分享码，但可以直接入局游玩。',
        confirmText: '立即入局',
        cancelText: '稍后'
      });

      if (result.confirm) {
        this.openLevel(level.levelId, true);
      }
    } catch (error) {
      wx.hideLoading();
      logger.captureError('minigame_custom_create_level', error);
      this.showToast(error.message || '生成失败');
    }
  }

  async handleCustomImportCode() {
    try {
      const clip = await getClipboardDataPromise();
      const rawCode = String((clip && clip.data) || '').trim();
      if (!rawCode) {
        this.showToast('剪贴板里还没有谜境码');
        return;
      }

      wx.showLoading({
        title: '导入谜境中'
      });
      const payload = customLevels.parseChallengeCode(rawCode);
      const createdAt = Date.now();
      const imagePath = imageUtil.writeBase64ToFile(payload.b, `imported_level_${createdAt}`);
      const level = customLevels.buildCustomLevel({
        title: payload.i || `好友谜境 ${createdAt}`,
        rows: payload.r,
        cols: payload.c,
        timeLimit: payload.t,
        hints: payload.h,
        imagePath,
        shareImageBase64: payload.b,
        authorName: payload.a || '好友',
        sourceType: 'imported',
        createdAt
      });

      customLevels.upsertCustomLevel(level);
      this.refreshProfile();
      this.refreshCustomData();
      this.buildCustomLayout();
      logger.trackEvent('minigame_custom_import_level', {
        levelId: level.levelId,
        rows: payload.r,
        cols: payload.c
      });
      wx.hideLoading();

      const result = await modalPromise({
        title: '导入成功',
        content: '好友谜境已经保存到本地列表，现在就可以直接入局。',
        confirmText: '立即入局',
        cancelText: '稍后'
      });

      if (result.confirm) {
        this.openLevel(level.levelId, true);
      }
    } catch (error) {
      wx.hideLoading();
      if (error && error.errMsg && error.errMsg.indexOf('cancel') > -1) {
        return;
      }
      logger.captureError('minigame_custom_import_level', error);
      this.showToast(error.message || '导入失败');
    }
  }

  handleCustomCopyCode(levelId) {
    try {
      const code = customLevels.buildChallengeCode(levelId);
      wx.setClipboardData({
        data: code,
        success: () => {
          logger.trackEvent('minigame_custom_copy_code', { levelId });
          this.showToast('谜境码已复制');
        }
      });
    } catch (error) {
      logger.captureError('minigame_custom_copy_code', error, { levelId });
      this.showToast(error.message || '当前谜境还不能分享');
    }
  }

  async handleCustomDelete(levelId) {
    const level = customLevels.getCustomLevelById(levelId);
    if (!level) {
      return;
    }

    const result = await modalPromise({
      title: '删除这段谜境',
      content: '删除后会移除本地图片和谜境配置，但不会影响已经发出去的谜境码。',
      confirmText: '删除',
      cancelText: '保留'
    });

    if (!result.confirm) {
      return;
    }

    const removed = customLevels.removeCustomLevel(levelId);
    if (removed && removed.customMeta && removed.customMeta.imagePath) {
      imageUtil.removeFileSafe(removed.customMeta.imagePath);
    }
    this.refreshProfile();
    this.refreshCustomData();
    this.buildCustomLayout();
    logger.trackEvent('minigame_custom_delete_level', { levelId });
    this.showToast('已删除这段谜境');
  }

  async openLevel(levelId, consumeEnergy) {
    const level = levelRepo.getLevelById(levelId);
    if (!level) {
      this.showToast('没有找到这段谜境');
      return;
    }

    if (consumeEnergy && level.energyCost > 0) {
      const consumeResult = storage.consumeEnergy(level.energyCost);
      if (!consumeResult.ok) {
        this.refreshProfile();
        this.showToast('体力不足，先回补给吧');
        return;
      }
    }

    this.refreshProfile();
    this.screen = 'loading';
    this.loadingText = `正在进入 ${getSafeLevelTitle(level)}...`;
    audioService.stopAll();
    this.syncScreenAudio();
    this.triggerScreenMotion('loading');
    this.currentLevel = level;
    this.gameState = gameEngine.createInitialState(level);
    this.guideHint = null;
    this.overlay = null;
    this.successResult = null;
    this.clearPuzzleEffects();
    this.timeLeft = level.timeLimit;
    storage.setCurrentLevel(level.levelId);
    logger.trackEvent('minigame_game_start', {
      levelId: level.levelId,
      rows: level.rows,
      cols: level.cols
    });

    this.currentImage = await this.loadImage(resolvePreviewImage(level));
    this.screen = 'puzzle';
    this.buildPuzzleLayout();
    this.syncScreenAudio();
    this.triggerScreenMotion('puzzle');
    this.openIntroOverlay();
  }

  openIntroOverlay() {
    if (!this.currentLevel || !this.currentLevel.introText) {
      this.overlay = null;
      this.overlayButtons = [];
      return;
    }

    this.overlay = {
      type: 'intro',
      title: `${getSafeLevelTitle(this.currentLevel)} · 开场`,
      desc: this.currentLevel.introText,
      buttons: [
        { key: 'start', label: '进入谜境' },
        { key: 'home', label: '返回首页' }
      ]
    };
    this.buildOverlayButtons();
    logger.trackEvent('minigame_intro_show', {
      levelId: this.currentLevel.levelId
    });
  }

  buildPuzzleLayout() {
    if (!this.currentLevel) {
      return;
    }

    const safeWidth = this.viewWidth - 28;
    const boardTop = 112;
    const bottomSpace = 220;
    const maxBoardW = safeWidth - 24;
    const maxBoardH = this.viewHeight - boardTop - bottomSpace;
    const cellSize = Math.floor(
      Math.min(maxBoardW / this.currentLevel.cols, maxBoardH / this.currentLevel.rows)
    );
    const boardW = cellSize * this.currentLevel.cols;
    const boardH = cellSize * this.currentLevel.rows;
    const boardX = Math.floor((this.viewWidth - boardW) / 2);
    const boardY = boardTop;

    this.boardRect = {
      x: boardX,
      y: boardY,
      w: boardW,
      h: boardH,
      cell: cellSize
    };

    const buttonGap = 12;
    const buttonW = Math.floor((this.viewWidth - 44 - buttonGap * 2) / 3);
    const secondRowW = Math.floor((this.viewWidth - 44 - buttonGap) / 2);
    const firstRowY = boardY + boardH + 22;
    const secondRowY = firstRowY + 54 + buttonGap;

    this.puzzleButtons = [
      { key: 'hint', label: `提示 ${this.gameState.hintsLeft}`, x: 22, y: firstRowY, w: buttonW, h: 54 },
      { key: 'lock', label: `定格 ${this.profile.unlockDragTools}`, x: 22 + buttonW + buttonGap, y: firstRowY, w: buttonW, h: 54 },
      { key: 'guide', label: `引路 ${this.profile.guideHintTools}`, x: 22 + (buttonW + buttonGap) * 2, y: firstRowY, w: buttonW, h: 54 },
      { key: 'reset', label: '重置谜境', x: 22, y: secondRowY, w: secondRowW, h: 50 },
      { key: 'home', label: '返回主界面', x: 22 + secondRowW + buttonGap, y: secondRowY, w: secondRowW, h: 50 }
    ];
  }

  loadImage(src) {
    if (!src) {
      return Promise.resolve(null);
    }

    if (this.images[src]) {
      return this.images[src];
    }

    const candidates = getMiniGameImageCandidates(src);
    let cachedPromise = null;
    const promise = new Promise((resolve) => {
      const tryLoad = (index) => {
        if (index >= candidates.length) {
          logger.captureError('minigame_image_load', new Error('Image load failed'), {
            src,
            candidates
          });
          resolve(null);
          return;
        }

        const candidate = candidates[index];
        const image = this.canvas.createImage ? this.canvas.createImage() : wx.createImage();
        image.onload = () => {
          if (cachedPromise) {
            cachedPromise.__resolvedImage = image;
            cachedPromise.__resolvedSrc = candidate;
          }
          candidates.forEach((key) => {
            this.images[key] = cachedPromise;
          });
          resolve(image);
        };
        image.onerror = () => {
          tryLoad(index + 1);
        };
        image.src = candidate;
      };

      tryLoad(0);
    });
    cachedPromise = promise;
    candidates.forEach((key) => {
      this.images[key] = promise;
    });
    return promise;
  }

  getResolvedImage(src) {
    if (!src) {
      return null;
    }
    const candidates = getMiniGameImageCandidates(src);
    const cached = candidates.map((candidate) => this.images[candidate]).find(Boolean);
    if (!cached) {
      this.loadImage(src);
      return null;
    }
    return cached.__resolvedImage || null;
  }

  handleTouchStart(x, y) {
    if (
      this.screen === 'home' ||
      this.screen === 'chapters' ||
      this.screen === 'levels' ||
      this.screen === 'custom' ||
      this.screen === 'supply' ||
      this.screen === 'legal'
    ) {
      this.touchStart = { x, y };
      this.capturePressState(x, y);
      return;
    }

    if (this.screen !== 'puzzle') {
      this.clearPressState();
      return;
    }

    if (this.overlay) {
      this.touchStart = { x, y };
      this.clearPressState();
      return;
    }

    const board = this.boardRect;
    if (!board) {
      return;
    }

    if (x >= board.x && x <= board.x + board.w && y >= board.y && y <= board.y + board.h) {
      const col = clamp(Math.floor((x - board.x) / board.cell), 0, this.currentLevel.cols - 1);
      const row = clamp(Math.floor((y - board.y) / board.cell), 0, this.currentLevel.rows - 1);
      const slot = row * this.currentLevel.cols + col + 1;
      const pieceId = this.gameState.slots[slot];
      const piece = this.gameState.pieces[pieceId];
      if (!piece) {
        return;
      }
      if (piece.locked) {
        this.showToast('这块碎片已经被定格了');
        return;
      }
      this.clearPressState();
      const group = this.gameState.groups[piece.groupId];
      this.drag = {
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

    this.touchStart = { x, y };
    this.clearPressState();
  }

  handleTouchMove(x, y) {
    if (!this.drag) {
      if (
        this.uiPressState &&
        this.touchStart &&
        (Math.abs(x - this.touchStart.x) > 12 || Math.abs(y - this.touchStart.y) > 12)
      ) {
        this.clearPressState();
      }
      return;
    }

    this.drag.dx = x - this.drag.startX;
    this.drag.dy = y - this.drag.startY;
  }

  handleTouchEnd(x, y) {
    if (this.screen === 'home') {
      this.clearPressState();
      this.handleHomeTap(x, y);
      return;
    }

    if (this.screen === 'chapters') {
      this.clearPressState();
      this.handleChapterTap(x, y);
      return;
    }

    if (this.screen === 'levels') {
      this.clearPressState();
      this.handleLevelTap(x, y);
      return;
    }

    if (this.screen === 'custom') {
      this.clearPressState();
      this.handleCustomTap(x, y);
      return;
    }

    if (this.screen === 'supply') {
      this.clearPressState();
      this.handleSupplyTap(x, y);
      return;
    }

    if (this.screen === 'legal') {
      this.clearPressState();
      this.handleLegalTap(x, y);
      return;
    }

    if (this.screen !== 'puzzle') {
      this.clearPressState();
      return;
    }

    if (this.overlay) {
      this.clearPressState();
      this.handleOverlayTap(x, y);
      return;
    }

    if (this.drag) {
      const board = this.boardRect;
      const draggedPieceId = this.drag.pieceId;
      const beforePieceSlots = this.capturePieceSlotSnapshot();
      const dragSnapshot = {
        dx: this.drag.dx,
        dy: this.drag.dy,
        groupPieceIds: this.drag.groupPieceIds ? this.drag.groupPieceIds.slice() : [draggedPieceId]
      };
      const feedbackBeforeMove = this.capturePuzzleFeedback(draggedPieceId);
      const rowDelta = Math.round(this.drag.dy / board.cell);
      const colDelta = Math.round(this.drag.dx / board.cell);
      const moved = gameEngine.moveGroup(
        this.currentLevel,
        this.gameState,
        draggedPieceId,
        rowDelta,
        colDelta
      );
      this.drag = null;
      if (moved) {
        this.guideHint = null;
        this.startSettleAnimation(dragSnapshot, rowDelta, colDelta);
        this.startPassiveSettleAnimations(beforePieceSlots, dragSnapshot.groupPieceIds);
        this.triggerMoveFeedback(feedbackBeforeMove, draggedPieceId);
        logger.trackEvent('minigame_group_drag', {
          levelId: this.currentLevel.levelId,
          rowDelta,
          colDelta
        });
        if (gameEngine.isComplete(this.gameState)) {
          this.playSuccessCelebration();
          this.openSuccessOverlay();
        }
      }
      return;
    }

    this.handlePuzzleTap(x, y);
  }

  handleHomeTap(x, y) {
    const button = this.homeButtons.concat(this.homeMiniButtons).find((item) => hitButton(item, x, y));
    if (!button) {
      return;
    }

    if (button.key === 'continue') {
      const levelId = levelRepo.getContinueLevelId(this.progress);
      logger.trackEvent('minigame_home_continue', { levelId });
      this.openLevel(levelId, true);
      return;
    }

    if (button.key === 'start') {
      const levelId = levelRepo.getFirstLevelId();
      logger.trackEvent('minigame_home_start', { levelId });
      this.openLevel(levelId, true);
      return;
    }

    if (button.key === 'chapter') {
      logger.trackEvent('minigame_open_chapters');
      this.switchToChapters();
      return;
    }

    if (button.key === 'custom') {
      logger.trackEvent('minigame_open_custom');
      this.switchToCustom();
      return;
    }

    if (button.key === 'supply') {
      logger.trackEvent('minigame_open_supply');
      this.switchToSupply();
      return;
    }

    if (button.key === 'signin') {
      const result = storage.claimDailySignIn();
      this.refreshProfile();
      if (!result.ok) {
        this.showToast('今天已经签到过了');
      } else {
        logger.trackEvent('minigame_sign_in');
        this.showToast('+3体力 +1定格符 +1引路符');
      }
      return;
    }

    if (button.key === 'privacy') {
      logger.trackEvent('minigame_open_privacy');
      this.switchToLegal('privacy');
      return;
      wx.showModal({
        title: '隐私摘要',
        content: '相册图片默认仅保存在本地。只有你主动复制谜境码时，图片压缩数据才会通过剪贴板分享。',
        showCancel: false
      });
      return;
    }

    if (button.key === 'agreement') {
      logger.trackEvent('minigame_open_agreement');
      this.switchToLegal('agreement');
      return;
      wx.showModal({
        title: '用户协议摘要',
        content: '请确保自定义图片拥有合法使用权。虚拟资源仅限游戏内使用，广告奖励以实际发放为准。',
        showCancel: false
      });
      return;
    }

    if (button.key === 'more') {
      this.handleMoreTools();
      return;
    }

    if (button.key === 'release') {
      logger.trackEvent('minigame_open_release_check');
      const checklist = release.getReleaseChecklist();
      const pendingText = checklist.pendingItems
        .slice(0, 4)
        .map((item) => `- ${item.label}`)
        .join('\n');
      wx.showModal({
        title: `发布检查 ${checklist.summary.ready}/${checklist.summary.total}`,
        content: pendingText || '当前关键项都已就绪，可以继续提审流程。',
        showCancel: false
      });
      return;
    }

    if (button.key === 'logs') {
      logger.trackEvent('minigame_copy_logs');
      wx.setClipboardData({
        data: logger.buildExportText(80),
        success: () => {
          this.showToast('运行日志已复制');
        }
      });
    }
  }

  handleChapterTap(x, y) {
    const button = this.chapterButtons.find((item) => hitButton(item, x, y));
    if (!button) {
      return;
    }

    if (button.key === 'back') {
      logger.trackEvent('minigame_back_home_from_chapters');
      this.switchToHome();
      return;
    }

    logger.trackEvent('minigame_select_chapter', {
      chapterId: button.chapter.chapterId
    });
    this.switchToLevels(button.chapter.chapterId);
  }

  handleLevelTap(x, y) {
    if (this.overlay && this.overlay.type === 'chapter') {
      this.handleOverlayTap(x, y);
      return;
    }

    const button = this.levelButtons.find((item) => hitButton(item, x, y));
    if (!button) {
      return;
    }

    if (button.key === 'back') {
      logger.trackEvent('minigame_back_chapters_from_levels', {
        chapterId: this.selectedChapter && this.selectedChapter.chapterId
      });
      this.switchToChapters();
      return;
    }

    const level = button.level;
    if (!level) {
      return;
    }

    if (!level.unlocked) {
      this.showToast('这一关还没有解锁');
      return;
    }

    logger.trackEvent('minigame_select_level', {
      chapterId: level.chapterId,
      levelId: level.levelId
    });
    this.openLevel(level.levelId, true);
  }

  handleCustomTap(x, y) {
    const actionButton = this.customButtons.find((item) => hitButton(item, x, y));
    if (actionButton) {
      if (actionButton.key === 'use-default') {
        this.handleCustomUseDefault();
        return;
      }
      if (actionButton.key === 'pick-image') {
        this.handleCustomChooseImage();
        return;
      }
      if (actionButton.key === 'layout') {
        this.handleCustomChooseLayout();
        return;
      }
      if (actionButton.key === 'create') {
        this.handleCustomCreateLevel();
        return;
      }
      if (actionButton.key === 'import') {
        this.handleCustomImportCode();
        return;
      }
      if (actionButton.key === 'back-home') {
        this.switchToHome();
      }
      return;
    }

    const itemButton = this.customItemButtons
      .slice()
      .reverse()
      .find((item) => hitButton(item, x, y));
    if (!itemButton) {
      return;
    }

    if (itemButton.action === 'play') {
      logger.trackEvent('minigame_custom_play_level', { levelId: itemButton.levelId });
      this.openLevel(itemButton.levelId, true);
      return;
    }

    if (itemButton.action === 'share') {
      this.handleCustomCopyCode(itemButton.levelId);
      return;
    }

    if (itemButton.action === 'delete') {
      this.handleCustomDelete(itemButton.levelId);
    }
  }

  handleSupplyTap(x, y) {
    const button = this.supplyButtons.find((item) => hitButton(item, x, y));
    if (!button) {
      return;
    }

    if (button.key === 'signin') {
      const result = storage.claimDailySignIn();
      this.refreshProfile();
      this.buildSupplyLayout();
      if (!result.ok) {
        this.showToast('今天已经签到过了');
      } else {
        logger.trackEvent('minigame_supply_sign_in');
        this.showToast('+3体力 +1定格符 +1引路符');
      }
      return;
    }

    if (button.key === 'sound') {
      const profile = storage.saveSoundEnabled(!this.profile.soundEnabled);
      this.profile = profile;
      this.buildSupplyLayout();
      logger.trackEvent('minigame_supply_toggle_sound', {
        enabled: !!profile.soundEnabled
      });
      this.showToast(profile.soundEnabled ? '音效已开启' : '音效已关闭');
      return;
    }

    if (button.key === 'energy-ad') {
      adService.showRewardedAction('2 点体力').then((granted) => {
        if (!granted) {
          this.showToast('没有获得体力奖励');
          return;
        }
        storage.addEnergy(2);
        this.refreshProfile();
        this.buildSupplyLayout();
        logger.trackEvent('minigame_supply_energy_reward');
        this.showToast('体力 +2');
      });
      return;
    }

    if (button.key === 'unlock-ad') {
      adService.showRewardedAction('1 个定格符').then((granted) => {
        if (!granted) {
          this.showToast('没有获得定格符');
          return;
        }
        storage.addUnlockDragTools(1);
        this.refreshProfile();
        this.buildSupplyLayout();
        logger.trackEvent('minigame_supply_unlock_reward');
        this.showToast('定格符 +1');
      });
      return;
    }

    if (button.key === 'guide-ad') {
      adService.showRewardedAction('1 个引路符').then((granted) => {
        if (!granted) {
          this.showToast('没有获得引路符');
          return;
        }
        storage.addGuideHintTools(1);
        this.refreshProfile();
        this.buildSupplyLayout();
        logger.trackEvent('minigame_supply_guide_reward');
        this.showToast('引路符 +1');
      });
      return;
    }

    if (button.key === 'custom') {
      this.switchToCustom();
      return;
    }

    if (button.key === 'privacy') {
      this.switchToLegal('privacy');
      return;
    }

    if (button.key === 'agreement') {
      this.switchToLegal('agreement');
      return;
    }

    if (button.key === 'release') {
      this.switchToLegal('release');
      return;
    }

    if (button.key === 'copy-logs') {
      wx.setClipboardData({
        data: logger.buildExportText(80),
        success: () => {
          logger.trackEvent('minigame_supply_copy_logs');
          this.showToast('运行日志已复制');
        }
      });
      return;
    }

    if (button.key === 'clear-logs') {
      wx.showModal({
        title: '清空运行日志',
        content: '清空后会移除本地事件和错误记录，适合重新开始排查。',
        success: (res) => {
          if (!res.confirm) {
            return;
          }
          logger.clearLogs();
          logger.trackEvent('minigame_supply_clear_logs');
          this.showToast('运行日志已清空');
        }
      });
      return;
    }

    if (button.key === 'back-home') {
      this.switchToHome();
    }
  }

  handleLegalTap(x, y) {
    const tabButton = this.legalTabButtons.find((item) => hitButton(item, x, y));
    if (tabButton) {
      if (tabButton.key !== this.legalState.type) {
        logger.trackEvent('minigame_legal_switch_tab', {
          type: tabButton.key
        });
      }
      this.buildLegalLayout(tabButton.key, 0);
      return;
    }

    const actionButton = this.legalButtons.find((item) => hitButton(item, x, y));
    if (!actionButton) {
      return;
    }

    if (actionButton.key === 'prev') {
      if (this.legalState.pageIndex > 0) {
        this.buildLegalLayout(this.legalState.type, this.legalState.pageIndex - 1);
      } else {
        this.showToast('已经是第一页');
      }
      return;
    }

    if (actionButton.key === 'next') {
      if (this.legalState.pageIndex < this.legalState.pages.length - 1) {
        this.buildLegalLayout(this.legalState.type, this.legalState.pageIndex + 1);
      } else {
        this.showToast('已经是最后一页');
      }
      return;
    }

    if (actionButton.key === 'copy') {
      if (this.legalState.type === 'release') {
        const checklist = release.getReleaseChecklist();
        const summary = [
          `发布检查 ${checklist.summary.ready}/${checklist.summary.total}`,
          '',
          '待补齐：',
          ...checklist.pendingItems.map((item) => `- ${item.label}: ${item.detail}`),
          '',
          '提醒：',
          ...checklist.tips.map((item) => `- ${item}`)
        ].join('\n');
        wx.setClipboardData({
          data: summary,
          success: () => this.showToast('发布摘要已复制')
        });
      } else {
        const contact = [
          `品牌：${legal.appName}`,
          `主体：${legal.companyName}`,
          `邮箱：${legal.contactEmail}`,
          `客服：${legal.supportWechat}`,
          `生效日期：${legal.effectiveDate}`
        ].join('\n');
        wx.setClipboardData({
          data: contact,
          success: () => this.showToast('联系信息已复制')
        });
      }
      return;
    }

    if (actionButton.key === 'back') {
      this.switchToSupply();
    }
  }

  handlePuzzleTap(x, y) {
    const button = this.puzzleButtons.find((item) => hitButton(item, x, y));
    if (!button) {
      return;
    }

    if (button.key === 'hint') {
      this.useHint();
      return;
    }

    if (button.key === 'lock') {
      this.useLockTool();
      return;
    }

    if (button.key === 'guide') {
      this.useGuideTool();
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
          gameEngine.resetBoard(this.currentLevel, this.gameState);
          this.timeLeft = this.currentLevel.timeLimit;
          this.guideHint = null;
          this.clearPuzzleEffects();
          logger.trackEvent('minigame_reset_level', {
            levelId: this.currentLevel.levelId
          });
          this.showToast('谜境已经重置');
        }
      });
      return;
    }

    if (button.key === 'home') {
      logger.trackEvent('minigame_back_home_from_game', {
        levelId: this.currentLevel.levelId
      });
      this.switchToHome();
    }
  }

  useHint() {
    const applyHint = () => {
      const fixedPieceId = gameEngine.autoPlaceOne(this.currentLevel, this.gameState);
      if (!fixedPieceId) {
        this.showToast('已经非常接近揭晓了');
        return;
      }
      this.guideHint = null;
      logger.trackEvent('minigame_use_hint', {
        levelId: this.currentLevel.levelId,
        pieceId: fixedPieceId
      });
      if (gameEngine.isComplete(this.gameState)) {
        this.playSuccessCelebration();
        this.openSuccessOverlay();
      } else {
        this.showToast('系统帮你归位了一块碎片');
      }
    };

    if (this.gameState.hintsLeft > 0) {
      this.gameState.hintsLeft -= 1;
      applyHint();
      return;
    }

    adService.showRewardedAction('额外提示').then((granted) => {
      if (!granted) {
        this.showToast('没有获得额外提示');
        return;
      }
      applyHint();
    });
  }

  useLockTool() {
    const lockableIds = gameEngine.getLockableCorrectPieceIds(this.gameState);
    if (lockableIds.length === 0) {
      this.showToast('当前没有可定格的正确碎片');
      return;
    }

    const consumeResult = storage.consumeUnlockDragTool(1);
    if (!consumeResult.ok) {
      this.refreshProfile();
      this.showToast('定格符不足');
      return;
    }

    const lockedIds = gameEngine.lockCorrectPieces(this.currentLevel, this.gameState);
    this.refreshProfile();
    this.playFeedbackCue('lock');
    logger.trackEvent('minigame_use_lock_tool', {
      levelId: this.currentLevel.levelId,
      lockedCount: lockedIds.length
    });
    this.showToast(`已定格 ${lockedIds.length} 块碎片`);
  }

  useGuideTool() {
    const hint = gameEngine.getGuideHint(this.currentLevel, this.gameState);
    if (!hint) {
      this.showToast('当前没有合适的引路提示');
      return;
    }

    const consumeResult = storage.consumeGuideHintTool(1);
    if (!consumeResult.ok) {
      this.refreshProfile();
      this.showToast('引路符不足');
      return;
    }

    this.guideHint = hint;
    this.refreshProfile();
    logger.trackEvent('minigame_use_guide_tool', {
      levelId: this.currentLevel.levelId,
      pieceId: hint.pieceId,
      targetSlot: hint.targetSlot
    });
    this.playFeedbackCue('guide');
    this.showToast('已标出下一块可接边碎片');
  }

  openFailOverlay() {
    logger.trackEvent('minigame_level_fail', {
      levelId: this.currentLevel.levelId,
      moves: this.gameState.moves
    });
    const buttons = [];
    if (!this.gameState.revived) {
      buttons.push({ key: 'revive', label: '复活 +15秒' });
    }
    buttons.push({ key: 'retry', label: '重新入局' });
    buttons.push({ key: 'home', label: '回到首页' });

    this.overlay = {
      type: 'fail',
      title: '谜境暂未揭晓',
      desc: '时间用尽了，你可以复活继续，也可以重新开始这一局。',
      buttons
    };
    this.buildOverlayButtons();
  }

  openSuccessOverlay() {
    if (this.overlay && this.overlay.type === 'success') {
      return;
    }

    const result = storage.updateLevelResult({
      levelId: this.currentLevel.levelId,
      success: true,
      moves: this.gameState.moves,
      remainingTime: Math.ceil(this.timeLeft)
    });
    this.refreshProfile();
    this.successResult = result;
    const storyText = this.currentLevel && this.currentLevel.outroText;
    this.overlay = {
      type: 'success',
      title: '谜境已经拼合',
      desc: '你可以先欣赏整张图，准备好后再进入下一关。',
      buttons: [
        { key: 'next', label: result.nextLevelId ? '进入下一关' : '返回首页' },
        { key: 'home', label: '主界面' }
      ]
    };
    if (this.overlay && this.overlay.type === 'success') {
      this.overlay.title = '谜境已经拼合';
      this.overlay.desc = storyText
        ? '完整画面已经回到眼前。你可以先停留欣赏，准备好了再揭晓这一回故事。'
        : '完整画面已经回到眼前。你可以先停留欣赏，再决定是否进入下一回。';
      this.overlay.storyTitle = `${getSafeLevelTitle(this.currentLevel)} · 这一回故事`;
      this.overlay.storyPhase = storyText ? 'admire' : 'story';
      this.overlay.buttons = storyText
        ? [
            { key: 'story', label: '揭晓这一回' },
            { key: 'home', label: '留在主界面' }
          ]
        : [
            { key: 'next', label: result.nextLevelId ? '进入下一回' : '返回首页' },
            { key: 'home', label: '留在主界面' }
          ];
    }
    logger.trackEvent('minigame_level_success', {
      levelId: this.currentLevel.levelId,
      moves: this.gameState.moves,
      timeLeft: Math.ceil(this.timeLeft),
      stars: result.rewards.stars
    });
    this.buildOverlayButtons();
  }

  buildOverlayButtons() {
    if (!this.overlay) {
      this.overlayButtons = [];
      return;
    }

    const width = this.viewWidth - 44;
    const buttonGap = 12;
    const buttonCount = this.overlay.buttons.length;
    const singleWidth = buttonCount === 1 ? width : Math.floor((width - buttonGap) / 2);

    this.overlayButtons = this.overlay.buttons.map((item, index) => ({
      key: item.key,
      label: item.label,
      x: 22 + Math.min(index, 1) * (singleWidth + buttonGap),
      y: this.viewHeight - 112 - (index >= 2 ? 62 : 0),
      w: singleWidth,
      h: 52
    }));
  }

  handleOverlayTap(x, y) {
    const button = this.overlayButtons.find((item) => hitButton(item, x, y));
    if (!button) {
      return;
    }

    if (this.overlay.type === 'intro') {
      if (button.key === 'start') {
        logger.trackEvent('minigame_intro_confirm', {
          levelId: this.currentLevel && this.currentLevel.levelId
        });
        this.overlay = null;
        this.overlayButtons = [];
        return;
      }

      if (button.key === 'home') {
        this.switchToHome();
      }
      return;
    }

    if (this.overlay.type === 'chapter') {
      if (button.key === 'start') {
        logger.trackEvent('minigame_chapter_overlay_confirm', {
          chapterId: this.selectedChapter && this.selectedChapter.chapterId
        });
        this.overlay = null;
        this.overlayButtons = [];
        return;
      }

      if (button.key === 'back') {
        this.switchToChapters();
      }
      return;
    }

    if (this.overlay.type === 'fail') {
      if (button.key === 'revive') {
        adService.showRewardedAction('15 秒加时').then((granted) => {
          if (!granted) {
            this.showToast('没有获得复活奖励');
            return;
          }
          this.gameState.revived = true;
          this.timeLeft += 15;
          this.overlay = null;
          this.overlayButtons = [];
          logger.trackEvent('minigame_revive_success', {
            levelId: this.currentLevel.levelId
          });
        });
        return;
      }

      if (button.key === 'retry') {
        logger.trackEvent('minigame_retry_level', {
          levelId: this.currentLevel.levelId
        });
        this.openLevel(this.currentLevel.levelId, true);
        return;
      }

      if (button.key === 'home') {
        this.switchToHome();
      }
      return;
    }

    if (this.overlay.type === 'success') {
      if (button.key === 'story') {
        this.activateSuccessStoryOverlay();
        return;
      }

      if (button.key === 'next') {
        const nextLevelId = this.successResult && this.successResult.nextLevelId;
        if (nextLevelId) {
          logger.trackEvent('minigame_next_level', {
            levelId: this.currentLevel.levelId,
            nextLevelId
          });
          this.openLevel(nextLevelId, true);
        } else {
          this.switchToHome();
        }
        return;
      }

      if (button.key === 'home') {
        this.switchToHome();
      }
    }
  }

  render() {
    const ctx = this.ctx;
    if (ctx.setTransform) {
      ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    }
    ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);
    this.drawBackground();

    if (this.screen === 'loading') {
      this.drawLoading();
    } else if (this.screen === 'home') {
      this.drawHome();
    } else if (this.screen === 'chapters') {
      this.drawChapters();
    } else if (this.screen === 'levels') {
      this.drawLevels();
    } else if (this.screen === 'custom') {
      this.drawCustom();
    } else if (this.screen === 'supply') {
      this.drawSupplyPanel();
    } else if (this.screen === 'legal') {
      this.drawLegalPanel();
    } else if (this.screen === 'puzzle') {
      this.drawPuzzle();
    }

    this.drawToast();
  }

  drawBackground() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.viewHeight);
    gradient.addColorStop(0, '#04131f');
    gradient.addColorStop(0.45, '#0a2c3a');
    gradient.addColorStop(1, '#04111d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);

    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#73f0ff';
    ctx.beginPath();
    ctx.arc(this.viewWidth * 0.18, 120, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a96ff';
    ctx.beginPath();
    ctx.arc(this.viewWidth * 0.82, 220, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawLoading() {
    drawText(this.ctx, '谜境拼图', this.viewWidth / 2, this.viewHeight * 0.32, 34, '#e6fbff', 'center', 'bold');
    drawText(this.ctx, this.loadingText, this.viewWidth / 2, this.viewHeight * 0.44, 16, 'rgba(230,251,255,0.82)', 'center');
  }

  drawHome() {
    const ctx = this.ctx;
    drawText(ctx, '谜境拼图', this.viewWidth / 2, 42, 34, '#eafcff', 'center', 'bold');
    drawText(ctx, '小游戏迁移版 · 先把主线拼图跑通', this.viewWidth / 2, 82, 15, 'rgba(230,251,255,0.72)', 'center');

    const hero = this.homeMeta;
    drawGlassCard(ctx, hero.heroX, hero.heroY, hero.heroW, hero.heroH, 28);
    drawText(ctx, '当前档案', hero.heroX + 18, hero.heroY + 18, 16, '#dffcff', 'left', 'bold');
    drawText(
      ctx,
      `${this.profile.energy}/${this.profile.maxEnergy} 体力 · ${this.profile.coins} 金币`,
      hero.heroX + hero.heroW - 18,
      hero.heroY + 18,
      13,
      'rgba(230,251,255,0.78)',
      'right'
    );

    const continueLevel = hero.continueLevel;
    drawText(
      ctx,
      continueLevel ? getLevelTitle(continueLevel) : '等待开启第一段谜境',
      hero.heroX + 18,
      hero.heroY + 58,
      24,
      '#f3ffff',
      'left',
      'bold'
    );
    drawText(
      ctx,
      continueLevel ? getChapterTitle(continueLevel) : '倩女幽魂 · 第一章',
      hero.heroX + 18,
      hero.heroY + 94,
      15,
      'rgba(230,251,255,0.68)'
    );
    drawParagraph(
      ctx,
      '当前已经迁成微信小游戏入口。现在可以直接继续主线、体验拖拽拼图、通关后进入下一关。',
      hero.heroX + 18,
      hero.heroY + 126,
      hero.heroW - 36,
      14,
      'rgba(230,251,255,0.78)',
      22,
      3
    );

    this.homeButtons.forEach((button) => this.drawButton(button, button.primary));
    this.homeMiniButtons.forEach((button) => this.drawButton(button, false, true));
  }

  drawCustom() {
    const ctx = this.ctx;
    const draft = this.customDraft || {};
    const layout = CUSTOM_LAYOUT_OPTIONS[draft.layoutIndex || 0] || CUSTOM_LAYOUT_OPTIONS[0];

    drawText(ctx, '自定义谜境', this.viewWidth / 2, 36, 32, '#eafcff', 'center', 'bold');
    drawText(ctx, '选图后自动生成关卡，也可以从剪贴板导入好友谜境码', this.viewWidth / 2, 76, 14, 'rgba(230,251,255,0.72)', 'center');

    drawGlassCard(ctx, 18, 108, this.viewWidth - 36, 212, 28);

    const previewX = 34;
    const previewY = 128;
    const previewSize = 150;
    fillRoundRect(ctx, previewX, previewY, previewSize, previewSize, 22, 'rgba(6, 24, 36, 0.78)', 'rgba(142, 235, 255, 0.12)');

    if (draft.imagePath && !this.customPreviewImage) {
      this.ensureCustomPreview(draft.imagePath);
    }

    if (this.customPreviewImage) {
      const image = this.customPreviewImage;
      const side = Math.min(image.width, image.height);
      const offsetX = (image.width - side) / 2;
      const offsetY = (image.height - side) / 2;
      ctx.drawImage(image, offsetX, offsetY, side, side, previewX, previewY, previewSize, previewSize);
    } else {
      drawText(ctx, '等待预览图', previewX + previewSize / 2, previewY + 56, 16, 'rgba(230,251,255,0.7)', 'center', 'bold');
      drawParagraph(ctx, '默认样图或相册图片会显示在这里。', previewX + 20, previewY + 86, previewSize - 40, 12, 'rgba(230,251,255,0.54)', 18, 2);
    }

    const infoX = previewX + previewSize + 18;
    drawText(ctx, draft.title || DEFAULT_CUSTOM_TITLE, infoX, 132, 22, '#f3ffff', 'left', 'bold');
    drawText(ctx, draft.isDefault ? '当前来源：默认样图' : '当前来源：相册图片', infoX, 168, 13, '#aef7ff');
    drawText(ctx, `当前规格：${layout.label}`, infoX, 194, 13, 'rgba(230,251,255,0.72)');
    drawText(ctx, `${layout.timeLimit}s · 提示 ${layout.hints} 次`, infoX, 216, 13, 'rgba(230,251,255,0.72)');
    drawParagraph(
      ctx,
      draft.shareReady ? '当前图片已准备好分享码，可复制给好友导入。' : '如果图片过大，仍可本地游玩，但分享码可能暂不生成。',
      infoX,
      242,
      this.viewWidth - infoX - 34,
      12,
      'rgba(230,251,255,0.66)',
      18,
      3
    );

    this.customButtons.forEach((button) => {
      this.drawButton(button, button.key === 'create', true);
    });

    const listY = this.customButtons.length ? this.customButtons[this.customButtons.length - 1].y + 72 : 532;
    drawText(ctx, '我的谜境', 24, listY, 20, '#eafcff', 'left', 'bold');
    drawText(ctx, `${this.customLevels.length} 个本地关卡`, this.viewWidth - 24, listY + 4, 12, 'rgba(230,251,255,0.66)', 'right');

    const rendered = new Set();
    this.customItemButtons.forEach((button) => {
      if (button.action !== 'play' || rendered.has(button.levelId)) {
        return;
      }

      const level = this.customLevels.find((item) => item.levelId === button.levelId);
      if (!level) {
        return;
      }

      rendered.add(button.levelId);
      drawGlassCard(ctx, button.x, button.y, button.w, button.h, 24);

      const imagePath = resolvePreviewImage(level);
      const cached = imagePath ? this.images[imagePath] : null;
      if (imagePath && !cached) {
        this.loadImage(imagePath).then((image) => {
          if (this.images[imagePath]) {
            this.images[imagePath].__resolvedImage = image;
          }
        });
      }

      const image = cached && cached.__resolvedImage;
      if (image) {
        const side = Math.min(image.width, image.height);
        const offsetX = (image.width - side) / 2;
        const offsetY = (image.height - side) / 2;
        ctx.drawImage(image, offsetX, offsetY, side, side, button.x + 12, button.y + 12, 58, 58);
      } else {
        fillRoundRect(ctx, button.x + 12, button.y + 12, 58, 58, 18, 'rgba(8, 29, 44, 0.58)', 'rgba(142,235,255,0.12)');
      }

      drawText(ctx, getSafeLevelTitle(level), button.x + 82, button.y + 14, 18, '#f3ffff', 'left', 'bold');
      drawText(
        ctx,
        `${level.rows}x${level.cols} · ${level.timeLimit}s · ${level.completed ? `已完成 ${level.stars || 0} 星` : '点击直接入局'}`,
        button.x + 82,
        button.y + 38,
        12,
        'rgba(230,251,255,0.68)'
      );

      const shareButton = this.customItemButtons.find((item) => item.levelId === level.levelId && item.action === 'share');
      const deleteButton = this.customItemButtons.find((item) => item.levelId === level.levelId && item.action === 'delete');
      if (shareButton) {
        fillRoundRect(ctx, shareButton.x, shareButton.y, shareButton.w, shareButton.h, 12, 'rgba(57, 161, 177, 0.22)', 'rgba(123, 247, 255, 0.28)');
        drawText(ctx, '复制码', shareButton.x + shareButton.w / 2, shareButton.y + 4, 11, '#eafcff', 'center', 'bold');
      }
      if (deleteButton) {
        fillRoundRect(ctx, deleteButton.x, deleteButton.y, deleteButton.w, deleteButton.h, 12, 'rgba(92, 43, 43, 0.28)', 'rgba(255, 143, 143, 0.22)');
        drawText(ctx, '删除', deleteButton.x + deleteButton.w / 2, deleteButton.y + 4, 11, '#ffd6d6', 'center', 'bold');
      }
    });

    if (this.customLevels.length === 0) {
      drawParagraph(ctx, '还没有本地自定义谜境。先用默认样图试一局，或者从相册挑一张图生成。', 24, listY + 34, this.viewWidth - 48, 14, 'rgba(230,251,255,0.66)', 22, 2);
    } else if (this.customLevels.length > rendered.size) {
      drawText(ctx, `仅展示最近 ${rendered.size} 个谜境`, this.viewWidth / 2, this.viewHeight - 28, 12, 'rgba(230,251,255,0.52)', 'center');
    }
  }

  drawChapters() {
    const ctx = this.ctx;
    drawText(ctx, '谜境章节', this.viewWidth / 2, 42, 32, '#eafcff', 'center', 'bold');
    drawText(ctx, '选择一个主题章节，再进入具体关卡', this.viewWidth / 2, 80, 15, 'rgba(230,251,255,0.72)', 'center');

    this.chapterButtons.forEach((button) => {
      if (button.key === 'back') {
        this.drawButton(Object.assign({ label: '返回首页' }, button), false, true);
        return;
      }

      const chapter = button.chapter;
      const total = chapter.levels.length;
      const completed = chapter.completedCount || 0;
      const unlockedCount = chapter.levels.filter((item) => item.unlocked).length;
      const progress = total ? completed / total : 0;
      const progressWidth = Math.max(0, Math.floor((button.w - 36) * progress));

      drawGlassCard(ctx, button.x, button.y, button.w, button.h, 24);
      drawText(ctx, getSafeChapterTitle(chapter), button.x + 16, button.y + 16, 20, '#f3ffff', 'left', 'bold');
      drawText(
        ctx,
        unlockedCount > 0 ? `已解锁 ${unlockedCount}/${total}` : '尚未解锁',
        button.x + button.w - 16,
        button.y + 18,
        12,
        unlockedCount > 0 ? '#aef7ff' : 'rgba(230,251,255,0.52)',
        'right'
      );
      drawParagraph(
        ctx,
        chapter.summary || '等待进入这个章节的谜境。',
        button.x + 16,
        button.y + 44,
        button.w - 32,
        13,
        'rgba(230,251,255,0.72)',
        18,
        2
      );

      fillRoundRect(
        ctx,
        button.x + 16,
        button.y + button.h - 22,
        button.w - 32,
        6,
        3,
        'rgba(255,255,255,0.08)'
      );
      if (progressWidth > 0) {
        fillRoundRect(
          ctx,
          button.x + 16,
          button.y + button.h - 22,
          progressWidth,
          6,
          3,
          'rgba(114, 241, 255, 0.88)'
        );
      }
      drawText(
        ctx,
        `已揭晓 ${completed}/${total}`,
        button.x + button.w - 16,
        button.y + button.h - 38,
        12,
        'rgba(230,251,255,0.66)',
        'right'
      );
    });
  }

  drawLevels() {
    const ctx = this.ctx;
    const chapter = this.selectedChapter;
    if (!chapter) {
      this.drawChapters();
      return;
    }

    drawText(ctx, getSafeChapterTitle(chapter), this.viewWidth / 2, 36, 30, '#eafcff', 'center', 'bold');
    drawParagraph(
      ctx,
      chapter.summary || '选择一关继续入局。',
      26,
      72,
      this.viewWidth - 52,
      14,
      'rgba(230,251,255,0.72)',
      20,
      2
    );

    this.levelButtons.forEach((button) => {
      if (button.key === 'back') {
        this.drawButton(Object.assign({ label: '返回章节' }, button), false, true);
        return;
      }

      const level = button.level;
      const locked = !level.unlocked;
      const done = !!level.completed;
      const stroke = locked ? 'rgba(255,255,255,0.08)' : 'rgba(145, 235, 255, 0.16)';

      fillRoundRect(
        ctx,
        button.x,
        button.y,
        button.w,
        button.h,
        22,
        locked ? 'rgba(7, 20, 31, 0.46)' : 'rgba(11, 30, 46, 0.62)',
        stroke
      );

      drawText(
        ctx,
        getSafeLevelTitle(level),
        button.x + 16,
        button.y + 13,
        18,
        locked ? 'rgba(230,251,255,0.42)' : '#f3ffff',
        'left',
        'bold'
      );
      drawText(
        ctx,
        `${level.rows}x${level.cols} · ${level.timeLimit}s · 体力 ${level.energyCost}`,
        button.x + 16,
        button.y + 34,
        12,
        locked ? 'rgba(230,251,255,0.32)' : 'rgba(230,251,255,0.66)'
      );

      let statusText = '进入谜境';
      let statusColor = '#aef7ff';
      if (locked) {
        statusText = '未解锁';
        statusColor = 'rgba(230,251,255,0.42)';
      } else if (done) {
        statusText = `已完成 · ${level.stars || 0} 星`;
        statusColor = '#b9ffd9';
      }

      drawText(ctx, statusText, button.x + button.w - 16, button.y + 18, 12, statusColor, 'right');
      drawText(
        ctx,
        locked ? '继续推进前面的谜境即可解锁' : '点击进入这一关',
        button.x + button.w - 16,
        button.y + 34,
        11,
        locked ? 'rgba(230,251,255,0.28)' : 'rgba(230,251,255,0.52)',
        'right'
      );
    });
  }

  drawSupply() {
    const ctx = this.ctx;
    const energyText = storage.getEnergyCountdownText(this.profile);
    const logStats = logger.getLogStats();
    const todaySigned = this.profile.lastSignInDate === getTodayKey();
    const infoY = this.viewHeight - 38;

    drawText(ctx, '谜境补给站', this.viewWidth / 2, 36, 32, '#eafcff', 'center', 'bold');
    drawText(ctx, '集中补体力、道具、设置与上线必需项', this.viewWidth / 2, 76, 14, 'rgba(230,251,255,0.72)', 'center');

    drawGlassCard(ctx, 18, 106, this.viewWidth - 36, 176, 28);
    drawText(ctx, '当前补给', 34, 126, 18, '#eafcff', 'left', 'bold');
    drawText(ctx, `${this.profile.coins} 金币`, this.viewWidth - 34, 128, 14, '#aef7ff', 'right');

    const stats = [
      { label: '体力', value: `${this.profile.energy} / ${this.profile.maxEnergy}` },
      { label: '定格符', value: `${this.profile.unlockDragTools}` },
      { label: '引路符', value: `${this.profile.guideHintTools}` },
      { label: '音效', value: this.profile.soundEnabled ? '开启' : '关闭' }
    ];

    stats.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const cellX = 34 + col * ((this.viewWidth - 92) / 2);
      const cellY = 156 + row * 44;
      drawText(ctx, item.label, cellX, cellY, 12, 'rgba(230,251,255,0.56)');
      drawText(ctx, item.value, cellX, cellY + 18, 20, '#f3ffff', 'left', 'bold');
    });

    drawText(ctx, '恢复倒计时', 34, 244, 12, 'rgba(230,251,255,0.56)');
    drawText(ctx, energyText, 34, 260, 14, '#b8fff7');
    drawText(ctx, todaySigned ? '今日签到已领取' : '今日签到可领取', this.viewWidth - 34, 260, 12, todaySigned ? '#b9ffd9' : '#ffd79a', 'right');

    this.supplyButtons.forEach((button) => {
      const primary = button.key === 'signin' || button.key === 'energy-ad';
      this.drawButton(button, primary, true);
    });

    drawText(ctx, `日志 ${logStats.total} 条 · 错误 ${logStats.errors} 条`, 24, infoY - 18, 12, 'rgba(230,251,255,0.56)');
    drawText(ctx, `主体：${legal.companyName}`, 24, infoY, 12, 'rgba(230,251,255,0.52)');
    drawText(ctx, `联系：${legal.contactEmail}`, this.viewWidth - 24, infoY, 12, 'rgba(230,251,255,0.52)', 'right');
  }

  drawSupplyPanel() {
    const ctx = this.ctx;
    const energyText = storage.getEnergyCountdownText(this.profile);
    const logStats = logger.getLogStats();
    const todaySigned = this.profile.lastSignInDate === getTodayKey();
    const infoY = this.viewHeight - 38;

    drawText(ctx, '谜境补给站', this.viewWidth / 2, 36, 32, '#eafcff', 'center', 'bold');
    drawText(ctx, '集中补体力、道具、设置与上线必需项', this.viewWidth / 2, 76, 14, 'rgba(230,251,255,0.72)', 'center');

    drawGlassCard(ctx, 18, 106, this.viewWidth - 36, 176, 28);
    drawText(ctx, '当前补给', 34, 126, 18, '#eafcff', 'left', 'bold');
    drawText(ctx, `${this.profile.coins} 金币`, this.viewWidth - 34, 128, 14, '#aef7ff', 'right');

    const stats = [
      { label: '体力', value: `${this.profile.energy} / ${this.profile.maxEnergy}` },
      { label: '定格符', value: `${this.profile.unlockDragTools}` },
      { label: '引路符', value: `${this.profile.guideHintTools}` },
      { label: '音效', value: this.profile.soundEnabled ? '开启' : '关闭' }
    ];

    stats.forEach((item, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const cellX = 34 + col * ((this.viewWidth - 92) / 2);
      const cellY = 156 + row * 44;
      drawText(ctx, item.label, cellX, cellY, 12, 'rgba(230,251,255,0.56)');
      drawText(ctx, item.value, cellX, cellY + 18, 20, '#f3ffff', 'left', 'bold');
    });

    drawText(ctx, '恢复倒计时', 34, 244, 12, 'rgba(230,251,255,0.56)');
    drawText(ctx, energyText, 34, 260, 14, '#b8fff7');
    drawText(ctx, todaySigned ? '今日签到已领取' : '今日签到可领取', this.viewWidth - 34, 260, 12, todaySigned ? '#b9ffd9' : '#ffd79a', 'right');

    this.supplyButtons.forEach((button) => {
      const primary = button.key === 'signin' || button.key === 'energy-ad';
      this.drawButton(button, primary, true);
    });

    drawText(ctx, `日志 ${logStats.total} 条 · 错误 ${logStats.errors} 条`, 24, infoY - 18, 12, 'rgba(230,251,255,0.56)');
    drawText(ctx, `主体：${legal.companyName}`, 24, infoY, 12, 'rgba(230,251,255,0.52)');
    drawText(ctx, `联系：${legal.contactEmail}`, this.viewWidth - 24, infoY, 12, 'rgba(230,251,255,0.52)', 'right');
  }

  drawLegalPanel() {
    const ctx = this.ctx;
    const state = this.legalState;
    const page = state.pages[state.pageIndex] || { heading: '', lines: [] };
    const cardX = 18;
    const cardY = 164;
    const cardW = this.viewWidth - 36;
    const cardH = this.viewHeight - 290;

    drawText(ctx, state.title, this.viewWidth / 2, 36, 32, '#eafcff', 'center', 'bold');
    drawText(ctx, `${legal.appName} 的法律与发布信息`, this.viewWidth / 2, 76, 14, 'rgba(230,251,255,0.72)', 'center');

    this.legalTabButtons.forEach((button) => {
      const active = button.key === state.type;
      this.drawButton(button, active, true);
    });

    drawGlassCard(ctx, cardX, cardY, cardW, cardH, 28);
    drawText(ctx, page.heading || state.title, cardX + 18, cardY + 18, 20, '#f3ffff', 'left', 'bold');
    drawText(
      ctx,
      `${state.pageIndex + 1} / ${Math.max(1, state.pages.length)}`,
      cardX + cardW - 18,
      cardY + 20,
      12,
      'rgba(230,251,255,0.62)',
      'right'
    );

    let cursorY = cardY + 58;
    page.lines.forEach((line, index) => {
      const lines = wrapText(ctx, line, cardW - 36, 14);
      lines.forEach((wrapped) => {
        drawText(ctx, wrapped, cardX + 18, cursorY, 14, 'rgba(230,251,255,0.76)');
        cursorY += 20;
      });
      if (index !== page.lines.length - 1) {
        cursorY += 12;
      }
    });

    if (state.type !== 'release') {
      drawText(ctx, `主体：${legal.companyName}`, cardX + 18, cardY + cardH - 48, 12, 'rgba(230,251,255,0.52)');
      drawText(ctx, `联系：${legal.contactEmail}`, cardX + 18, cardY + cardH - 28, 12, 'rgba(230,251,255,0.52)');
    }

    this.legalButtons.forEach((button) => {
      let primary = false;
      if (button.key === 'next' && state.pageIndex < state.pages.length - 1) {
        primary = true;
      }
      if (button.key === 'copy') {
        primary = state.type === 'release';
      }
      this.drawButton(button, primary, true);
    });
  }

  drawHome() {
    const ctx = this.ctx;
    drawText(ctx, '谜境拼图', this.viewWidth / 2, 42, 34, '#eafcff', 'center', 'bold');
    drawText(ctx, '小游戏版 · 主线与自定义谜境', this.viewWidth / 2, 82, 15, 'rgba(230,251,255,0.72)', 'center');

    const hero = this.homeMeta;
    drawGlassCard(ctx, hero.heroX, hero.heroY, hero.heroW, hero.heroH, 28);
    drawText(ctx, '当前档案', hero.heroX + 18, hero.heroY + 18, 16, '#dffcff', 'left', 'bold');
    drawText(
      ctx,
      `${this.profile.energy}/${this.profile.maxEnergy} 体力 · ${this.profile.coins} 金币`,
      hero.heroX + hero.heroW - 18,
      hero.heroY + 18,
      13,
      'rgba(230,251,255,0.78)',
      'right'
    );

    const continueLevel = hero.continueLevel;
    drawText(
      ctx,
      continueLevel ? getSafeLevelTitle(continueLevel) : '等待开启第一段谜境',
      hero.heroX + 18,
      hero.heroY + 58,
      24,
      '#f3ffff',
      'left',
      'bold'
    );
    drawText(
      ctx,
      continueLevel ? getSafeChapterTitle(continueLevel) : '倩女幽魂 · 第一章',
      hero.heroX + 18,
      hero.heroY + 94,
      15,
      'rgba(230,251,255,0.68)'
    );
    drawParagraph(
      ctx,
      '现在可以继续主线、选章选关，也能进入自定义谜境，用默认样图或相册照片生成自己的拼图关卡。',
      hero.heroX + 18,
      hero.heroY + 126,
      hero.heroW - 36,
      14,
      'rgba(230,251,255,0.78)',
      22,
      3
    );

    this.homeButtons.forEach((button) => this.drawButton(button, button.primary));
    this.homeMiniButtons.forEach((button) => this.drawButton(button, false, true));
  }

  drawHome() {
    const ctx = this.ctx;
    const hero = this.homeMeta;
    const continueLevel = hero.continueLevel;
    const continueImage = this.getResolvedImage(resolvePreviewImage(continueLevel));
    const themeColor = (continueLevel && continueLevel.themeColor) || '#61d5e8';
    const chapters = levelRepo.getChaptersWithProgress(this.progress);
    const customCount = levelRepo.getCustomLevelsWithProgress(this.progress).length;

    drawText(ctx, '谜境拼图', this.viewWidth / 2, 38, 34, '#eafcff', 'center', 'bold');
    drawText(ctx, '主线剧情与自定义谜境都已经迁入小游戏版本', this.viewWidth / 2, 78, 14, 'rgba(230,251,255,0.72)', 'center');

    drawGlassCard(ctx, hero.heroX, hero.heroY, hero.heroW, hero.heroH, 28);
    if (continueImage) {
      drawImageCover(ctx, continueImage, hero.heroX + 8, hero.heroY + 8, hero.heroW - 16, hero.heroH - 16, 22);
      fillRoundRect(ctx, hero.heroX + 8, hero.heroY + 8, hero.heroW - 16, hero.heroH - 16, 22, 'rgba(2, 12, 20, 0.42)');
    }

    fillRoundRect(ctx, hero.heroX + 18, hero.heroY + 18, 76, 22, 11, `${themeColor}33`, `${themeColor}88`);
    drawText(ctx, '当前档案', hero.heroX + 56, hero.heroY + 22, 11, '#e9ffff', 'center', 'bold');
    drawText(
      ctx,
      continueLevel ? getSafeLevelTitle(continueLevel) : '等待开启第一段谜境',
      hero.heroX + 18,
      hero.heroY + 56,
      24,
      '#f3ffff',
      'left',
      'bold'
    );
    drawText(
      ctx,
      continueLevel ? getSafeChapterTitle(continueLevel) : '倩女幽魂 · 第一章',
      hero.heroX + 18,
      hero.heroY + 92,
      14,
      'rgba(230,251,255,0.74)'
    );
    drawText(
      ctx,
      `${this.profile.energy}/${this.profile.maxEnergy} 体力 · ${this.profile.coins} 金币 · ${customCount} 个自定义谜境`,
      hero.heroX + 18,
      hero.heroY + 118,
      13,
      'rgba(230,251,255,0.84)'
    );
    drawParagraph(
      ctx,
      continueLevel
        ? '继续追完当前剧情，或切去章节页挑一段新的谜境。'
        : '从第一章进入主线，也可以直接前往自定义谜境生成自己的拼图。',
      hero.heroX + 18,
      hero.heroY + 144,
      hero.heroW - 36,
      13,
      'rgba(230,251,255,0.76)',
      20,
      2
    );

    const chipY = hero.heroY + hero.heroH - 34;
    const chipText = [`主线 ${chapters.length} 章`, `剧情关卡 ${chapters.reduce((sum, item) => sum + item.levels.length, 0)} 个`];
    chipText.forEach((text, index) => {
      const x = hero.heroX + 18 + index * 110;
      fillRoundRect(ctx, x, chipY, 94, 22, 11, 'rgba(8, 29, 44, 0.55)', 'rgba(145, 235, 255, 0.12)');
      drawText(ctx, text, x + 47, chipY + 4, 11, '#dffcff', 'center');
    });

    this.homeButtons.forEach((button) => this.drawButton(button, button.primary));
    this.homeMiniButtons.forEach((button) => this.drawButton(button, false, true));
  }

  drawChapters() {
    const ctx = this.ctx;
    drawText(ctx, '谜境章节', this.viewWidth / 2, 40, 32, '#eafcff', 'center', 'bold');
    drawText(ctx, '每一章都是一段完整的图像叙事，先选主题，再进入关卡。', this.viewWidth / 2, 78, 14, 'rgba(230,251,255,0.72)', 'center');

    this.chapterButtons.forEach((button) => {
      if (button.key === 'back') {
        this.drawButton(Object.assign({ label: '返回首页' }, button), false, true);
        return;
      }

      const chapter = button.chapter;
      const coverLevel = getChapterCoverLevel(chapter);
      const coverSrc = resolvePreviewImage(coverLevel);
      const coverImage = this.getResolvedImage(coverSrc);
      const total = chapter.levels.length;
      const completed = chapter.completedCount || 0;
      const unlockedCount = chapter.levels.filter((item) => item.unlocked).length;
      const progress = total ? completed / total : 0;
      const progressWidth = Math.max(0, Math.floor((button.w - 140) * progress));
      const themeColor = (coverLevel && coverLevel.themeColor) || '#73f0ff';

      drawGlassCard(ctx, button.x, button.y, button.w, button.h, 24);
      fillRoundRect(ctx, button.x + 10, button.y + 10, 88, button.h - 20, 18, 'rgba(6, 24, 36, 0.78)', 'rgba(142, 235, 255, 0.14)');
      if (coverImage) {
        drawImageCover(ctx, coverImage, button.x + 10, button.y + 10, 88, button.h - 20, 18);
        fillRoundRect(ctx, button.x + 10, button.y + 10, 88, button.h - 20, 18, 'rgba(3, 12, 22, 0.18)');
      }

      fillRoundRect(ctx, button.x + 110, button.y + 14, 72, 22, 11, `${themeColor}33`, `${themeColor}88`);
      drawText(ctx, `${completed}/${total} 已揭晓`, button.x + 146, button.y + 18, 11, '#e9ffff', 'center', 'bold');
      drawText(ctx, getSafeChapterTitle(chapter), button.x + 110, button.y + 42, 20, '#f3ffff', 'left', 'bold');
      drawText(
        ctx,
        unlockedCount > 0 ? `已解锁 ${unlockedCount}/${total}` : '尚未解锁',
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
        'rgba(230,251,255,0.7)',
        17,
        2
      );
      fillRoundRect(ctx, button.x + 110, button.y + button.h - 18, button.w - 126, 6, 3, 'rgba(255,255,255,0.08)');
      if (progressWidth > 0) {
        fillRoundRect(ctx, button.x + 110, button.y + button.h - 18, progressWidth, 6, 3, themeColor);
      }
    });
  }

  drawLevels() {
    const ctx = this.ctx;
    const chapter = this.selectedChapter;
    if (!chapter) {
      this.drawChapters();
      return;
    }

    const coverLevel = getChapterCoverLevel(chapter);
    const coverSrc = resolvePreviewImage(coverLevel);
    const coverImage = this.getResolvedImage(coverSrc);
    const themeColor = (coverLevel && coverLevel.themeColor) || '#73f0ff';
    const total = chapter.levels.length;
    const completed = chapter.levels.filter((item) => item.completed).length;

    drawText(ctx, getSafeChapterTitle(chapter), this.viewWidth / 2, 34, 30, '#eafcff', 'center', 'bold');
    drawText(ctx, '挑选一个场景切入剧情，逐步拼回这一章的全貌。', this.viewWidth / 2, 70, 14, 'rgba(230,251,255,0.72)', 'center');

    drawGlassCard(ctx, 18, 102, this.viewWidth - 36, 74, 24);
    if (coverImage) {
      drawImageCover(ctx, coverImage, 26, 110, 94, 58, 16);
      fillRoundRect(ctx, 26, 110, 94, 58, 16, 'rgba(3, 12, 22, 0.16)');
    } else {
      fillRoundRect(ctx, 26, 110, 94, 58, 16, 'rgba(6, 24, 36, 0.78)', 'rgba(142, 235, 255, 0.14)');
    }

    drawParagraph(ctx, getChapterSummary(chapter), 132, 114, this.viewWidth - 160, 13, 'rgba(230,251,255,0.78)', 18, 2);
    fillRoundRect(ctx, 132, 144, 90, 20, 10, `${themeColor}33`, `${themeColor}88`);
    drawText(ctx, `已完成 ${completed}/${total}`, 177, 148, 11, '#e9ffff', 'center', 'bold');
    drawText(ctx, `${total} 个关卡`, this.viewWidth - 28, 148, 12, 'rgba(230,251,255,0.62)', 'right');

    this.levelButtons.forEach((button) => {
      if (button.key === 'back') {
        this.drawButton(Object.assign({ label: '返回章节' }, button), false, true);
        return;
      }

      const level = button.level;
      const locked = !level.unlocked;
      const done = !!level.completed;
      const previewSrc = resolvePreviewImage(level);
      const previewImage = this.getResolvedImage(previewSrc);

      fillRoundRect(
        ctx,
        button.x,
        button.y,
        button.w,
        button.h,
        22,
        locked ? 'rgba(7, 20, 31, 0.42)' : 'rgba(11, 30, 46, 0.62)',
        locked ? 'rgba(255,255,255,0.06)' : 'rgba(145, 235, 255, 0.16)'
      );

      fillRoundRect(ctx, button.x + 10, button.y + 8, 52, button.h - 16, 14, 'rgba(6, 24, 36, 0.78)', 'rgba(142, 235, 255, 0.12)');
      if (previewImage) {
        drawImageCover(ctx, previewImage, button.x + 10, button.y + 8, 52, button.h - 16, 14);
        fillRoundRect(ctx, button.x + 10, button.y + 8, 52, button.h - 16, 14, locked ? 'rgba(2, 8, 14, 0.42)' : 'rgba(3, 12, 22, 0.18)');
      }

      drawText(
        ctx,
        getSafeLevelTitle(level),
        button.x + 74,
        button.y + 10,
        17,
        locked ? 'rgba(230,251,255,0.42)' : '#f3ffff',
        'left',
        'bold'
      );
      drawText(
        ctx,
        `${level.rows}x${level.cols} · ${level.timeLimit}s · 体力 ${level.energyCost}`,
        button.x + 74,
        button.y + 31,
        11,
        locked ? 'rgba(230,251,255,0.3)' : 'rgba(230,251,255,0.62)'
      );

      let statusText = '点击入局';
      let statusColor = '#aef7ff';
      if (locked) {
        statusText = '未解锁';
        statusColor = 'rgba(230,251,255,0.42)';
      } else if (done) {
        statusText = `已完成 · ${level.stars || 0} 星`;
        statusColor = '#b9ffd9';
      }

      drawText(ctx, statusText, button.x + button.w - 16, button.y + 12, 11, statusColor, 'right');
      fillRoundRect(ctx, button.x + button.w - 88, button.y + button.h - 22, 72, 16, 8, `${themeColor}22`, `${themeColor}55`);
      drawText(ctx, done ? '已拼合' : locked ? '待进入' : '可挑战', button.x + button.w - 52, button.y + button.h - 20, 10, '#eaffff', 'center');
    });
  }

  clearPressState() {
    this.uiPressState = null;
  }

  capturePressState(x, y) {
    if (this.screen === 'home' && this.homeMeta) {
      const hero = this.homeMeta;
      if (x >= hero.heroX && x <= hero.heroX + hero.heroW && y >= hero.heroY && y <= hero.heroY + hero.heroH) {
        this.uiPressState = {
          screen: 'home',
          key: 'hero',
          tiltX: clamp((x - (hero.heroX + hero.heroW / 2)) / Math.max(hero.heroW / 2, 1), -1, 1),
          tiltY: clamp((y - (hero.heroY + hero.heroH / 2)) / Math.max(hero.heroH / 2, 1), -1, 1)
        };
        return;
      }

      const homeButton = this.homeButtons.concat(this.homeMiniButtons).find((item) => hitButton(item, x, y));
      if (homeButton) {
        this.uiPressState = {
          screen: 'home',
          key: homeButton.key
        };
        return;
      }
    }

    if (this.screen === 'levels') {
      const levelButton = this.levelButtons.find((item) => item.level && hitButton(item, x, y));
      if (levelButton) {
        this.uiPressState = {
          screen: 'levels',
          key: levelButton.key
        };
        return;
      }
    }

    this.uiPressState = null;
  }

  getHomeHeroParallax() {
    const baseTime = Date.now() / 1000;
    const press = this.uiPressState && this.uiPressState.screen === 'home' && this.uiPressState.key === 'hero'
      ? this.uiPressState
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

  triggerScreenMotion(screen) {
    this.screenMotion = {
      screen,
      startedAt: Date.now()
    };
  }

  getScreenMotion(screen, staggerIndex) {
    const active = this.screenMotion && this.screenMotion.screen === screen ? this.screenMotion : null;
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

  drawHome() {
    return this.drawStoryHome();
    const ctx = this.ctx;
    const hero = this.homeMeta;
    const continueLevel = hero.continueLevel;
    const continueImage = this.getResolvedImage(resolvePreviewImage(continueLevel));
    const themeColor = (continueLevel && continueLevel.themeColor) || '#61d5e8';
    const chapters = levelRepo.getChaptersWithProgress(this.progress);
    const customCount = levelRepo.getCustomLevelsWithProgress(this.progress).length;
    const titleMotion = this.getScreenMotion('home');
    const heroParallax = this.getHomeHeroParallax();
    const titleAlpha = titleMotion.alpha;
    const titleY = 36 + titleMotion.offsetY * 0.35 + titleMotion.floatY;
    const accentWidth = 86 + titleMotion.glow * 26;

    ctx.save();
    ctx.shadowColor = `rgba(115, 240, 255, ${0.18 + titleMotion.glow * 0.12})`;
    ctx.shadowBlur = 14 + titleMotion.glow * 14;
    drawText(ctx, '谜境拼图', this.viewWidth / 2, titleY, 34, `rgba(234,252,255,${titleAlpha})`, 'center', 'bold');
    ctx.restore();
    drawText(
      ctx,
      '主线剧情与自定义谜境都已经迁入小游戏版本',
      this.viewWidth / 2,
      78 + titleMotion.offsetY * 0.25,
      14,
      `rgba(230,251,255,${0.54 + titleAlpha * 0.28})`,
      'center'
    );
    fillRoundRect(
      ctx,
      this.viewWidth / 2 - accentWidth / 2,
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
    this.drawMotionMotes('home', { x: hero.heroX + 8, y: hero.heroY + 8, w: hero.heroW - 16, h: hero.heroH - 16 }, {
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
    drawText(ctx, '当前档案', hero.heroX + 56, hero.heroY + 22, 11, '#e9ffff', 'center', 'bold');
    drawText(
      ctx,
      continueLevel ? getSafeLevelTitle(continueLevel) : '等待开启第一段谜境',
      hero.heroX + 18,
      hero.heroY + 56,
      24,
      '#f3ffff',
      'left',
      'bold'
    );
    drawText(
      ctx,
      continueLevel ? getSafeChapterTitle(continueLevel) : '倩女幽魂 · 第一章',
      hero.heroX + 18,
      hero.heroY + 92,
      14,
      'rgba(230,251,255,0.74)'
    );
    drawText(
      ctx,
      `${this.profile.energy}/${this.profile.maxEnergy} 体力 · ${this.profile.coins} 金币 · ${customCount} 个自定义谜境`,
      hero.heroX + 18,
      hero.heroY + 118,
      13,
      'rgba(230,251,255,0.84)'
    );
    drawParagraph(
      ctx,
      continueLevel
        ? '继续追完当前剧情，或切去章节页挑一段新的谜境。'
        : '从第一章进入主线，也可以直接前往自定义谜境生成自己的拼图。',
      hero.heroX + 18,
      hero.heroY + 144,
      hero.heroW - 36,
      13,
      'rgba(230,251,255,0.76)',
      20,
      2
    );

    const chipY = hero.heroY + hero.heroH - 34;
    const chipText = [`主线 ${chapters.length} 章`, `剧情关卡 ${chapters.reduce((sum, item) => sum + item.levels.length, 0)} 个`];
    chipText.forEach((text, index) => {
      const x = hero.heroX + 18 + index * 110;
      fillRoundRect(ctx, x, chipY, 94, 22, 11, 'rgba(8, 29, 44, 0.55)', 'rgba(145, 235, 255, 0.12)');
      drawText(ctx, text, x + 47, chipY + 4, 11, '#dffcff', 'center');
    });

    this.homeButtons.forEach((button) => this.drawButton(button, button.primary));
    this.homeMiniButtons.forEach((button) => this.drawButton(button, false, true));
  }

  drawChapters() {
    return this.drawStoryChapters();
    const ctx = this.ctx;
    const titleMotion = this.getScreenMotion('chapters');
    const titleY = 38 + titleMotion.offsetY * 0.28 + titleMotion.floatY * 0.7;
    const titleAlpha = titleMotion.alpha;

    ctx.save();
    ctx.shadowColor = `rgba(115, 240, 255, ${0.16 + titleMotion.glow * 0.1})`;
    ctx.shadowBlur = 12 + titleMotion.glow * 10;
    drawText(ctx, '谜境章节', this.viewWidth / 2, titleY, 32, `rgba(234,252,255,${titleAlpha})`, 'center', 'bold');
    ctx.restore();
    drawText(
      ctx,
      '每一章都是一段完整的图像叙事，先选主题，再进入关卡。',
      this.viewWidth / 2,
      78 + titleMotion.offsetY * 0.22,
      14,
      `rgba(230,251,255,${0.54 + titleAlpha * 0.26})`,
      'center'
    );
    fillRoundRect(
      ctx,
      this.viewWidth / 2 - 52,
      102 + titleMotion.offsetY * 0.18,
      104 + titleMotion.glow * 18,
      4,
      2,
      `rgba(115, 240, 255, ${0.22 + titleMotion.glow * 0.16})`
    );

    let cardIndex = 0;
    this.chapterButtons.forEach((button) => {
      if (button.key === 'back') {
        this.drawButton(Object.assign({ label: '返回首页' }, button), false, true);
        return;
      }

      const chapter = button.chapter;
      const coverLevel = getChapterCoverLevel(chapter);
      const coverSrc = resolvePreviewImage(coverLevel);
      const coverImage = this.getResolvedImage(coverSrc);
      const total = chapter.levels.length;
      const completed = chapter.completedCount || 0;
      const unlockedCount = chapter.levels.filter((item) => item.unlocked).length;
      const progress = total ? completed / total : 0;
      const progressWidth = Math.max(0, Math.floor((button.w - 140) * progress));
      const themeColor = (coverLevel && coverLevel.themeColor) || '#73f0ff';
      const reveal = this.getScreenMotion('chapters', cardIndex + 1);
      cardIndex += 1;

      drawGlassCard(ctx, button.x, button.y, button.w, button.h, 24);
      fillRoundRect(ctx, button.x + 10, button.y + 10, 88, button.h - 20, 18, 'rgba(6, 24, 36, 0.78)', 'rgba(142, 235, 255, 0.14)');
      if (coverImage) {
        const coverShift = (1 - reveal.eased) * 7;
        ctx.save();
        roundRectPath(ctx, button.x + 10, button.y + 10, 88, button.h - 20, 18);
        ctx.clip();
        ctx.globalAlpha = reveal.alpha;
        drawImageCover(
          ctx,
          coverImage,
          button.x + 8 - coverShift * 0.2,
          button.y + 10 + coverShift,
          92,
          button.h - 16,
          18
        );
        ctx.restore();
        fillRoundRect(ctx, button.x + 10, button.y + 10, 88, button.h - 20, 18, `rgba(3, 12, 22, ${0.34 - reveal.eased * 0.16})`);
      }

      fillRoundRect(ctx, button.x + 110, button.y + 14, 72, 22, 11, `${themeColor}33`, `${themeColor}88`);
      drawText(ctx, `${completed}/${total} 已揭晓`, button.x + 146, button.y + 18, 11, '#e9ffff', 'center', 'bold');
      drawText(ctx, getSafeChapterTitle(chapter), button.x + 110, button.y + 42, 20, '#f3ffff', 'left', 'bold');
      drawText(
        ctx,
        unlockedCount > 0 ? `已解锁 ${unlockedCount}/${total}` : '尚未解锁',
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
        'rgba(230,251,255,0.7)',
        17,
        2
      );
      fillRoundRect(ctx, button.x + 110, button.y + button.h - 18, button.w - 126, 6, 3, 'rgba(255,255,255,0.08)');
      if (progressWidth > 0) {
        fillRoundRect(ctx, button.x + 110, button.y + button.h - 18, progressWidth, 6, 3, themeColor);
      }
    });
  }

  drawMotionMotes(screen, bounds, options) {
    if (!bounds) {
      return;
    }

    const nextOptions = options || {};
    const count = Math.max(1, nextOptions.count || 4);
    const tint = nextOptions.tint || '111,245,255';
    const alphaScale = typeof nextOptions.alphaScale === 'number' ? nextOptions.alphaScale : 0.2;
    const radiusBase = typeof nextOptions.radius === 'number' ? nextOptions.radius : 1.8;
    const seed = typeof nextOptions.seed === 'number' ? nextOptions.seed : 0;
    const motion = this.getScreenMotion(screen, seed);
    const time = Date.now() / 1000;
    const driftX = typeof nextOptions.driftX === 'number' ? nextOptions.driftX : 4;
    const driftY = typeof nextOptions.driftY === 'number' ? nextOptions.driftY : 6;
    const rise = typeof nextOptions.rise === 'number' ? nextOptions.rise : 8;
    const ctx = this.ctx;

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

  drawChapters() {
    return this.drawStoryChapters();
    const ctx = this.ctx;
    const titleMotion = this.getScreenMotion('chapters');
    const titleY = 38 + titleMotion.offsetY * 0.28 + titleMotion.floatY * 0.7;
    const titleAlpha = titleMotion.alpha;

    ctx.save();
    ctx.shadowColor = `rgba(115, 240, 255, ${0.16 + titleMotion.glow * 0.1})`;
    ctx.shadowBlur = 12 + titleMotion.glow * 10;
    drawText(ctx, '谜境章节', this.viewWidth / 2, titleY, 32, `rgba(234,252,255,${titleAlpha})`, 'center', 'bold');
    ctx.restore();
    drawText(
      ctx,
      '每一章都是一段完整的图像叙事，先选主题，再进入关卡。',
      this.viewWidth / 2,
      78 + titleMotion.offsetY * 0.22,
      14,
      `rgba(230,251,255,${0.54 + titleAlpha * 0.26})`,
      'center'
    );
    fillRoundRect(
      ctx,
      this.viewWidth / 2 - 52,
      102 + titleMotion.offsetY * 0.18,
      104 + titleMotion.glow * 18,
      4,
      2,
      `rgba(115, 240, 255, ${0.22 + titleMotion.glow * 0.16})`
    );

    let cardIndex = 0;
    this.chapterButtons.forEach((button) => {
      if (button.key === 'back') {
        this.drawButton(Object.assign({ label: '返回首页' }, button), false, true);
        return;
      }

      const chapter = button.chapter;
      const coverLevel = getChapterCoverLevel(chapter);
      const coverSrc = resolvePreviewImage(coverLevel);
      const coverImage = this.getResolvedImage(coverSrc);
      const total = chapter.levels.length;
      const completed = chapter.completedCount || 0;
      const unlockedCount = chapter.levels.filter((item) => item.unlocked).length;
      const progress = total ? completed / total : 0;
      const progressWidth = Math.max(0, Math.floor((button.w - 140) * progress));
      const themeColor = (coverLevel && coverLevel.themeColor) || '#73f0ff';
      const reveal = this.getScreenMotion('chapters', cardIndex + 1);
      cardIndex += 1;

      drawGlassCard(ctx, button.x, button.y, button.w, button.h, 24);
      fillRoundRect(ctx, button.x + 10, button.y + 10, 88, button.h - 20, 18, 'rgba(6, 24, 36, 0.78)', 'rgba(142, 235, 255, 0.14)');
      if (coverImage) {
        const coverShift = (1 - reveal.eased) * 7;
        ctx.save();
        roundRectPath(ctx, button.x + 10, button.y + 10, 88, button.h - 20, 18);
        ctx.clip();
        ctx.globalAlpha = reveal.alpha;
        drawImageCover(
          ctx,
          coverImage,
          button.x + 8 - coverShift * 0.2,
          button.y + 10 + coverShift,
          92,
          button.h - 16,
          18
        );
        this.drawMotionMotes('chapters', { x: button.x + 10, y: button.y + 10, w: 88, h: button.h - 20 }, {
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
      drawText(ctx, `${completed}/${total} 已揭晓`, button.x + 146, button.y + 18, 11, '#e9ffff', 'center', 'bold');
      drawText(ctx, getSafeChapterTitle(chapter), button.x + 110, button.y + 42, 20, '#f3ffff', 'left', 'bold');
      drawText(
        ctx,
        unlockedCount > 0 ? `已解锁 ${unlockedCount}/${total}` : '尚未解锁',
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
        'rgba(230,251,255,0.7)',
        17,
        2
      );
      fillRoundRect(ctx, button.x + 110, button.y + button.h - 18, button.w - 126, 6, 3, 'rgba(255,255,255,0.08)');
      if (progressWidth > 0) {
        fillRoundRect(ctx, button.x + 110, button.y + button.h - 18, progressWidth, 6, 3, themeColor);
      }
    });
  }

  drawLevels() {
    return this.drawStoryLevels();
    const ctx = this.ctx;
    const chapter = this.selectedChapter;
    if (!chapter) {
      this.drawChapters();
      return;
    }

    const coverLevel = getChapterCoverLevel(chapter);
    const coverSrc = resolvePreviewImage(coverLevel);
    const coverImage = this.getResolvedImage(coverSrc);
    const themeColor = (coverLevel && coverLevel.themeColor) || '#73f0ff';
    const total = chapter.levels.length;
    const completed = chapter.levels.filter((item) => item.completed).length;
    const titleMotion = this.getScreenMotion('levels');

    ctx.save();
    ctx.shadowColor = `rgba(115, 240, 255, ${0.16 + titleMotion.glow * 0.1})`;
    ctx.shadowBlur = 12 + titleMotion.glow * 10;
    drawText(
      ctx,
      getSafeChapterTitle(chapter),
      this.viewWidth / 2,
      34 + titleMotion.offsetY * 0.22 + titleMotion.floatY * 0.5,
      30,
      `rgba(234,252,255,${titleMotion.alpha})`,
      'center',
      'bold'
    );
    ctx.restore();
    drawText(
      ctx,
      '挑选一个场景切入剧情，逐步拼回这一章的全貌。',
      this.viewWidth / 2,
      70 + titleMotion.offsetY * 0.18,
      14,
      `rgba(230,251,255,${0.54 + titleMotion.alpha * 0.26})`,
      'center'
    );

    const headerY = 102 + titleMotion.offsetY * 0.35;
    ctx.save();
    ctx.globalAlpha = titleMotion.alpha;
    drawGlassCard(ctx, 18, headerY, this.viewWidth - 36, 74, 24);
    if (coverImage) {
      drawImageCover(ctx, coverImage, 26, headerY + 8, 94, 58, 16);
      this.drawMotionMotes('levels', { x: 26, y: headerY + 8, w: 94, h: 58 }, {
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

    drawParagraph(ctx, getChapterSummary(chapter), 132, headerY + 12, this.viewWidth - 160, 13, 'rgba(230,251,255,0.78)', 18, 2);
    fillRoundRect(ctx, 132, headerY + 42, 90, 20, 10, `${themeColor}33`, `${themeColor}88`);
    drawText(ctx, `已完成 ${completed}/${total}`, 177, headerY + 46, 11, '#e9ffff', 'center', 'bold');
    drawText(ctx, `${total} 个关卡`, this.viewWidth - 28, headerY + 46, 12, 'rgba(230,251,255,0.62)', 'right');
    ctx.restore();

    let rowIndex = 0;
    this.levelButtons.forEach((button) => {
      if (button.key === 'back') {
        this.drawButton(Object.assign({ label: '返回章节' }, button), false, true);
        return;
      }

      const level = button.level;
      const locked = !level.unlocked;
      const done = !!level.completed;
      const previewSrc = resolvePreviewImage(level);
      const previewImage = this.getResolvedImage(previewSrc);
      const reveal = this.getScreenMotion('levels', rowIndex + 1);
      const thumbPressed = !!(
        this.uiPressState &&
        this.uiPressState.screen === 'levels' &&
        this.uiPressState.key === button.key
      );
      rowIndex += 1;
      const rowY = button.y + reveal.offsetY * 0.72;
      const thumbInset = thumbPressed ? 2 : 0;
      const thumbX = button.x + 10 + thumbInset;
      const thumbY = rowY + 8 + thumbInset;
      const thumbW = 52 - thumbInset * 2;
      const thumbH = button.h - 16 - thumbInset * 2;

      ctx.save();
      ctx.globalAlpha = reveal.alpha;
      fillRoundRect(
        ctx,
        button.x,
        rowY,
        button.w,
        button.h,
        22,
        locked ? 'rgba(7, 20, 31, 0.42)' : 'rgba(11, 30, 46, 0.62)',
        locked ? 'rgba(255,255,255,0.06)' : 'rgba(145, 235, 255, 0.16)'
      );

      if (thumbPressed) {
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(111,245,255,0.26)';
        fillRoundRect(ctx, thumbX - 1, thumbY - 1, thumbW + 2, thumbH + 2, 14, 'rgba(9, 30, 45, 0.68)', 'rgba(150,248,255,0.4)');
        ctx.restore();
      }
      fillRoundRect(ctx, thumbX, thumbY, thumbW, thumbH, 14, 'rgba(6, 24, 36, 0.78)', thumbPressed ? 'rgba(163,249,255,0.42)' : 'rgba(142, 235, 255, 0.12)');
      if (previewImage) {
        drawImageCover(ctx, previewImage, thumbX, thumbY, thumbW, thumbH, 14);
        this.drawMotionMotes('levels', { x: thumbX, y: thumbY, w: thumbW, h: thumbH }, {
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
          14,
          thumbPressed
            ? 'rgba(150,248,255,0.1)'
            : locked
              ? 'rgba(2, 8, 14, 0.42)'
              : 'rgba(3, 12, 22, 0.18)'
        );
      }

      drawText(
        ctx,
        getSafeLevelTitle(level),
        button.x + 74,
        rowY + 10,
        17,
        locked ? 'rgba(230,251,255,0.42)' : '#f3ffff',
        'left',
        'bold'
      );
      drawText(
        ctx,
        `${level.rows}x${level.cols} · ${level.timeLimit}s · 体力 ${level.energyCost}`,
        button.x + 74,
        rowY + 31,
        11,
        locked ? 'rgba(230,251,255,0.3)' : 'rgba(230,251,255,0.62)'
      );

      let statusText = '点击入局';
      let statusColor = '#aef7ff';
      if (locked) {
        statusText = '未解锁';
        statusColor = 'rgba(230,251,255,0.42)';
      } else if (done) {
        statusText = `已完成 · ${level.stars || 0} 星`;
        statusColor = '#b9ffd9';
      }

      drawText(ctx, statusText, button.x + button.w - 16, rowY + 12, 11, statusColor, 'right');
      fillRoundRect(ctx, button.x + button.w - 88, rowY + button.h - 22, 72, 16, 8, `${themeColor}22`, `${themeColor}55`);
      drawText(ctx, done ? '已拼合' : locked ? '待进入' : '可挑战', button.x + button.w - 52, rowY + button.h - 20, 10, '#eaffff', 'center');
      ctx.restore();
    });
  }

  drawStoryHome() {
    const ctx = this.ctx;
    const hero = this.homeMeta;
    const continueLevel = hero.continueLevel;
    const continueImage = this.getResolvedImage(resolvePreviewImage(continueLevel));
    const themeColor = (continueLevel && continueLevel.themeColor) || '#61d5e8';
    const chapters = levelRepo.getChaptersWithProgress(this.progress);
    const customCount = levelRepo.getCustomLevelsWithProgress(this.progress).length;
    const totalLevels = chapters.reduce((sum, item) => sum + item.levels.length, 0);
    const titleMotion = this.getScreenMotion('home');
    const heroParallax = this.getHomeHeroParallax();
    const titleAlpha = titleMotion.alpha;
    const titleY = 36 + titleMotion.offsetY * 0.35 + titleMotion.floatY;
    const accentWidth = 86 + titleMotion.glow * 26;

    ctx.save();
    ctx.shadowColor = `rgba(115, 240, 255, ${0.18 + titleMotion.glow * 0.12})`;
    ctx.shadowBlur = 14 + titleMotion.glow * 14;
    drawText(ctx, '谜境拼图', this.viewWidth / 2, titleY, 34, `rgba(234,252,255,${titleAlpha})`, 'center', 'bold');
    ctx.restore();
    drawText(
      ctx,
      '十六幕兰若旧梦，已尽数收入这一卷《倩女幽魂》',
      this.viewWidth / 2,
      78 + titleMotion.offsetY * 0.25,
      14,
      `rgba(230,251,255,${0.54 + titleAlpha * 0.28})`,
      'center'
    );
    fillRoundRect(
      ctx,
      this.viewWidth / 2 - accentWidth / 2,
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
    this.drawMotionMotes('home', { x: hero.heroX + 8, y: hero.heroY + 8, w: hero.heroW - 16, h: hero.heroH - 16 }, {
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
    drawText(ctx, '当前剧卷', hero.heroX + 56, hero.heroY + 22, 11, '#e9ffff', 'center', 'bold');
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
      continueLevel ? getSafeChapterTitle(continueLevel) : '倩女幽魂 · 第一回',
      hero.heroX + 18,
      hero.heroY + 92,
      14,
      'rgba(230,251,255,0.74)'
    );
    drawText(
      ctx,
      `${this.profile.energy}/${this.profile.maxEnergy} 体力 · ${this.profile.coins} 金币 · ${customCount} 个自定义谜境`,
      hero.heroX + 18,
      hero.heroY + 118,
      13,
      'rgba(230,251,255,0.84)'
    );
    drawParagraph(
      ctx,
      continueLevel
        ? '继续拼回当前剧情，沿着兰若寺的残梦一路走到《白首焚稿》。'
        : '从《暴雨古道》入局，顺着十六幅图像一步步揭开《倩女幽魂》的完整旧梦。',
      hero.heroX + 18,
      hero.heroY + 144,
      hero.heroW - 36,
      13,
      'rgba(230,251,255,0.76)',
      20,
      2
    );

    const chipY = hero.heroY + hero.heroH - 34;
    const chipText = [`主卷 ${chapters.length} 卷`, `剧情 ${totalLevels} 回`];
    chipText.forEach((text, index) => {
      const x = hero.heroX + 18 + index * 110;
      fillRoundRect(ctx, x, chipY, 94, 22, 11, 'rgba(8, 29, 44, 0.55)', 'rgba(145, 235, 255, 0.12)');
      drawText(ctx, text, x + 47, chipY + 4, 11, '#dffcff', 'center');
    });

    this.homeButtons.forEach((button) => this.drawButton(button, button.primary));
    this.homeMiniButtons.forEach((button) => this.drawButton(button, false, true));
  }

  drawStoryChapters() {
    const ctx = this.ctx;
    const titleMotion = this.getScreenMotion('chapters');
    const titleY = 38 + titleMotion.offsetY * 0.28 + titleMotion.floatY * 0.7;
    const titleAlpha = titleMotion.alpha;

    ctx.save();
    ctx.shadowColor = `rgba(115, 240, 255, ${0.16 + titleMotion.glow * 0.1})`;
    ctx.shadowBlur = 12 + titleMotion.glow * 10;
    drawText(ctx, '幽魂剧卷', this.viewWidth / 2, titleY, 32, `rgba(234,252,255,${titleAlpha})`, 'center', 'bold');
    ctx.restore();
    drawText(
      ctx,
      '这一卷只写兰若寺旧梦。自《暴雨古道》起，至《白首焚稿》终。',
      this.viewWidth / 2,
      78 + titleMotion.offsetY * 0.22,
      14,
      `rgba(230,251,255,${0.54 + titleAlpha * 0.26})`,
      'center'
    );
    fillRoundRect(
      ctx,
      this.viewWidth / 2 - 52,
      102 + titleMotion.offsetY * 0.18,
      104 + titleMotion.glow * 18,
      4,
      2,
      `rgba(115, 240, 255, ${0.22 + titleMotion.glow * 0.16})`
    );

    let cardIndex = 0;
    this.chapterButtons.forEach((button) => {
      if (button.key === 'back') {
        this.drawButton(Object.assign({ label: '返回首页' }, button), false, true);
        return;
      }

      const chapter = button.chapter;
      const coverLevel = getChapterCoverLevel(chapter);
      const coverSrc = resolvePreviewImage(coverLevel);
      const coverImage = this.getResolvedImage(coverSrc);
      const total = chapter.levels.length;
      const completed = chapter.completedCount || 0;
      const unlockedCount = chapter.levels.filter((item) => item.unlocked).length;
      const progress = total ? completed / total : 0;
      const progressWidth = Math.max(0, Math.floor((button.w - 140) * progress));
      const themeColor = (coverLevel && coverLevel.themeColor) || '#73f0ff';
      const reveal = this.getScreenMotion('chapters', cardIndex + 1);
      cardIndex += 1;

      drawGlassCard(ctx, button.x, button.y, button.w, button.h, 24);
      fillRoundRect(ctx, button.x + 10, button.y + 10, 88, button.h - 20, 18, 'rgba(6, 24, 36, 0.78)', 'rgba(142, 235, 255, 0.14)');
      if (coverImage) {
        const coverShift = (1 - reveal.eased) * 7;
        ctx.save();
        roundRectPath(ctx, button.x + 10, button.y + 10, 88, button.h - 20, 18);
        ctx.clip();
        ctx.globalAlpha = reveal.alpha;
        drawImageCover(
          ctx,
          coverImage,
          button.x + 8 - coverShift * 0.2,
          button.y + 10 + coverShift,
          92,
          button.h - 16,
          18
        );
        this.drawMotionMotes('chapters', { x: button.x + 10, y: button.y + 10, w: 88, h: button.h - 20 }, {
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
        unlockedCount > 0 ? `已入局 ${unlockedCount}/${total}` : '尚未入局',
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
        'rgba(230,251,255,0.7)',
        17,
        2
      );
      fillRoundRect(ctx, button.x + 110, button.y + button.h - 18, button.w - 126, 6, 3, 'rgba(255,255,255,0.08)');
      if (progressWidth > 0) {
        fillRoundRect(ctx, button.x + 110, button.y + button.h - 18, progressWidth, 6, 3, themeColor);
      }
    });
  }

  drawStoryLevels() {
    const ctx = this.ctx;
    const chapter = this.selectedChapter;
    if (!chapter) {
      this.drawStoryChapters();
      return;
    }

    const coverLevel = getChapterCoverLevel(chapter);
    const coverSrc = resolvePreviewImage(coverLevel);
    const coverImage = this.getResolvedImage(coverSrc);
    const themeColor = (coverLevel && coverLevel.themeColor) || '#73f0ff';
    const total = chapter.levels.length;
    const completed = chapter.levels.filter((item) => item.completed).length;
    const titleMotion = this.getScreenMotion('levels');

    ctx.save();
    ctx.shadowColor = `rgba(115, 240, 255, ${0.16 + titleMotion.glow * 0.1})`;
    ctx.shadowBlur = 12 + titleMotion.glow * 10;
    drawText(
      ctx,
      getSafeChapterTitle(chapter),
      this.viewWidth / 2,
      34 + titleMotion.offsetY * 0.22 + titleMotion.floatY * 0.5,
      30,
      `rgba(234,252,255,${titleMotion.alpha})`,
      'center',
      'bold'
    );
    ctx.restore();
    drawText(
      ctx,
      '按顺序进入十六回场景，逐步拼回兰若寺旧梦的全貌。',
      this.viewWidth / 2,
      70 + titleMotion.offsetY * 0.18,
      14,
      `rgba(230,251,255,${0.54 + titleMotion.alpha * 0.26})`,
      'center'
    );

    const headerY = 102 + titleMotion.offsetY * 0.35;
    ctx.save();
    ctx.globalAlpha = titleMotion.alpha;
    drawGlassCard(ctx, 18, headerY, this.viewWidth - 36, 74, 24);
    if (coverImage) {
      drawImageCover(ctx, coverImage, 26, headerY + 8, 94, 58, 16);
      this.drawMotionMotes('levels', { x: 26, y: headerY + 8, w: 94, h: 58 }, {
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

    drawParagraph(ctx, getChapterSummary(chapter), 132, headerY + 12, this.viewWidth - 160, 13, 'rgba(230,251,255,0.78)', 18, 2);
    fillRoundRect(ctx, 132, headerY + 42, 90, 20, 10, `${themeColor}33`, `${themeColor}88`);
    drawText(ctx, `已完成 ${completed}/${total}`, 177, headerY + 46, 11, '#e9ffff', 'center', 'bold');
    drawText(ctx, `${total} 回剧情`, this.viewWidth - 28, headerY + 46, 12, 'rgba(230,251,255,0.62)', 'right');
    ctx.restore();

    let rowIndex = 0;
    this.levelButtons.forEach((button) => {
      if (button.key === 'back') {
        this.drawButton(Object.assign({ label: '返回剧卷' }, button), false, true);
        return;
      }

      const level = button.level;
      const locked = !level.unlocked;
      const done = !!level.completed;
      const previewSrc = resolvePreviewImage(level);
      const previewImage = this.getResolvedImage(previewSrc);
      const reveal = this.getScreenMotion('levels', rowIndex + 1);
      const thumbPressed = !!(
        this.uiPressState &&
        this.uiPressState.screen === 'levels' &&
        this.uiPressState.key === button.key
      );
      rowIndex += 1;
      const rowY = button.y + reveal.offsetY * 0.72;
      const thumbInset = thumbPressed ? 2 : 0;
      const thumbX = button.x + 10 + thumbInset;
      const thumbY = rowY + 8 + thumbInset;
      const thumbW = 52 - thumbInset * 2;
      const thumbH = button.h - 16 - thumbInset * 2;

      ctx.save();
      ctx.globalAlpha = reveal.alpha;
      fillRoundRect(
        ctx,
        button.x,
        rowY,
        button.w,
        button.h,
        22,
        locked ? 'rgba(7, 20, 31, 0.42)' : 'rgba(11, 30, 46, 0.62)',
        locked ? 'rgba(255,255,255,0.06)' : 'rgba(145, 235, 255, 0.16)'
      );

      if (thumbPressed) {
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.shadowColor = 'rgba(111,245,255,0.26)';
        fillRoundRect(ctx, thumbX - 1, thumbY - 1, thumbW + 2, thumbH + 2, 14, 'rgba(9, 30, 45, 0.68)', 'rgba(150,248,255,0.4)');
        ctx.restore();
      }
      fillRoundRect(ctx, thumbX, thumbY, thumbW, thumbH, 14, 'rgba(6, 24, 36, 0.78)', thumbPressed ? 'rgba(163,249,255,0.42)' : 'rgba(142, 235, 255, 0.12)');
      if (previewImage) {
        drawImageCover(ctx, previewImage, thumbX, thumbY, thumbW, thumbH, 14);
        this.drawMotionMotes('levels', { x: thumbX, y: thumbY, w: thumbW, h: thumbH }, {
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
          14,
          thumbPressed
            ? 'rgba(150,248,255,0.1)'
            : locked
              ? 'rgba(2, 8, 14, 0.42)'
              : 'rgba(3, 12, 22, 0.18)'
        );
      }

      drawText(
        ctx,
        getSafeLevelTitle(level),
        button.x + 74,
        rowY + 10,
        17,
        locked ? 'rgba(230,251,255,0.42)' : '#f3ffff',
        'left',
        'bold'
      );
      drawText(
        ctx,
        `${level.rows}x${level.cols} · ${level.timeLimit}s · 体力 ${level.energyCost}`,
        button.x + 74,
        rowY + 31,
        11,
        locked ? 'rgba(230,251,255,0.3)' : 'rgba(230,251,255,0.62)'
      );

      let statusText = '点击入局';
      let statusColor = '#aef7ff';
      if (locked) {
        statusText = '未解锁';
        statusColor = 'rgba(230,251,255,0.42)';
      } else if (done) {
        statusText = `已完成 · ${level.stars || 0} 星`;
        statusColor = '#b9ffd9';
      }

      drawText(ctx, statusText, button.x + button.w - 16, rowY + 12, 11, statusColor, 'right');
      fillRoundRect(ctx, button.x + button.w - 88, rowY + button.h - 22, 72, 16, 8, `${themeColor}22`, `${themeColor}55`);
      drawText(ctx, done ? '已拼合' : locked ? '待入局' : '可挑战', button.x + button.w - 52, rowY + button.h - 20, 10, '#eaffff', 'center');
      ctx.restore();
    });

    if (this.overlay && this.overlay.type === 'chapter') {
      this.drawOverlay();
    }
  }

  isButtonPressed(button) {
    if (!button || !this.uiPressState) {
      return false;
    }
    return this.uiPressState.screen === this.screen && this.uiPressState.key === button.key;
  }

  drawButton(button, primary, compact) {
    const ctx = this.ctx;
    const pressed = this.isButtonPressed(button);
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

  drawScreenFade() {
    if (!this.screenMotion || this.screenMotion.screen !== this.screen) {
      return;
    }

    const motion = this.getScreenMotion(this.screen);
    if (motion.enter >= 1) {
      return;
    }

    const ctx = this.ctx;
    const alpha = (1 - motion.eased) * 0.28;
    ctx.save();
    ctx.fillStyle = `rgba(3, 12, 20, ${alpha})`;
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    ctx.restore();
  }

  render() {
    const ctx = this.ctx;
    if (ctx.setTransform) {
      ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
    }
    ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);
    this.drawBackground();

    if (this.screen === 'loading') {
      this.drawLoading();
    } else if (this.screen === 'home') {
      this.drawHome();
    } else if (this.screen === 'chapters') {
      this.drawChapters();
    } else if (this.screen === 'levels') {
      this.drawLevels();
    } else if (this.screen === 'custom') {
      this.drawCustom();
    } else if (this.screen === 'supply') {
      this.drawSupplyPanel();
    } else if (this.screen === 'legal') {
      this.drawLegalPanel();
    } else if (this.screen === 'puzzle') {
      this.drawPuzzle();
    }

    this.drawScreenFade();
    this.drawToast();
  }

  drawPuzzle() {
    const ctx = this.ctx;
    const level = this.currentLevel;
    if (!level || !this.boardRect) {
      return;
    }

    drawGlassCard(ctx, 14, 18, this.viewWidth - 28, 84, 24);
    drawText(ctx, getSafeLevelTitle(level), 28, 32, 22, '#f2fdff', 'left', 'bold');
    drawText(ctx, `${getSafeChapterTitle(level)} · ${level.rows}x${level.cols}`, 28, 62, 14, 'rgba(230,251,255,0.72)');
    drawText(ctx, formatTime(this.timeLeft), this.viewWidth - 24, 28, 24, '#aef7ff', 'right', 'bold');
    drawText(ctx, `步数 ${this.gameState.moves} · 提示 ${this.gameState.hintsLeft}`, this.viewWidth - 24, 62, 14, 'rgba(230,251,255,0.72)', 'right');

    drawGlassCard(ctx, this.boardRect.x - 10, this.boardRect.y - 10, this.boardRect.w + 20, this.boardRect.h + 20, 28);
    this.drawBoard();
    this.buildPuzzleLayout();
    this.puzzleButtons.forEach((button) => this.drawButton(button, button.key === 'hint'));

    drawText(ctx, `定格符 ${this.profile.unlockDragTools} · 引路符 ${this.profile.guideHintTools}`, 24, this.viewHeight - 56, 14, 'rgba(230,251,255,0.74)');

    if (this.guideHint) {
      const targetCoords = gameEngine.slotToRowCol(this.guideHint.targetSlot, level.cols);
      drawText(ctx, `引路：把高亮碎片拖到第 ${targetCoords.row + 1} 行第 ${targetCoords.col + 1} 列`, this.viewWidth - 24, this.viewHeight - 56, 14, '#f7e6b0', 'right');
    }

    if (this.overlay) {
      this.drawOverlay();
    }
  }

  drawBoard() {
    const ctx = this.ctx;
    const board = this.boardRect;
    const level = this.currentLevel;
    const cell = board.cell;
    const previewSrc = resolvePreviewImage(level);
    if (!this.currentImage && previewSrc) {
      this.currentImage = this.getResolvedImage(previewSrc);
    }

    fillRoundRect(ctx, board.x, board.y, board.w, board.h, 18, 'rgba(4, 18, 28, 0.52)', 'rgba(255,255,255,0.08)');

    const allPieces = [];
    for (let slot = 1; slot < this.gameState.slots.length; slot += 1) {
      const pieceId = this.gameState.slots[slot];
      if (pieceId) {
        allPieces.push(this.gameState.pieces[pieceId]);
      }
    }

    const activeGroupLookup = {};
    if (this.drag && this.drag.groupPieceIds) {
      this.drag.groupPieceIds.forEach((pieceId) => {
        activeGroupLookup[pieceId] = true;
      });
    }

    const passivePieces = allPieces.filter((piece) => !activeGroupLookup[piece.id]);
    const activePieces = allPieces.filter((piece) => activeGroupLookup[piece.id]);
    passivePieces.concat(activePieces).forEach((piece) => {
      const coords = gameEngine.slotToRowCol(piece.currentSlot, level.cols);
      const baseX = board.x + coords.col * cell;
      const baseY = board.y + coords.row * cell;
      const settleEffect = !activeGroupLookup[piece.id] ? this.getSettleEffect(piece.id) : null;
      const settleOffset = settleEffect ? this.getSettleOffset(piece.id) : null;
      const dx = activeGroupLookup[piece.id] && this.drag ? this.drag.dx : settleOffset ? settleOffset.x : 0;
      const dy = activeGroupLookup[piece.id] && this.drag ? this.drag.dy : settleOffset ? settleOffset.y : 0;
      const drawX = baseX + dx;
      const drawY = baseY + dy;

      if (settleEffect && settleEffect.variant === 'passiveSwap') {
        this.drawSettleTrail(settleEffect, baseX, baseY, drawX, drawY, cell);
      }

      if (this.currentImage) {
        const cropCoords = gameEngine.slotToRowCol(piece.correctSlot, level.cols);
        const cropSide = Math.min(this.currentImage.width, this.currentImage.height);
        const cropOffsetX = (this.currentImage.width - cropSide) / 2;
        const cropOffsetY = (this.currentImage.height - cropSide) / 2;
        const srcW = cropSide / level.cols;
        const srcH = cropSide / level.rows;
        const srcX = cropOffsetX + cropCoords.col * srcW;
        const srcY = cropOffsetY + cropCoords.row * srcH;
        ctx.drawImage(this.currentImage, srcX, srcY, srcW, srcH, drawX, drawY, cell, cell);
      } else {
        ctx.save();
        ctx.fillStyle = level.themeColor || '#3f8ca3';
        ctx.fillRect(drawX, drawY, cell, cell);
        drawText(ctx, `${piece.id}`, drawX + cell / 2, drawY + cell / 2 - 10, 18, '#ffffff', 'center', 'bold');
        ctx.restore();
      }

      const isGuidePiece =
        this.guideHint &&
        (piece.id === this.guideHint.pieceId ||
          (this.gameState.pieces[this.guideHint.pieceId] &&
            this.gameState.pieces[this.guideHint.pieceId].groupId === piece.groupId));

      if (piece.locked || isGuidePiece || activeGroupLookup[piece.id]) {
        ctx.save();
        ctx.shadowBlur = 18;
        ctx.lineWidth = 3;
        if (piece.locked) {
          ctx.shadowColor = 'rgba(110, 244, 255, 0.46)';
          ctx.strokeStyle = 'rgba(110, 244, 255, 0.84)';
        } else if (isGuidePiece) {
          ctx.shadowColor = 'rgba(255, 210, 92, 0.55)';
          ctx.strokeStyle = 'rgba(255, 221, 115, 0.98)';
        } else {
          ctx.shadowColor = 'rgba(111, 245, 255, 0.58)';
          ctx.strokeStyle = 'rgba(111, 245, 255, 0.98)';
        }
        roundRectPath(ctx, drawX + 2, drawY + 2, cell - 4, cell - 4, 14);
        ctx.stroke();
        ctx.restore();
      }
    });

    if (this.guideHint) {
      const target = gameEngine.slotToRowCol(this.guideHint.targetSlot, level.cols);
      const x = board.x + target.col * cell;
      const y = board.y + target.row * cell;
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(111, 245, 255, 0.66)';
      ctx.lineWidth = 3;
      if (ctx.setLineDash) {
        ctx.setLineDash([8, 6]);
      }
      ctx.strokeStyle = 'rgba(111, 245, 255, 0.96)';
      roundRectPath(ctx, x + 6, y + 6, cell - 12, cell - 12, 14);
      ctx.stroke();
      ctx.restore();
    }

    this.drawBoardEffects();
  }

  drawOverlay() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = 'rgba(1, 9, 16, 0.36)';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    ctx.restore();

    drawGlassCard(ctx, 18, this.viewHeight - 218, this.viewWidth - 36, 128, 28);
    drawText(ctx, this.overlay.title, 34, this.viewHeight - 198, 22, '#f3fdff', 'left', 'bold');
    drawParagraph(ctx, this.overlay.desc, 34, this.viewHeight - 164, this.viewWidth - 68, 14, 'rgba(230,251,255,0.78)', 22, 2);

    if (this.overlay.type === 'success' && this.successResult) {
      drawText(ctx, `金币 +${this.successResult.rewards.coins} · 星级 ${this.successResult.rewards.stars} · 剩余 ${formatTime(this.timeLeft)}`, 34, this.viewHeight - 120, 14, '#b7fff6');
    }

    this.buildOverlayButtons();
    this.overlayButtons.forEach((button, index) => this.drawButton(button, index === 0));
  }

  buildPuzzleLayout() {
    if (!this.currentLevel) {
      return;
    }

    const safeWidth = this.viewWidth - 28;
    const boardTop = 126;
    const bottomSpace = 214;
    const maxBoardW = safeWidth - 24;
    const maxBoardH = this.viewHeight - boardTop - bottomSpace;
    const cellSize = Math.floor(
      Math.min(maxBoardW / this.currentLevel.cols, maxBoardH / this.currentLevel.rows)
    );
    const boardW = cellSize * this.currentLevel.cols;
    const boardH = cellSize * this.currentLevel.rows;
    const boardX = Math.floor((this.viewWidth - boardW) / 2);
    const boardY = boardTop;

    this.boardRect = {
      x: boardX,
      y: boardY,
      w: boardW,
      h: boardH,
      cell: cellSize
    };

    const buttonGap = 10;
    const buttonW = Math.floor((this.viewWidth - 44 - buttonGap * 2) / 3);
    const secondRowW = Math.floor((this.viewWidth - 44 - buttonGap) / 2);
    const firstRowY = boardY + boardH + 18;
    const secondRowY = firstRowY + 54 + buttonGap;

    this.puzzleButtons = [
      { key: 'hint', label: `破局提示 ${this.gameState.hintsLeft}`, x: 22, y: firstRowY, w: buttonW, h: 54 },
      { key: 'lock', label: `定格符 ${this.profile.unlockDragTools}`, x: 22 + buttonW + buttonGap, y: firstRowY, w: buttonW, h: 54 },
      { key: 'guide', label: `引路符 ${this.profile.guideHintTools}`, x: 22 + (buttonW + buttonGap) * 2, y: firstRowY, w: buttonW, h: 54 },
      { key: 'reset', label: '重置谜境', x: 22, y: secondRowY, w: secondRowW, h: 50 },
      { key: 'home', label: '离开谜境', x: 22 + secondRowW + buttonGap, y: secondRowY, w: secondRowW, h: 50 }
    ];
  }

  openFailOverlay() {
    logger.trackEvent('minigame_level_fail', {
      levelId: this.currentLevel.levelId,
      moves: this.gameState.moves
    });
    const buttons = [];
    if (!this.gameState.revived) {
      buttons.push({ key: 'revive', label: '复活 +15 秒' });
    }
    buttons.push({ key: 'retry', label: '重新入局' });
    buttons.push({ key: 'home', label: '回到首页' });

    this.overlay = {
      type: 'fail',
      title: '谜境暂未揭晓',
      desc: '时间已经耗尽。你可以复活继续，也可以重新整理这一局的线索。',
      buttons
    };
    this.buildOverlayButtons();
  }

  openSuccessOverlay() {
    if (this.overlay && this.overlay.type === 'success') {
      return;
    }

    const result = storage.updateLevelResult({
      levelId: this.currentLevel.levelId,
      success: true,
      moves: this.gameState.moves,
      remainingTime: Math.ceil(this.timeLeft)
    });
    this.refreshProfile();
    this.successResult = result;
    this.overlay = {
      type: 'success',
      title: '谜境已经拼合',
      desc: '完整画面已经回到眼前。你可以先停留欣赏，再决定是否进入下一段谜境。',
      buttons: [
        { key: 'next', label: result.nextLevelId ? '进入下一关' : '返回首页' },
        { key: 'home', label: '留在主界面' }
      ]
    };
    logger.trackEvent('minigame_level_success', {
      levelId: this.currentLevel.levelId,
      moves: this.gameState.moves,
      timeLeft: Math.ceil(this.timeLeft),
      stars: result.rewards.stars
    });
    this.buildOverlayButtons();
  }

  buildOverlayButtons() {
    if (!this.overlay) {
      this.overlayButtons = [];
      return;
    }

    if (this.overlay.type === 'success') {
      this.buildSuccessOverlayButtons();
      return;
    }

    if (this.overlay.type === 'intro') {
      this.buildIntroOverlayButtons();
      return;
    }

    if (this.overlay.type === 'chapter') {
      this.buildChapterOverlayButtons();
      return;
    }

    const cardX = 18;
    const cardW = this.viewWidth - 36;
    const cardH = this.overlay.type === 'success' ? 214 : 232;
    const cardY = this.viewHeight - cardH - 24;
    const innerX = cardX + 14;
    const innerW = cardW - 28;
    const buttonGap = 12;

    if (this.overlay.buttons.length <= 2) {
      const count = this.overlay.buttons.length;
      const buttonW = count === 1 ? innerW : Math.floor((innerW - buttonGap) / 2);
      const y = cardY + cardH - 62;
      this.overlayButtons = this.overlay.buttons.map((item, index) => ({
        key: item.key,
        label: item.label,
        x: innerX + (count === 1 ? 0 : index * (buttonW + buttonGap)),
        y,
        w: buttonW,
        h: 48
      }));
      return;
    }

    const halfW = Math.floor((innerW - buttonGap) / 2);
    const topY = cardY + cardH - 122;
    const bottomY = cardY + cardH - 62;
    this.overlayButtons = [
      {
        key: this.overlay.buttons[0].key,
        label: this.overlay.buttons[0].label,
        x: innerX,
        y: topY,
        w: halfW,
        h: 48
      },
      {
        key: this.overlay.buttons[1].key,
        label: this.overlay.buttons[1].label,
        x: innerX + halfW + buttonGap,
        y: topY,
        w: halfW,
        h: 48
      },
      {
        key: this.overlay.buttons[2].key,
        label: this.overlay.buttons[2].label,
        x: innerX,
        y: bottomY,
        w: innerW,
        h: 48
      }
    ];
  }

  drawPuzzle() {
    const ctx = this.ctx;
    const level = this.currentLevel;
    if (!level || !this.boardRect) {
      return;
    }

    this.buildPuzzleLayout();

    const pieces = Object.values(this.gameState.pieces || {});
    const correctCount = pieces.filter((piece) => piece.currentSlot === piece.correctSlot).length;
    const lockedCount = pieces.filter((piece) => piece.locked).length;
    const totalCount = level.rows * level.cols;
    const guideText = this.guideHint
      ? (() => {
          const target = gameEngine.slotToRowCol(this.guideHint.targetSlot, level.cols);
          return `引路符已标出目标位置：第 ${target.row + 1} 行，第 ${target.col + 1} 列`;
        })()
      : '拖动相邻碎片拼成更大的拼块组，再慢慢把整张谜境拼回原貌。';

    drawGlassCard(ctx, 14, 18, this.viewWidth - 28, 96, 26);
    fillRoundRect(ctx, 26, 28, 72, 72, 18, 'rgba(8, 28, 40, 0.84)', 'rgba(124, 229, 245, 0.14)');
    if (this.currentImage) {
      drawImageCover(ctx, this.currentImage, 26, 28, 72, 72, 18);
      fillRoundRect(ctx, 26, 28, 72, 72, 18, 'rgba(3, 12, 22, 0.12)');
    }

    drawText(ctx, getSafeLevelTitle(level), 112, 30, 24, '#f3fdff', 'left', 'bold');
    drawText(
      ctx,
      `${getSafeChapterTitle(level)} · ${level.rows}x${level.cols} · ${level.timeLimit} 秒谜境`,
      112,
      60,
      13,
      'rgba(230,251,255,0.68)'
    );
    drawText(
      ctx,
      `已归位 ${correctCount}/${totalCount} · 已定格 ${lockedCount} · 步数 ${this.gameState.moves}`,
      112,
      82,
      13,
      'rgba(230,251,255,0.78)'
    );

    fillRoundRect(ctx, this.viewWidth - 116, 28, 78, 44, 20, 'rgba(68, 219, 238, 0.18)', 'rgba(123, 247, 255, 0.36)');
    drawText(ctx, '剩余时间', this.viewWidth - 77, 36, 10, 'rgba(230,251,255,0.68)', 'center');
    drawText(ctx, formatTime(this.timeLeft), this.viewWidth - 77, 50, 20, '#aef7ff', 'center', 'bold');

    fillRoundRect(ctx, this.viewWidth - 116, 80, 78, 20, 10, 'rgba(255,255,255,0.06)', 'rgba(123, 247, 255, 0.14)');
    drawText(ctx, `提示 ${this.gameState.hintsLeft}`, this.viewWidth - 77, 84, 11, '#e9ffff', 'center');

    drawGlassCard(ctx, this.boardRect.x - 12, this.boardRect.y - 12, this.boardRect.w + 24, this.boardRect.h + 24, 30);
    this.drawBoard();

    drawText(ctx, '破局工具', 24, this.puzzleButtons[0].y - 22, 16, '#eafcff', 'left', 'bold');
    drawText(ctx, '定格正确碎片，或用引路符标出下一块能接边的碎片。', this.viewWidth - 24, this.puzzleButtons[0].y - 20, 12, 'rgba(230,251,255,0.6)', 'right');
    this.puzzleButtons.forEach((button) => this.drawButton(button, button.key === 'hint'));

    const infoY = this.puzzleButtons[3].y + this.puzzleButtons[3].h + 12;
    const infoH = 58;
    const leftW = 128;
    drawGlassCard(ctx, 18, infoY, leftW, infoH, 18);
    drawText(ctx, '谜境资源', 30, infoY + 12, 12, 'rgba(230,251,255,0.7)', 'left');
    drawText(ctx, `定格符 ${this.profile.unlockDragTools}`, 30, infoY + 30, 14, '#eafcff', 'left', 'bold');
    drawText(ctx, `引路符 ${this.profile.guideHintTools}`, 30, infoY + 48, 14, '#f7e6b0', 'left', 'bold');

    drawGlassCard(ctx, 154, infoY, this.viewWidth - 172, infoH, 18);
    drawText(ctx, this.overlay && this.overlay.type === 'success' ? '谜境已完整展开' : '入局提示', 168, infoY + 12, 12, 'rgba(230,251,255,0.7)', 'left');
    drawParagraph(
      ctx,
      this.overlay && this.overlay.type === 'success'
        ? '完整画面已经回到眼前。你可以先欣赏原图，再决定要不要继续下一关。'
        : guideText,
      168,
      infoY + 28,
      this.viewWidth - 200,
      13,
      this.guideHint ? '#f6e4a7' : 'rgba(230,251,255,0.82)',
      18,
      2
    );

    if (this.overlay) {
      this.drawOverlay();
    }
  }

  drawOverlay() {
    const ctx = this.ctx;
    if (this.overlay && this.overlay.type === 'success') {
      this.drawSuccessNarrativeOverlay();
      return;
    }
    if (this.overlay && this.overlay.type === 'intro') {
      this.drawIntroNarrativeOverlay();
      return;
    }
    if (this.overlay && this.overlay.type === 'chapter') {
      this.drawChapterNarrativeOverlay();
      return;
    }
    const isSuccess = this.overlay.type === 'success';
    const isIntro = this.overlay.type === 'intro';
    const cardX = 18;
    const cardW = this.viewWidth - 36;
    const cardH = isSuccess ? 214 : 232;
    const cardY = this.viewHeight - cardH - 24;
    const accent = isSuccess ? '#8ff6ff' : isIntro ? '#8ff6ff' : '#ffd38e';
    const title = isSuccess ? '谜境已经拼合' : '谜境暂未揭晓';
    const desc = isSuccess
      ? '完整画面已经浮现。你可以先停在这一刻欣赏原图，再决定是否继续进入下一段谜境。'
      : this.gameState.revived
        ? '这一次复活机会已经用过了。你可以整理思路重新入局，或者先回到首页。'
        : '距离揭晓只差一点。可以用一次复活多争取 15 秒，也可以重新整理这局谜境。';
    const pieces = Object.values(this.gameState.pieces || {});
    const lockedCount = pieces.filter((piece) => piece.locked).length;
    const chipY = cardY + (isSuccess ? 112 : 120);
    const chipW = Math.floor((cardW - 48) / 3);

    ctx.save();
    ctx.fillStyle = 'rgba(1, 9, 16, 0.42)';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    ctx.restore();

    drawGlassCard(ctx, cardX, cardY, cardW, cardH, 28);
    fillRoundRect(ctx, cardX + 16, cardY + 16, 96, 22, 11, `${accent}22`, `${accent}55`);
    drawText(ctx, isSuccess ? '拼合完成' : '线索中断', cardX + 64, cardY + 20, 11, '#eaffff', 'center', 'bold');
    drawText(ctx, title, cardX + 16, cardY + 48, 24, '#f3fdff', 'left', 'bold');
    drawParagraph(ctx, desc, cardX + 16, cardY + 80, cardW - 32, 14, 'rgba(230,251,255,0.8)', 20, 2);

    const chips = isSuccess
      ? [
          { label: '金币奖励', value: `+${(this.successResult && this.successResult.rewards.coins) || 0}` },
          { label: '谜境评级', value: `${(this.successResult && this.successResult.rewards.stars) || 0} 星` },
          { label: '剩余时间', value: formatTime(this.timeLeft) }
        ]
      : [
          { label: '当前步数', value: `${this.gameState.moves}` },
          { label: '已定格', value: `${lockedCount} 块` },
          { label: '复活状态', value: this.gameState.revived ? '已用过' : '可使用' }
        ];

    chips.forEach((chip, index) => {
      const x = cardX + 12 + index * (chipW + 6);
      fillRoundRect(ctx, x, chipY, chipW, 34, 14, 'rgba(7, 24, 36, 0.72)', 'rgba(124, 229, 245, 0.12)');
      drawText(ctx, chip.label, x + 12, chipY + 8, 10, 'rgba(230,251,255,0.58)', 'left');
      drawText(ctx, chip.value, x + 12, chipY + 20, 14, isSuccess ? '#b9fff7' : '#ffe0a8', 'left', 'bold');
    });

    this.buildOverlayButtons();
    this.overlayButtons.forEach((button, index) => this.drawButton(button, index === 0));
  }

  activateSuccessStoryOverlay() {
    if (!this.overlay || this.overlay.type !== 'success') {
      return;
    }

    const storyText = (this.currentLevel && this.currentLevel.outroText) || '';
    if (!storyText || this.overlay.storyPhase === 'story') {
      return;
    }

    this.overlay.storyPhase = 'story';
    this.overlay.title = '这一回故事';
    this.overlay.desc = storyText;
    this.overlay.buttons = [
      { key: 'next', label: this.successResult && this.successResult.nextLevelId ? '进入下一回' : '返回首页' },
      { key: 'home', label: '留在主界面' }
    ];
    this.buildOverlayButtons();
    logger.trackEvent('minigame_story_revealed', {
      levelId: this.currentLevel && this.currentLevel.levelId
    });
  }

  getSuccessOverlayMetrics() {
    const isStory = this.overlay && this.overlay.type === 'success' && this.overlay.storyPhase === 'story';
    const cardX = 18;
    const cardW = this.viewWidth - 36;
    const cardH = isStory ? 252 : 214;
    const cardY = this.viewHeight - cardH - 24;
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

  buildSuccessOverlayButtons() {
    const metrics = this.getSuccessOverlayMetrics();
    const buttonGap = 12;
    const count = this.overlay.buttons.length;
    const buttonW = count === 1 ? metrics.innerW : Math.floor((metrics.innerW - buttonGap) / 2);
    const y = metrics.cardY + metrics.cardH - 62;

    this.overlayButtons = this.overlay.buttons.map((item, index) => ({
      key: item.key,
      label: item.label,
      x: metrics.innerX + (count === 1 ? 0 : index * (buttonW + buttonGap)),
      y,
      w: buttonW,
      h: 48
    }));
  }

  buildIntroOverlayButtons() {
    const cardX = 18;
    const cardW = this.viewWidth - 36;
    const cardH = 244;
    const cardY = this.viewHeight - cardH - 24;
    const innerX = cardX + 14;
    const innerW = cardW - 28;
    const buttonGap = 12;
    const count = this.overlay.buttons.length;
    const buttonW = count === 1 ? innerW : Math.floor((innerW - buttonGap) / 2);
    const y = cardY + cardH - 62;

    this.overlayButtons = this.overlay.buttons.map((item, index) => ({
      key: item.key,
      label: item.label,
      x: innerX + (count === 1 ? 0 : index * (buttonW + buttonGap)),
      y,
      w: buttonW,
      h: 48
    }));
  }

  buildChapterOverlayButtons() {
    const cardX = 18;
    const cardW = this.viewWidth - 36;
    const cardH = 252;
    const cardY = this.viewHeight - cardH - 24;
    const innerX = cardX + 14;
    const innerW = cardW - 28;
    const buttonGap = 12;
    const count = this.overlay.buttons.length;
    const buttonW = count === 1 ? innerW : Math.floor((innerW - buttonGap) / 2);
    const y = cardY + cardH - 62;

    this.overlayButtons = this.overlay.buttons.map((item, index) => ({
      key: item.key,
      label: item.label,
      x: innerX + (count === 1 ? 0 : index * (buttonW + buttonGap)),
      y,
      w: buttonW,
      h: 48
    }));
  }

  drawSuccessNarrativeOverlay() {
    const ctx = this.ctx;
    const metrics = this.getSuccessOverlayMetrics();
    const title = this.overlay.title || '谜境已经拼合';
    const desc = this.overlay.desc || '完整画面已经回到眼前。';
    const chips = metrics.isStory
      ? [
          { label: '故事场景', value: (this.currentLevel && this.currentLevel.sceneName) || getSafeLevelTitle(this.currentLevel) },
          { label: '线索标签', value: (this.currentLevel && this.currentLevel.clueTag) || '剧情' },
          { label: '剩余时间', value: formatTime(this.timeLeft) }
        ]
      : [
          { label: '金币奖励', value: `+${(this.successResult && this.successResult.rewards.coins) || 0}` },
          { label: '谜境评级', value: `${(this.successResult && this.successResult.rewards.stars) || 0} 星` },
          { label: '剩余时间', value: formatTime(this.timeLeft) }
        ];

    ctx.save();
    ctx.fillStyle = 'rgba(1, 9, 16, 0.42)';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    ctx.restore();

    drawGlassCard(ctx, metrics.cardX, metrics.cardY, metrics.cardW, metrics.cardH, 28);
    fillRoundRect(ctx, metrics.cardX + 16, metrics.cardY + 16, 108, 22, 11, 'rgba(143, 246, 255, 0.22)', 'rgba(143, 246, 255, 0.55)');
    drawText(ctx, metrics.isStory ? '剧情揭晓' : '拼合完成', metrics.cardX + 70, metrics.cardY + 20, 11, '#eaffff', 'center', 'bold');
    drawText(ctx, title, metrics.cardX + 16, metrics.cardY + 48, 24, '#f3fdff', 'left', 'bold');
    drawParagraph(ctx, desc, metrics.cardX + 16, metrics.cardY + 80, metrics.cardW - 32, 14, 'rgba(230,251,255,0.82)', 20, metrics.isStory ? 3 : 2);

    chips.forEach((chip, index) => {
      const x = metrics.cardX + 12 + index * (metrics.chipW + 6);
      fillRoundRect(ctx, x, metrics.chipY, metrics.chipW, 34, 14, 'rgba(7, 24, 36, 0.72)', 'rgba(124, 229, 245, 0.12)');
      drawText(ctx, chip.label, x + 12, metrics.chipY + 8, 10, 'rgba(230,251,255,0.58)', 'left');
      drawText(ctx, chip.value, x + 12, metrics.chipY + 20, 14, metrics.isStory ? '#f7e6b0' : '#b9fff7', 'left', 'bold');
    });

    this.buildOverlayButtons();
    this.overlayButtons.forEach((button, index) => this.drawButton(button, index === 0));
  }

  drawIntroNarrativeOverlay() {
    const ctx = this.ctx;
    const cardX = 18;
    const cardW = this.viewWidth - 36;
    const cardH = 244;
    const cardY = this.viewHeight - cardH - 24;
    const chipW = Math.floor((cardW - 48) / 3);
    const chipY = cardY + 146;

    ctx.save();
    ctx.fillStyle = 'rgba(1, 9, 16, 0.42)';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    ctx.restore();

    drawGlassCard(ctx, cardX, cardY, cardW, cardH, 28);
    fillRoundRect(ctx, cardX + 16, cardY + 16, 108, 22, 11, 'rgba(143, 246, 255, 0.22)', 'rgba(143, 246, 255, 0.55)');
    drawText(ctx, '剧情开场', cardX + 70, cardY + 20, 11, '#eaffff', 'center', 'bold');
    drawText(ctx, this.overlay.title || '这一回开场', cardX + 16, cardY + 48, 24, '#f3fdff', 'left', 'bold');
    drawParagraph(ctx, this.overlay.desc || '', cardX + 16, cardY + 80, cardW - 32, 14, 'rgba(230,251,255,0.82)', 20, 3);

    const chips = [
      { label: '当前回目', value: getSafeLevelTitle(this.currentLevel) },
      { label: '线索标签', value: this.currentLevel.clueTag || '剧情' },
      { label: '倒计时', value: formatTime(this.timeLeft) }
    ];

    chips.forEach((chip, index) => {
      const x = cardX + 12 + index * (chipW + 6);
      fillRoundRect(ctx, x, chipY, chipW, 34, 14, 'rgba(7, 24, 36, 0.72)', 'rgba(124, 229, 245, 0.12)');
      drawText(ctx, chip.label, x + 12, chipY + 8, 10, 'rgba(230,251,255,0.58)', 'left');
      drawText(ctx, chip.value, x + 12, chipY + 20, 14, '#b9fff7', 'left', 'bold');
    });

    this.buildOverlayButtons();
    this.overlayButtons.forEach((button, index) => this.drawButton(button, index === 0));
  }

  drawChapterNarrativeOverlay() {
    const ctx = this.ctx;
    const chapter = this.selectedChapter;
    const total = chapter ? chapter.levels.length : 0;
    const completed = chapter ? chapter.levels.filter((item) => item.completed).length : 0;
    const unlocked = chapter ? chapter.levels.filter((item) => item.unlocked).length : 0;
    const coverLevel = getChapterCoverLevel(chapter);
    const coverImage = this.getResolvedImage(resolvePreviewImage(coverLevel));
    const cardX = 18;
    const cardW = this.viewWidth - 36;
    const cardH = 252;
    const cardY = this.viewHeight - cardH - 24;
    const chipW = Math.floor((cardW - 48) / 3);
    const chipY = cardY + 156;

    ctx.save();
    ctx.fillStyle = 'rgba(1, 9, 16, 0.46)';
    ctx.fillRect(0, 0, this.viewWidth, this.viewHeight);
    ctx.restore();

    drawGlassCard(ctx, cardX, cardY, cardW, cardH, 28);
    fillRoundRect(ctx, cardX + 16, cardY + 16, 108, 22, 11, 'rgba(143, 246, 255, 0.22)', 'rgba(143, 246, 255, 0.55)');
    drawText(ctx, '章节旁白', cardX + 70, cardY + 20, 11, '#eaffff', 'center', 'bold');

    if (coverImage) {
      drawImageCover(ctx, coverImage, cardX + 16, cardY + 48, 96, 84, 18);
      fillRoundRect(ctx, cardX + 16, cardY + 48, 96, 84, 18, 'rgba(3, 12, 22, 0.16)');
    } else {
      fillRoundRect(ctx, cardX + 16, cardY + 48, 96, 84, 18, 'rgba(6, 24, 36, 0.78)', 'rgba(142, 235, 255, 0.14)');
    }

    drawText(ctx, this.overlay.title || (chapter ? getSafeChapterTitle(chapter) : '章节旁白'), cardX + 126, cardY + 52, 22, '#f3fdff', 'left', 'bold');
    drawParagraph(ctx, this.overlay.desc || '', cardX + 126, cardY + 84, cardW - 142, 14, 'rgba(230,251,255,0.82)', 20, 3);

    const chips = [
      { label: '总回目', value: `${total} 回` },
      { label: '已揭卷', value: `${completed}/${total}` },
      { label: '已入局', value: `${unlocked}/${total}` }
    ];

    chips.forEach((chip, index) => {
      const x = cardX + 12 + index * (chipW + 6);
      fillRoundRect(ctx, x, chipY, chipW, 34, 14, 'rgba(7, 24, 36, 0.72)', 'rgba(124, 229, 245, 0.12)');
      drawText(ctx, chip.label, x + 12, chipY + 8, 10, 'rgba(230,251,255,0.58)', 'left');
      drawText(ctx, chip.value, x + 12, chipY + 20, 14, '#b9fff7', 'left', 'bold');
    });

    this.buildOverlayButtons();
    this.overlayButtons.forEach((button, index) => this.drawButton(button, index === 0));
  }

  clearPuzzleEffects() {
    this.snapPulses = [];
    this.fxParticles = [];
    this.settleAnimations = [];
  }

  playHaptic(type, scene) {
    if (!wx.vibrateShort) {
      return;
    }

    try {
      wx.vibrateShort({
        type: type || 'light'
      });
    } catch (error) {
      logger.captureError(scene || 'minigame_vibrate_feedback', error);
    }
  }

  playFeedbackCue(kind, options) {
    const nextOptions = options || {};
    const soundEnabled = !!(this.profile && this.profile.soundEnabled);
    let effectKey = '';
    let audioOptions = {};
    let hapticType = nextOptions.hapticType;
    let hapticScene = nextOptions.hapticScene;

    if (kind === 'merge') {
      effectKey = 'snap';
      audioOptions = { volume: 0.62, playbackRate: 1.06 };
      hapticType = hapticType || 'light';
      hapticScene = hapticScene || 'minigame_merge_vibrate';
    } else if (kind === 'improve') {
      effectKey = 'snap';
      audioOptions = { volume: 0.46, playbackRate: 0.96 };
      hapticType = hapticType || 'light';
      hapticScene = hapticScene || 'minigame_improve_vibrate';
    } else if (kind === 'lock') {
      effectKey = 'lock';
      audioOptions = { volume: 0.72, playbackRate: 1 };
      hapticType = hapticType || 'medium';
      hapticScene = hapticScene || 'minigame_lock_vibrate';
    } else if (kind === 'guide') {
      effectKey = 'guide';
      audioOptions = { volume: 0.68, playbackRate: 1 };
      hapticType = hapticType || 'light';
      hapticScene = hapticScene || 'minigame_guide_vibrate';
    } else if (kind === 'success') {
      effectKey = 'success';
      audioOptions = { volume: 0.84, playbackRate: 1 };
      hapticType = hapticType || 'medium';
      hapticScene = hapticScene || 'minigame_success_vibrate';
    } else if (kind === 'fail') {
      effectKey = 'fail';
      audioOptions = { volume: 0.78, playbackRate: 1 };
      hapticType = hapticType || 'medium';
      hapticScene = hapticScene || 'minigame_fail_vibrate';
    }

    if (effectKey) {
      audioService.playEffect(effectKey, soundEnabled, audioOptions);
    }

    if (hapticType) {
      this.playHaptic(hapticType, hapticScene);
    }
  }

  syncScreenAudio() {
    const soundEnabled = !!(this.profile && this.profile.soundEnabled);
    if (!soundEnabled) {
      audioService.stopAll();
      return;
    }

    if (['home', 'chapters', 'levels', 'custom', 'supply', 'legal'].includes(this.screen)) {
      audioService.playAmbient('menu', soundEnabled, { volume: 0.22 });
      return;
    }

    audioService.stopAmbient();
  }

  handleSupplyTap(x, y) {
    const button = this.supplyButtons.find((item) => hitButton(item, x, y));
    if (!button) {
      return;
    }

    if (button.key === 'signin') {
      const result = storage.claimDailySignIn();
      this.refreshProfile();
      this.buildSupplyLayout();
      if (!result.ok) {
        this.showToast('今天已经签到过了');
      } else {
        logger.trackEvent('minigame_supply_sign_in');
        this.playFeedbackCue('guide', { hapticType: '' });
        this.showToast('体力 +3 · 定格符 +1 · 引路符 +1');
      }
      return;
    }

    if (button.key === 'sound') {
      const profile = storage.saveSoundEnabled(!this.profile.soundEnabled);
      this.profile = profile;
      this.buildSupplyLayout();
      logger.trackEvent('minigame_supply_toggle_sound', {
        enabled: !!profile.soundEnabled
      });
      if (profile.soundEnabled) {
        this.syncScreenAudio();
        this.playFeedbackCue('guide', { hapticType: '' });
        this.showToast('音效与氛围音已开启');
      } else {
        audioService.stopAll();
        this.showToast('音效与氛围音已关闭');
      }
      return;
    }

    if (button.key === 'energy-ad') {
      adService.showRewardedAction('2 点体力').then((granted) => {
        if (!granted) {
          this.showToast('没有获得体力奖励');
          return;
        }
        storage.addEnergy(2);
        this.refreshProfile();
        this.buildSupplyLayout();
        logger.trackEvent('minigame_supply_energy_reward');
        this.playFeedbackCue('guide', { hapticType: '' });
        this.showToast('体力 +2');
      });
      return;
    }

    if (button.key === 'unlock-ad') {
      adService.showRewardedAction('1 个定格符').then((granted) => {
        if (!granted) {
          this.showToast('没有获得定格符');
          return;
        }
        storage.addUnlockDragTools(1);
        this.refreshProfile();
        this.buildSupplyLayout();
        logger.trackEvent('minigame_supply_unlock_reward');
        this.playFeedbackCue('lock', { hapticType: '' });
        this.showToast('定格符 +1');
      });
      return;
    }

    if (button.key === 'guide-ad') {
      adService.showRewardedAction('1 个引路符').then((granted) => {
        if (!granted) {
          this.showToast('没有获得引路符');
          return;
        }
        storage.addGuideHintTools(1);
        this.refreshProfile();
        this.buildSupplyLayout();
        logger.trackEvent('minigame_supply_guide_reward');
        this.playFeedbackCue('guide', { hapticType: '' });
        this.showToast('引路符 +1');
      });
      return;
    }

    if (button.key === 'custom') {
      this.switchToCustom();
      return;
    }

    if (button.key === 'privacy') {
      this.switchToLegal('privacy');
      return;
    }

    if (button.key === 'agreement') {
      this.switchToLegal('agreement');
      return;
    }

    if (button.key === 'release') {
      this.switchToLegal('release');
      return;
    }

    if (button.key === 'copy-logs') {
      wx.setClipboardData({
        data: logger.buildExportText(80),
        success: () => {
          logger.trackEvent('minigame_supply_copy_logs');
          this.showToast('运行日志已复制');
        }
      });
      return;
    }

    if (button.key === 'clear-logs') {
      wx.showModal({
        title: '清空运行日志',
        content: '清空后会移除本地事件和错误记录，适合重新开始排查。',
        success: (res) => {
          if (!res.confirm) {
            return;
          }
          logger.clearLogs();
          logger.trackEvent('minigame_supply_clear_logs');
          this.showToast('运行日志已清空');
        }
      });
      return;
    }

    if (button.key === 'back-home') {
      this.switchToHome();
    }
  }

  openFailOverlay() {
    logger.trackEvent('minigame_level_fail', {
      levelId: this.currentLevel.levelId,
      moves: this.gameState.moves
    });
    const buttons = [];
    if (!this.gameState.revived) {
      buttons.push({ key: 'revive', label: '复活 +15 秒' });
    }
    buttons.push({ key: 'retry', label: '重新入局' });
    buttons.push({ key: 'home', label: '回到首页' });

    this.overlay = {
      type: 'fail',
      title: '谜境暂未揭晓',
      desc: '时间已经耗尽。你可以复活继续，也可以重新整理这一局的线索。',
      buttons
    };
    this.playFeedbackCue('fail');
    this.buildOverlayButtons();
  }

  useHint() {
    const applyHint = () => {
      const fixedPieceId = gameEngine.autoPlaceOne(this.currentLevel, this.gameState);
      if (!fixedPieceId) {
        this.showToast('已经非常接近揭晓了');
        return;
      }

      this.guideHint = null;
      logger.trackEvent('minigame_use_hint', {
        levelId: this.currentLevel.levelId,
        pieceId: fixedPieceId
      });

      if (gameEngine.isComplete(this.gameState)) {
        this.playSuccessCelebration();
        this.openSuccessOverlay();
      } else {
        this.playFeedbackCue('improve', { hapticType: '' });
        this.showToast('系统帮你归位了一块碎片');
      }
    };

    if (this.gameState.hintsLeft > 0) {
      this.gameState.hintsLeft -= 1;
      applyHint();
      return;
    }

    adService.showRewardedAction('额外提示').then((granted) => {
      if (!granted) {
        this.showToast('没有获得额外提示');
        return;
      }
      applyHint();
    });
  }

  useLockTool() {
    const lockableIds = gameEngine.getLockableCorrectPieceIds(this.gameState);
    if (lockableIds.length === 0) {
      this.showToast('当前没有可定格的正确碎片');
      return;
    }

    const consumeResult = storage.consumeUnlockDragTool(1);
    if (!consumeResult.ok) {
      this.refreshProfile();
      this.showToast('定格符不足');
      return;
    }

    const lockedIds = gameEngine.lockCorrectPieces(this.currentLevel, this.gameState);
    this.refreshProfile();
    this.playFeedbackCue('lock');
    logger.trackEvent('minigame_use_lock_tool', {
      levelId: this.currentLevel.levelId,
      lockedCount: lockedIds.length
    });
    this.showToast(`已定格 ${lockedIds.length} 块碎片`);
  }

  useGuideTool() {
    const hint = gameEngine.getGuideHint(this.currentLevel, this.gameState);
    if (!hint) {
      this.showToast('当前没有合适的引路提示');
      return;
    }

    const consumeResult = storage.consumeGuideHintTool(1);
    if (!consumeResult.ok) {
      this.refreshProfile();
      this.showToast('引路符不足');
      return;
    }

    this.guideHint = hint;
    this.refreshProfile();
    logger.trackEvent('minigame_use_guide_tool', {
      levelId: this.currentLevel.levelId,
      pieceId: hint.pieceId,
      targetSlot: hint.targetSlot
    });
    this.playFeedbackCue('guide');
    this.showToast('已标出下一块可接边碎片');
  }

  startSettleAnimation(dragSnapshot, rowDelta, colDelta) {
    if (!dragSnapshot || !this.boardRect || !dragSnapshot.groupPieceIds || !dragSnapshot.groupPieceIds.length) {
      return;
    }

    const cell = this.boardRect.cell;
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
      this.settleAnimations = this.settleAnimations.filter((item) => item.pieceId !== pieceId);
      this.settleAnimations.push({
        pieceId,
        fromX: offsetX,
        fromY: offsetY,
        variant: 'active',
        age: 0,
        duration
      });
    });
  }

  capturePieceSlotSnapshot() {
    const snapshot = {};
    if (!this.gameState || !this.gameState.pieces) {
      return snapshot;
    }

    Object.keys(this.gameState.pieces).forEach((pieceId) => {
      const piece = this.gameState.pieces[pieceId];
      snapshot[piece.id] = piece.currentSlot;
    });
    return snapshot;
  }

  startPassiveSettleAnimations(beforePieceSlots, excludePieceIds) {
    if (!beforePieceSlots || !this.boardRect || !this.currentLevel || !this.gameState || !this.gameState.pieces) {
      return;
    }

    const excludedLookup = {};
    (excludePieceIds || []).forEach((pieceId) => {
      excludedLookup[pieceId] = true;
    });

    const cell = this.boardRect.cell;
    const duration = 150;
    Object.keys(this.gameState.pieces).forEach((pieceKey) => {
      const piece = this.gameState.pieces[pieceKey];
      if (!piece || excludedLookup[piece.id]) {
        return;
      }

      const previousSlot = beforePieceSlots[piece.id];
      if (!previousSlot || previousSlot === piece.currentSlot) {
        return;
      }

      const previousCoords = gameEngine.slotToRowCol(previousSlot, this.currentLevel.cols);
      const currentCoords = gameEngine.slotToRowCol(piece.currentSlot, this.currentLevel.cols);
      const fromX = (previousCoords.col - currentCoords.col) * cell;
      const fromY = (previousCoords.row - currentCoords.row) * cell;

      if (Math.abs(fromX) < 0.5 && Math.abs(fromY) < 0.5) {
        return;
      }

      this.settleAnimations = this.settleAnimations.filter((item) => item.pieceId !== piece.id);
      this.settleAnimations.push({
        pieceId: piece.id,
        fromX,
        fromY,
        variant: 'passiveSwap',
        age: 0,
        duration
      });
    });
  }

  getSettleEffect(pieceId) {
    return this.settleAnimations.find((item) => item.pieceId === pieceId) || null;
  }

  getSettleOffset(pieceId) {
    const effect = this.getSettleEffect(pieceId);
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

  drawSettleTrail(effect, baseX, baseY, drawX, drawY, cell) {
    const deltaX = drawX - baseX;
    const deltaY = drawY - baseY;
    if (Math.abs(deltaX) < 1 && Math.abs(deltaY) < 1) {
      return;
    }

    const progress = clamp(effect.age / effect.duration, 0, 1);
    const alpha = (1 - progress) * 0.28;
    const ctx = this.ctx;

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

  capturePuzzleFeedback(pieceId) {
    const pieces = Object.values((this.gameState && this.gameState.pieces) || {});
    const groups = Object.values((this.gameState && this.gameState.groups) || {});
    const piece = pieceId && this.gameState ? this.gameState.pieces[pieceId] : null;
    const activeGroup = piece && piece.groupId ? this.gameState.groups[piece.groupId] : null;

    return {
      correctCount: pieces.filter((item) => item.currentSlot === item.correctSlot).length,
      largestGroupSize: groups.reduce((max, group) => Math.max(max, group.pieceIds.length), 1),
      activeGroupSize: activeGroup ? activeGroup.pieceIds.length : piece ? 1 : 0
    };
  }

  getGroupBounds(group) {
    if (!group || !group.pieceIds || !group.pieceIds.length || !this.boardRect || !this.currentLevel) {
      return null;
    }

    let minRow = this.currentLevel.rows;
    let minCol = this.currentLevel.cols;
    let maxRow = 0;
    let maxCol = 0;

    group.pieceIds.forEach((pieceId) => {
      const piece = this.gameState.pieces[pieceId];
      if (!piece) {
        return;
      }
      const coords = gameEngine.slotToRowCol(piece.currentSlot, this.currentLevel.cols);
      minRow = Math.min(minRow, coords.row);
      minCol = Math.min(minCol, coords.col);
      maxRow = Math.max(maxRow, coords.row);
      maxCol = Math.max(maxCol, coords.col);
    });

    const cell = this.boardRect.cell;
    const x = this.boardRect.x + minCol * cell;
    const y = this.boardRect.y + minRow * cell;
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

  addSnapPulse(bounds, tone, expandBoost) {
    if (!bounds) {
      return;
    }

    const palettes = {
      cyan: { rgb: '111,245,255', glow: 0.62 },
      gold: { rgb: '255,225,132', glow: 0.58 },
      success: { rgb: '173,255,247', glow: 0.68 }
    };
    const palette = palettes[tone] || palettes.cyan;
    this.snapPulses.push({
      x: bounds.x,
      y: bounds.y,
      w: bounds.w,
      h: bounds.h,
      age: 0,
      duration: tone === 'success' ? 980 : 480,
      rgb: palette.rgb,
      glow: palette.glow,
      expand: expandBoost || (tone === 'success' ? 26 : 16),
      radius: Math.min(26, Math.max(16, this.boardRect ? this.boardRect.cell * 0.28 : 18))
    });

    if (this.snapPulses.length > 10) {
      this.snapPulses.splice(0, this.snapPulses.length - 10);
    }
  }

  spawnBurstParticles(x, y, count, palette, options) {
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
      this.fxParticles.push({
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

    if (this.fxParticles.length > 160) {
      this.fxParticles.splice(0, this.fxParticles.length - 160);
    }
  }

  triggerMoveFeedback(beforeMove, pieceId) {
    if (!beforeMove || !pieceId || !this.gameState) {
      return;
    }

    const afterMove = this.capturePuzzleFeedback(pieceId);
    const movedPiece = this.gameState.pieces[pieceId];
    const movedGroup = movedPiece ? this.gameState.groups[movedPiece.groupId] : null;
    if (!movedGroup) {
      return;
    }

    const grew = afterMove.activeGroupSize > beforeMove.activeGroupSize;
    const improved = afterMove.correctCount > beforeMove.correctCount;
    if (!grew && !improved) {
      return;
    }

    const bounds = this.getGroupBounds(movedGroup);
    if (!bounds) {
      return;
    }

    const tone = grew ? 'cyan' : 'gold';
    const palette = grew
      ? ['111,245,255', '170,255,248', '224,255,255']
      : ['255,225,132', '255,244,204', '111,245,255'];
    this.addSnapPulse(bounds, tone, grew ? 18 : 12);
    this.spawnBurstParticles(bounds.cx, bounds.cy, grew ? Math.min(16, movedGroup.pieceIds.length * 2 + 4) : 8, palette, {
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
    this.playFeedbackCue(grew ? 'merge' : 'improve', {
      hapticType: gameEngine.isComplete(this.gameState) ? '' : 'light'
    });
  }

  playSuccessCelebration() {
    if (!this.boardRect) {
      return;
    }

    const board = this.boardRect;
    this.addSnapPulse(
      {
        x: board.x - 6,
        y: board.y - 6,
        w: board.w + 12,
        h: board.h + 12
      },
      'success',
      28
    );

    this.spawnBurstParticles(board.x + board.w * 0.28, board.y + board.h * 0.16, 18, ['173,255,247', '111,245,255', '255,244,204'], {
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
    this.spawnBurstParticles(board.x + board.w * 0.72, board.y + board.h * 0.16, 18, ['173,255,247', '111,245,255', '255,225,132'], {
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
    this.spawnBurstParticles(board.x + board.w * 0.5, board.y + board.h * 0.08, 14, ['255,225,132', '111,245,255', '224,255,255'], {
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

    this.playFeedbackCue('success');
  }

  updateAnimationEffects(delta) {
    const safeDelta = Math.max(0, delta || 0);

    if (this.settleAnimations.length) {
      this.settleAnimations = this.settleAnimations.filter((effect) => {
        effect.age += safeDelta;
        return effect.age < effect.duration;
      });
    }

    if (this.snapPulses.length) {
      this.snapPulses = this.snapPulses.filter((effect) => {
        effect.age += safeDelta;
        return effect.age < effect.duration;
      });
    }

    if (this.fxParticles.length) {
      const deltaSeconds = safeDelta / 1000;
      this.fxParticles = this.fxParticles.filter((particle) => {
        particle.age += safeDelta;
        particle.x += particle.vx * deltaSeconds;
        particle.y += particle.vy * deltaSeconds;
        particle.vy += particle.gravity * deltaSeconds;
        return particle.age < particle.duration;
      });
    }
  }

  drawBoardEffects() {
    const ctx = this.ctx;

    this.snapPulses.forEach((effect) => {
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

    this.fxParticles.forEach((particle) => {
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

  drawToast() {
    if (!this.toast) {
      return;
    }

    const ctx = this.ctx;
    const width = Math.min(this.viewWidth - 44, 280);
    const x = (this.viewWidth - width) / 2;
    const y = this.viewHeight - 168;
    fillRoundRect(ctx, x, y, width, 40, 20, 'rgba(6, 24, 36, 0.82)', 'rgba(124, 229, 245, 0.14)');
    drawText(ctx, this.toast.message, x + width / 2, y + 10, 14, '#effdff', 'center');
  }
}

module.exports = {
  start() {
    const app = new MiniGameApp();
    app.start();
  }
};
