function getImageInfo(src) {
  return new Promise((resolve, reject) => {
    wx.getImageInfo({
      src,
      success: resolve,
      fail: reject
    });
  });
}

function exportSquareImage(page, canvasId, src, size, fileType, quality) {
  return getImageInfo(src).then((info) => {
    const side = Math.min(info.width, info.height);
    const cropX = Math.floor((info.width - side) / 2);
    const cropY = Math.floor((info.height - side) / 2);
    const context = wx.createCanvasContext(canvasId, page);

    context.clearRect(0, 0, size, size);
    context.drawImage(src, cropX, cropY, side, side, 0, 0, size, size);

    return new Promise((resolve, reject) => {
      context.draw(false, () => {
        wx.canvasToTempFilePath(
          {
            canvasId,
            fileType,
            quality,
            x: 0,
            y: 0,
            width: size,
            height: size,
            destWidth: size,
            destHeight: size,
            success: (res) => resolve(res.tempFilePath),
            fail: reject
          },
          page
        );
      });
    });
  });
}

function persistTempFile(tempFilePath, targetName) {
  const extension = /\.png$/i.test(tempFilePath) ? 'png' : 'jpg';
  const targetPath = `${wx.env.USER_DATA_PATH}/${targetName}.${extension}`;
  const fs = wx.getFileSystemManager();

  return new Promise((resolve, reject) => {
    fs.copyFile({
      srcPath: tempFilePath,
      destPath: targetPath,
      success: () => resolve(targetPath),
      fail: reject
    });
  });
}

function readFileBase64(filePath) {
  return wx.getFileSystemManager().readFileSync(filePath, 'base64');
}

function writeBase64ToFile(base64, targetName) {
  const targetPath = `${wx.env.USER_DATA_PATH}/${targetName}.jpg`;
  const fs = wx.getFileSystemManager();
  fs.writeFileSync(targetPath, wx.base64ToArrayBuffer(base64));
  return targetPath;
}

function removeFileSafe(filePath) {
  if (!filePath) {
    return;
  }

  try {
    wx.getFileSystemManager().unlinkSync(filePath);
  } catch (error) {
    // Ignore cleanup failures in MVP mode.
  }
}

module.exports = {
  exportSquareImage,
  persistTempFile,
  readFileBase64,
  removeFileSafe,
  writeBase64ToFile
};
