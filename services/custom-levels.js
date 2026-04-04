const CUSTOM_LEVEL_KEY = 'mystery_custom_levels_v1';
const CHALLENGE_CODE_PREFIX = 'MPC1:';

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function getStorageList() {
  const cached = wx.getStorageSync(CUSTOM_LEVEL_KEY);
  return Array.isArray(cached) ? cached : [];
}

function saveStorageList(levels) {
  wx.setStorageSync(CUSTOM_LEVEL_KEY, levels);
  return clone(levels);
}

function normalizeImageStyle(imagePath) {
  const safePath = String(imagePath || '').replace(/"/g, '%22');
  return `url("${safePath}")`;
}

function createLevelId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function buildCustomLevel(options) {
  const createdAt = options.createdAt || Date.now();
  const levelId = options.levelId || createLevelId(options.sourceType === 'imported' ? 'shared' : 'custom');
  const chapterTitle = options.sourceType === 'imported' ? '朋友分享' : '我的拼图';
  const totalPieces = options.rows * options.cols;
  const sceneName = options.sourceType === 'imported' ? '好友挑战图' : '相册拼图';

  return {
    levelId,
    chapterId: options.sourceType === 'imported' ? 'custom-shared' : 'custom-local',
    chapterTitle,
    title: options.title || `自定义拼图 ${new Date(createdAt).toLocaleDateString()}`,
    introText:
      options.introText ||
      (options.sourceType === 'imported'
        ? '这是朋友分享给你的挑战图，拼回完整图片后看看能用几步完成。'
        : '这张图片来自你的相册，系统已经自动裁切并生成可玩的拼图关卡。'),
    outroText: options.outroText || '完整画面已经恢复，你可以继续刷更短时间或更少步数。',
    clueTag: options.clueTag || (options.sourceType === 'imported' ? '好友分享' : '自定义'),
    sceneName,
    sceneStyle: normalizeImageStyle(options.imagePath),
    themeColor: options.themeColor || '#d98657',
    rows: options.rows,
    cols: options.cols,
    timeLimit: options.timeLimit,
    energyCost: options.energyCost || 0,
    hints: options.hints,
    seed: options.seed || `${levelId}-${createdAt}`,
    chapterOrder: 999,
    levelOrder: createdAt,
    isCustom: true,
    shareable: true,
    customMeta: {
      createdAt,
      imagePath: options.imagePath,
      shareImageBase64: options.shareImageBase64 || '',
      authorName: options.authorName || '本地玩家',
      sourceType: options.sourceType || 'album',
      totalPieces
    }
  };
}

function listCustomLevels() {
  return getStorageList()
    .slice()
    .sort((left, right) => (right.customMeta?.createdAt || 0) - (left.customMeta?.createdAt || 0));
}

function getCustomLevelById(levelId) {
  return listCustomLevels().find((item) => item.levelId === levelId) || null;
}

function upsertCustomLevel(level) {
  const list = getStorageList();
  const index = list.findIndex((item) => item.levelId === level.levelId);
  if (index === -1) {
    list.unshift(level);
  } else {
    list[index] = level;
  }
  saveStorageList(list);
  return clone(level);
}

function removeCustomLevel(levelId) {
  const list = getStorageList();
  const target = list.find((item) => item.levelId === levelId);
  const nextList = list.filter((item) => item.levelId !== levelId);
  saveStorageList(nextList);
  return target || null;
}

function buildChallengeCode(levelId) {
  const level = getCustomLevelById(levelId);
  if (!level) {
    throw new Error('未找到要分享的关卡');
  }

  if (!level.customMeta || !level.customMeta.shareImageBase64) {
    throw new Error('当前关卡缺少可分享的图片数据');
  }

  const payload = {
    v: 1,
    i: level.title,
    a: level.customMeta.authorName || '匿名玩家',
    r: level.rows,
    c: level.cols,
    t: level.timeLimit,
    h: level.hints,
    b: level.customMeta.shareImageBase64
  };

  return `${CHALLENGE_CODE_PREFIX}${JSON.stringify(payload)}`;
}

function parseChallengeCode(code) {
  const raw = String(code || '').trim();
  if (!raw) {
    throw new Error('挑战码为空');
  }

  const body = raw.startsWith(CHALLENGE_CODE_PREFIX)
    ? raw.slice(CHALLENGE_CODE_PREFIX.length)
    : raw;

  let payload = null;
  try {
    payload = JSON.parse(body);
  } catch (error) {
    throw new Error('挑战码格式不正确');
  }

  if (
    !payload ||
    typeof payload.r !== 'number' ||
    typeof payload.c !== 'number' ||
    typeof payload.t !== 'number' ||
    typeof payload.h !== 'number' ||
    typeof payload.b !== 'string'
  ) {
    throw new Error('挑战码缺少必要字段');
  }

  return payload;
}

module.exports = {
  buildChallengeCode,
  buildCustomLevel,
  getCustomLevelById,
  listCustomLevels,
  parseChallengeCode,
  removeCustomLevel,
  upsertCustomLevel
};
