Component({
  options: {
    addGlobalClass: true
  },
  properties: {
    title: {
      type: String,
      value: ''
    },
    clueTag: {
      type: String,
      value: ''
    },
    timeText: {
      type: String,
      value: ''
    },
    energy: {
      type: Number,
      value: 0
    }
  },
  methods: {
    handlePause() {
      this.triggerEvent('pause');
    }
  }
});
