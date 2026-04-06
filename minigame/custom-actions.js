const customLevels = require('../services/custom-levels');
const logger = require('../services/logger');
const storage = require('../utils/storage');
const imageUtil = require('../utils/image');

async function handleCustomUseDefault(app, helpers) {
  const { DEFAULT_CUSTOM_IMAGE_PATH, DEFAULT_CUSTOM_TITLE } = helpers;
  app.customDraft = Object.assign({}, app.customDraft, {
    imagePath: DEFAULT_CUSTOM_IMAGE_PATH,
    isDefault: true,
    title: DEFAULT_CUSTOM_TITLE,
    shareReady: false
  });
  app.customPreviewImage = null;
  app.ensureCustomPreview(app.customDraft.imagePath);
  app.showToast('已切回默认样图');
}

async function handleCustomChooseImage(app, helpers) {
  const { chooseImagePromise } = helpers;
  try {
    const result = await chooseImagePromise();
    const filePath = result.tempFilePaths && result.tempFilePaths[0];
    if (!filePath) {
      return;
    }
    app.customDraft = Object.assign({}, app.customDraft, {
      imagePath: filePath,
      isDefault: false,
      title: `相册谜境 ${new Date().toLocaleDateString()}`,
      shareReady: false
    });
    app.customPreviewImage = null;
    app.ensureCustomPreview(filePath);
    logger.trackEvent('minigame_custom_choose_image');
    app.showToast('已选中新相册图片');
  } catch (error) {
    if (error && error.errMsg && error.errMsg.indexOf('cancel') > -1) {
      return;
    }
    logger.captureError('minigame_custom_choose_image', error);
    app.showToast('选图失败');
  }
}

async function handleCustomChooseLayout(app, helpers) {
  const { actionSheetPromise, CUSTOM_LAYOUT_OPTIONS } = helpers;
  try {
    const result = await actionSheetPromise(CUSTOM_LAYOUT_OPTIONS.map((item) => item.label));
    app.customDraft = Object.assign({}, app.customDraft, {
      layoutIndex: result.tapIndex
    });
    app.buildCustomLayout();
    app.showToast(`已切换到 ${CUSTOM_LAYOUT_OPTIONS[result.tapIndex].label}`);
  } catch (error) {
    if (error && error.errMsg && error.errMsg.indexOf('cancel') > -1) {
      return;
    }
    logger.captureError('minigame_custom_choose_layout', error);
  }
}

async function handleCustomCreateLevel(app, helpers) {
  const {
    compressImagePromise,
    CUSTOM_LAYOUT_OPTIONS,
    CUSTOM_SHARE_BASE64_LIMIT,
    DEFAULT_CUSTOM_TITLE,
    modalPromise
  } = helpers;

  const draft = app.customDraft;
  if (!draft || !draft.imagePath) {
    app.showToast('先选一张图片');
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
    app.customDraft = Object.assign({}, draft, {
      imagePath: savedImagePath,
      title: level.title,
      shareReady: !!shareImageBase64
    });
    app.customPreviewImage = null;
    app.ensureCustomPreview(savedImagePath);
    storage.setCurrentLevel(level.levelId);
    app.refreshProfile();
    app.refreshCustomData();
    app.buildCustomLayout();
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
        ? '新谜境已经保存。你可以立刻入局，也可以稍后复制谜境码分享给朋友。'
        : '新谜境已经保存。当前图片较大，小程序版暂时不建议生成分享码，但可以直接入局游玩。',
      confirmText: '立刻入局',
      cancelText: '稍后'
    });

    if (result.confirm) {
      app.openLevel(level.levelId, true);
    }
  } catch (error) {
    wx.hideLoading();
    logger.captureError('minigame_custom_create_level', error);
    app.showToast(error.message || '生成失败');
  }
}

async function handleCustomImportCode(app, helpers) {
  const { getClipboardDataPromise, modalPromise } = helpers;
  try {
    const clip = await getClipboardDataPromise();
    const rawCode = String((clip && clip.data) || '').trim();
    if (!rawCode) {
      app.showToast('剪贴板里还没有谜境码');
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
    app.refreshProfile();
    app.refreshCustomData();
    app.buildCustomLayout();
    logger.trackEvent('minigame_custom_import_level', {
      levelId: level.levelId,
      rows: payload.r,
      cols: payload.c
    });
    wx.hideLoading();

    const result = await modalPromise({
      title: '导入成功',
      content: '好友谜境已经保存到本地列表，现在就可以直接入局。',
      confirmText: '立刻入局',
      cancelText: '稍后'
    });

    if (result.confirm) {
      app.openLevel(level.levelId, true);
    }
  } catch (error) {
    wx.hideLoading();
    if (error && error.errMsg && error.errMsg.indexOf('cancel') > -1) {
      return;
    }
    logger.captureError('minigame_custom_import_level', error);
    app.showToast(error.message || '导入失败');
  }
}

function handleCustomCopyCode(app, levelId) {
  try {
    const code = customLevels.buildChallengeCode(levelId);
    wx.setClipboardData({
      data: code,
      success: () => {
        logger.trackEvent('minigame_custom_copy_code', { levelId });
        app.showToast('谜境码已复制');
      }
    });
  } catch (error) {
    logger.captureError('minigame_custom_copy_code', error, { levelId });
    app.showToast(error.message || '当前谜境还不能分享');
  }
}

async function handleCustomDelete(app, levelId, helpers) {
  const { modalPromise } = helpers;
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
    app.dropImageCacheEntry(app.getImageCacheEntry(removed.customMeta.imagePath));
    imageUtil.removeFileSafe(removed.customMeta.imagePath);
  }
  app.refreshProfile();
  app.refreshCustomData();
  app.buildCustomLayout();
  logger.trackEvent('minigame_custom_delete_level', { levelId });
  app.showToast('已删除这段谜境');
}

module.exports = {
  handleCustomUseDefault,
  handleCustomChooseImage,
  handleCustomChooseLayout,
  handleCustomCreateLevel,
  handleCustomImportCode,
  handleCustomCopyCode,
  handleCustomDelete
};
