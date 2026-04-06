const logger = require('../services/logger');

function isRectVisible(app, y, height, margin) {
  const safeMargin = typeof margin === 'number' ? margin : 80;
  return y + height >= -safeMargin && y <= app.viewHeight + safeMargin;
}

function getImageCacheEntry(app, src, helpers) {
  const { getMiniGameImageCandidates } = helpers;
  const candidates = getMiniGameImageCandidates(src);
  return candidates.map((candidate) => app.images[candidate]).find(Boolean) || null;
}

function bindImageCacheEntry(app, candidates, entry) {
  entry.__cacheKeys = Array.isArray(entry.__cacheKeys) ? entry.__cacheKeys : [];
  candidates.forEach((candidate) => {
    if (entry.__cacheKeys.indexOf(candidate) === -1) {
      entry.__cacheKeys.push(candidate);
    }
    app.images[candidate] = entry;
  });
}

function touchImageCacheEntry(app, entry) {
  if (!entry) {
    return;
  }
  entry.__lastUsedAt = Date.now();
}

function dropImageCacheEntry(app, entry) {
  if (!entry) {
    return;
  }
  const keys = Array.isArray(entry.__cacheKeys) ? entry.__cacheKeys.slice() : [];
  keys.forEach((key) => {
    if (app.images[key] === entry) {
      delete app.images[key];
    }
  });
  if (entry.__resolvedImage) {
    try {
      entry.__resolvedImage.onload = null;
      entry.__resolvedImage.onerror = null;
      entry.__resolvedImage.src = '';
    } catch (error) {
      logger.captureError('minigame_release_image', error, {
        src: entry.__resolvedSrc || ''
      });
    }
  }
  entry.__cacheKeys = [];
  entry.__resolvedImage = null;
}

function collectPreferredImageSources(app, helpers) {
  const { DEFAULT_CUSTOM_IMAGE_PATH, getChapterCoverLevel, resolvePreviewImage } = helpers;
  const preferred = [];
  const pushSource = (src) => {
    if (!src) {
      return;
    }
    helpers.getMiniGameImageCandidates(src).forEach((candidate) => {
      if (preferred.indexOf(candidate) === -1) {
        preferred.push(candidate);
      }
    });
  };

  if (app.screen === 'home') {
    const continueLevel = app.homeMeta && app.homeMeta.continueLevel;
    pushSource(resolvePreviewImage(continueLevel));
  } else if (app.screen === 'chapters') {
    app.chapterButtons.forEach((button) => {
      if (!button.chapter || !isRectVisible(app, button.y, button.h, 120)) {
        return;
      }
      pushSource(resolvePreviewImage(getChapterCoverLevel(button.chapter)));
    });
  } else if (app.screen === 'levels') {
    pushSource(resolvePreviewImage(getChapterCoverLevel(app.selectedChapter)));
    app.levelButtons.forEach((button) => {
      if (!button.level || !isRectVisible(app, button.y, button.h, 120)) {
        return;
      }
      pushSource(resolvePreviewImage(button.level));
    });
  } else if (app.screen === 'custom') {
    pushSource(app.customDraft && app.customDraft.imagePath);
    app.customLevels.slice(0, 3).forEach((level) => {
      pushSource(resolvePreviewImage(level));
    });
  } else if (app.screen === 'leaderboard') {
    app.leaderboardEntries.slice(0, 6).forEach((entry) => {
      pushSource(entry.avatarUrl);
    });
  } else if (app.screen === 'puzzle') {
    pushSource(resolvePreviewImage(app.currentLevel));
  }

  pushSource(app.customDraft && app.customDraft.isDefault ? DEFAULT_CUSTOM_IMAGE_PATH : '');
  return preferred;
}

function pruneImageCache(app, force, helpers) {
  const { MAX_IMAGE_CACHE_ITEMS } = helpers;
  const preferred = app.collectPreferredImageSources();
  const preferredSet = {};
  preferred.forEach((key) => {
    preferredSet[key] = true;
  });

  const uniqueEntries = [];
  Object.keys(app.images).forEach((key) => {
    const entry = app.images[key];
    if (!entry || uniqueEntries.indexOf(entry) > -1) {
      return;
    }
    uniqueEntries.push(entry);
  });

  const resolvedEntries = uniqueEntries.filter((entry) => entry.__resolvedImage);
  const preferredEntries = resolvedEntries.filter((entry) =>
    (entry.__cacheKeys || []).some((key) => preferredSet[key])
  );
  const capacity = Math.max(MAX_IMAGE_CACHE_ITEMS, preferredEntries.length + 1);

  const removable = resolvedEntries
    .filter((entry) => !(entry.__cacheKeys || []).some((key) => preferredSet[key]))
    .sort((left, right) => (left.__lastUsedAt || 0) - (right.__lastUsedAt || 0));

  while (force && removable.length) {
    app.dropImageCacheEntry(removable.shift());
  }

  const activeEntries = [];
  Object.keys(app.images).forEach((key) => {
    const entry = app.images[key];
    if (!entry || !entry.__resolvedImage || activeEntries.indexOf(entry) > -1) {
      return;
    }
    activeEntries.push(entry);
  });

  let overflow = activeEntries.length - capacity;
  while (overflow > 0 && removable.length) {
    app.dropImageCacheEntry(removable.shift());
    overflow -= 1;
  }
}

function loadImage(app, src, helpers) {
  const { getMiniGameImageCandidates } = helpers;
  if (!src) {
    return Promise.resolve(null);
  }

  const cachedEntry = app.getImageCacheEntry(src);
  if (cachedEntry) {
    app.touchImageCacheEntry(cachedEntry);
    return cachedEntry;
  }

  const candidates = getMiniGameImageCandidates(src);
  let cacheEntry = null;
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
      const image = app.canvas.createImage ? app.canvas.createImage() : wx.createImage();
      image.onload = () => {
        if (cacheEntry) {
          cacheEntry.__resolvedImage = image;
          cacheEntry.__resolvedSrc = candidate;
          app.touchImageCacheEntry(cacheEntry);
        }
        app.bindImageCacheEntry(candidates, cacheEntry);
        app.pruneImageCache(false);
        resolve(image);
      };
      image.onerror = () => {
        tryLoad(index + 1);
      };
      image.src = candidate;
    };

    tryLoad(0);
  });
  cacheEntry = promise;
  cacheEntry.__resolvedImage = null;
  cacheEntry.__resolvedSrc = '';
  cacheEntry.__cacheKeys = [];
  cacheEntry.__lastUsedAt = Date.now();
  app.bindImageCacheEntry(candidates, cacheEntry);
  return cacheEntry;
}

function getResolvedImage(app, src) {
  if (!src) {
    return null;
  }
  const cached = app.getImageCacheEntry(src);
  if (!cached) {
    app.loadImage(src);
    return null;
  }
  app.touchImageCacheEntry(cached);
  return cached.__resolvedImage || null;
}

module.exports = {
  isRectVisible,
  getImageCacheEntry,
  bindImageCacheEntry,
  touchImageCacheEntry,
  dropImageCacheEntry,
  collectPreferredImageSources,
  pruneImageCache,
  loadImage,
  getResolvedImage
};
