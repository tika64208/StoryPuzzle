// Legacy page-based implementation kept for reference and filing support only.
// The actual mini-game runtime entry is `game.js` -> `minigame/app.js`.
const customLevels = require('../../services/custom-levels');
const imageUtil = require('../../utils/image');
const levelRepo = require('../../services/level-repo');
const logger = require('../../services/logger');
const storage = require('../../utils/storage');

const DEFAULT_IMAGE_PATH = '/assets/default-custom.jpg';
const DEFAULT_IMAGE_NAME = '海边玩耍';

const LAYOUT_OPTIONS = [
  { label: '3 x 3 轻松', rows: 3, cols: 3, timeLimit: 90, hints: 3 },
  { label: '4 x 4 标准', rows: 4, cols: 4, timeLimit: 140, hints: 2 },
  { label: '5 x 5 进阶', rows: 5, cols: 5, timeLimit: 200, hints: 1 },
  { label: '3 x 4 竖版', rows: 3, cols: 4, timeLimit: 120, hints: 2 },
  { label: '4 x 5 挑战', rows: 4, cols: 5, timeLimit: 180, hints: 1 }
];

function buildDefaultTitle() {
  return `${DEFAULT_IMAGE_NAME}谜境`;
}

Page({
  data: {
    profile: null,
    customLevels: [],
    draftTitle: buildDefaultTitle(),
    selectedImagePath: DEFAULT_IMAGE_PATH,
    selectedImageInfo: null,
    isUsingDefaultImage: true,
    layoutIndex: 1,
    layoutOptions: LAYOUT_OPTIONS,
    importCode: '',
    generating: false
  },

  onLoad() {
    this.ensureSelectedImage(DEFAULT_IMAGE_PATH, true);
  },

  onShow() {
    logger.trackEvent('custom_view');
    this.refresh();
    if (!this.data.selectedImagePath) {
      this.ensureSelectedImage(DEFAULT_IMAGE_PATH, true);
    }
  },

  refresh() {
    const progress = storage.getProgress();
    this.setData({
      profile: storage.getProfile(),
      customLevels: levelRepo.getCustomLevelsWithProgress(progress)
    });
  },

  ensureSelectedImage(filePath, isDefaultImage) {
    wx.getImageInfo({
      src: filePath,
      success: (info) => {
        this.setData({
          selectedImagePath: filePath,
          selectedImageInfo: info,
          isUsingDefaultImage: !!isDefaultImage,
          draftTitle: isDefaultImage && !this.data.draftTitle ? buildDefaultTitle() : this.data.draftTitle
        });
      },
      fail: () => {
        wx.showToast({
          title: '默认样图加载失败',
          icon: 'none'
        });
      }
    });
  },

  handleChooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        const filePath = res.tempFilePaths[0];
        logger.trackEvent('custom_choose_image');
        this.ensureSelectedImage(filePath, false);
      }
    });
  },

  handleUseDefaultImage() {
    logger.trackEvent('custom_use_default_image');
    this.ensureSelectedImage(DEFAULT_IMAGE_PATH, true);
    this.setData({
      draftTitle: buildDefaultTitle()
    });
  },

  handleTitleInput(event) {
    this.setData({
      draftTitle: event.detail.value
    });
  },

  handleLayoutChange(event) {
    this.setData({
      layoutIndex: Number(event.detail.value || 0)
    });
  },

  handleImportInput(event) {
    this.setData({
      importCode: event.detail.value
    });
  },

  async handleCreateLevel() {
    if (this.data.generating) {
      return;
    }

    if (!this.data.selectedImagePath) {
      wx.showToast({
        title: '请先选一张照片',
        icon: 'none'
      });
      return;
    }

    const layout = this.data.layoutOptions[this.data.layoutIndex];
    const title = (this.data.draftTitle || '').trim() || buildDefaultTitle();
    const createdAt = Date.now();

    this.setData({
      generating: true
    });
    wx.showLoading({
      title: '生成谜境中'
    });

    try {
      const displayTempPath = await imageUtil.exportSquareImage(
        this,
        'processorCanvas',
        this.data.selectedImagePath,
        720,
        'jpg',
        0.92
      );
      const savedImagePath = await imageUtil.persistTempFile(
        displayTempPath,
        `custom_level_${createdAt}`
      );
      const shareTempPath = await imageUtil.exportSquareImage(
        this,
        'processorCanvas',
        this.data.selectedImagePath,
        220,
        'jpg',
        0.72
      );
      const shareImageBase64 = imageUtil.readFileBase64(shareTempPath);

      const level = customLevels.buildCustomLevel({
        title,
        rows: layout.rows,
        cols: layout.cols,
        timeLimit: layout.timeLimit,
        hints: layout.hints,
        imagePath: savedImagePath,
        shareImageBase64,
        authorName: '本地玩家',
        sourceType: 'album',
        createdAt
      });

      customLevels.upsertCustomLevel(level);
      storage.setCurrentLevel(level.levelId);
      logger.trackEvent('custom_create_level_success', {
        levelId: level.levelId,
        rows: layout.rows,
        cols: layout.cols
      });
      this.setData({
        draftTitle: buildDefaultTitle(),
        generating: false
      });
      this.ensureSelectedImage(DEFAULT_IMAGE_PATH, true);
      this.refresh();
      wx.hideLoading();
      wx.showModal({
        title: '谜境已生成',
        content: '当前画面已经生成谜境关卡，可以自己入局，也可以复制谜境码分享给别人导入。',
        confirmText: '立即入局',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            logger.trackEvent('custom_create_level_enter_now', {
              levelId: level.levelId
            });
            wx.navigateTo({
              url: `/pages/level-intro/index?levelId=${level.levelId}`
            });
          }
        }
      });
    } catch (error) {
      wx.hideLoading();
      this.setData({
        generating: false
      });
      logger.captureError('custom_create_level', error);
      wx.showToast({
        title: error.message || '生成失败',
        icon: 'none'
      });
    }
  },

  handlePlay(event) {
    const levelId = event.currentTarget.dataset.levelId;
    logger.trackEvent('custom_play_level', {
      levelId
    });
    wx.navigateTo({
      url: `/pages/level-intro/index?levelId=${levelId}`
    });
  },

  handleCopyCode(event) {
    const levelId = event.currentTarget.dataset.levelId;
    try {
      const code = customLevels.buildChallengeCode(levelId);
      wx.setClipboardData({
        data: code,
        success: () => {
          logger.trackEvent('custom_copy_code', {
            levelId
          });
          wx.showModal({
            title: '谜境码已复制',
            content: '把这串谜境码发给朋友，对方在这里粘贴导入后，就能进入同一张谜境图。',
            showCancel: false
          });
        }
      });
    } catch (error) {
      logger.captureError('custom_copy_code', error, {
        levelId
      });
      wx.showToast({
        title: error.message || '复制失败',
        icon: 'none'
      });
    }
  },

  async handleDelete(event) {
    const levelId = event.currentTarget.dataset.levelId;
    const level = customLevels.getCustomLevelById(levelId);
    if (!level) {
      return;
    }

    const res = await new Promise((resolve) => {
      wx.showModal({
        title: '删除自定义谜境',
        content: '删除后会移除本地样图和谜境配置，但不会影响已经发出去的谜境码。',
        success: resolve
      });
    });

    if (!res.confirm) {
      return;
    }

    const removed = customLevels.removeCustomLevel(levelId);
    if (removed && removed.customMeta) {
      imageUtil.removeFileSafe(removed.customMeta.imagePath);
    }
    logger.trackEvent('custom_delete_level', {
      levelId
    });
    this.refresh();
    wx.showToast({
      title: '已删除',
      icon: 'none'
    });
  },

  handlePasteCode() {
    wx.getClipboardData({
      success: (res) => {
        this.setData({
          importCode: res.data || ''
        });
      }
    });
  },

  handleImportCode() {
    const rawCode = (this.data.importCode || '').trim();
    if (!rawCode) {
      wx.showToast({
        title: '先粘贴谜境码',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '导入谜境中'
    });

    try {
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
      logger.trackEvent('custom_import_code_success', {
        levelId: level.levelId,
        rows: payload.r,
        cols: payload.c
      });
      this.setData({
        importCode: ''
      });
      this.refresh();
      wx.hideLoading();
      wx.showModal({
        title: '导入成功',
        content: '谜境已经保存到你的自定义列表，现在就可以入局。',
        confirmText: '立即入局',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            logger.trackEvent('custom_import_enter_now', {
              levelId: level.levelId
            });
            wx.navigateTo({
              url: `/pages/level-intro/index?levelId=${level.levelId}`
            });
          }
        }
      });
    } catch (error) {
      wx.hideLoading();
      logger.captureError('custom_import_code', error);
      wx.showToast({
        title: error.message || '导入失败',
        icon: 'none'
      });
    }
  }
});
