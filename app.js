const storage = require('./utils/storage');

App({
  globalData: {
    brandName: '悬疑线索拼图'
  },

  onLaunch() {
    storage.bootstrap();
  }
});
