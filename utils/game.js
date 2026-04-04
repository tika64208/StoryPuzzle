function hashSeed(seed) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }
  return hash >>> 0;
}

function createRng(seed) {
  let state = hashSeed(seed);
  return function random() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function buildShuffledSlots(total, seed) {
  const random = createRng(seed);
  const slots = [];
  for (let i = 1; i <= total; i += 1) {
    slots.push(i);
  }

  for (let i = total - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const temp = slots[i];
    slots[i] = slots[j];
    slots[j] = temp;
  }

  for (let i = 0; i < total; i += 1) {
    if (slots[i] === i + 1) {
      const swapIndex = i === total - 1 ? i - 1 : i + 1;
      const temp = slots[i];
      slots[i] = slots[swapIndex];
      slots[swapIndex] = temp;
    }
  }

  return slots;
}

function slotToRowCol(slot, cols) {
  const index = slot - 1;
  return {
    row: Math.floor(index / cols),
    col: index % cols
  };
}

function rowColToSlot(row, col, cols) {
  return row * cols + col + 1;
}

function translateSlot(slot, rowDelta, colDelta, level) {
  const coords = slotToRowCol(slot, level.cols);
  const nextRow = coords.row + rowDelta;
  const nextCol = coords.col + colDelta;
  if (nextRow < 0 || nextRow >= level.rows || nextCol < 0 || nextCol >= level.cols) {
    return 0;
  }
  return rowColToSlot(nextRow, nextCol, level.cols);
}

function areNeighborOffsetsEqual(pieceA, pieceB, cols) {
  const currentA = slotToRowCol(pieceA.currentSlot, cols);
  const currentB = slotToRowCol(pieceB.currentSlot, cols);
  const correctA = slotToRowCol(pieceA.correctSlot, cols);
  const correctB = slotToRowCol(pieceB.correctSlot, cols);

  const currentRowDiff = currentB.row - currentA.row;
  const currentColDiff = currentB.col - currentA.col;
  const correctRowDiff = correctB.row - correctA.row;
  const correctColDiff = correctB.col - correctA.col;

  return (
    Math.abs(currentRowDiff) + Math.abs(currentColDiff) === 1 &&
    currentRowDiff === correctRowDiff &&
    currentColDiff === correctColDiff
  );
}

function isPieceInCorrectSlot(piece) {
  return !!piece && piece.currentSlot === piece.correctSlot;
}

function recomputeGroups(level, state) {
  const pieceIds = Object.keys(state.pieces).map((pieceId) => Number(pieceId));
  const adjacency = {};
  pieceIds.forEach((pieceId) => {
    adjacency[pieceId] = [];
  });

  const total = level.rows * level.cols;
  for (let slot = 1; slot <= total; slot += 1) {
    const pieceAId = state.slots[slot];
    const pieceA = state.pieces[pieceAId];
    if (!pieceA) {
      continue;
    }

    const coords = slotToRowCol(slot, level.cols);
    if (coords.col < level.cols - 1) {
      const rightSlot = slot + 1;
      const pieceBId = state.slots[rightSlot];
      const pieceB = state.pieces[pieceBId];
      if (
        pieceB &&
        !pieceA.locked &&
        !pieceB.locked &&
        areNeighborOffsetsEqual(pieceA, pieceB, level.cols)
      ) {
        adjacency[pieceAId].push(pieceBId);
        adjacency[pieceBId].push(pieceAId);
      }
    }

    if (coords.row < level.rows - 1) {
      const bottomSlot = slot + level.cols;
      const pieceBId = state.slots[bottomSlot];
      const pieceB = state.pieces[pieceBId];
      if (
        pieceB &&
        !pieceA.locked &&
        !pieceB.locked &&
        areNeighborOffsetsEqual(pieceA, pieceB, level.cols)
      ) {
        adjacency[pieceAId].push(pieceBId);
        adjacency[pieceBId].push(pieceAId);
      }
    }
  }

  const visited = {};
  const groups = {};

  pieceIds.forEach((pieceId) => {
    if (visited[pieceId]) {
      return;
    }

    const stack = [pieceId];
    const component = [];
    visited[pieceId] = true;

    while (stack.length > 0) {
      const currentId = stack.pop();
      component.push(currentId);
      adjacency[currentId].forEach((neighborId) => {
        if (!visited[neighborId]) {
          visited[neighborId] = true;
          stack.push(neighborId);
        }
      });
    }

    component.sort((left, right) => left - right);
    const groupId = `group_${component[0]}`;
    const allCorrect = component.every((id) => isPieceInCorrectSlot(state.pieces[id]));

    groups[groupId] = {
      id: groupId,
      pieceIds: component.slice(),
      slots: component.map((id) => state.pieces[id].currentSlot).sort((left, right) => left - right),
      locked: component.every((id) => !!state.pieces[id].locked),
      correct: allCorrect
    };

    component.forEach((id) => {
      state.pieces[id].groupId = groupId;
      state.pieces[id].correct = isPieceInCorrectSlot(state.pieces[id]);
      state.pieces[id].locked = !!state.pieces[id].locked && state.pieces[id].correct;
    });
  });

  state.groups = groups;
  return groups;
}

function buildAssembledGroups(level, state) {
  const pieceIds = Object.keys(state.pieces).map((pieceId) => Number(pieceId));
  const adjacency = {};
  pieceIds.forEach((pieceId) => {
    adjacency[pieceId] = [];
  });

  const total = level.rows * level.cols;
  for (let slot = 1; slot <= total; slot += 1) {
    const pieceAId = state.slots[slot];
    const pieceA = state.pieces[pieceAId];
    if (!pieceA) {
      continue;
    }

    const coords = slotToRowCol(slot, level.cols);
    if (coords.col < level.cols - 1) {
      const pieceBId = state.slots[slot + 1];
      const pieceB = state.pieces[pieceBId];
      if (pieceB && areNeighborOffsetsEqual(pieceA, pieceB, level.cols)) {
        adjacency[pieceAId].push(pieceBId);
        adjacency[pieceBId].push(pieceAId);
      }
    }

    if (coords.row < level.rows - 1) {
      const pieceBId = state.slots[slot + level.cols];
      const pieceB = state.pieces[pieceBId];
      if (pieceB && areNeighborOffsetsEqual(pieceA, pieceB, level.cols)) {
        adjacency[pieceAId].push(pieceBId);
        adjacency[pieceBId].push(pieceAId);
      }
    }
  }

  const visited = {};
  const groups = [];

  pieceIds.forEach((pieceId) => {
    if (visited[pieceId]) {
      return;
    }

    const stack = [pieceId];
    const component = [];
    visited[pieceId] = true;

    while (stack.length > 0) {
      const currentId = stack.pop();
      component.push(currentId);
      adjacency[currentId].forEach((neighborId) => {
        if (!visited[neighborId]) {
          visited[neighborId] = true;
          stack.push(neighborId);
        }
      });
    }

    component.sort((left, right) => left - right);
    groups.push({
      id: `assembled_${component[0]}`,
      pieceIds: component,
      size: component.length
    });
  });

  groups.sort((left, right) => right.size - left.size || left.pieceIds[0] - right.pieceIds[0]);
  return groups;
}

function areCorrectNeighbors(pieceA, pieceB, cols) {
  const correctA = slotToRowCol(pieceA.correctSlot, cols);
  const correctB = slotToRowCol(pieceB.correctSlot, cols);
  return Math.abs(correctA.row - correctB.row) + Math.abs(correctA.col - correctB.col) === 1;
}

function getDirectionLabel(rowOffset, colOffset) {
  if (rowOffset === -1) {
    return '上方';
  }
  if (rowOffset === 1) {
    return '下方';
  }
  if (colOffset === -1) {
    return '左侧';
  }
  return '右侧';
}

function buildGuideHintForGroup(level, state, group) {
  if (!group || !group.pieceIds || group.pieceIds.length === 0) {
    return null;
  }

  const groupPieceLookup = {};
  group.pieceIds.forEach((pieceId) => {
    groupPieceLookup[pieceId] = true;
  });

  let bestHint = null;
  const pieceIds = Object.keys(state.pieces).map((pieceId) => Number(pieceId));
  pieceIds.forEach((pieceId) => {
    if (groupPieceLookup[pieceId]) {
      return;
    }

    const piece = state.pieces[pieceId];
    if (!piece || piece.locked) {
      return;
    }

    const pieceGroup = state.groups[piece.groupId];
    const pieceGroupSize = pieceGroup ? pieceGroup.pieceIds.length : 1;
    const currentCoords = slotToRowCol(piece.currentSlot, level.cols);

    group.pieceIds.forEach((anchorId) => {
      const anchorPiece = state.pieces[anchorId];
      if (!anchorPiece || !areCorrectNeighbors(piece, anchorPiece, level.cols)) {
        return;
      }

      const pieceCorrect = slotToRowCol(piece.correctSlot, level.cols);
      const anchorCorrect = slotToRowCol(anchorPiece.correctSlot, level.cols);
      const rowOffset = pieceCorrect.row - anchorCorrect.row;
      const colOffset = pieceCorrect.col - anchorCorrect.col;

      const anchorCurrent = slotToRowCol(anchorPiece.currentSlot, level.cols);
      const targetRow = anchorCurrent.row + rowOffset;
      const targetCol = anchorCurrent.col + colOffset;

      if (
        targetRow < 0 ||
        targetRow >= level.rows ||
        targetCol < 0 ||
        targetCol >= level.cols
      ) {
        return;
      }

      const targetSlot = rowColToSlot(targetRow, targetCol, level.cols);
      const occupantPieceId = state.slots[targetSlot];
      if (
        occupantPieceId &&
        occupantPieceId !== piece.id &&
        state.pieces[occupantPieceId] &&
        state.pieces[occupantPieceId].locked
      ) {
        return;
      }

      const distance =
        Math.abs(currentCoords.row - targetRow) + Math.abs(currentCoords.col - targetCol);
      const candidate = {
        pieceId: piece.id,
        targetSlot,
        clusterSize: group.size,
        pieceGroupSize,
        directionLabel: getDirectionLabel(rowOffset, colOffset),
        distance
      };

      if (
        !bestHint ||
        candidate.pieceGroupSize < bestHint.pieceGroupSize ||
        (candidate.pieceGroupSize === bestHint.pieceGroupSize && candidate.distance < bestHint.distance) ||
        (candidate.pieceGroupSize === bestHint.pieceGroupSize &&
          candidate.distance === bestHint.distance &&
          candidate.pieceId < bestHint.pieceId)
      ) {
        bestHint = candidate;
      }
    });
  });

  return bestHint;
}

function getGuideHint(level, state) {
  recomputeGroups(level, state);
  const assembledGroups = buildAssembledGroups(level, state);
  for (let index = 0; index < assembledGroups.length; index += 1) {
    const hint = buildGuideHintForGroup(level, state, assembledGroups[index]);
    if (hint) {
      return hint;
    }
  }
  return null;
}

function createInitialState(level) {
  const total = level.rows * level.cols;
  const slotPieces = buildShuffledSlots(total, level.seed);
  const pieces = {};
  const slots = [null];

  slotPieces.forEach((pieceId, index) => {
    const currentSlot = index + 1;
    pieces[pieceId] = {
      id: pieceId,
      correctSlot: pieceId,
      currentSlot,
      locked: false,
      correct: false,
      groupId: ''
    };
    slots[currentSlot] = pieceId;
  });

  const state = {
    slots,
    pieces,
    groups: {},
    initialSlots: slotPieces.slice(),
    initialHints: level.hints,
    selectedPieceId: 0,
    moves: 0,
    hintsLeft: level.hints,
    revived: false
  };

  recomputeGroups(level, state);
  return state;
}

function rebuildPieceSlots(state) {
  for (let slot = 1; slot < state.slots.length; slot += 1) {
    const pieceId = state.slots[slot];
    if (pieceId && state.pieces[pieceId]) {
      state.pieces[pieceId].currentSlot = slot;
    }
  }
}

function cloneState(state) {
  const nextPieces = {};
  Object.keys(state.pieces).forEach((pieceId) => {
    nextPieces[pieceId] = Object.assign({}, state.pieces[pieceId]);
  });

  return {
    slots: state.slots.slice(),
    pieces: nextPieces,
    groups: {},
    initialSlots: state.initialSlots.slice(),
    initialHints: state.initialHints,
    selectedPieceId: state.selectedPieceId,
    moves: state.moves,
    hintsLeft: state.hintsLeft,
    revived: state.revived
  };
}

function splitSegments(sortedValues) {
  if (sortedValues.length === 0) {
    return [];
  }

  const segments = [];
  let start = sortedValues[0];
  let end = sortedValues[0];

  for (let index = 1; index < sortedValues.length; index += 1) {
    const value = sortedValues[index];
    if (value === end + 1) {
      end = value;
      continue;
    }
    segments.push({ start, end });
    start = value;
    end = value;
  }

  segments.push({ start, end });
  return segments;
}

function applyHorizontalStep(level, state, groupId, direction) {
  const group = state.groups[groupId];
  if (!group) {
    return false;
  }

  const rowBuckets = {};
  group.slots.forEach((slot) => {
    const coords = slotToRowCol(slot, level.cols);
    if (!rowBuckets[coords.row]) {
      rowBuckets[coords.row] = [];
    }
    rowBuckets[coords.row].push(coords.col);
  });

  Object.keys(rowBuckets).forEach((rowKey) => {
    rowBuckets[rowKey].sort((left, right) => left - right);
  });

  const originalSlots = state.slots.slice();
  const nextSlots = originalSlots.slice();

  const rows = Object.keys(rowBuckets).map((row) => Number(row));
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const segments = splitSegments(rowBuckets[row]);
    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
      const segment = segments[segmentIndex];
      if (direction > 0) {
        if (segment.end >= level.cols - 1) {
          return false;
        }

        const displacedSlot = rowColToSlot(row, segment.end + 1, level.cols);
        const displacedPieceId = originalSlots[displacedSlot];
        if (displacedPieceId && state.pieces[displacedPieceId] && state.pieces[displacedPieceId].locked) {
          return false;
        }
        const vacatedSlot = rowColToSlot(row, segment.start, level.cols);
        nextSlots[vacatedSlot] = displacedPieceId;

        for (let col = segment.end; col >= segment.start; col -= 1) {
          const sourceSlot = rowColToSlot(row, col, level.cols);
          const targetSlot = rowColToSlot(row, col + 1, level.cols);
          nextSlots[targetSlot] = originalSlots[sourceSlot];
        }
      } else {
        if (segment.start <= 0) {
          return false;
        }

        const displacedSlot = rowColToSlot(row, segment.start - 1, level.cols);
        const displacedPieceId = originalSlots[displacedSlot];
        if (displacedPieceId && state.pieces[displacedPieceId] && state.pieces[displacedPieceId].locked) {
          return false;
        }
        const vacatedSlot = rowColToSlot(row, segment.end, level.cols);
        nextSlots[vacatedSlot] = displacedPieceId;

        for (let col = segment.start; col <= segment.end; col += 1) {
          const sourceSlot = rowColToSlot(row, col, level.cols);
          const targetSlot = rowColToSlot(row, col - 1, level.cols);
          nextSlots[targetSlot] = originalSlots[sourceSlot];
        }
      }
    }
  }

  state.slots = nextSlots;
  rebuildPieceSlots(state);
  recomputeGroups(level, state);
  return true;
}

function applyVerticalStep(level, state, groupId, direction) {
  const group = state.groups[groupId];
  if (!group) {
    return false;
  }

  const colBuckets = {};
  group.slots.forEach((slot) => {
    const coords = slotToRowCol(slot, level.cols);
    if (!colBuckets[coords.col]) {
      colBuckets[coords.col] = [];
    }
    colBuckets[coords.col].push(coords.row);
  });

  Object.keys(colBuckets).forEach((colKey) => {
    colBuckets[colKey].sort((left, right) => left - right);
  });

  const originalSlots = state.slots.slice();
  const nextSlots = originalSlots.slice();

  const cols = Object.keys(colBuckets).map((col) => Number(col));
  for (let index = 0; index < cols.length; index += 1) {
    const col = cols[index];
    const segments = splitSegments(colBuckets[col]);
    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex += 1) {
      const segment = segments[segmentIndex];
      if (direction > 0) {
        if (segment.end >= level.rows - 1) {
          return false;
        }

        const displacedSlot = rowColToSlot(segment.end + 1, col, level.cols);
        const displacedPieceId = originalSlots[displacedSlot];
        if (displacedPieceId && state.pieces[displacedPieceId] && state.pieces[displacedPieceId].locked) {
          return false;
        }
        const vacatedSlot = rowColToSlot(segment.start, col, level.cols);
        nextSlots[vacatedSlot] = displacedPieceId;

        for (let row = segment.end; row >= segment.start; row -= 1) {
          const sourceSlot = rowColToSlot(row, col, level.cols);
          const targetSlot = rowColToSlot(row + 1, col, level.cols);
          nextSlots[targetSlot] = originalSlots[sourceSlot];
        }
      } else {
        if (segment.start <= 0) {
          return false;
        }

        const displacedSlot = rowColToSlot(segment.start - 1, col, level.cols);
        const displacedPieceId = originalSlots[displacedSlot];
        if (displacedPieceId && state.pieces[displacedPieceId] && state.pieces[displacedPieceId].locked) {
          return false;
        }
        const vacatedSlot = rowColToSlot(segment.end, col, level.cols);
        nextSlots[vacatedSlot] = displacedPieceId;

        for (let row = segment.start; row <= segment.end; row += 1) {
          const sourceSlot = rowColToSlot(row, col, level.cols);
          const targetSlot = rowColToSlot(row - 1, col, level.cols);
          nextSlots[targetSlot] = originalSlots[sourceSlot];
        }
      }
    }
  }

  state.slots = nextSlots;
  rebuildPieceSlots(state);
  recomputeGroups(level, state);
  return true;
}

function moveGroup(level, state, pieceId, rowDelta, colDelta) {
  if (!pieceId || (!rowDelta && !colDelta)) {
    return false;
  }

  const piece = state.pieces[pieceId];
  if (!piece) {
    return false;
  }

  const workingState = cloneState(state);
  recomputeGroups(level, workingState);
  const workingPiece = workingState.pieces[pieceId];
  const group = workingState.groups[workingPiece.groupId];
  if (!group || group.locked || workingPiece.locked) {
    return false;
  }

  const rowStep = rowDelta === 0 ? 0 : rowDelta > 0 ? 1 : -1;
  const colStep = colDelta === 0 ? 0 : colDelta > 0 ? 1 : -1;

  for (let step = 0; step < Math.abs(colDelta); step += 1) {
    if (!applyHorizontalStep(level, workingState, workingPiece.groupId, colStep)) {
      return false;
    }
  }

  for (let step = 0; step < Math.abs(rowDelta); step += 1) {
    if (!applyVerticalStep(level, workingState, workingPiece.groupId, rowStep)) {
      return false;
    }
  }

  state.slots = workingState.slots;
  state.pieces = workingState.pieces;
  state.groups = workingState.groups;
  state.moves += 1;
  return true;
}

function lockCorrectPieces(level, state) {
  recomputeGroups(level, state);
  const lockedPieceIds = Object.keys(state.pieces)
    .map((pieceId) => state.pieces[pieceId])
    .filter((piece) => isPieceInCorrectSlot(piece) && !piece.locked)
    .map((piece) => piece.id);

  lockedPieceIds.forEach((pieceId) => {
    state.pieces[pieceId].locked = true;
  });

  recomputeGroups(level, state);
  return lockedPieceIds;
}

function getLockableCorrectPieceIds(state) {
  return Object.keys(state.pieces)
    .map((pieceId) => state.pieces[pieceId])
    .filter((piece) => isPieceInCorrectSlot(piece) && !piece.locked)
    .map((piece) => piece.id);
}

function autoPlaceOne(level, state) {
  recomputeGroups(level, state);
  const misplaced = Object.keys(state.pieces)
    .map((pieceId) => state.pieces[pieceId])
    .find((piece) => !isPieceInCorrectSlot(piece));

  if (!misplaced) {
    return 0;
  }

  const current = slotToRowCol(misplaced.currentSlot, level.cols);
  const target = slotToRowCol(misplaced.correctSlot, level.cols);
  const moved = moveGroup(level, state, misplaced.id, target.row - current.row, target.col - current.col);
  return moved ? misplaced.id : 0;
}

function resetBoard(level, state) {
  state.selectedPieceId = 0;
  state.moves = 0;
  state.hintsLeft = state.initialHints;
  state.revived = false;
  state.slots = [null];
  state.pieces = {};
  state.groups = {};

  state.initialSlots.forEach((pieceId, index) => {
    const currentSlot = index + 1;
    state.pieces[pieceId] = {
      id: pieceId,
      correctSlot: pieceId,
      currentSlot,
      locked: false,
      correct: false,
      groupId: ''
    };
    state.slots[currentSlot] = pieceId;
  });

  recomputeGroups(level, state);
}

function isComplete(state) {
  return Object.keys(state.pieces).every((pieceId) => isPieceInCorrectSlot(state.pieces[pieceId]));
}

function getBackgroundPosition(level, slot) {
  const coords = slotToRowCol(slot, level.cols);
  const x = level.cols === 1 ? 0 : (coords.col / (level.cols - 1)) * 100;
  const y = level.rows === 1 ? 0 : (coords.row / (level.rows - 1)) * 100;
  return {
    x: Number(x.toFixed(4)),
    y: Number(y.toFixed(4))
  };
}

function getPieceImageSrc(level) {
  if (level.sceneAssetPath) {
    return level.sceneAssetPath;
  }

  if (level.customMeta && level.customMeta.imagePath) {
    return level.customMeta.imagePath;
  }

  const rawStyle = String(level.sceneStyle || '');
  const match = rawStyle.match(/url\(["']?(.*?)["']?\)/i);
  return match ? match[1] : '';
}

function buildPieceStyle(level, piece) {
  const bgPos = getBackgroundPosition(level, piece.correctSlot);
  return [
    `background-image:${level.sceneStyle}`,
    `background-size:${level.cols * 100}% ${level.rows * 100}%`,
    `background-position:${bgPos.x}% ${bgPos.y}%`,
    'background-repeat:no-repeat'
  ].join(';');
}

function buildPieceImageStyle(level, piece) {
  const coords = slotToRowCol(piece.correctSlot, level.cols);
  return [
    `left:${coords.col * -100}%`,
    `top:${coords.row * -100}%`,
    `width:${level.cols * 100}%`,
    `height:${level.rows * 100}%`
  ].join(';');
}

function buildGroupOutline(piece, level, state) {
  const coords = slotToRowCol(piece.currentSlot, level.cols);
  const topPieceId = coords.row > 0 ? state.slots[piece.currentSlot - level.cols] : 0;
  const rightPieceId = coords.col < level.cols - 1 ? state.slots[piece.currentSlot + 1] : 0;
  const bottomPieceId =
    coords.row < level.rows - 1 ? state.slots[piece.currentSlot + level.cols] : 0;
  const leftPieceId = coords.col > 0 ? state.slots[piece.currentSlot - 1] : 0;

  const isSameGroup = (neighborPieceId) =>
    !!neighborPieceId &&
    !!state.pieces[neighborPieceId] &&
    state.pieces[neighborPieceId].groupId === piece.groupId;

  return {
    top: !isSameGroup(topPieceId),
    right: !isSameGroup(rightPieceId),
    bottom: !isSameGroup(bottomPieceId),
    left: !isSameGroup(leftPieceId)
  };
}

function buildRenderSlots(level, state) {
  const total = level.rows * level.cols;
  const pieceImageSrc = getPieceImageSrc(level);
  const slots = [];
  for (let slot = 1; slot <= total; slot += 1) {
    const pieceId = state.slots[slot];
    const piece = state.pieces[pieceId];
    const outline = buildGroupOutline(piece, level, state);
    slots.push({
      slotIndex: slot,
      pieceId,
      locked: piece.locked,
      correct: isPieceInCorrectSlot(piece),
      groupId: piece.groupId,
      outline,
      pieceStyle: buildPieceStyle(level, piece),
      pieceImageSrc,
      pieceImageStyle: buildPieceImageStyle(level, piece)
    });
  }
  return slots;
}

module.exports = {
  autoPlaceOne,
  buildRenderSlots,
  createInitialState,
  getGuideHint,
  getLockableCorrectPieceIds,
  isComplete,
  lockCorrectPieces,
  moveGroup,
  resetBoard,
  slotToRowCol
};
