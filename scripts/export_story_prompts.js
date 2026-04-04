const fs = require('fs');
const path = require('path');
const { GLOBAL_PRESET, THEMES } = require('../data/story-prompt-library');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, 'exports');

fs.mkdirSync(outputDir, { recursive: true });

const exportPayload = {
  exportedAt: new Date().toISOString(),
  globalPreset: GLOBAL_PRESET,
  themes: THEMES
};

fs.writeFileSync(
  path.join(outputDir, 'story-image-prompts.json'),
  JSON.stringify(exportPayload, null, 2),
  'utf8'
);

fs.writeFileSync(
  path.join(outputDir, 'story-image-prompts.md'),
  buildMarkdown(exportPayload),
  'utf8'
);

fs.writeFileSync(
  path.join(outputDir, 'story-image-prompts.txt'),
  buildPlainText(exportPayload),
  'utf8'
);

console.log(`Exported story prompts to ${outputDir}`);

function buildMarkdown(payload) {
  const lines = [];

  lines.push('# 剧情图片提示词导出');
  lines.push('');
  lines.push('## 全局设定');
  lines.push('');
  lines.push(`- 项目：${payload.globalPreset.projectName}`);
  lines.push(`- 用途：${payload.globalPreset.useCase}`);
  lines.push(`- 推荐比例：${payload.globalPreset.recommendedAspectRatio}`);
  lines.push(`- 推荐分辨率：${payload.globalPreset.recommendedResolution}`);
  lines.push(`- 统一风格：${payload.globalPreset.visualStyle}`);
  lines.push('- 构图规则：');
  payload.globalPreset.compositionRules.forEach((rule) => {
    lines.push(`  - ${rule}`);
  });
  lines.push(`- 通用负面提示词：${payload.globalPreset.negativePrompt}`);
  lines.push('');

  payload.themes.forEach((theme) => {
    lines.push(`## ${theme.chapterId} ${theme.title}`);
    lines.push('');
    lines.push(`### 故事背景`);
    lines.push(theme.storyBackground);
    lines.push('');
    lines.push(`### 视觉关键词`);
    lines.push(theme.visualKeywords.join('、'));
    lines.push('');
    lines.push(`### 章节封面提示词`);
    lines.push(`- 标题：${theme.chapterCover.title}`);
    lines.push(`- 正向提示词：${theme.chapterCover.prompt}`);
    lines.push(`- 负面提示词：${theme.chapterCover.negativePrompt}`);
    lines.push('');
    lines.push(`### 关卡提示词`);
    lines.push('');

    theme.levels.forEach((level) => {
      lines.push(`#### ${level.levelId} ${level.title}`);
      lines.push(`- 剧情节点：${level.storyBeat}`);
      lines.push(`- 正向提示词：${level.prompt}`);
      lines.push(`- 负面提示词：${level.negativePrompt}`);
      lines.push('');
    });
  });

  return `${lines.join('\n').trim()}\n`;
}

function buildPlainText(payload) {
  const lines = [];

  lines.push('剧情图片提示词导出');
  lines.push('');
  lines.push(`项目：${payload.globalPreset.projectName}`);
  lines.push(`用途：${payload.globalPreset.useCase}`);
  lines.push(`推荐比例：${payload.globalPreset.recommendedAspectRatio}`);
  lines.push(`推荐分辨率：${payload.globalPreset.recommendedResolution}`);
  lines.push(`统一风格：${payload.globalPreset.visualStyle}`);
  lines.push('构图规则：');
  payload.globalPreset.compositionRules.forEach((rule, index) => {
    lines.push(`${index + 1}. ${rule}`);
  });
  lines.push(`通用负面提示词：${payload.globalPreset.negativePrompt}`);
  lines.push('');

  payload.themes.forEach((theme) => {
    lines.push(`${theme.chapterId} ${theme.title}`);
    lines.push(`故事背景：${theme.storyBackground}`);
    lines.push(`视觉关键词：${theme.visualKeywords.join('、')}`);
    lines.push(`章节封面提示词：${theme.chapterCover.prompt}`);
    lines.push(`章节封面负面提示词：${theme.chapterCover.negativePrompt}`);
    lines.push('');

    theme.levels.forEach((level) => {
      lines.push(`${level.levelId} ${level.title}`);
      lines.push(`剧情节点：${level.storyBeat}`);
      lines.push(`正向提示词：${level.prompt}`);
      lines.push(`负面提示词：${level.negativePrompt}`);
      lines.push('');
    });
  });

  return `${lines.join('\n').trim()}\n`;
}
