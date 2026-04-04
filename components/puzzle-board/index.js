Component({
  options: {
    addGlobalClass: true
  },
  properties: {
    slots: {
      type: Array,
      value: []
    },
    rows: {
      type: Number,
      value: 3
    },
    cols: {
      type: Number,
      value: 3
    },
    guideHintPieceId: {
      type: Number,
      value: 0
    },
    guideHintGroupId: {
      type: String,
      value: ''
    },
    guideHintTargetSlot: {
      type: Number,
      value: 0
    }
  },
  data: {
    boardStyle: '',
    boardWidth: 0,
    boardHeight: 0,
    cellWidth: 0,
    cellHeight: 0,
    draggingGroupId: '',
    dragX: 0,
    dragY: 0,
    activeTransformStyle: ''
  },
  observers: {
    'rows, cols, slots': function updateBoard(rows, cols) {
      this.setData({
        boardStyle: `grid-template-columns: repeat(${cols}, minmax(0, 1fr));`
      });
      wx.nextTick(() => {
        this.measureBoard();
      });
    }
  },
  methods: {
    measureBoard() {
      this.createSelectorQuery()
        .in(this)
        .select('.board')
        .boundingClientRect((rect) => {
          if (!rect) {
            return;
          }
          this.setData({
            boardWidth: rect.width,
            boardHeight: rect.height,
            cellWidth: rect.width / this.data.cols,
            cellHeight: rect.height / this.data.rows
          });
        })
        .exec();
    },

    handleTouchStart(event) {
      const pieceId = Number(event.currentTarget.dataset.pieceId);
      const groupId = String(event.currentTarget.dataset.groupId || '');
      const rawLocked = event.currentTarget.dataset.locked;
      const locked = rawLocked === true || rawLocked === 'true';
      if (!pieceId || !groupId) {
        return;
      }

      if (locked) {
        this.triggerEvent('lockedpieceblocked', {
          pieceId,
          groupId
        });
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      this.dragContext = {
        pieceId,
        groupId,
        startX: touch.pageX,
        startY: touch.pageY
      };

      this.setData({
        draggingGroupId: groupId,
        dragX: 0,
        dragY: 0,
        activeTransformStyle: 'transform:translate3d(0px, 0px, 0);z-index:8;transition:none;'
      });
    },

    handleTouchMove(event) {
      if (!this.dragContext) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      const dragX = touch.pageX - this.dragContext.startX;
      const dragY = touch.pageY - this.dragContext.startY;
      this.setData({
        dragX,
        dragY,
        activeTransformStyle: `transform:translate3d(${dragX}px, ${dragY}px, 0);z-index:8;transition:none;`
      });
    },

    handleTouchEnd() {
      if (!this.dragContext) {
        return;
      }

      const { pieceId, groupId } = this.dragContext;
      const rowDelta = this.data.cellHeight ? Math.round(this.data.dragY / this.data.cellHeight) : 0;
      const colDelta = this.data.cellWidth ? Math.round(this.data.dragX / this.data.cellWidth) : 0;

      this.dragContext = null;
      this.setData({
        draggingGroupId: '',
        dragX: 0,
        dragY: 0,
        activeTransformStyle: ''
      });

      if (!rowDelta && !colDelta) {
        return;
      }

      this.triggerEvent('groupdrop', {
        pieceId,
        groupId,
        rowDelta,
        colDelta
      });
    }
  }
});
