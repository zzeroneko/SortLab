const DEFAULT_VALUES = [5, 1, 4, 2, 8, 3, 7, 6];

let values = [...DEFAULT_VALUES];
let sortType = 'bubble';
let sortInfo = {};

let steps = [];
let stepIndex = -1;

let compareCount = 0;
let moveCount = 0;

let isSorting = false;
let isAutoRunning = false;
let autoTimer = null;

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', init);

// 초기 설정
async function init() {
  try {
    sortInfo = await loadSortInfo();
  } catch (error) {
    console.error(error);
    setMessage('정렬 정보 파일을 불러오지 못했습니다.');
  }

  bindSortMenu();
  bindEvents();

  $('nums').value = values.join(', ');

  renderSortInfo();
  updateInputLabels();
  resetStats();
  renderBars();
  updateButtons();
  updateProgress('대기 중');
}

// JSON 로드
async function loadSortInfo() {
  const response = await fetch('./data/sort-info.json');

  if (!response.ok) throw new Error('sort-info.json load failed');

  return response.json();
}

function bindSortMenu() {
  const navButtons = document.querySelectorAll('.nav-btn');

  navButtons.forEach((button) => {
    button.addEventListener('click', () => {
      if (isSorting) return;

      sortType = button.dataset.sort;

      navButtons.forEach((nav) => nav.classList.remove('on'));
      button.classList.add('on');

      resetReadyState();
      renderSortInfo();
      setMessage('정렬 방법을 변경했습니다.');
      setStepText('정렬을 시작하면 단계별 설명이 표시됩니다.');
    });
  });
}

function bindEvents() {
  $('makeBtn').addEventListener('click', createRandomArray);
  $('startBtn').addEventListener('click', startSorting);
  $('prevBtn').addEventListener('click', goPrevStep);
  $('stepBtn').addEventListener('click', goNextStep);
  $('autoBtn').addEventListener('click', runAutoStep);
  $('stopBtn').addEventListener('click', stopSorting);
  $('resetBtn').addEventListener('click', resetState);
  $('count').addEventListener('input', () => {
    updateInputLabels();
    syncMaxWithCount();
  });
  $('min').addEventListener('input', syncMaxWithCount);
  $('speed').addEventListener('input', updateInputLabels);
  $('nums').addEventListener('input', () => applyInputArray(false));
  $('order').addEventListener('change', () => {
    if (isSorting) return;

    clearSteps();
    resetStats();
    updateProgress('대기 중');
    setStepText('정렬 방향이 변경되었습니다. 정렬을 시작해 주세요.');
  });
}

function renderSortInfo() {
  const info = sortInfo[sortType];
  if (!info) return;

  $('sortName').textContent = info.name;
  $('sortDesc').textContent = info.summary;
  $('avgTime').textContent = info.average;
  $('worstTime').textContent = info.worst;
  $('spaceTime').textContent = info.space;

  const detailBox = $('sortDetail');
  const fragment = document.createDocumentFragment();

  detailBox.innerHTML = '';

  info.detail.forEach((text) => {
    const p = document.createElement('p');
    p.textContent = text;
    fragment.appendChild(p);
  });

  detailBox.appendChild(fragment);
}

function updateInputLabels() {
  const speed = Number($('speed').value);

  $('countText').textContent = `${$('count').value}개`;
  $('speedText').textContent = speed < 300 ? '빠름' : speed <= 500 ? '보통' : '느림';
}

// 입력 배열 변환
function parseInputArray() {
  return $('nums')
    .value.split(/[\s,]+/)
    .map(Number)
    .filter(Number.isFinite)
    .map(Math.round)
    .slice(0, 40);
}

function applyInputArray(showMessage = true) {
  if (isSorting) return false;

  const inputValues = parseInputArray();

  if (inputValues.length < 2) {
    if (showMessage) {
      values = [...DEFAULT_VALUES];
      $('nums').value = values.join(', ');

      setMessage('숫자를 2개 이상 입력해 주세요. 기본 배열을 사용했습니다.');
      renderBars();
      updateProgress('대기 중');
    }
    return false;
  }
  values = inputValues;
  resetReadyState();

  if (showMessage) {
    setMessage('입력한 배열을 적용했습니다.');
    setStepText('정렬을 시작하면 단계별 설명이 표시됩니다.');
  }
  return true;
}

function createRandomArray() {
  if (isSorting) return;

  const range = getArrayRange();

  $('count').value = range.count;
  $('min').value = range.min;
  $('max').value = range.max;

  values = getRandomArray(range.count, range.min, range.max);
  $('nums').value = values.join(', ');

  resetReadyState();
  updateInputLabels();
  setMessage('랜덤 배열을 생성했습니다.');
  setStepText('정렬을 시작하면 단계별 설명이 표시됩니다.');
}

function getArrayRange() {
  let count = clamp(Math.round(toNumber($('count').value, 8)), 2, 40);
  let min = Math.round(toNumber($('min').value, 1));
  let max = Math.round(toNumber($('max').value, 10));

  if (min > max) [min, max] = [max, min];

  return {
    count,
    min,
    max: Math.max(max, min + count - 1),
  };
}

function getRandomArray(count, min, max) {
  const result = [];
  const used = new Set();

  while (result.length < count) {
    const num = getRandomInt(min, max);

    if (used.has(num)) continue;

    used.add(num);
    result.push(num);
  }
  return result;
}

function startSorting() {
  if (isSorting) return;
  if (typeof createSortSteps !== 'function') {
    setMessage('sortLogic.js 파일을 먼저 연결해 주세요.');
    return;
  }
  if (!applyInputArray(false)) {
    values = [...DEFAULT_VALUES];
    $('nums').value = values.join(', ');
    setMessage('숫자를 2개 이상 입력해 주세요. 기본 배열로 정렬을 시작합니다.');
  }

  steps = createSortSteps([...values], sortType, $('order').value);
  stepIndex = -1;
  isSorting = true;
  isAutoRunning = false;

  resetStats();
  renderBars();
  updateButtons();
  updateProgress('정렬 시작');
  setMessage('정렬을 시작했습니다.');
  goNextStep();
}

function goNextStep() {
  if (!isSorting) return;
  if (stepIndex >= steps.length - 1) {
    finishSorting();
    return;
  }

  stepIndex++;
  renderStep();

  if (stepIndex >= steps.length - 1) finishSorting();
}

function goPrevStep() {
  if (!isSorting || isAutoRunning || stepIndex <= 0) return;

  stepIndex--;
  renderStep();
}

// 현재 단계 출력
function renderStep() {
  const currentStep = steps[stepIndex];

  if (!currentStep) return;

  values = [...currentStep.arr];
  compareCount = currentStep.cmp;
  moveCount = currentStep.swp;

  $('cmp').textContent = compareCount;
  $('swp').textContent = moveCount;

  setStepText(currentStep.text);
  renderBars(currentStep);
  updateProgress(isAutoRunning ? '자동 진행 중' : '정렬 중');
  updateButtons();
}

function runAutoStep() {
  if (!isSorting || isAutoRunning) return;

  isAutoRunning = true;

  updateButtons();
  updateProgress('자동 진행 중');
  runAutoTimer();
}

function runAutoTimer() {
  clearTimeout(autoTimer);

  autoTimer = setTimeout(
    () => {
      if (!isSorting || !isAutoRunning) return;

      goNextStep();

      if (isSorting && isAutoRunning) runAutoTimer();
    },
    Number($('speed').value),
  );
}

function stopSorting() {
  if (!isSorting) return;

  isSorting = false;
  isAutoRunning = false;

  clearTimeout(autoTimer);

  $('nums').value = values.join(', ');

  updateButtons();
  updateProgress('일시 정지');
  setMessage('정렬을 일시 정지했습니다.');
  setStepText('현재 배열 상태는 유지됩니다. 다시 시작하면 현재 배열 기준으로 정렬합니다.');
}

function finishSorting() {
  isSorting = false;
  isAutoRunning = false;

  clearTimeout(autoTimer);

  $('nums').value = values.join(', ');

  updateButtons();
  updateProgress('완료');
  setMessage('정렬이 완료되었습니다.');
  setStepText('모든 단계가 끝났습니다.');
  renderBars({ done: values.map((_, index) => index) });
}

function resetState() {
  values = [...DEFAULT_VALUES];
  isSorting = false;
  isAutoRunning = false;

  clearTimeout(autoTimer);
  clearSteps();

  $('nums').value = values.join(', ');
  $('count').value = 8;
  $('min').value = 1;
  $('max').value = 10;
  $('speed').value = 400;
  $('order').value = 'asc';

  resetStats();
  renderSortInfo();
  updateInputLabels();
  renderBars();
  updateButtons();
  updateProgress('대기 중');
  setMessage('초기 상태로 되돌렸습니다.');
  setStepText('정렬을 시작하면 단계별 설명이 표시됩니다.');
}

function resetReadyState() {
  clearSteps();
  resetStats();
  renderBars();
  updateProgress('대기 중');
}

function renderBars(option = {}) {
  const bars = $('bars');
  const fragment = document.createDocumentFragment();
  const maxValue = Math.max(...values.map((num) => Math.abs(num)), 1);

  bars.innerHTML = '';

  values.forEach((num, index) => {
    const bar = document.createElement('div');

    bar.className = 'bar';
    bar.style.height = `${Math.max(18, (Math.abs(num) / maxValue) * 280)}px`;
    bar.textContent = num;

    if (option.now?.includes(index)) bar.classList.add('now');
    if (option.move?.includes(index)) bar.classList.add('move');
    if (option.done?.includes(index)) bar.classList.add('done');

    fragment.appendChild(bar);
  });
  bars.appendChild(fragment);
}

function updateButtons() {
  const sortingInputs = [$('makeBtn'), $('count'), $('min'), $('max'), $('nums'), $('order')];

  $('startBtn').hidden = isSorting;
  $('prevBtn').hidden = !isSorting;
  $('stepBtn').hidden = !isSorting;
  $('autoBtn').hidden = !isSorting;
  $('stopBtn').hidden = !isSorting;

  sortingInputs.forEach((input) => {
    input.disabled = isSorting;
  });

  $('prevBtn').disabled = !isSorting || isAutoRunning || stepIndex <= 0;
  $('stepBtn').disabled = !isSorting || isAutoRunning;
  $('autoBtn').disabled = !isSorting || isAutoRunning;
  $('stopBtn').disabled = !isSorting;
}

function resetStats() {
  compareCount = 0;
  moveCount = 0;

  $('cmp').textContent = compareCount;
  $('swp').textContent = moveCount;
}

function updateProgress(state) {
  const total = steps.length;
  const now = Math.max(stepIndex + 1, 0);
  const percent = total ? Math.round((now / total) * 100) : 0;

  $('statusText').textContent = state;
  $('progressText').textContent = `${now} / ${total}`;
  $('progressBar').style.width = `${percent}%`;
}

function clearSteps() {
  steps = [];
  stepIndex = -1;
}

// 최대값 자동 조정
function syncMaxWithCount() {
  const count = Number($('count').value);
  const min = Number($('min').value);
  const max = Number($('max').value);

  if (![count, min, max].every(Number.isFinite)) return;

  $('max').value = Math.max(max, min + count - 1);
}

function setMessage(value) {
  $('msg').textContent = value;
}

function setStepText(value) {
  $('step').textContent = value;
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function toNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

// 범위 제한
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
