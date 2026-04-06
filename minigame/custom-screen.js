function drawCustom(app, helpers) {
  const {
    CUSTOM_LAYOUT_OPTIONS,
    DEFAULT_CUSTOM_TITLE,
    drawGlassCard,
    drawParagraph,
    drawText,
    fillRoundRect,
    getSafeLevelTitle,
    resolvePreviewImage
  } = helpers;
  const ctx = app.ctx;
  const draft = app.customDraft || {};
  const layout = CUSTOM_LAYOUT_OPTIONS[draft.layoutIndex || 0] || CUSTOM_LAYOUT_OPTIONS[0];

  drawText(ctx, '自定义谜境', app.viewWidth / 2, 36, 32, '#eafcff', 'center', 'bold');
  drawText(ctx, '选图后自动生成关卡，也可以从剪贴板导入好友谜境码', app.viewWidth / 2, 76, 14, 'rgba(230,251,255,0.72)', 'center');

  drawGlassCard(ctx, 18, 108, app.viewWidth - 36, 212, 28);

  const previewX = 34;
  const previewY = 128;
  const previewSize = 150;
  fillRoundRect(ctx, previewX, previewY, previewSize, previewSize, 22, 'rgba(6, 24, 36, 0.78)', 'rgba(142, 235, 255, 0.12)');

  if (draft.imagePath && !app.customPreviewImage) {
    app.ensureCustomPreview(draft.imagePath);
  }

  if (app.customPreviewImage) {
    const image = app.customPreviewImage;
    const side = Math.min(image.width, image.height);
    const offsetX = (image.width - side) / 2;
    const offsetY = (image.height - side) / 2;
    ctx.drawImage(image, offsetX, offsetY, side, side, previewX, previewY, previewSize, previewSize);
  } else {
    drawText(ctx, '等待预览图', previewX + previewSize / 2, previewY + 56, 16, 'rgba(230,251,255,0.7)', 'center', 'bold');
    drawParagraph(ctx, '默认样图或相册图片会显示在这里。', previewX + 20, previewY + 86, previewSize - 40, 12, 'rgba(230,251,255,0.54)', 18, 2);
  }

  const infoX = previewX + previewSize + 18;
  drawText(ctx, draft.title || DEFAULT_CUSTOM_TITLE, infoX, 132, 22, '#f3ffff', 'left', 'bold');
  drawText(ctx, draft.isDefault ? '当前来源：默认样图' : '当前来源：相册图片', infoX, 168, 13, '#aef7ff');
  drawText(ctx, `当前规格：${layout.label}`, infoX, 194, 13, 'rgba(230,251,255,0.72)');
  drawText(ctx, `${layout.timeLimit}s · 提示 ${layout.hints} 次`, infoX, 216, 13, 'rgba(230,251,255,0.72)');
  drawParagraph(
    ctx,
    draft.shareReady ? '当前图片已准备好分享码，可复制给好友导入。' : '如果图片过大，仍可本地游玩，但分享码可能暂不生成。',
    infoX,
    242,
    app.viewWidth - infoX - 34,
    12,
    'rgba(230,251,255,0.66)',
    18,
    3
  );

  app.customButtons.forEach((button) => {
    app.drawButton(button, button.key === 'create', true);
  });

  const listY = app.customButtons.length ? app.customButtons[app.customButtons.length - 1].y + 72 : 532;
  drawText(ctx, '我的谜境', 24, listY, 20, '#eafcff', 'left', 'bold');
  drawText(ctx, `${app.customLevels.length} 个本地关卡`, app.viewWidth - 24, listY + 4, 12, 'rgba(230,251,255,0.66)', 'right');

  const rendered = new Set();
  app.customItemButtons.forEach((button) => {
    if (button.action !== 'play' || rendered.has(button.levelId)) {
      return;
    }

    const level = app.customLevels.find((item) => item.levelId === button.levelId);
    if (!level) {
      return;
    }

    rendered.add(button.levelId);
    drawGlassCard(ctx, button.x, button.y, button.w, button.h, 24);

    const imagePath = resolvePreviewImage(level);
    const cached = imagePath ? app.images[imagePath] : null;
    if (imagePath && !cached) {
      app.loadImage(imagePath).then((image) => {
        if (app.images[imagePath]) {
          app.images[imagePath].__resolvedImage = image;
        }
      });
    }

    const image = cached && cached.__resolvedImage;
    if (image) {
      const side = Math.min(image.width, image.height);
      const offsetX = (image.width - side) / 2;
      const offsetY = (image.height - side) / 2;
      ctx.drawImage(image, offsetX, offsetY, side, side, button.x + 12, button.y + 12, 58, 58);
    } else {
      fillRoundRect(ctx, button.x + 12, button.y + 12, 58, 58, 18, 'rgba(8, 29, 44, 0.58)', 'rgba(142,235,255,0.12)');
    }

    drawText(ctx, getSafeLevelTitle(level), button.x + 82, button.y + 14, 18, '#f3ffff', 'left', 'bold');
    drawText(
      ctx,
      `${level.rows}x${level.cols} · ${level.timeLimit}s · ${level.completed ? `已完成 ${level.stars || 0} 星` : '点击直接入局'}`,
      button.x + 82,
      button.y + 38,
      12,
      'rgba(230,251,255,0.68)'
    );

    const shareButton = app.customItemButtons.find((item) => item.levelId === level.levelId && item.action === 'share');
    const deleteButton = app.customItemButtons.find((item) => item.levelId === level.levelId && item.action === 'delete');
    if (shareButton) {
      fillRoundRect(ctx, shareButton.x, shareButton.y, shareButton.w, shareButton.h, 12, 'rgba(57, 161, 177, 0.22)', 'rgba(123, 247, 255, 0.28)');
      drawText(ctx, '复制码', shareButton.x + shareButton.w / 2, shareButton.y + 4, 11, '#eafcff', 'center', 'bold');
    }
    if (deleteButton) {
      fillRoundRect(ctx, deleteButton.x, deleteButton.y, deleteButton.w, deleteButton.h, 12, 'rgba(92, 43, 43, 0.28)', 'rgba(255, 143, 143, 0.22)');
      drawText(ctx, '删除', deleteButton.x + deleteButton.w / 2, deleteButton.y + 4, 11, '#ffd6d6', 'center', 'bold');
    }
  });

  if (app.customLevels.length === 0) {
    drawParagraph(ctx, '还没有本地自定义谜境。先用默认样图试一局，或者从相册挑一张图生成。', 24, listY + 34, app.viewWidth - 48, 14, 'rgba(230,251,255,0.66)', 22, 2);
  } else if (app.customLevels.length > rendered.size) {
    drawText(ctx, `仅展示最近 ${rendered.size} 个谜境`, app.viewWidth / 2, app.viewHeight - 28, 12, 'rgba(230,251,255,0.52)', 'center');
  }
}

module.exports = {
  drawCustom
};
