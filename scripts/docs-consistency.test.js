const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { getProjectMetadata } = require('../services/project-metadata');

function readText(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('README stays aligned with current chapter and level metadata', () => {
  const metadata = getProjectMetadata();
  const readme = readText('README.md');

  assert.ok(
    readme.includes(`当前系统章节为 \`${metadata.chapterCount}\` 章、\`${metadata.totalLevels}\` 关`),
    'README should mention the current chapter and total level counts'
  );
  assert.ok(
    readme.includes(`章节名称：\`${metadata.currentChapterTitle}\``),
    'README should mention the current main chapter title'
  );
});

test('submission notes stay aligned with current chapter and level metadata', () => {
  const metadata = getProjectMetadata();
  const submissionNotes = readText('SUBMISSION_NOTES.md');

  assert.ok(
    submissionNotes.includes(`《${metadata.currentChapterTitle}》${metadata.totalLevels} 关`) ||
      submissionNotes.includes(`《${metadata.currentChapterTitle}》十六回`),
    'SUBMISSION_NOTES should mention the active main chapter and current level count'
  );
});
