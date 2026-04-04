const runtime = require('../config/runtime');
const logger = require('./logger');

const EFFECT_SOURCES = {
  snap: '/assets/audio/snap.wav',
  guide: '/assets/audio/guide.wav',
  lock: '/assets/audio/lock.wav',
  success: '/assets/audio/success.wav',
  fail: '/assets/audio/fail.wav'
};

const AMBIENT_SOURCES = {
  menu: '/assets/audio/menu-ambient.wav'
};

const audioContexts = {};
const ambientContexts = {};
let currentAmbientKey = '';

function isAudioEnabled(enabled) {
  return runtime.enableSoundEffects !== false && !!enabled;
}

function applyCommonOptions(context, volume) {
  if ('obeyMuteSwitch' in context) {
    context.obeyMuteSwitch = true;
  }
  if ('volume' in context && typeof volume === 'number') {
    context.volume = volume;
  }
}

function createEffectContext(effectKey) {
  if (!wx.createInnerAudioContext || !EFFECT_SOURCES[effectKey]) {
    return null;
  }

  const context = wx.createInnerAudioContext();
  context.src = EFFECT_SOURCES[effectKey];
  context.loop = false;
  context.autoplay = false;
  applyCommonOptions(
    context,
    typeof runtime.soundEffectsVolume === 'number' ? runtime.soundEffectsVolume : 0.72
  );
  context.onError((error) => {
    logger.captureError('audio_effect_error', error, {
      effectKey
    });
  });

  audioContexts[effectKey] = context;
  return context;
}

function createAmbientContext(trackKey) {
  if (!wx.createInnerAudioContext || !AMBIENT_SOURCES[trackKey]) {
    return null;
  }

  const context = wx.createInnerAudioContext();
  context.src = AMBIENT_SOURCES[trackKey];
  context.loop = true;
  context.autoplay = false;
  applyCommonOptions(
    context,
    typeof runtime.ambientVolume === 'number' ? runtime.ambientVolume : 0.22
  );
  context.onError((error) => {
    logger.captureError('audio_ambient_error', error, {
      trackKey
    });
  });

  ambientContexts[trackKey] = context;
  return context;
}

function getEffectContext(effectKey) {
  return audioContexts[effectKey] || createEffectContext(effectKey);
}

function getAmbientContext(trackKey) {
  return ambientContexts[trackKey] || createAmbientContext(trackKey);
}

function preload() {
  Object.keys(EFFECT_SOURCES).forEach((effectKey) => {
    getEffectContext(effectKey);
  });
  Object.keys(AMBIENT_SOURCES).forEach((trackKey) => {
    getAmbientContext(trackKey);
  });
}

function playEffect(effectKey, enabled, options) {
  if (!isAudioEnabled(enabled)) {
    return false;
  }

  const context = getEffectContext(effectKey);
  if (!context) {
    return false;
  }

  const nextOptions = options || {};
  if ('volume' in context) {
    context.volume =
      typeof nextOptions.volume === 'number'
        ? nextOptions.volume
        : typeof runtime.soundEffectsVolume === 'number'
          ? runtime.soundEffectsVolume
          : 0.72;
  }
  if ('playbackRate' in context && typeof nextOptions.playbackRate === 'number') {
    context.playbackRate = nextOptions.playbackRate;
  } else if ('playbackRate' in context) {
    context.playbackRate = 1;
  }

  try {
    if (context.stop) {
      context.stop();
    }
    if (context.seek) {
      context.seek(0);
    }
    context.play();
    return true;
  } catch (error) {
    logger.captureError('audio_effect_play', error, {
      effectKey
    });
    return false;
  }
}

function playAmbient(trackKey, enabled, options) {
  if (!isAudioEnabled(enabled)) {
    stopAmbient();
    return false;
  }

  const context = getAmbientContext(trackKey);
  if (!context) {
    return false;
  }

  const nextOptions = options || {};
  if ('volume' in context) {
    context.volume =
      typeof nextOptions.volume === 'number'
        ? nextOptions.volume
        : typeof runtime.ambientVolume === 'number'
          ? runtime.ambientVolume
          : 0.22;
  }

  if (currentAmbientKey === trackKey) {
    if (typeof context.paused === 'boolean' && !context.paused) {
      return true;
    }
    try {
      if (context.seek) {
        context.seek(0);
      }
      context.play();
      return true;
    } catch (error) {
      logger.captureError('audio_ambient_resume', error, {
        trackKey
      });
      return false;
    }
  }

  stopAmbient();
  currentAmbientKey = trackKey;
  try {
    if (context.seek) {
      context.seek(0);
    }
    context.play();
    return true;
  } catch (error) {
    logger.captureError('audio_ambient_play', error, {
      trackKey
    });
    currentAmbientKey = '';
    return false;
  }
}

function stopAmbient() {
  Object.keys(ambientContexts).forEach((trackKey) => {
    const context = ambientContexts[trackKey];
    if (context && context.stop) {
      try {
        context.stop();
      } catch (error) {
        logger.captureError('audio_ambient_stop', error, {
          trackKey
        });
      }
    }
  });
  currentAmbientKey = '';
}

function stopEffects() {
  Object.keys(audioContexts).forEach((effectKey) => {
    const context = audioContexts[effectKey];
    if (context && context.stop) {
      try {
        context.stop();
      } catch (error) {
        logger.captureError('audio_effect_stop', error, {
          effectKey
        });
      }
    }
  });
}

function stopAll() {
  stopEffects();
  stopAmbient();
}

module.exports = {
  preload,
  playEffect,
  playAmbient,
  stopAmbient,
  stopEffects,
  stopAll
};
