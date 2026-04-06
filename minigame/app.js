const bootstrapRuntime = require('./bootstrap-runtime');
const { helperBundles, appMethods } = require('./app-methods');

class MiniGameApp {
  constructor() {
    bootstrapRuntime.initializeApp(this, helperBundles.bootstrap);

    this.resizeCanvas();
    this.bindTouches();
  }
}

Object.assign(MiniGameApp.prototype, appMethods);

module.exports = {
  start() {
    const app = new MiniGameApp();
    app.start();
  }
};
