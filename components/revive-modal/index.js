// Legacy page-based component kept for reference only.
// It is not part of the current `game.js` -> `minigame/app.js` runtime chain.
Component({
  options: {
    addGlobalClass: true
  },
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    timeBonus: {
      type: Number,
      value: 15
    }
  },
  methods: {
    handleClose() {
      this.triggerEvent('close');
    },
    handleConfirm() {
      this.triggerEvent('confirm');
    }
  }
});
