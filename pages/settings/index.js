// Legacy page-based implementation kept for reference and filing support only.
// The actual mini-game runtime entry is `game.js` -> `minigame/app.js`.
const logger = require('../../services/logger');
const storage = require('../../utils/storage');

Page({
  data: {
    profile: {
      soundEnabled: true,
      vibrationEnabled: true
    },
    enabledCount: 2
  },

  onShow() {
    logger.trackEvent('settings_view');
    this.refresh();
  },

  refresh() {
    const profile = storage.getProfile();
    this.setData({
      profile,
      enabledCount: Number(profile.soundEnabled !== false) + Number(profile.vibrationEnabled !== false)
    });
  },

  handleToggleSound(event) {
    const enabled = !!event.detail.value;
    storage.saveSoundEnabled(enabled);
    logger.trackEvent('settings_toggle_sound', {
      enabled
    });
    this.refresh();
  },

  handleToggleVibration(event) {
    const enabled = !!event.detail.value;
    storage.saveVibrationEnabled(enabled);
    logger.trackEvent('settings_toggle_vibration', {
      enabled
    });
    this.refresh();
  },

  handleOpenInfo() {
    logger.trackEvent('settings_open_info');
    wx.navigateTo({
      url: '/pages/info/index'
    });
  }
});
