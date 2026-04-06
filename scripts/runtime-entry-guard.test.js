const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function readText(relativePath) {
  return fs.readFileSync(path.join(__dirname, '..', relativePath), 'utf8');
}

test('minigame runtime entry stays wired to game.js -> minigame/app.js', () => {
  const gameSource = readText('game.js');

  assert.match(gameSource, /require\('\.\/minigame\/app'\)/, 'game.js should require ./minigame/app');
  assert.match(gameSource, /app\.start\(\)/, 'game.js should start the minigame app');
});

test('project config keeps legacy page runtime out of minigame packaging', () => {
  const projectConfig = JSON.parse(readText('project.config.json'));
  const ignoreEntries = (projectConfig.packOptions && projectConfig.packOptions.ignore) || [];
  const ignoreSet = new Set(ignoreEntries.map((entry) => `${entry.type}:${entry.value}`));

  assert.equal(projectConfig.compileType, 'game', 'project should stay in mini game compile mode');

  [
    'folder:pages',
    'folder:components',
    'folder:scripts',
    'file:app.js',
    'file:app.json',
    'file:app.wxss',
    'file:sitemap.json'
  ].forEach((entry) => {
    assert.ok(ignoreSet.has(entry), `project.config.json should ignore ${entry}`);
  });
});
