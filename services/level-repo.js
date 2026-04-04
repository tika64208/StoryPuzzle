const levels = require('../data/levels');
const storyArt = require('../data/story-art');
const customLevels = require('./custom-levels');

function normalizeImageStyle(imagePath) {
  const safePath = String(imagePath || '').replace(/"/g, '%22');
  return `url("${safePath}")`;
}

function attachStoryArt(level) {
  if (!level || level.isCustom) {
    return level;
  }

  const asset = storyArt[level.levelId];
  if (!asset || !asset.path) {
    return level;
  }

  return Object.assign({}, level, {
    sceneName: asset.sceneName || level.sceneName,
    sceneStyle: normalizeImageStyle(asset.path),
    sceneAssetPath: asset.path
  });
}

function getFirstLevelId() {
  return levels.getFirstLevelId();
}

function getLevelById(levelId) {
  const customLevel = customLevels.getCustomLevelById(levelId);
  if (customLevel) {
    return customLevel;
  }
  return attachStoryArt(levels.getLevelById(levelId));
}

function getNextLevelId(levelId) {
  if (customLevels.getCustomLevelById(levelId)) {
    return '';
  }
  return levels.getNextLevelId(levelId);
}

function getChaptersWithProgress(progress) {
  return levels.getChaptersWithProgress(progress).map((chapter) =>
    Object.assign({}, chapter, {
      levels: chapter.levels.map((level) => attachStoryArt(level))
    })
  );
}

function getCustomLevelsWithProgress(progress) {
  const records = (progress && progress.levelRecords) || {};
  return customLevels.listCustomLevels().map((level) => {
    const record = records[level.levelId] || {};
    return Object.assign({}, level, {
      unlocked: true,
      completed: !!record.completed,
      stars: record.stars || 0,
      bestTime: record.bestTime || 0,
      bestMoves: record.bestMoves || 0
    });
  });
}

function getContinueLevelId(progress) {
  const candidate = (progress && progress.lastPlayedLevelId) || getFirstLevelId();
  return getLevelById(candidate) ? candidate : getFirstLevelId();
}

module.exports = {
  getChaptersWithProgress,
  getContinueLevelId,
  getCustomLevelsWithProgress,
  getFirstLevelId,
  getLevelById,
  getNextLevelId
};
