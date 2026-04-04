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
