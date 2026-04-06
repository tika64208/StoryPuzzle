const levelRepo = require('../services/level-repo');
const logger = require('../services/logger');
const release = require('../services/release');
const storage = require('../utils/storage');
const legal = require('../config/legal');

function updateSelectedChapterDifficulty(app, stars, helpers) {
  const { getChapterDifficultyStars } = helpers;
  if (!app.selectedChapter || !app.selectedChapter.chapterId) {
    return;
  }

  const chapterId = app.selectedChapter.chapterId;
  const currentStars = getChapterDifficultyStars(app.profile, chapterId);
  if (currentStars === stars) {
    app.showToast(`当前已经是 ${stars} 星难度`);
    return;
  }

  app.profile = storage.saveChapterDifficulty(chapterId, stars);
  app.refreshSelectedChapter();
  app.buildLevelLayout();
  logger.trackEvent('minigame_change_chapter_difficulty', {
    chapterId,
    difficultyStars: stars
  });
  app.showToast(`已切换为 ${stars} 星难度`);
}

function refreshCustomData(app) {
  app.customLevels = levelRepo.getCustomLevelsWithProgress(app.progress);
}

function ensureCustomPreview(app, path) {
  if (!path) {
    app.customPreviewImage = null;
    return;
  }

  app.loadImage(path)
    .then((image) => {
      if (app.customDraft && app.customDraft.imagePath === path) {
        app.customPreviewImage = image;
      }
    })
    .catch((error) => {
      logger.captureError('minigame_custom_preview', error, { path });
    });
}

function switchToCustom(app, helpers) {
  const { DEFAULT_CUSTOM_IMAGE_PATH, DEFAULT_CUSTOM_TITLE } = helpers;
  app.refreshProfile();
  app.refreshCustomData();
  app.screen = 'custom';
  app.overlay = null;
  app.drag = null;
  app.selectedChapter = null;
  app.triggerScreenMotion('custom');
  if (!app.customDraft) {
    app.customDraft = {
      imagePath: DEFAULT_CUSTOM_IMAGE_PATH,
      isDefault: true,
      title: DEFAULT_CUSTOM_TITLE,
      layoutIndex: 1,
      shareReady: false
    };
  }
  app.ensureCustomPreview(app.customDraft.imagePath);
  app.buildCustomLayout();
  app.pruneImageCache(true);
  app.syncScreenAudio();
}

function buildCustomLayout(app) {
  const width = app.viewWidth - 44;
  const rowGap = 12;
  const rowWidth = Math.floor((width - 12) / 2);
  const startY = 336;

  app.customButtons = [
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
  const visibleCount = Math.max(1, Math.min(3, Math.floor((app.viewHeight - listStartY - 30) / (cardH + listGap))));
  const visibleLevels = app.customLevels.slice(0, visibleCount);

  app.customItemButtons = [];
  visibleLevels.forEach((level, index) => {
    const y = listStartY + index * (cardH + listGap);
    app.customItemButtons.push({
      key: `play:${level.levelId}`,
      action: 'play',
      levelId: level.levelId,
      x: 22,
      y,
      w: width,
      h: cardH
    });
    app.customItemButtons.push({
      key: `share:${level.levelId}`,
      action: 'share',
      levelId: level.levelId,
      x: 22 + width - 146,
      y: y + 46,
      w: 64,
      h: 24
    });
    app.customItemButtons.push({
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

function switchToLegal(app, type) {
  app.refreshProfile();
  app.screen = 'legal';
  app.overlay = null;
  app.drag = null;
  app.triggerScreenMotion('legal');
  app.buildLegalLayout(type || 'privacy', 0);
  app.pruneImageCache(true);
  app.syncScreenAudio();
}

function buildLegalLayout(app, type, pageIndex, helpers) {
  const { clamp } = helpers;
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

  const pages = app.buildLegalPages(safeType);
  const safePageIndex = clamp(pageIndex || 0, 0, Math.max(0, pages.length - 1));

  app.legalState = {
    type: safeType,
    title: titleMap[safeType],
    pages,
    pageIndex: safePageIndex
  };

  const tabY = 110;
  const gap = 12;
  const width = app.viewWidth - 44;
  const tabW = Math.floor((width - gap * 2) / 3);
  app.legalTabButtons = tabs.map((item, index) => ({
    key: item.key,
    label: item.label,
    x: 22 + index * (tabW + gap),
    y: tabY,
    w: tabW,
    h: 38
  }));

  const buttonY = app.viewHeight - 110;
  const half = Math.floor((width - gap) / 2);
  app.legalButtons = [
    { key: 'prev', label: '上一页', x: 22, y: buttonY, w: half, h: 44 },
    { key: 'next', label: '下一页', x: 22 + half + gap, y: buttonY, w: half, h: 44 },
    { key: 'copy', label: safeType === 'release' ? '复制摘要' : '复制联系', x: 22, y: buttonY + 56, w: half, h: 44 },
    { key: 'back', label: '返回补给站', x: 22 + half + gap, y: buttonY + 56, w: half, h: 44 }
  ];
}

function buildLegalPages(type, helpers) {
  const { chunkArray } = helpers;
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
      heading: '发布概览',
      lines: [
        `已完成 ${checklist.summary.ready} / ${checklist.summary.total}`,
        `待补齐 ${checklist.summary.pending} 项`,
        `阻塞 ${checklist.summary.blocking} 项`,
        checklist.summary.canRelease
          ? '当前配置已满足提审前置要求'
          : '当前仍有阻塞项，暂不建议提审'
      ]
    }
  ];

  chunkArray(checklist.blockingItems, 3).forEach((group, index) => {
    pages.push({
      heading: `阻塞项 ${index + 1}`,
      lines: group.map((item) => `${item.label}：${item.detail}`)
    });
  });
  chunkArray(checklist.pendingItems.filter((item) => !item.blocking), 3).forEach((group, index) => {
    pages.push({
      heading: `待补齐 ${index + 1}`,
      lines: group.map((item) => `${item.label}：${item.detail}`)
    });
  });
  chunkArray(checklist.readyItems, 3).forEach((group, index) => {
    pages.push({
      heading: `已完成 ${index + 1}`,
      lines: group.map((item) => `${item.label}：${item.detail}`)
    });
  });
  pages.push({
    heading: '发布提醒',
    lines: checklist.tips || []
  });

  return pages;
}

module.exports = {
  updateSelectedChapterDifficulty,
  refreshCustomData,
  ensureCustomPreview,
  switchToCustom,
  buildCustomLayout,
  switchToLegal,
  buildLegalLayout,
  buildLegalPages
};
