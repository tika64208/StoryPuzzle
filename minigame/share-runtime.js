const customLevels = require('../services/custom-levels');
const levelRepo = require('../services/level-repo');
const logger = require('../services/logger');

function buildShareQuery(params) {
  return Object.keys(params || {})
    .filter((key) => params[key] !== undefined && params[key] !== null && params[key] !== '')
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(String(params[key]))}`)
    .join('&');
}

function getHomeSharePayload(app, helpers) {
  const { resolvePreviewImage } = helpers;
  const firstLevel = levelRepo.getLevelById(levelRepo.getFirstLevelId());
  return {
    shareType: 'home',
    title: '来《谜境拼图》一起拼回《倩女幽魂》的十六回旧梦',
    imageUrl: (firstLevel && resolvePreviewImage(firstLevel)) || '',
    query: buildShareQuery({
      shareType: 'home'
    })
  };
}

function getChapterSharePayload(app, chapterId, helpers) {
  const {
    getChaptersWithDifficulty,
    getChapterCoverLevel,
    getSafeChapterTitle,
    resolvePreviewImage
  } = helpers;
  const chapters = getChaptersWithDifficulty(app.progress, app.profile);
  const chapter = chapters.find((item) => item.chapterId === chapterId);
  if (!chapter) {
    return getHomeSharePayload(app, helpers);
  }

  const coverLevel = getChapterCoverLevel(chapter);
  return {
    shareType: 'chapter',
    title: `来《谜境拼图》翻开《${getSafeChapterTitle(chapter)}》这一卷`,
    imageUrl: (coverLevel && resolvePreviewImage(coverLevel)) || '',
    query: buildShareQuery({
      shareType: 'chapter',
      chapterId: chapter.chapterId
    })
  };
}

function getLevelSharePayload(app, levelId, helpers) {
  const { getSafeLevelTitle, resolvePreviewImage } = helpers;
  const level = levelRepo.getLevelById(levelId);
  if (!level || level.isCustom) {
    return getHomeSharePayload(app, helpers);
  }

  return {
    shareType: 'level',
    title: `来帮我拼《${getSafeLevelTitle(level)}》这张谜境图`,
    imageUrl: resolvePreviewImage(level),
    query: buildShareQuery({
      shareType: 'level',
      levelId: level.levelId
    })
  };
}

function getSharePayloadFromData(payload) {
  const sharePayload = {
    title: payload.title,
    query: payload.query
  };
  if (payload.imageUrl) {
    sharePayload.imageUrl = payload.imageUrl;
  }
  return sharePayload;
}

function getSharePayload(app, helpers) {
  let payload = null;
  if (app.currentLevel && !app.currentLevel.isCustom) {
    payload = getLevelSharePayload(app, app.currentLevel.levelId, helpers);
  } else if (app.screen === 'levels' && app.selectedChapter) {
    payload = getChapterSharePayload(app, app.selectedChapter.chapterId, helpers);
  } else {
    payload = getHomeSharePayload(app, helpers);
  }

  return getSharePayloadFromData(payload);
}

function triggerShare(app, shareType, payloadId, helpers) {
  if (!wx.shareAppMessage) {
    app.showToast('当前基础库暂不支持主动转发');
    return;
  }

  const payload =
    shareType === 'level'
      ? getLevelSharePayload(app, payloadId || (app.currentLevel && app.currentLevel.levelId), helpers)
      : shareType === 'chapter'
        ? getChapterSharePayload(app, payloadId || (app.selectedChapter && app.selectedChapter.chapterId), helpers)
        : getHomeSharePayload(app, helpers);

  try {
    wx.shareAppMessage(getSharePayloadFromData(payload));
    logger.trackEvent('minigame_active_share', {
      shareType: payload.shareType,
      targetId: payloadId || ''
    });
    app.showToast('转发面板已打开');
  } catch (error) {
    logger.captureError('minigame_active_share', error, {
      shareType,
      payloadId: payloadId || ''
    });
    app.showToast('打开转发失败');
  }
}

function getSuccessShareAction(app) {
  if (!app.currentLevel) {
    return null;
  }

  if (app.currentLevel.isCustom) {
    const level = customLevels.getCustomLevelById(app.currentLevel.levelId);
    if (level && level.customMeta && level.customMeta.shareImageBase64) {
      return {
        key: 'share-code',
        label: '谜境码'
      };
    }
    return null;
  }

  return {
    key: 'share-level',
    label: '转发'
  };
}

function handleSuccessShareAction(app, helpers) {
  const action = getSuccessShareAction(app);
  if (!action) {
    app.showToast('当前这一关暂时不能转发');
    return;
  }

  if (action.key === 'share-code') {
    app.handleCustomCopyCode(app.currentLevel.levelId);
    return;
  }

  triggerShare(app, 'level', app.currentLevel.levelId, helpers);
}

async function handleIncomingShareOptions(app, options, source, helpers) {
  const query = (options && options.query) || {};
  const shareType = String(query.shareType || '').trim();
  const levelId = String(query.levelId || '').trim();
  const chapterId = String(query.chapterId || '').trim();
  const shareKey = [shareType, levelId, chapterId].join('|');

  if (!shareType) {
    return;
  }

  if (app.shareState.lastIncomingKey === shareKey) {
    return;
  }

  app.shareState.lastIncomingKey = shareKey;
  app.shareState.lastHandledAt = Date.now();

  if (shareType === 'level' && levelId) {
    const level = levelRepo.getLevelById(levelId);
    if (!level || level.isCustom) {
      app.showToast('朋友分享的关卡暂时不可用');
      return;
    }
    logger.trackEvent('minigame_share_open_level', {
      levelId,
      source
    });
    await app.openLevel(levelId, false);
    app.showToast('已进入朋友分享的关卡');
    return;
  }

  if (shareType === 'chapter' && chapterId) {
    logger.trackEvent('minigame_share_open_chapter', {
      chapterId,
      source
    });
    app.switchToLevels(chapterId);
    app.showToast('已翻开朋友分享的章节');
    return;
  }

  logger.trackEvent('minigame_share_open_home', {
    source
  });
  app.switchToHome();
  app.showToast('欢迎来到朋友分享的谜境');
}

function setupSharing(app, helpers) {
  try {
    if (wx.showShareMenu) {
      try {
        wx.showShareMenu({
          withShareTicket: false,
          menus: ['shareAppMessage']
        });
      } catch (error) {
        wx.showShareMenu({
          withShareTicket: false
        });
      }
    }
  } catch (error) {
    logger.captureError('minigame_show_share_menu', error);
  }

  try {
    if (wx.onShareAppMessage) {
      wx.onShareAppMessage(() => getSharePayload(app, helpers));
    }
  } catch (error) {
    logger.captureError('minigame_register_share_handler', error);
  }

  try {
    if (wx.onShow) {
      wx.onShow((options) => {
        handleIncomingShareOptions(app, options, 'show', helpers);
      });
    }
  } catch (error) {
    logger.captureError('minigame_register_show_handler', error);
  }
}

module.exports = {
  setupSharing,
  buildShareQuery,
  getHomeSharePayload,
  getChapterSharePayload,
  getLevelSharePayload,
  getSharePayload,
  triggerShare,
  getSharePayloadFromData,
  getSuccessShareAction,
  handleSuccessShareAction,
  handleIncomingShareOptions
};
