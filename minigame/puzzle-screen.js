const { getChapterDifficultyStars } = require('../services/challenge');
const gameEngine = require('../utils/game');

function drawBoard(app, helpers) {
  const {
    drawText,
    fillRoundRect,
    resolvePreviewImage,
    roundRectPath
  } = helpers;
  const ctx = app.ctx;
  const board = app.boardRect;
  const level = app.currentLevel;
  const cell = board.cell;
  const previewSrc = resolvePreviewImage(level);
  if (!app.currentImage && previewSrc) {
    app.currentImage = app.getResolvedImage(previewSrc);
  }

  fillRoundRect(ctx, board.x, board.y, board.w, board.h, 18, 'rgba(4, 18, 28, 0.52)', 'rgba(255,255,255,0.08)');

  const allPieces = [];
  for (let slot = 1; slot < app.gameState.slots.length; slot += 1) {
    const pieceId = app.gameState.slots[slot];
    if (pieceId) {
      allPieces.push(app.gameState.pieces[pieceId]);
    }
  }

  const activeGroupLookup = {};
  if (app.drag && app.drag.groupPieceIds) {
    app.drag.groupPieceIds.forEach((pieceId) => {
      activeGroupLookup[pieceId] = true;
    });
  }

  const passivePieces = allPieces.filter((piece) => !activeGroupLookup[piece.id]);
  const activePieces = allPieces.filter((piece) => activeGroupLookup[piece.id]);
  passivePieces.concat(activePieces).forEach((piece) => {
    const coords = gameEngine.slotToRowCol(piece.currentSlot, level.cols);
    const baseX = board.x + coords.col * cell;
    const baseY = board.y + coords.row * cell;
    const settleEffect = !activeGroupLookup[piece.id] ? app.getSettleEffect(piece.id) : null;
    const settleOffset = settleEffect ? app.getSettleOffset(piece.id) : null;
    const dx = activeGroupLookup[piece.id] && app.drag ? app.drag.dx : settleOffset ? settleOffset.x : 0;
    const dy = activeGroupLookup[piece.id] && app.drag ? app.drag.dy : settleOffset ? settleOffset.y : 0;
    const drawX = baseX + dx;
    const drawY = baseY + dy;

    if (settleEffect && settleEffect.variant === 'passiveSwap') {
      app.drawSettleTrail(settleEffect, baseX, baseY, drawX, drawY, cell);
    }

    if (app.currentImage) {
      const cropCoords = gameEngine.slotToRowCol(piece.correctSlot, level.cols);
      const cropSide = Math.min(app.currentImage.width, app.currentImage.height);
      const cropOffsetX = (app.currentImage.width - cropSide) / 2;
      const cropOffsetY = (app.currentImage.height - cropSide) / 2;
      const srcW = cropSide / level.cols;
      const srcH = cropSide / level.rows;
      const srcX = cropOffsetX + cropCoords.col * srcW;
      const srcY = cropOffsetY + cropCoords.row * srcH;
      ctx.drawImage(app.currentImage, srcX, srcY, srcW, srcH, drawX, drawY, cell, cell);
    } else {
      ctx.save();
      ctx.fillStyle = level.themeColor || '#3f8ca3';
      ctx.fillRect(drawX, drawY, cell, cell);
      drawText(ctx, `${piece.id}`, drawX + cell / 2, drawY + cell / 2 - 10, 18, '#ffffff', 'center', 'bold');
      ctx.restore();
    }

    const isGuidePiece =
      app.guideHint &&
      (piece.id === app.guideHint.pieceId ||
        (app.gameState.pieces[app.guideHint.pieceId] &&
          app.gameState.pieces[app.guideHint.pieceId].groupId === piece.groupId));

    if (piece.locked || isGuidePiece || activeGroupLookup[piece.id]) {
      ctx.save();
      ctx.shadowBlur = 18;
      ctx.lineWidth = 3;
      if (piece.locked) {
        ctx.shadowColor = 'rgba(110, 244, 255, 0.46)';
        ctx.strokeStyle = 'rgba(110, 244, 255, 0.84)';
      } else if (isGuidePiece) {
        ctx.shadowColor = 'rgba(255, 210, 92, 0.55)';
        ctx.strokeStyle = 'rgba(255, 221, 115, 0.98)';
      } else {
        ctx.shadowColor = 'rgba(111, 245, 255, 0.58)';
        ctx.strokeStyle = 'rgba(111, 245, 255, 0.98)';
      }
      roundRectPath(ctx, drawX + 2, drawY + 2, cell - 4, cell - 4, 14);
      ctx.stroke();
      ctx.restore();
    }
  });

  if (app.guideHint) {
    const target = gameEngine.slotToRowCol(app.guideHint.targetSlot, level.cols);
    const x = board.x + target.col * cell;
    const y = board.y + target.row * cell;
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = 'rgba(111, 245, 255, 0.66)';
    ctx.lineWidth = 3;
    if (ctx.setLineDash) {
      ctx.setLineDash([8, 6]);
    }
    ctx.strokeStyle = 'rgba(111, 245, 255, 0.96)';
    roundRectPath(ctx, x + 6, y + 6, cell - 12, cell - 12, 14);
    ctx.stroke();
    ctx.restore();
  }

  app.drawBoardEffects();
}

function buildPuzzleLayout(app) {
  if (!app.currentLevel) {
    return;
  }

  const safeWidth = app.viewWidth - 28;
  const boardTop = 114;
  const bottomSpace = 128;
  const maxBoardW = safeWidth - 24;
  const maxBoardH = app.viewHeight - boardTop - bottomSpace;
  const cellSize = Math.floor(
    Math.min(maxBoardW / app.currentLevel.cols, maxBoardH / app.currentLevel.rows)
  );
  const boardW = cellSize * app.currentLevel.cols;
  const boardH = cellSize * app.currentLevel.rows;
  const boardX = Math.floor((app.viewWidth - boardW) / 2);
  const boardY = boardTop;

  app.boardRect = {
    x: boardX,
    y: boardY,
    w: boardW,
    h: boardH,
    cell: cellSize
  };

  const buttonGap = 8;
  const buttonW = Math.floor((app.viewWidth - 44 - buttonGap * 2) / 3);
  const primaryButtonH = 44;
  const secondaryButtonW = Math.max(72, Math.floor((app.viewWidth - 44) * 0.22));
  const secondaryButtonH = 36;
  const firstRowY = boardY + boardH + 12;
  const secondRowY = firstRowY + primaryButtonH + buttonGap;
  const statusX = 22 + secondaryButtonW + buttonGap;
  const statusW = app.viewWidth - 44 - secondaryButtonW * 2 - buttonGap * 2;

  app.puzzleStatusRect = {
    x: statusX,
    y: secondRowY,
    w: statusW,
    h: secondaryButtonH
  };

  app.puzzleButtons = [
    { key: 'hint', label: `提示 ${app.gameState.hintsLeft}`, x: 22, y: firstRowY, w: buttonW, h: primaryButtonH, primary: true },
    { key: 'lock', label: `定格 ${app.profile.unlockDragTools}`, x: 22 + buttonW + buttonGap, y: firstRowY, w: buttonW, h: primaryButtonH, primary: true },
    { key: 'guide', label: `引路 ${app.profile.guideHintTools}`, x: 22 + (buttonW + buttonGap) * 2, y: firstRowY, w: buttonW, h: primaryButtonH, primary: true },
    { key: 'reset', label: '重置', x: 22, y: secondRowY, w: secondaryButtonW, h: secondaryButtonH, primary: false },
    { key: 'home', label: '返回', x: app.viewWidth - 22 - secondaryButtonW, y: secondRowY, w: secondaryButtonW, h: secondaryButtonH, primary: false }
  ];
}

function drawPuzzle(app, helpers) {
  const {
    drawGlassCard,
    drawImageCover,
    drawText,
    fillRoundRect,
    formatTime,
    getSafeChapterTitle,
    getSafeLevelTitle
  } = helpers;
  const ctx = app.ctx;
  const level = app.currentLevel;
  if (!level || !app.boardRect) {
    return;
  }

  buildPuzzleLayout(app);

  const pieces = Object.values(app.gameState.pieces || {});
  const correctCount = pieces.filter((piece) => piece.currentSlot === piece.correctSlot).length;
  const totalCount = level.rows * level.cols;
  const difficultyStars = Number(level.difficultyStars) || getChapterDifficultyStars(app.profile, level.chapterId);
  const guideText = app.guideHint
    ? (() => {
        const target = gameEngine.slotToRowCol(app.guideHint.targetSlot, level.cols);
        return `目标 ${target.row + 1} 行 ${target.col + 1} 列`;
      })()
    : '优先接长边，再慢慢收拢中心区域。';

  drawGlassCard(ctx, 14, 18, app.viewWidth - 28, 82, 24);
  fillRoundRect(ctx, 24, 26, 56, 56, 14, 'rgba(8, 28, 40, 0.84)', 'rgba(124, 229, 245, 0.14)');
  if (app.currentImage) {
    drawImageCover(ctx, app.currentImage, 24, 26, 56, 56, 14);
    fillRoundRect(ctx, 24, 26, 56, 56, 14, 'rgba(3, 12, 22, 0.12)');
  }

  drawText(ctx, getSafeLevelTitle(level), 94, 28, 22, '#f3fdff', 'left', 'bold');
  drawText(
    ctx,
    `${getSafeChapterTitle(level)} · ${difficultyStars}星难度 · ${level.rows}x${level.cols}`,
    94,
    54,
    12,
    'rgba(230,251,255,0.68)'
  );
  drawText(
    ctx,
    `归位 ${correctCount}/${totalCount} · 步数 ${app.gameState.moves} · 本关 +${difficultyStars}`,
    94,
    74,
    12,
    'rgba(230,251,255,0.78)'
  );

  fillRoundRect(ctx, app.viewWidth - 108, 24, 70, 52, 18, 'rgba(68, 219, 238, 0.16)', 'rgba(123, 247, 255, 0.32)');
  drawText(ctx, '倒计时', app.viewWidth - 73, 32, 10, 'rgba(230,251,255,0.64)', 'center');
  drawText(ctx, formatTime(app.timeLeft), app.viewWidth - 73, 48, 19, '#aef7ff', 'center', 'bold');

  drawGlassCard(ctx, app.boardRect.x - 12, app.boardRect.y - 12, app.boardRect.w + 24, app.boardRect.h + 24, 30);
  app.drawBoard();

  if (app.overlay) {
    app.drawOverlay();
    return;
  }

  app.puzzleButtons.forEach((button) => app.drawButton(button, button.primary, true));

  if (app.puzzleStatusRect) {
    const statusRect = app.puzzleStatusRect;
    drawGlassCard(ctx, statusRect.x, statusRect.y, statusRect.w, statusRect.h, 18);
    if (app.guideHint) {
      fillRoundRect(
        ctx,
        statusRect.x + 2,
        statusRect.y + 2,
        statusRect.w - 4,
        statusRect.h - 4,
        16,
        'rgba(255, 221, 115, 0.08)',
        'rgba(255, 221, 115, 0.16)'
      );
    }
    drawText(
      ctx,
      guideText,
      statusRect.x + statusRect.w / 2,
      statusRect.y + 11,
      11,
      app.guideHint ? '#f6e4a7' : 'rgba(230,251,255,0.78)',
      'center'
    );
  }
}

module.exports = {
  drawBoard,
  buildPuzzleLayout,
  drawPuzzle
};
