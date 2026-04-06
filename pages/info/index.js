// Legacy page-based implementation kept for reference and filing support only.
// The actual mini-game runtime entry is `game.js` -> `minigame/app.js`.
const legal = require('../../config/legal');
const levelRepo = require('../../services/level-repo');
const logger = require('../../services/logger');
const storage = require('../../utils/storage');

function normalizeDisplayText(value) {
  const safeValue = String(value || '').trim();
  if (!safeValue || safeValue.indexOf('待填写') > -1) {
    return '';
  }
  return safeValue;
}

function getLevelDisplayTitle(level) {
  if (!level) {
    return '尚未开始挑战';
  }

  return level.title || level.sceneName || level.levelId || '当前关卡';
}

function buildProgressSummary(progress) {
  const chapters = levelRepo.getChaptersWithProgress(progress);
  const customLevels = levelRepo.getCustomLevelsWithProgress(progress);

  return {
    completedLevels: chapters.reduce((sum, chapter) => sum + chapter.completedCount, 0),
    totalLevels: chapters.reduce((sum, chapter) => sum + chapter.totalLevels, 0),
    unlockedLevels: ((progress && progress.unlockedLevels) || []).length,
    customLevels: customLevels.length
  };
}

Page({
  data: {
    profile: {
      energy: 0,
      maxEnergy: 0
    },
    summary: {
      completedLevels: 0,
      totalLevels: 0,
      unlockedLevels: 0,
      customLevels: 0
    },
    energyText: '',
    currentLevelTitle: '',
    supportWechat: normalizeDisplayText(legal.supportWechat),
    companyName: normalizeDisplayText(legal.companyName)
  },

  onShow() {
    logger.trackEvent('info_view');
    this.refresh();
  },

  refresh() {
    const profile = storage.getProfile();
    const progress = storage.getProgress();
    const currentLevel = levelRepo.getLevelById(profile.currentLevelId);
    const summary = buildProgressSummary(progress);

    this.setData({
      profile,
      summary,
      energyText: storage.getEnergyCountdownText(profile),
      currentLevelTitle: getLevelDisplayTitle(currentLevel)
    });
  },

  handleOpenPrivacy() {
    logger.trackEvent('info_open_privacy');
    wx.navigateTo({
      url: '/pages/legal/index?type=privacy'
    });
  },

  handleOpenAgreement() {
    logger.trackEvent('info_open_agreement');
    wx.navigateTo({
      url: '/pages/legal/index?type=agreement'
    });
  },

  handleOpenReleaseChecklist() {
    logger.trackEvent('info_open_release_checklist');
    wx.navigateTo({
      url: '/pages/legal/index?type=release'
    });
  },

  handleCopyLogs() {
    const exportText = logger.buildExportText(80);
    wx.setClipboardData({
      data: exportText,
      success: () => {
        logger.trackEvent('info_copy_logs');
        wx.showToast({
          title: '运行日志已复制',
          icon: 'none'
        });
      }
    });
  },

  handleClearLogs() {
    wx.showModal({
      title: '清空运行日志',
      content: '清空后将移除本地埋点和错误日志记录，方便重新开始排查。',
      success: (res) => {
        if (!res.confirm) {
          return;
        }

        logger.clearLogs();
        logger.trackEvent('info_clear_logs');
        wx.showToast({
          title: '运行日志已清空',
          icon: 'none'
        });
      }
    });
  }
});
