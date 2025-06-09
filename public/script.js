// Constants
const GAME_SETTINGS = {
    DEFAULT_TIME: 5,
    DEFAULT_TOPIC: 'global-celebrities',
    AUTO_NEXT_DELAY: 2000,
    TIMER_WARNING_THRESHOLD: 2
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
    usedQuestions: [],
    autoNextEnabled: true
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

async function loadPersonsData(topic) {
    try {
        const response = await fetch(`/api/persons/${topic}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        gameState.persons = await response.json();
        
        if (gameState.persons.length === 0) {
            throw new Error('No data available.');
        }
    } catch (error) {
        throw error;
    }
}

function loadQuestion() {
    if (gameState.usedQuestions.length >= gameState.persons.length) {
        endGame();
        return;
    }

    const randomIndex = selectRandomUnusedQuestion();
    gameState.usedQuestions.push(randomIndex);
    gameState.currentQuestion = randomIndex;
    
    const person = gameState.persons[gameState.currentQuestion];
    updateQuestionDisplay(person);
    startTimer();
}

function selectRandomUnusedQuestion() {
    let attempts = 0;
    const maxAttempts = gameState.persons.length * 2;
    let randomIndex;
    
    do {
        randomIndex = getRandomIndex(gameState.persons.length);
        attempts++;
    } while (gameState.usedQuestions.includes(randomIndex) && attempts < maxAttempts);
    
    if (gameState.usedQuestions.includes(randomIndex)) {
        for (let i = 0; i < gameState.persons.length; i++) {
            if (!gameState.usedQuestions.includes(i)) {
                return i;
            }
        }
    }
    
    return randomIndex;
}

function updateQuestionDisplay(person) {
    elements.personImage.src = person.image;
    elements.personImage.alt = `${person.name} image`;
    elements.personImage.loading = 'eager';
    
    updateImageClasses();
    updateCountryNameDisplay(person);
    
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
    const person = gameState.persons[gameState.currentQuestion];
    
    elements.correctAnswerElement.textContent = person.name;
    
    updateDisplay('resultContainer', true);
    updateDisplay('clickInstruction', false);
    
    gameState.waitingForClick = true;
    elements.gameArea.classList.add('clickable');
}

function nextQuestion() {
    if (!gameState.waitingForClick) return;
    
    clearTimers();
    updateDisplay('resultContainer', false);
    elements.gameArea.classList.remove('clickable');
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
    gameState = {
        ...gameState,
        currentQuestion: 0,
        timeLeft: gameState.defaultTime,
        gameActive: false,
        waitingForClick: false,
        usedQuestions: []
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