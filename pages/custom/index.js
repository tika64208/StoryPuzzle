const customLevels = require('../../services/custom-levels');
const imageUtil = require('../../utils/image');
const levelRepo = require('../../services/level-repo');
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
  return `${DEFAULT_IMAGE_NAME}拼图`;
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
          title: '默认图片加载失败',
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
        this.ensureSelectedImage(filePath, false);
      }
    });
  },

  handleUseDefaultImage() {
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
        title: '请先选择一张图片',
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
      title: '生成关卡中'
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
      this.setData({
        draftTitle: buildDefaultTitle(),
        generating: false
      });
      this.ensureSelectedImage(DEFAULT_IMAGE_PATH, true);
      this.refresh();
      wx.hideLoading();
      wx.showModal({
        title: '关卡已生成',
        content: '当前默认图片已经生成拼图关卡，可以自己玩，也可以复制挑战码分享给别人导入。',
        confirmText: '立即开玩',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
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
      wx.showToast({
        title: error.message || '生成失败',
        icon: 'none'
      });
    }
  },

  handlePlay(event) {
    const levelId = event.currentTarget.dataset.levelId;
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
          wx.showModal({
            title: '挑战码已复制',
            content: '把这串挑战码发给朋友，对方在这里粘贴导入后，就能玩同一张图片关卡。',
            showCancel: false
          });
        }
      });
    } catch (error) {
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
        title: '删除自定义关卡',
        content: '删除后会移除本地图片和关卡配置，但不会影响已经发出去的挑战码。',
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
        title: '先粘贴挑战码',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '导入中'
    });

    try {
      const payload = customLevels.parseChallengeCode(rawCode);
      const createdAt = Date.now();
      const imagePath = imageUtil.writeBase64ToFile(payload.b, `imported_level_${createdAt}`);
      const level = customLevels.buildCustomLevel({
        title: payload.i || `好友拼图 ${createdAt}`,
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
      this.setData({
        importCode: ''
      });
      this.refresh();
      wx.hideLoading();
      wx.showModal({
        title: '导入成功',
        content: '挑战图已经保存到你的自定义列表，现在就可以开始玩。',
        confirmText: '立即开玩',
        cancelText: '稍后',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: `/pages/level-intro/index?levelId=${level.levelId}`
            });
          }
        }
      });
    } catch (error) {
      wx.hideLoading();
      wx.showToast({
        title: error.message || '导入失败',
        icon: 'none'
      });
    }
  }
});
