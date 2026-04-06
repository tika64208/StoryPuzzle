const logger = require('../services/logger');
const audioService = require('../services/audio');
const challengeService = require('../services/challenge');
const storage = require('../utils/storage');
const actionHandlers = require('./action-handlers');
const appRuntime = require('./app-runtime');
const assetRuntime = require('./asset-runtime');
const bootstrapRuntime = require('./bootstrap-runtime');
const contentFlow = require('./content-flow');
const customActions = require('./custom-actions');
const customScreen = require('./custom-screen');
const feedbackRuntime = require('./feedback-runtime');
const inputRuntime = require('./input-runtime');
const leaderboardRuntime = require('./leaderboard-runtime');
const levelRuntime = require('./level-runtime');
const overlayRuntime = require('./overlay-runtime');
const panelScreens = require('./panel-screens');
const puzzleEffects = require('./puzzle-effects');
const puzzleScreen = require('./puzzle-screen');
const { createRuntimeHelperBundles } = require('./runtime-helper-bundles');
const screenFlow = require('./screen-flow');
const shareRuntime = require('./share-runtime');
const storyScreens = require('./story-screens');
const uiRuntime = require('./ui-runtime');
const {
  CHALLENGE_SCORE_CLOUD_KEY,
  CHALLENGE_SCORE_UPDATED_KEY,
  CHAPTER_DIFFICULTY_OPTIONS,
  buildLeaderboardLoadViewModel,
  getChallengeScore,
  getChapterDifficultyConfig,
  getChapterDifficultyStars,
  getChaptersWithDifficulty,
  getLevelByIdWithDifficulty
} = challengeService;

const {
  DEFAULT_CUSTOM_IMAGE_PATH,
  DEFAULT_CUSTOM_TITLE,
  CUSTOM_SHARE_BASE64_LIMIT,
  MAX_IMAGE_CACHE_ITEMS,
  CUSTOM_LAYOUT_OPTIONS,
  clamp,
  roundRectPath,
  fillRoundRect,
  drawGlassCard,
  drawImageCover,
  drawText,
  wrapText,
  drawParagraph,
  drawSettingsGearIcon,
  hitButton,
  formatTime,
  getTodayKey,
  chunkArray,
  chooseImagePromise,
  compressImagePromise,
  actionSheetPromise,
  modalPromise,
  getClipboardDataPromise,
  resolvePreviewImage,
  getMiniGameImageCandidates,
  getSafeLevelTitle,
  getSafeChapterTitle,
  getChapterSummary,
  getChapterCoverLevel,
  getAccountInfo
} = require('./shared-helpers');
const helperBundles = createRuntimeHelperBundles({
  CHALLENGE_SCORE_CLOUD_KEY,
  CHALLENGE_SCORE_UPDATED_KEY,
  CHAPTER_DIFFICULTY_OPTIONS,
  CUSTOM_LAYOUT_OPTIONS,
  CUSTOM_SHARE_BASE64_LIMIT,
  DEFAULT_CUSTOM_IMAGE_PATH,
  DEFAULT_CUSTOM_TITLE,
  MAX_IMAGE_CACHE_ITEMS,
  actionSheetPromise,
  audioService,
  buildLeaderboardLoadViewModel,
  chooseImagePromise,
  chunkArray,
  clamp,
  compressImagePromise,
  drawGlassCard,
  drawImageCover,
  drawParagraph,
  drawSettingsGearIcon,
  drawText,
  fillRoundRect,
  formatTime,
  getAccountInfo,
  getChallengeScore,
  getChapterCoverLevel,
  getChapterDifficultyConfig,
  getChapterDifficultyStars,
  getChapterSummary,
  getChaptersWithDifficulty,
  getClipboardDataPromise,
  getLevelByIdWithDifficulty,
  getMiniGameImageCandidates,
  getSafeChapterTitle,
  getSafeLevelTitle,
  getTodayKey,
  hitButton,
  logger,
  modalPromise,
  resolvePreviewImage,
  roundRectPath,
  storage,
  wrapText
});

const appMethods = {
  resizeCanvas() {
    return bootstrapRuntime.resizeCanvas(this);
  },

  bindTouches() {
    return bootstrapRuntime.bindTouches(this);
  },

  getLaunchOptions() {
    return appRuntime.getLaunchOptions(this, { logger });
  },

  setupSharing() {
    return shareRuntime.setupSharing(this, helperBundles.share);
  },

  buildShareQuery(params) {
    return shareRuntime.buildShareQuery(params);
  },

  getHomeSharePayload() {
    return shareRuntime.getHomeSharePayload(this, helperBundles.homeShare);
  },

  getChapterSharePayload(chapterId) {
    return shareRuntime.getChapterSharePayload(this, chapterId, helperBundles.chapterShare);
  },

  getLevelSharePayload(levelId) {
    return shareRuntime.getLevelSharePayload(this, levelId, helperBundles.levelShare);
  },

  getSharePayload() {
    return shareRuntime.getSharePayload(this, helperBundles.share);
  },

  triggerShare(shareType, payloadId) {
    return shareRuntime.triggerShare(this, shareType, payloadId, helperBundles.share);
  },

  getSharePayloadFromData(payload) {
    return shareRuntime.getSharePayloadFromData(payload);
  },

  getSuccessShareAction() {
    return shareRuntime.getSuccessShareAction(this);
  },

  handleSuccessShareAction() {
    return shareRuntime.handleSuccessShareAction(this, helperBundles.share);
  },

  async handleIncomingShareOptions(options, source) {
    return shareRuntime.handleIncomingShareOptions(this, options, source, helperBundles.share);
  },

  start() {
    return appRuntime.start(this, helperBundles.appStart);
  },

  loop() {
    return appRuntime.loop(this);
  },

  update(delta) {
    return appRuntime.update(this, delta);
  },

  showToast(message) {
    return appRuntime.showToast(this, message);
  },

  refreshProfile() {
    return appRuntime.refreshProfile(this, helperBundles.appProfile);
  },

  refreshSelectedChapter() {
    return appRuntime.refreshSelectedChapter(this, helperBundles.selectedChapter);
  },

  isRectVisible(y, height, margin) {
    return assetRuntime.isRectVisible(this, y, height, margin);
  },

  getImageCacheEntry(src) {
    return assetRuntime.getImageCacheEntry(this, src, helperBundles.imageCache);
  },

  bindImageCacheEntry(candidates, entry) {
    return assetRuntime.bindImageCacheEntry(this, candidates, entry);
  },

  touchImageCacheEntry(entry) {
    return assetRuntime.touchImageCacheEntry(this, entry);
  },

  dropImageCacheEntry(entry) {
    return assetRuntime.dropImageCacheEntry(this, entry);
  },

  collectPreferredImageSources() {
    return assetRuntime.collectPreferredImageSources(this, helperBundles.preferredImageSources);
  },

  pruneImageCache(force) {
    return assetRuntime.pruneImageCache(this, force, helperBundles.imageCachePrune);
  },

  switchToHome() {
    return screenFlow.switchToHome(this);
  },

  buildHomeLayout() {
    return screenFlow.buildHomeLayout(this, helperBundles.buildHomeLayout);
  },

  refreshHomeQuickActions() {
    return screenFlow.refreshHomeQuickActions(this);
  },

  switchToSettings() {
    return screenFlow.switchToSettings(this);
  },

  buildSettingsLayout() {
    return screenFlow.buildSettingsLayout(this);
  },

  switchToLeaderboard() {
    return screenFlow.switchToLeaderboard(this);
  },

  buildLeaderboardLayout() {
    return screenFlow.buildLeaderboardLayout(this);
  },

  syncChallengeScoreToCloud(options) {
    return leaderboardRuntime.syncChallengeScoreToCloud(this, options, helperBundles.challengeSync);
  },

  loadFriendLeaderboard() {
    return leaderboardRuntime.loadFriendLeaderboard(this, helperBundles.leaderboardLoad);
  },

  switchToChapters() {
    return screenFlow.switchToChapters(this);
  },

  switchToLevels(chapterId) {
    return screenFlow.switchToLevels(this, chapterId, helperBundles.switchToLevels);
  },

  openChapterOverlay(chapter) {
    return overlayRuntime.openChapterOverlay(this, chapter, helperBundles.chapterOverlay);
  },

  buildChapterLayout() {
    return screenFlow.buildChapterLayout(this);
  },

  buildLevelLayout() {
    return screenFlow.buildLevelLayout(this, helperBundles.buildLevelLayout);
  },

  updateSelectedChapterDifficulty(stars) {
    return contentFlow.updateSelectedChapterDifficulty(this, stars, helperBundles.selectedChapterDifficulty);
  },

  refreshCustomData() {
    return contentFlow.refreshCustomData(this);
  },

  ensureCustomPreview(path) {
    return contentFlow.ensureCustomPreview(this, path);
  },

  switchToCustom() {
    return contentFlow.switchToCustom(this, helperBundles.switchToCustom);
  },

  buildCustomLayout() {
    return contentFlow.buildCustomLayout(this);
  },

  switchToSupply() {
    return screenFlow.switchToSupply(this);
  },

  buildSupplyLayout() {
    return screenFlow.buildSupplyLayout(this);
  },

  switchToLegal(type) {
    return contentFlow.switchToLegal(this, type);
  },

  buildLegalLayout(type, pageIndex) {
    return contentFlow.buildLegalLayout(this, type, pageIndex, helperBundles.buildLegalLayout);
  },

  buildLegalPages(type) {
    return contentFlow.buildLegalPages(type, helperBundles.buildLegalPages);
  },

  async handleMoreTools() {
    return actionHandlers.handleMoreTools(this, helperBundles.moreTools);
  },

  async handleCustomUseDefault() {
    return customActions.handleCustomUseDefault(this, helperBundles.customUseDefault);
  },

  async handleCustomChooseImage() {
    return customActions.handleCustomChooseImage(this, helperBundles.customChooseImage);
  },

  async handleCustomChooseLayout() {
    return customActions.handleCustomChooseLayout(this, helperBundles.customChooseLayout);
  },

  async handleCustomCreateLevel() {
    return customActions.handleCustomCreateLevel(this, helperBundles.customCreateLevel);
  },

  async handleCustomImportCode() {
    return customActions.handleCustomImportCode(this, helperBundles.customImportCode);
  },

  handleCustomCopyCode(levelId) {
    return customActions.handleCustomCopyCode(this, levelId);
  },

  async handleCustomDelete(levelId) {
    return customActions.handleCustomDelete(this, levelId, helperBundles.customDelete);
  },

  async openLevel(levelId, consumeEnergy) {
    return levelRuntime.openLevel(this, levelId, consumeEnergy, helperBundles.openLevel);
  },

  openIntroOverlay() {
    return levelRuntime.openIntroOverlay(this, helperBundles.openIntro);
  },

  loadImage(src) {
    return assetRuntime.loadImage(this, src, helperBundles.imageCache);
  },

  getResolvedImage(src) {
    return assetRuntime.getResolvedImage(this, src);
  },

  handleTouchStart(x, y) {
    return inputRuntime.handleTouchStart(this, x, y, helperBundles.touchStart);
  },

  handleTouchMove(x, y) {
    return inputRuntime.handleTouchMove(this, x, y);
  },

  handleTouchEnd(x, y) {
    return inputRuntime.handleTouchEnd(this, x, y);
  },

  handleHomeTap(x, y) {
    return inputRuntime.handleHomeTap(this, x, y, helperBundles.hitButton);
  },

  handleChapterTap(x, y) {
    return inputRuntime.handleChapterTap(this, x, y, helperBundles.hitButton);
  },

  handleLevelTap(x, y) {
    return inputRuntime.handleLevelTap(this, x, y, helperBundles.hitButton);
  },

  handleCustomTap(x, y) {
    return inputRuntime.handleCustomTap(this, x, y, helperBundles.hitButton);
  },

  handleLegalTap(x, y) {
    return actionHandlers.handleLegalTap(this, x, y, helperBundles.hitButton);
  },

  handlePuzzleTap(x, y) {
    return inputRuntime.handlePuzzleTap(this, x, y, helperBundles.hitButton);
  },

  drawBackground() {
    return uiRuntime.drawBackground(this);
  },

  drawLoading() {
    return uiRuntime.drawLoading(this, helperBundles.drawLoading);
  },

  drawCustom() {
    return customScreen.drawCustom(this, helperBundles.customScreen);
  },

  drawSupply() {
    return this.drawSupplyPanel();
  },

  drawSupplyPanel() {
    return panelScreens.drawSupplyPanel(this, helperBundles.supplyPanel);
  },

  drawSettingsPanel() {
    return panelScreens.drawSettingsPanel(this, helperBundles.settingsPanel);
  },

  drawLegalPanel() {
    return panelScreens.drawLegalPanel(this, helperBundles.legalPanel);
  },

  clearPressState() {
    return inputRuntime.clearPressState(this);
  },

  capturePressState(x, y) {
    return inputRuntime.capturePressState(this, x, y, helperBundles.capturePressState);
  },

  getHomeHeroParallax() {
    return uiRuntime.getHomeHeroParallax(this);
  },

  triggerScreenMotion(screen) {
    return uiRuntime.triggerScreenMotion(this, screen);
  },

  getScreenMotion(screen, staggerIndex) {
    return uiRuntime.getScreenMotion(this, screen, staggerIndex);
  },

  drawHome() {
    return this.drawStoryHome();
  },

  drawChapters() {
    return this.drawStoryChapters();
  },

  drawMotionMotes(screen, bounds, options) {
    return uiRuntime.drawMotionMotes(this, screen, bounds, options);
  },

  drawLevels() {
    return this.drawStoryLevels();
  },

  drawStoryHome() {
    return storyScreens.drawStoryHome(this, helperBundles.storyScreens);
  },

  drawStoryChapters() {
    return storyScreens.drawStoryChapters(this, helperBundles.storyScreens);
  },

  drawStoryLevels() {
    return storyScreens.drawStoryLevels(this, helperBundles.storyScreens);
  },

  isButtonPressed(button) {
    return uiRuntime.isButtonPressed(this, button);
  },

  drawButton(button, primary, compact) {
    return uiRuntime.drawButton(this, button, primary, compact, helperBundles.buttonDraw);
  },

  drawScreenFade() {
    return uiRuntime.drawScreenFade(this);
  },

  render() {
    return appRuntime.render(this);
  },

  drawBoard() {
    return puzzleScreen.drawBoard(this, helperBundles.boardDraw);
  },

  buildPuzzleLayout() {
    return puzzleScreen.buildPuzzleLayout(this);
  },

  drawPuzzle() {
    return puzzleScreen.drawPuzzle(this, helperBundles.puzzleDraw);
  },

  drawOverlay() {
    return overlayRuntime.drawOverlay(this, helperBundles.overlayDraw);
  },

  activateSuccessStoryOverlay() {
    return overlayRuntime.activateSuccessStoryOverlay(this);
  },

  buildOverlayButtons() {
    return overlayRuntime.buildOverlayButtons(this);
  },

  drawSuccessNarrativeOverlay() {
    return overlayRuntime.drawSuccessNarrativeOverlay(this, helperBundles.successOverlayDraw);
  },

  drawIntroNarrativeOverlay() {
    return overlayRuntime.drawIntroNarrativeOverlay(this, helperBundles.successOverlayDraw);
  },

  clearPuzzleEffects() {
    return feedbackRuntime.clearPuzzleEffects(this);
  },

  playHaptic(type, scene) {
    return feedbackRuntime.playHaptic(this, type, scene, helperBundles.feedbackHaptic);
  },

  playFeedbackCue(kind, options) {
    return feedbackRuntime.playFeedbackCue(this, kind, options, helperBundles.feedbackAudio);
  },

  syncScreenAudio() {
    return feedbackRuntime.syncScreenAudio(this, helperBundles.feedbackAudio);
  },

  handleSupplyTap(x, y) {
    return actionHandlers.handleSupplyTap(this, x, y, helperBundles.hitButton);
  },

  handleSettingsTap(x, y) {
    return actionHandlers.handleSettingsTap(this, x, y, helperBundles.hitButton);
  },

  handleLeaderboardTap(x, y) {
    return actionHandlers.handleLeaderboardTap(this, x, y, helperBundles.hitButton);
  },

  drawLeaderboardPanel() {
    return panelScreens.drawLeaderboardPanel(this, helperBundles.leaderboardPanel);
  },

  handleOverlayTap(x, y) {
    return overlayRuntime.handleOverlayTap(this, x, y, helperBundles.hitButton);
  },

  buildChapterOverlayButtons() {
    return overlayRuntime.buildChapterOverlayButtons(this);
  },

  drawChapterNarrativeOverlay() {
    return overlayRuntime.drawChapterNarrativeOverlay(this, helperBundles.chapterNarrativeOverlay);
  },

  openSuccessOverlay() {
    return overlayRuntime.openSuccessOverlay(this);
  },

  openFailOverlay() {
    return overlayRuntime.openFailOverlay(this);
  },

  useHint() {
    return actionHandlers.useHint(this);
  },

  useLockTool() {
    return actionHandlers.useLockTool(this);
  },

  useGuideTool() {
    return actionHandlers.useGuideTool(this);
  },

  startSettleAnimation(dragSnapshot, rowDelta, colDelta) {
    return puzzleEffects.startSettleAnimation(this, dragSnapshot, rowDelta, colDelta);
  },

  capturePieceSlotSnapshot() {
    return puzzleEffects.capturePieceSlotSnapshot(this);
  },

  startPassiveSettleAnimations(beforePieceSlots, excludePieceIds) {
    return puzzleEffects.startPassiveSettleAnimations(this, beforePieceSlots, excludePieceIds);
  },

  getSettleEffect(pieceId) {
    return puzzleEffects.getSettleEffect(this, pieceId);
  },

  getSettleOffset(pieceId) {
    return puzzleEffects.getSettleOffset(this, pieceId);
  },

  drawSettleTrail(effect, baseX, baseY, drawX, drawY, cell) {
    return puzzleEffects.drawSettleTrail(this, effect, baseX, baseY, drawX, drawY, cell, helperBundles.settleTrail);
  },

  capturePuzzleFeedback(pieceId) {
    return puzzleEffects.capturePuzzleFeedback(this, pieceId);
  },

  getGroupBounds(group) {
    return puzzleEffects.getGroupBounds(this, group);
  },

  addSnapPulse(bounds, tone, expandBoost) {
    return puzzleEffects.addSnapPulse(this, bounds, tone, expandBoost);
  },

  spawnBurstParticles(x, y, count, palette, options) {
    return puzzleEffects.spawnBurstParticles(this, x, y, count, palette, options);
  },

  triggerMoveFeedback(beforeMove, pieceId) {
    return puzzleEffects.triggerMoveFeedback(this, beforeMove, pieceId);
  },

  playSuccessCelebration() {
    return puzzleEffects.playSuccessCelebration(this);
  },

  updateAnimationEffects(delta) {
    return puzzleEffects.updateAnimationEffects(this, delta);
  },

  drawBoardEffects() {
    return puzzleEffects.drawBoardEffects(this, helperBundles.boardEffects);
  },

  drawToast() {
    return uiRuntime.drawToast(this, helperBundles.toastDraw);
  },
};

module.exports = {
  helperBundles,
  appMethods
};
