function createSortSteps(startArr, sortType, order) {
  const work = [...startArr];
  const steps = [];
  const asc = order === 'asc';

  const headDoneCache = new Map();
  const tailDoneCache = new Map();

  let cmp = 0;
  let swp = 0;

  // 단계 저장
  const pushStep = (text, { now = [], move = [], done = [] } = {}) =>
    steps.push({ arr: [...work], now, move, done, text, cmp, swp });

  const compareStep = (text, option) => {
    cmp++;
    pushStep(text, option);
  };
  const moveStep = (text, option) => {
    swp++;
    pushStep(text, option);
  };

  const swapValues = (a, b) => ([work[a], work[b]] = [work[b], work[a]]);

  const shouldSwap = (a, b) => (asc ? a > b : a < b);
  const comesBefore = (a, b) => (asc ? a <= b : a >= b);

  const getHeadDone = (count) => {
    if (!headDoneCache.has(count)) {
      headDoneCache.set(
        count,
        Array.from({ length: count }, (_, i) => i),
      );
    }
    return headDoneCache.get(count);
  };
  const getTailDone = (count) => {
    if (!tailDoneCache.has(count)) {
      const start = Math.max(work.length - count, 0);
      tailDoneCache.set(
        count,
        Array.from({ length: count }, (_, i) => start + i),
      );
    }
    return tailDoneCache.get(count);
  };

  switch (sortType) {
    case 'bubble':
      createBubbleSteps();
      break;
    case 'selection':
      createSelectionSteps();
      break;
    case 'insertion':
      createInsertionSteps();
      break;
    case 'merge':
      splitMerge(0, work.length - 1);
      break;
    case 'quick':
      splitQuick(0, work.length - 1);
      break;
    case 'heap':
      createHeapSteps();
      break;
  }

  pushStep('정렬이 끝났습니다.', { done: work.map((_, i) => i) });

  return steps;

  function createBubbleSteps() {
    for (let end = work.length - 1; end > 0; end--) {
      const done = getTailDone(work.length - 1 - end);

      for (let i = 0; i < end; i++) {
        compareStep(`${i + 1}번째 값과 ${i + 2}번째 값을 비교합니다.`, { now: [i, i + 1], done });

        if (!shouldSwap(work[i], work[i + 1])) continue;

        swapValues(i, i + 1);
        moveStep('두 값의 위치를 바꿨습니다.', { move: [i, i + 1], done });
      }
    }
  }

  function createSelectionSteps() {
    for (let i = 0; i < work.length - 1; i++) {
      let pick = i;
      const done = getHeadDone(i);

      for (let j = i + 1; j < work.length; j++) {
        compareStep(`기준 값과 ${j + 1}번째 값을 비교합니다.`, { now: [pick, j], done });

        if (shouldSwap(work[pick], work[j])) pick = j;
      }
      if (pick === i) continue;

      swapValues(i, pick);
      moveStep('선택한 값을 앞쪽으로 옮겼습니다.', { move: [i, pick], done: getHeadDone(i + 1) });
    }
  }

  function createInsertionSteps() {
    for (let i = 1; i < work.length; i++) {
      let j = i;
      const done = getHeadDone(i);

      while (j > 0) {
        compareStep(`${j}번째 값과 ${j + 1}번째 값을 비교합니다.`, { now: [j - 1, j], done });

        if (!shouldSwap(work[j - 1], work[j])) break;

        swapValues(j - 1, j);
        moveStep('앞쪽의 알맞은 위치로 이동했습니다.', { move: [j - 1, j], done });

        j--;
      }
    }
  }

  function splitMerge(left, right) {
    if (left >= right) return;

    const mid = Math.floor((left + right) / 2);

    splitMerge(left, mid);
    splitMerge(mid + 1, right);
    mergeParts(left, mid, right);
  }

  function mergeParts(left, mid, right) {
    const leftArr = work.slice(left, mid + 1);
    const rightArr = work.slice(mid + 1, right + 1);

    let i = 0;
    let j = 0;
    let k = left;

    const putValue = (value, text) => {
      work[k] = value;
      moveStep(text, { move: [k] });
      k++;
    };

    while (i < leftArr.length && j < rightArr.length) {
      compareStep('왼쪽 묶음과 오른쪽 묶음의 값을 비교합니다.', { now: [left + i, mid + 1 + j] });

      if (comesBefore(leftArr[i], rightArr[j])) putValue(leftArr[i++], `${k + 1}번째 위치에 값을 넣었습니다.`);
      else putValue(rightArr[j++], `${k + 1}번째 위치에 값을 넣었습니다.`);
    }
    while (i < leftArr.length) putValue(leftArr[i++], `남은 왼쪽 값을 ${k + 1}번째 위치에 넣었습니다.`);
    while (j < rightArr.length) putValue(rightArr[j++], `남은 오른쪽 값을 ${k + 1}번째 위치에 넣었습니다.`);
  }

  function splitQuick(left, right) {
    if (left >= right) return;

    const pivotIndex = partitionByPivot(left, right);

    splitQuick(left, pivotIndex - 1);
    splitQuick(pivotIndex + 1, right);
  }

  function partitionByPivot(left, right) {
    const pivot = work[right];
    let store = left;

    pushStep(`${right + 1}번째 값을 기준 값으로 정합니다.`, { now: [right] });

    for (let i = left; i < right; i++) {
      compareStep(`${i + 1}번째 값과 기준 값을 비교합니다.`, { now: [i, right] });

      if (!comesBefore(work[i], pivot)) continue;
      if (i !== store) {
        swapValues(i, store);
        moveStep('기준 값보다 앞에 와야 하므로 위치를 바꿨습니다.', { move: [i, store] });
      }
      store++;
    }
    if (store !== right) {
      swapValues(store, right);
      moveStep('기준 값을 알맞은 위치로 옮겼습니다.', { move: [store, right] });
    }
    return store;
  }

  function createHeapSteps() {
    const shouldSwapParent = (parent, child) => (asc ? parent < child : parent > child);

    // 힙 조건 노드 정리
    const fixHeap = (size, root) => {
      let pick = root;
      const done = getTailDone(work.length - size);
      const checkChild = (child, label) => {
        if (child >= size) return;

        compareStep(`부모 노드와 ${label} 자식 노드를 비교합니다.`, { now: [pick, child], done });

        if (shouldSwapParent(work[pick], work[child])) pick = child;
      };

      checkChild(root * 2 + 1, '왼쪽');
      checkChild(root * 2 + 2, '오른쪽');

      if (pick === root) return;

      swapValues(root, pick);
      moveStep('힙 조건에 맞게 부모와 자식의 위치를 바꿨습니다.', { move: [root, pick], done });
      fixHeap(size, pick);
    };

    for (let i = Math.floor(work.length / 2) - 1; i >= 0; i--) fixHeap(work.length, i);
    for (let end = work.length - 1; end > 0; end--) {
      swapValues(0, end);
      moveStep('힙의 첫 값을 정렬 위치로 보냈습니다.', { move: [0, end], done: getTailDone(work.length - end) });
      fixHeap(end, 0);
    }
  }
}
