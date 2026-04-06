function clearPuzzleEffects(app) {
  app.snapPulses = [];
  app.fxParticles = [];
  app.settleAnimations = [];
}

function playHaptic(app, type, scene, helpers) {
  const { logger } = helpers;
  if (!wx.vibrateShort || (app.profile && app.profile.vibrationEnabled === false)) {
    return;
  }

  try {
    wx.vibrateShort({
      type: type || 'light'
    });
  } catch (error) {
    logger.captureError(scene || 'minigame_vibrate_feedback', error);
  }
}

function playFeedbackCue(app, kind, options, helpers) {
  const { audioService } = helpers;
  const nextOptions = options || {};
  const soundEnabled = !!(app.profile && app.profile.soundEnabled);
  let effectKey = '';
  let audioOptions = {};
  let hapticType = nextOptions.hapticType;
  let hapticScene = nextOptions.hapticScene;

  if (kind === 'merge') {
    effectKey = 'snap';
    audioOptions = { volume: 0.62, playbackRate: 1.06 };
    hapticType = hapticType || 'light';
    hapticScene = hapticScene || 'minigame_merge_vibrate';
  } else if (kind === 'improve') {
    effectKey = 'snap';
    audioOptions = { volume: 0.46, playbackRate: 0.96 };
    hapticType = hapticType || 'light';
    hapticScene = hapticScene || 'minigame_improve_vibrate';
  } else if (kind === 'lock') {
    effectKey = 'lock';
    audioOptions = { volume: 0.72, playbackRate: 1 };
    hapticType = hapticType || 'medium';
    hapticScene = hapticScene || 'minigame_lock_vibrate';
  } else if (kind === 'guide') {
    effectKey = 'guide';
    audioOptions = { volume: 0.68, playbackRate: 1 };
    hapticType = hapticType || 'light';
    hapticScene = hapticScene || 'minigame_guide_vibrate';
  } else if (kind === 'success') {
    effectKey = 'success';
    audioOptions = { volume: 0.84, playbackRate: 1 };
    hapticType = hapticType || 'medium';
    hapticScene = hapticScene || 'minigame_success_vibrate';
  } else if (kind === 'fail') {
    effectKey = 'fail';
    audioOptions = { volume: 0.78, playbackRate: 1 };
    hapticType = hapticType || 'medium';
    hapticScene = hapticScene || 'minigame_fail_vibrate';
  }

  if (effectKey) {
    audioService.playEffect(effectKey, soundEnabled, audioOptions);
  }

  if (hapticType) {
    app.playHaptic(hapticType, hapticScene);
  }
}

function syncScreenAudio(app, helpers) {
  const { audioService } = helpers;
  const soundEnabled = !!(app.profile && app.profile.soundEnabled);
  if (!soundEnabled) {
    audioService.stopAll();
    return;
  }

  if (['home', 'chapters', 'levels', 'custom', 'supply', 'legal'].includes(app.screen)) {
    audioService.playAmbient('menu', soundEnabled, { volume: 0.22 });
    return;
  }

  audioService.stopAmbient();
}

module.exports = {
  clearPuzzleEffects,
  playFeedbackCue,
  playHaptic,
  syncScreenAudio
};
