// Constants
const GAME_SETTINGS = {
    DEFAULT_TIME: 5,
    DEFAULT_TOPIC: 'global-celebrities',
    AUTO_NEXT_DELAY: 2000,
    TIMER_WARNING_THRESHOLD: 2,
    STACK_SIZE: 20  // 스택에 유지할 이미지 수
};

const TOPICS = {
    ANIMALS: 'animals',
    DOG_BREEDS: 'dog-breeds',
    GLOBAL_CELEBRITIES: 'global-celebrities',
    KPOP_STARS: 'kpop-stars',
    HISTORICAL_FIGURES: 'historical-figures',
    KOREAN_CELEBRITIES: 'korean-celebrities',
    FLAGS: 'flags',
    CAPITALS: 'capitals'
};

const TOPIC_LABELS = {
    [TOPICS.ANIMALS]: 'Animals',
    [TOPICS.DOG_BREEDS]: 'Dog Breeds',
    [TOPICS.GLOBAL_CELEBRITIES]: 'Global Stars',
    [TOPICS.KPOP_STARS]: 'K-pop Stars',
    [TOPICS.HISTORICAL_FIGURES]: 'Historical Figures',
    [TOPICS.KOREAN_CELEBRITIES]: 'Korean Celebrities',
    [TOPICS.FLAGS]: 'Flags',
    [TOPICS.CAPITALS]: 'Capitals'
};

// Game state
let gameState = {
    currentQuestion: 0,
    timeLeft: GAME_SETTINGS.DEFAULT_TIME,
    defaultTime: GAME_SETTINGS.DEFAULT_TIME,
    questionTimer: null,
    autoNextTimer: null,
    gameActive: false,
    waitingForClick: false,
    currentTopic: TOPICS.GLOBAL_CELEBRITIES,
    persons: [],
    imageStack: [],  // 이미지 스택
    usedQuestions: [],
    autoNextEnabled: true,
    currentBatchIndex: 0,  // 현재 배치 인덱스
    totalQuestions: 0,     // 전체 문제 수
    questionsAnswered: 0   // 답변한 문제 수 (중복 방지용)
};

// DOM elements
const elements = {
    startScreen: document.getElementById('start-screen'),
    gameArea: document.getElementById('game-area'),
    gameInfo: document.getElementById('game-info'),
    gameOver: document.getElementById('game-over'),
    resultContainer: document.getElementById('result-container'),
    personImage: document.getElementById('person-image'),
    timerElement: document.getElementById('timer'),
    correctAnswerElement: document.getElementById('correct-answer'),
    clickInstruction: document.querySelector('.click-instruction'),
    logoContainer: document.querySelector('.logo-container'),
    countryNameElement: document.getElementById('country-name')
};

// Utility functions
function isKoreanTopic(topic) {
    return topic === TOPICS.KOREAN_CELEBRITIES || topic === TOPICS.KPOP_STARS;
}

function isGeographyTopic(topic) {
    return topic === TOPICS.FLAGS || topic === TOPICS.CAPITALS;
}

function getRandomIndex(max) {
    return Math.floor(Math.random() * max);
}

function clearTimers() {
    if (gameState.questionTimer) {
        clearInterval(gameState.questionTimer);
        gameState.questionTimer = null;
    }
    if (gameState.autoNextTimer) {
        clearTimeout(gameState.autoNextTimer);
        gameState.autoNextTimer = null;
    }
}

function updateDisplay(element, show, displayType = 'block') {
    if (elements[element]) {
        elements[element].style.display = show ? displayType : 'none';
    }
}

// Game functions
async function startGame(topic = null) {
    if (topic) {
        gameState.currentTopic = topic;
    }
    
    showLoadingIndicator();
    
    try {
        await loadPersonsData(gameState.currentTopic);
        
        hideLoadingIndicator();
        
        updateDisplay('startScreen', false);
        updateDisplay('gameArea', true);
        updateDisplay('gameInfo', true, 'flex');
        updateDisplay('logoContainer', false);
        
        gameState.gameActive = true;
        gameState.currentQuestion = 0;
        gameState.waitingForClick = false;
        gameState.usedQuestions = [];
        
        loadQuestion();
    } catch (error) {
        hideLoadingIndicator();
        alert('An error occurred while loading game data.');
    }
}

// 이미지 스택 관련 함수들
async function preloadImageStack(persons) {
    const stackPromises = persons.map(person => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous'; // CORS 설정
            
            img.onload = () => {
                // 이미지를 캔버스로 변환한 후 blob URL 생성
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob((blob) => {
                    const blobUrl = URL.createObjectURL(blob);
                    gameState.imageStack.push({
                        blobUrl: blobUrl,
                        person: person,
                        originalUrl: person.image
                    });
                    resolve();
                });
            };
            
            img.onerror = () => {
                // 에러 시 기본 이미지를 blob URL로 변환
                const defaultImageData = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzUwIiBoZWlnaHQ9IjM1MCIgdmlld0JveD0iMCAwIDM1MCAzNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzNTAiIGhlaWdodD0iMzUwIiBmaWxsPSIjRjdGQUZDIi8+CjxjaXJjbGUgY3g9IjE3NSIgY3k9IjE0MCIgcj0iNDAiIGZpbGw9IiNFMkU4RjAiLz4KPHBhdGggZD0iTTEwMCAyODBDNTAgMjIwIDEyMCAyMDAgMjMwIDIyMEM1MCAyMzAgMzAwIDI0MCAyNTAgMjgwSDEwMFoiIGZpbGw9IiNFMkU4RjAiLz4KPHN2Zz4=';
                
                fetch(defaultImageData)
                    .then(res => res.blob())
                    .then(blob => {
                        const blobUrl = URL.createObjectURL(blob);
                        gameState.imageStack.push({
                            blobUrl: blobUrl,
                            person: person,
                            originalUrl: person.image
                        });
                        resolve();
                    })
                    .catch(() => {
                        // fetch도 실패하면 원본 URL로 대체
                        gameState.imageStack.push({
                            blobUrl: person.image,
                            person: person,
                            originalUrl: person.image
                        });
                        resolve();
                    });
            };
            
            img.src = person.image;
        });
    });

    const updateInterval = setInterval(() => {
        const progress = Math.round((gameState.imageStack.length / persons.length) * 100);
        updateLoadingProgress(progress);
    }, 100);

    await Promise.all(stackPromises);
    clearInterval(updateInterval);
    updateLoadingProgress(100);
    
    console.log('Preloaded batch:', persons.length, 'Total in stack:', gameState.imageStack.length);
}

async function loadNextBatch() {
    const startIndex = gameState.currentBatchIndex * GAME_SETTINGS.STACK_SIZE;
    const endIndex = Math.min(startIndex + GAME_SETTINGS.STACK_SIZE, gameState.totalQuestions);
    
    if (startIndex >= gameState.totalQuestions) {
        console.log('All questions exhausted');
        return false; // 더 이상 로드할 데이터 없음
    }
    
    // 순차적으로 데이터 가져오기 (중복 방지)
    const batchData = gameState.persons.slice(startIndex, endIndex);
    console.log(`Loading batch ${gameState.currentBatchIndex + 1}: ${startIndex}-${endIndex-1} (${batchData.length} items)`);
    
    // 스택을 완전히 비우고 새 배치로 교체
    await clearCurrentStack();
    
    showLoadingIndicator();
    await preloadImageStack(batchData);
    hideLoadingIndicator();
    
    gameState.currentBatchIndex++;
    return true;
}

async function clearCurrentStack() {
    // 현재 스택의 모든 blob URL 정리
    gameState.imageStack.forEach(item => {
        if (item.blobUrl && item.blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(item.blobUrl);
        }
    });
    gameState.imageStack = [];
}

async function loadPersonsData(topic) {
    try {
        const response = await fetch(`/api/persons/${topic}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const allPersons = await response.json();
        
        if (allPersons.length === 0) {
            throw new Error('No data available.');
        }

        // 데이터를 섞고 전체 저장 (한 번만 섞어서 순서 고정)
        gameState.persons = shuffleArray(allPersons);
        gameState.totalQuestions = gameState.persons.length;
        gameState.currentBatchIndex = 0;
        gameState.questionsAnswered = 0;
        gameState.usedQuestions = []; // 사용된 문제 추적 초기화
        
        console.log(`Total questions: ${gameState.totalQuestions}`);
        console.log('Questions order shuffled and fixed');
        
        // 첫 번째 배치 로드
        await loadNextBatch();

    } catch (error) {
        throw error;
    }
}

// Fisher-Yates 셔플
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function loadQuestion() {
    // 스택이 비어있고 더 로드할 데이터가 있으면 다음 배치 로드
    if (gameState.imageStack.length === 0) {
        if (gameState.questionsAnswered < gameState.totalQuestions) {
            console.log('Stack empty, loading next batch...');
            loadNextBatch().then(success => {
                if (success && gameState.imageStack.length > 0) {
                    loadQuestion(); // 재귀적으로 다시 시도
                } else {
                    console.log('All questions completed!');
                    endGame(); // 더 이상 로드할 데이터 없음
                }
            });
            return;
        } else {
            console.log('All questions completed!');
            endGame(); // 모든 데이터 소진
            return;
        }
    }

    // 스택의 마지막 항목(LIFO)을 사용
    const currentItem = gameState.imageStack[gameState.imageStack.length - 1];
    
    // 중복 체크 (혹시 모를 상황 대비)
    const questionId = currentItem.person.name + '_' + currentItem.originalUrl;
    if (gameState.usedQuestions.includes(questionId)) {
        console.warn('Duplicate question detected, skipping:', questionId);
        gameState.imageStack.pop();
        if (currentItem.blobUrl && currentItem.blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(currentItem.blobUrl);
        }
        loadQuestion(); // 다음 문제로
        return;
    }
    
    gameState.usedQuestions.push(questionId);
    updateQuestionDisplay(currentItem);
    startTimer();
}

function updateQuestionDisplay(stackItem) {
    // blob URL을 직접 사용
    elements.personImage.src = stackItem.blobUrl;
    elements.personImage.alt = `${stackItem.person.name} image`;
    elements.personImage.loading = 'eager';
    
    updateImageClasses();
    updateCountryNameDisplay(stackItem.person);
    
    updateDisplay('resultContainer', false);
    updateDisplay('clickInstruction', true);
    gameState.waitingForClick = false;
}

function updateImageClasses() {
    elements.personImage.classList.remove('flag-image', 'korean-celebrity-image');
    if (isGeographyTopic(gameState.currentTopic)) {
        elements.personImage.classList.add('flag-image');
    } else if (isKoreanTopic(gameState.currentTopic)) {
        elements.personImage.classList.add('korean-celebrity-image');
    }
}

function updateCountryNameDisplay(person) {
    if (gameState.currentTopic === TOPICS.CAPITALS && person.countryName) {
        elements.countryNameElement.textContent = person.countryName;
        updateDisplay('countryNameElement', true);
    } else {
        updateDisplay('countryNameElement', false);
    }
}

function startTimer() {
    gameState.timeLeft = gameState.defaultTime;
    updateTimerDisplay();
    
    gameState.questionTimer = setInterval(() => {
        gameState.timeLeft--;
        updateTimerDisplay();
        
        if (gameState.timeLeft <= GAME_SETTINGS.TIMER_WARNING_THRESHOLD) {
            elements.timerElement.classList.add('time-warning');
        }
        
        if (gameState.timeLeft <= 0) {
            handleTimerExpired();
        }
    }, 1000);
}

function handleTimerExpired() {
    clearInterval(gameState.questionTimer);
    elements.timerElement.textContent = "0";
    elements.timerElement.classList.add('time-expired');
    
    if (gameState.autoNextEnabled && !gameState.waitingForClick) {
        showAnswer();
        gameState.autoNextTimer = setTimeout(() => {
            if (gameState.waitingForClick) {
                nextQuestion();
            }
        }, GAME_SETTINGS.AUTO_NEXT_DELAY);
    }
}

function showAnswer() {
    clearTimers();
    
    elements.timerElement.classList.remove('time-warning', 'time-expired');
    const currentItem = gameState.imageStack[gameState.imageStack.length - 1];
    
    elements.correctAnswerElement.textContent = currentItem.person.name;
    
    updateDisplay('resultContainer', true);
    updateDisplay('clickInstruction', false);
    
    gameState.waitingForClick = true;
    elements.gameArea.classList.add('clickable');
}

function nextQuestion() {
    if (!gameState.waitingForClick) return;
    
    // 현재 문제를 스택에서 제거하고 blob URL 정리
    const removedItem = gameState.imageStack.pop();
    if (removedItem && removedItem.blobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(removedItem.blobUrl);
    }
    
    // 답변한 문제 수 증가
    gameState.questionsAnswered++;
    
    clearTimers();
    updateDisplay('resultContainer', false);
    elements.gameArea.classList.remove('clickable');
    
    // 진행 상황 로그
    console.log(`Progress: ${gameState.questionsAnswered}/${gameState.totalQuestions} questions answered`);
    console.log(`Stack remaining: ${gameState.imageStack.length}`);
    console.log(`Used questions: ${gameState.usedQuestions.length}`);
    
    loadQuestion();
}

function endGame() {
    gameState.gameActive = false;
    updateDisplay('gameArea', false);
    updateDisplay('gameInfo', false);
    updateDisplay('gameOver', true);
}

function resetGame() {
    updateDisplay('gameOver', false);
    updateDisplay('resultContainer', false);
    updateDisplay('startScreen', true);
    updateDisplay('logoContainer', true);
    
    resetGameState();
    clearTimers();
    resetUI();
}

function resetGameState() {
    // 남은 blob URL들 정리
    gameState.imageStack.forEach(item => {
        if (item.blobUrl && item.blobUrl.startsWith('blob:')) {
            URL.revokeObjectURL(item.blobUrl);
        }
    });
    
    gameState = {
        ...gameState,
        currentQuestion: 0,
        timeLeft: gameState.defaultTime,
        gameActive: false,
        waitingForClick: false,
        imageStack: [],
        usedQuestions: [],
        currentBatchIndex: 0,
        totalQuestions: 0,
        questionsAnswered: 0
    };
}

function resetUI() {
    elements.timerElement.classList.remove('time-warning', 'time-expired');
    updateTimerDisplay();
    elements.gameArea.classList.remove('clickable');
}

function exitGame() {
    clearTimers();
    resetGameState();
    
    updateDisplay('gameArea', false);
    updateDisplay('gameInfo', false);
    updateDisplay('resultContainer', false);
    updateDisplay('gameOver', false);
    updateDisplay('startScreen', true);
    updateDisplay('logoContainer', true);
    
    elements.timerElement.classList.remove('time-warning', 'time-expired');
    elements.gameArea.classList.remove('clickable');
    updateTimerDisplay();
}

function updateTimer(value) {
    gameState.defaultTime = parseInt(value);
    gameState.timeLeft = gameState.defaultTime;
    
    document.getElementById('timer-value').textContent = gameState.defaultTime;
    elements.timerElement.textContent = gameState.defaultTime;
}

function updateTimerDisplay() {
    elements.timerElement.textContent = gameState.timeLeft;
}

function setTimerValue(seconds) {
    document.getElementById('timer-slider').value = seconds;
    updateTimer(seconds);
}

function showLoadingIndicator() {
    let loadingOverlay = document.getElementById('loading-overlay');
    if (!loadingOverlay) {
        loadingOverlay = document.createElement('div');
        loadingOverlay.id = 'loading-overlay';
        loadingOverlay.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <div class="loading-text">Loading images...</div>
                <div class="loading-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" id="loading-progress"></div>
                    </div>
                    <span class="progress-text" id="progress-text">0%</span>
                </div>
            </div>
        `;
        document.body.appendChild(loadingOverlay);
    }
    loadingOverlay.style.display = 'flex';
}

function updateLoadingProgress(progress) {
    const progressFill = document.getElementById('loading-progress');
    const progressText = document.getElementById('progress-text');
    
    if (progressFill && progressText) {
        progressFill.style.width = `${progress}%`;
        progressText.textContent = `${progress}%`;
    }
}

function hideLoadingIndicator() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

function toggleAutoNext() {
    const toggle = document.getElementById('auto-next-toggle');
    gameState.autoNextEnabled = toggle.checked;
}

// Event Listeners
elements.personImage.addEventListener('error', function() {
    this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzUwIiBoZWlnaHQ9IjM1MCIgdmlld0JveD0iMCAwIDM1MCAzNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzNTAiIGhlaWdodD0iMzUwIiBmaWxsPSIjRjdGQUZDIi8+CjxjaXJjbGUgY3g9IjE3NSIgY3k9IjE0MCIgcj0iNDAiIGZpbGw9IiNFMkU4RjAiLz4KPHBhdGggZD0iTTEwMCAyODBDNTAgMjIwIDEyMCAyMDAgMjMwIDIyMEM1MCAyMzAgMzAwIDI0MCAyNTAgMjgwSDEwMFoiIGZpbGw9IiNFMkU4RjAiLz4KPHN2Zz4=';
    this.alt = 'Image could not be loaded.';
});

document.addEventListener('click', function(event) {
    if (shouldIgnoreClick(event.target)) return;
    
    if (gameState.gameActive) {
        handleGameClick();
    }
});

function shouldIgnoreClick(target) {
    return target.classList.contains('topic-btn') || 
           target.classList.contains('preset-btn') ||
           target.classList.contains('time-btn') ||
           target.id === 'timer-slider' ||
           target.id === 'auto-next-toggle' ||
           target.classList.contains('toggle-slider') ||
           target.classList.contains('compact-label') ||
           target.closest('.toggle-switch') ||
           target.textContent === 'Play Again' ||
           target.id === 'start-btn' ||
           target.id === 'exit-btn';
}

function handleGameClick() {
    if (gameState.waitingForClick) {
        nextQuestion();
    } else {
        clearInterval(gameState.questionTimer);
        showAnswer();
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateDisplay('gameArea', false);
    updateDisplay('gameInfo', false);
    updateDisplay('gameOver', false);
    updateDisplay('resultContainer', false);
    
    const autoNextToggle = document.getElementById('auto-next-toggle');
    if (autoNextToggle) {
        autoNextToggle.addEventListener('change', toggleAutoNext);
        gameState.autoNextEnabled = autoNextToggle.checked;
    }
}); 