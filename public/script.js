// Game state variables
let currentQuestion = 0;
let timeLeft = 5;
let defaultTime = 5; // Default timer setting
let questionTimer;
let gameActive = false;
let waitingForClick = false;
let currentTopic = 'global-celebrities';
let persons = [];
let usedQuestions = []; // Track used questions

// Available topics (only those with prepared images)
const availableTopics = {
    'animals': 'Animals',
    'dog-breeds': 'Dog Breeds',
    'global-celebrities': 'Global Stars',
    'kpop-stars': 'K-pop Stars',
    'historical-figures': 'Historical Figures',
    'korean-celebrities': 'Korean Celebrities',
    'flags': 'Flags',
    'capitals': 'Capitals'
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
const countryNameElement = document.getElementById('country-name');

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
        logoContainer.style.display = 'none'; // Hide logo during game
        gameActive = true;
        currentQuestion = 0;
        waitingForClick = false;
        usedQuestions = []; // Reset used questions list
        
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

// Array shuffle function removed - now using random selection

// Load question function (prevent duplicates)
function loadQuestion() {
    // End game if all questions have been used
    if (usedQuestions.length >= persons.length) {
        endGame();
        return;
    }

    let randomIndex;
    let attempts = 0;
    const maxAttempts = persons.length * 2; // Prevent infinite loop
    
    // Select random unused question
    do {
        randomIndex = Math.floor(Math.random() * persons.length);
        attempts++;
    } while (usedQuestions.includes(randomIndex) && attempts < maxAttempts);
    
    // If no unused question found, select first available unused one
    if (usedQuestions.includes(randomIndex)) {
        for (let i = 0; i < persons.length; i++) {
            if (!usedQuestions.includes(i)) {
                randomIndex = i;
                break;
            }
        }
    }
    
    // Add to used questions list
    usedQuestions.push(randomIndex);
    currentQuestion = randomIndex;
    
    const person = persons[currentQuestion];
    
    // Set image
    personImage.src = person.image;
    personImage.alt = `${person.name} image`;
    
    // Add flag-image class for flags and capitals topics, korean-celebrity-image for korean celebrities and kpop stars
    personImage.classList.remove('flag-image', 'korean-celebrity-image');
    if (currentTopic === 'flags' || currentTopic === 'capitals') {
        personImage.classList.add('flag-image');
    } else if (currentTopic === 'korean-celebrities' || currentTopic === 'kpop-stars') {
        personImage.classList.add('korean-celebrity-image');
    }
    
    // Show country name for capitals topic
    if (currentTopic === 'capitals' && person.countryName) {
        countryNameElement.textContent = person.countryName;
        countryNameElement.style.display = 'block';
    } else {
        countryNameElement.style.display = 'none';
    }
    
    // Hide result container and show click instruction
    resultContainer.style.display = 'none';
    clickInstruction.style.display = 'block';
    waitingForClick = false;
    
    // Start timer
    startTimer();
}

// Start timer function (decorative)
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
            // Don't auto-show answer when timer expires
            timerElement.textContent = "0";
            timerElement.classList.add('time-expired');
        }
    }, 1000);
}

// Update timer display function
function updateTimerDisplay() {
    timerElement.textContent = timeLeft;
}

// Show answer function
function showAnswer() {
    timerElement.classList.remove('time-warning', 'time-expired');
    const person = persons[currentQuestion];
    
    // Show Korean name for Korean celebrities and K-pop stars
    if ((currentTopic === 'korean-celebrities' || currentTopic === 'kpop-stars') && person.koreanName) {
        correctAnswerElement.textContent = `${person.name}`;
    } else {
        correctAnswerElement.textContent = person.name;
    }
    
    resultContainer.style.display = 'block';
    clickInstruction.style.display = 'none';
    
    waitingForClick = true;
    gameArea.classList.add('clickable');
}

// Next question function
function nextQuestion() {
    if (!waitingForClick) return;
    
    resultContainer.style.display = 'none';
    gameArea.classList.remove('clickable');
    loadQuestion(); // Load new random question
}

// End game function
function endGame() {
    gameActive = false;
    gameArea.style.display = 'none';
    gameInfo.style.display = 'none';
    gameOver.style.display = 'block';
}

// Reset game function
function resetGame() {
    gameOver.style.display = 'none';
    resultContainer.style.display = 'none';
    startScreen.style.display = 'block';
    logoContainer.style.display = 'block'; // Show logo on main screen
    
    // Reset game state
    currentQuestion = 0;
    timeLeft = defaultTime;
    gameActive = false;
    waitingForClick = false;
    usedQuestions = []; // Reset used questions list
    
    // Clear timer
    if (questionTimer) {
        clearInterval(questionTimer);
    }
    
    // Reset UI
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
    usedQuestions = []; // Reset used questions list
    
    // Hide game screens and show start screen
    gameArea.style.display = 'none';
    gameInfo.style.display = 'none';
    resultContainer.style.display = 'none';
    gameOver.style.display = 'none';
    startScreen.style.display = 'block';
    logoContainer.style.display = 'block'; // Show logo on main screen
    
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

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set initial state
    gameArea.style.display = 'none';
    gameInfo.style.display = 'none';
    gameOver.style.display = 'none';
    resultContainer.style.display = 'none';
}); 