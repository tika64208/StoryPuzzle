const levelRepo = require('../services/level-repo');

const DISPLAY_CHAPTERS = {
  ch01: '深夜旧宅',
  ch02: '废弃剧场',
  ch03: '雨夜码头',
  ch04: '倩女幽魂',
  ch05: '倩女幽魂·双生局'
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
const MAX_IMAGE_CACHE_ITEMS = 8;
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

function drawSettingsGearIcon(ctx, centerX, centerY, radius, color) {
  const innerRadius = radius * 0.4;
  const ringRadius = radius * 0.72;
  const toothInner = radius * 0.82;
  const toothOuter = radius * 1.06;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, radius * 0.15);
  ctx.lineCap = 'round';

  for (let index = 0; index < 8; index += 1) {
    const angle = (Math.PI / 4) * index;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    ctx.beginPath();
    ctx.moveTo(centerX + cos * toothInner, centerY + sin * toothInner);
    ctx.lineTo(centerX + cos * toothOuter, centerY + sin * toothOuter);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(centerX, centerY, innerRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
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
  return level.chapterTitle || level.title || getChapterTitle(level);
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

module.exports = {
  DEFAULT_CUSTOM_IMAGE_PATH,
  DEFAULT_CUSTOM_TITLE,
  CUSTOM_SHARE_BASE64_LIMIT,
  MAX_IMAGE_CACHE_ITEMS,
  CUSTOM_LAYOUT_OPTIONS,
  clamp,
  roundRectPath,
  fillRoundRect,
  drawGlassCard,
  drawImageCover,
  drawText,
  wrapText,
  drawParagraph,
  drawSettingsGearIcon,
  hitButton,
  formatTime,
  getTodayKey,
  chunkArray,
  chooseImagePromise,
  compressImagePromise,
  actionSheetPromise,
  modalPromise,
  getClipboardDataPromise,
  resolvePreviewImage,
  getMiniGameImageCandidates,
  getSafeLevelTitle,
  getSafeChapterTitle,
  getChapterSummary,
  getChapterCoverLevel,
  getAccountInfo,
  buildLegalPreview
};
