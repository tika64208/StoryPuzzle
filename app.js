// Legacy page-based App entry kept for reference and filing flows only.
// The actual mini-game runtime entry is `game.js` -> `minigame/app.js`.
const logger = require('./services/logger');
const storage = require('./utils/storage');

App({
  globalData: {
    brandName: '谜境拼图'
  },

  onLaunch() {
    storage.bootstrap();
    logger.trackEvent('app_launch');
  },

  onShow(options) {
    logger.trackEvent('app_show', {
      scene: options && options.scene,
      path: options && options.path
    });
  },

  onHide() {
    logger.trackEvent('app_hide');
  },

  onError(error) {
    logger.captureError('app_on_error', error);
  },

  onUnhandledRejection(result) {
    logger.captureError(
      'app_on_unhandled_rejection',
      result && result.reason ? result.reason : result
    );
  },

  onPageNotFound(result) {
    logger.captureError('app_page_not_found', new Error('Page not found'), result);
  }
});
