// Game state variables
let currentQuestion = 0;
let timeLeft = 5;
let defaultTime = 5; // Default timer setting
let questionTimer;
let gameActive = false;
let waitingForClick = false;
let currentTopic = 'global-celebrities';
let persons = [];

// Available topics (only those with prepared images)
const availableTopics = {
    'animals': 'Animals',
    'global-celebrities': 'Global Stars',
    'history': 'Historical Figures',
    'korean-celebrities': 'Korean Celebrities',
    'flags': 'Flags'
};

// DOM elements
const startScreen = document.getElementById('start-screen');
const gameArea = document.getElementById('game-area');
const gameInfo = document.getElementById('game-info');
const gameOver = document.getElementById('game-over');
const resultContainer = document.getElementById('result-container');
const personImage = document.getElementById('person-image');
const timerElement = document.getElementById('timer');
const correctAnswerElement = document.getElementById('correct-answer');
const clickInstruction = document.querySelector('.click-instruction');
const logoContainer = document.querySelector('.logo-container');

// Game start function
async function startGame(topic = null) {
    if (topic) {
        currentTopic = topic;
    }
    
    // Load data
    try {
        await loadPersonsData(currentTopic);
        
        startScreen.style.display = 'none';
        gameArea.style.display = 'block';
        gameInfo.style.display = 'flex';
        logoContainer.style.display = 'none'; // 게임 중에는 로고 숨기기
        gameActive = true;
        currentQuestion = 0;
        waitingForClick = false;
        
        // Shuffle array for random order
        shuffleArray(persons);
        
        loadQuestion();
    } catch (error) {
        console.error('Error starting game:', error);
        alert('An error occurred while loading game data.');
    }
}

// Load data from server
async function loadPersonsData(topic) {
    try {
        const response = await fetch(`/api/persons/${topic}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        persons = await response.json();
        
        if (persons.length === 0) {
            throw new Error('No data available.');
        }
        
        console.log(`✅ ${availableTopics[topic]} data loaded successfully:`, persons.length, 'items');
    } catch (error) {
        console.error('Data loading failed:', error);
        throw error;
    }
}

// 배열 섞기 함수
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 문제 로드 함수
function loadQuestion() {
    if (currentQuestion >= persons.length) {
        endGame();
        return;
    }

    const person = persons[currentQuestion];
    
    // Set image
    personImage.src = person.image;
    personImage.alt = `${person.name} image`;
    
    // 국기 토픽인 경우 flag-image 클래스 추가
    personImage.classList.remove('flag-image', 'korean-celebrity-image');
    if (currentTopic === 'flags') {
        personImage.classList.add('flag-image');
    } else if (currentTopic === 'korean-celebrities') {
        personImage.classList.add('korean-celebrity-image');
    }
    
    // Hide result container and show click instruction
    resultContainer.style.display = 'none';
    clickInstruction.style.display = 'block';
    waitingForClick = false;
    
    // Start timer
    startTimer();
}

// 타이머 시작 함수 (장식용)
function startTimer() {
    timeLeft = defaultTime;
    updateTimerDisplay();
    
    questionTimer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 2) {
            timerElement.classList.add('time-warning');
        }
        
        if (timeLeft <= 0) {
            clearInterval(questionTimer);
            // 타이머가 끝나도 정답을 자동으로 보여주지 않음
            timerElement.textContent = "0";
            timerElement.classList.add('time-expired');
        }
    }, 1000);
}

// 타이머 업데이트 함수
function updateTimerDisplay() {
    timerElement.textContent = timeLeft;
}

// 정답 표시 함수
function showAnswer() {
    timerElement.classList.remove('time-warning', 'time-expired');
    const person = persons[currentQuestion];
    
    correctAnswerElement.textContent = person.name;
    resultContainer.style.display = 'block';
    clickInstruction.style.display = 'none';
    
    waitingForClick = true;
    gameArea.classList.add('clickable');
}

// 다음 문제 함수
function nextQuestion() {
    if (!waitingForClick) return;
    
    resultContainer.style.display = 'none';
    gameArea.classList.remove('clickable');
    currentQuestion++;
    loadQuestion();
}

// 게임 종료 함수
function endGame() {
    gameActive = false;
    gameArea.style.display = 'none';
    gameInfo.style.display = 'none';
    gameOver.style.display = 'block';
}

// 게임 리셋 함수
function resetGame() {
    gameOver.style.display = 'none';
    resultContainer.style.display = 'none';
    startScreen.style.display = 'block';
    logoContainer.style.display = 'block'; // 메인화면에서는 로고 보이기
    
    // 게임 상태 초기화
    currentQuestion = 0;
    timeLeft = defaultTime;
    gameActive = false;
    waitingForClick = false;
    
    // 타이머 정리
    if (questionTimer) {
        clearInterval(questionTimer);
    }
    
    // UI 초기화
    timerElement.classList.remove('time-warning', 'time-expired');
    updateTimerDisplay();
    gameArea.classList.remove('clickable');
}

// Image load error handling
personImage.addEventListener('error', function() {
    this.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzUwIiBoZWlnaHQ9IjM1MCIgdmlld0JveD0iMCAwIDM1MCAzNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzNTAiIGhlaWdodD0iMzUwIiBmaWxsPSIjRjdGQUZDIi8+CjxjaXJjbGUgY3g9IjE3NSIgY3k9IjE0MCIgcj0iNDAiIGZpbGw9IiNFMkU4RjAiLz4KPHBhdGggZD0iTTEwMCAyODBDNTAgMjIwIDEyMCAyMDAgMjMwIDIyMEM1MCAyMzAgMzAwIDI0MCAyNTAgMjgwSDEwMFoiIGZpbGw9IiNFMkU4RjAiLz4KPHN2Zz4=';
    this.alt = 'Image could not be loaded.';
});

// Click event handling
document.addEventListener('click', function(event) {
    // Exclude topic buttons, preset buttons, slider, exit button and reset buttons
    if (event.target.classList.contains('topic-btn') || 
        event.target.classList.contains('preset-btn') ||
        event.target.classList.contains('time-btn') ||
        event.target.id === 'timer-slider' ||
        event.target.textContent === 'Play Again' ||
        event.target.id === 'start-btn' ||
        event.target.id === 'exit-btn') {
        return;
    }
    
    if (gameActive) {
        if (waitingForClick) {
            // Continue to next question
            nextQuestion();
        } else {
            // Show answer immediately
            clearInterval(questionTimer);
            showAnswer();
        }
    }
});

// Exit game function
function exitGame() {
    // Clear any running timer
    if (questionTimer) {
        clearInterval(questionTimer);
    }
    
    // Reset game state
    gameActive = false;
    waitingForClick = false;
    currentQuestion = 0;
    
    // Hide game screens and show start screen
    gameArea.style.display = 'none';
    gameInfo.style.display = 'none';
    resultContainer.style.display = 'none';
    gameOver.style.display = 'none';
    startScreen.style.display = 'block';
    logoContainer.style.display = 'block'; // 메인화면에서는 로고 보이기
    
    // Reset UI elements
    timerElement.classList.remove('time-warning', 'time-expired');
    gameArea.classList.remove('clickable');
    timeLeft = defaultTime;
    updateTimerDisplay();
}

// Update timer from slider
function updateTimer(value) {
    defaultTime = parseInt(value);
    timeLeft = defaultTime;
    
    // Update display value
    document.getElementById('timer-value').textContent = defaultTime;
    document.getElementById('timer').textContent = defaultTime;
}

// Set timer value from preset buttons
function setTimerValue(seconds) {
    document.getElementById('timer-slider').value = seconds;
    updateTimer(seconds);
}

// Legacy function for compatibility (deprecated)
function setTime(seconds) {
    setTimerValue(seconds);
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
    // 초기 상태 설정
    gameArea.style.display = 'none';
    gameInfo.style.display = 'none';
    gameOver.style.display = 'none';
    resultContainer.style.display = 'none';
}); 