// Game state variables
let currentQuestion = 0;
let timeLeft = 5;
let defaultTime = 5; // Default timer setting
let questionTimer;
let autoNextTimer;
let gameActive = false;
let waitingForClick = false;
let currentTopic = 'global-celebrities';
let persons = [];
let usedQuestions = []; // Track used questions
let autoNextEnabled = true; // Auto-advance on timer expiry

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

// Image preloading variables
let preloadedImages = new Map();
let isPreloading = false;

// WebP 지원 확인
function supportsWebP() {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

const isWebPSupported = supportsWebP();

// 이미지 URL을 최적화된 형식으로 변환
function getOptimizedImageUrl(originalUrl) {
    if (isWebPSupported) {
        return originalUrl.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    }
    return originalUrl;
}

// Progressive image loading with WebP support
function loadImageWithFallback(src, fallbackSrc = null) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        
        // WebP 지원 시 WebP 이미지 먼저 시도
        const webpSrc = getOptimizedImageUrl(src);
        
        img.onload = () => resolve(img);
        img.onerror = () => {
            // WebP 실패 시 원본 이미지로 fallback
            if (webpSrc !== src) {
                const fallbackImg = new Image();
                fallbackImg.onload = () => resolve(fallbackImg);
                fallbackImg.onerror = () => reject(new Error('Image loading failed'));
                fallbackImg.src = fallbackSrc || src;
            } else {
                reject(new Error('Image loading failed'));
            }
        };
        
        img.src = webpSrc;
    });
}

// Preload all images for a topic with batching
function preloadImages(topic, persons) {
    return new Promise((resolve) => {
        if (preloadedImages.has(topic)) {
            resolve();
            return;
        }
        
        isPreloading = true;
        
        // 배치 처리로 동시 로딩 제한 (네트워크 과부하 방지)
        const BATCH_SIZE = 5;
        let loadedCount = 0;
        
        const loadBatch = (startIndex) => {
            const batch = persons.slice(startIndex, startIndex + BATCH_SIZE);
            const batchPromises = batch.map((person) => {
                return loadImageWithFallback(person.image)
                    .then(() => {
                        loadedCount++;
                        // 진행률 표시
                        const progress = Math.round((loadedCount / persons.length) * 100);
                        updateLoadingProgress(progress);
                    })
                    .catch(() => {
                        loadedCount++;
                        console.warn(`Failed to load image: ${person.image}`);
                    });
            });
            
            return Promise.all(batchPromises).then(() => {
                if (startIndex + BATCH_SIZE < persons.length) {
                    return loadBatch(startIndex + BATCH_SIZE);
                }
            });
        };
        
        loadBatch(0).then(() => {
            preloadedImages.set(topic, true);
            isPreloading = false;
            resolve();
        });
    });
}

// Game start function
async function startGame(topic = null) {
    if (topic) {
        currentTopic = topic;
    }
    
    // Show loading indicator
    showLoadingIndicator();
    
    // Load data
    try {
        await loadPersonsData(currentTopic);
        
        // Preload all images for better performance
        await preloadImages(currentTopic, persons);
        
        hideLoadingIndicator();
        
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
        hideLoadingIndicator();
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
    } catch (error) {
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
    
    // Set image with optimized loading
    const optimizedImageUrl = getOptimizedImageUrl(person.image);
    personImage.src = optimizedImageUrl;
    personImage.alt = `${person.name} image`;
    
    // Add loading attribute for better performance
    personImage.loading = 'eager';
    
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
            timerElement.textContent = "0";
            timerElement.classList.add('time-expired');
            
            // Auto-advance if enabled
            if (autoNextEnabled && !waitingForClick) {
                showAnswer();
                // Auto-proceed to next question after 2 seconds
                autoNextTimer = setTimeout(() => {
                    if (waitingForClick) {
                        nextQuestion();
                    }
                }, 2000);
            }
        }
    }, 1000);
}

// Update timer display function
function updateTimerDisplay() {
    timerElement.textContent = timeLeft;
}

// Show answer function
function showAnswer() {
    // Clear any existing question timer
    if (questionTimer) {
        clearInterval(questionTimer);
    }
    
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
    
    // Clear auto-next timer if it exists
    if (autoNextTimer) {
        clearTimeout(autoNextTimer);
        autoNextTimer = null;
    }
    
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
    
    // Clear timers
    if (questionTimer) {
        clearInterval(questionTimer);
    }
    if (autoNextTimer) {
        clearTimeout(autoNextTimer);
        autoNextTimer = null;
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
    // Exclude topic buttons, preset buttons, slider, exit button, reset buttons, and toggle switch
    if (event.target.classList.contains('topic-btn') || 
        event.target.classList.contains('preset-btn') ||
        event.target.classList.contains('time-btn') ||
        event.target.id === 'timer-slider' ||
        event.target.id === 'auto-next-toggle' ||
        event.target.classList.contains('toggle-slider') ||
        event.target.classList.contains('compact-label') ||
        event.target.closest('.toggle-switch') ||
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
    // Clear any running timers
    if (questionTimer) {
        clearInterval(questionTimer);
    }
    if (autoNextTimer) {
        clearTimeout(autoNextTimer);
        autoNextTimer = null;
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

// Loading indicator functions
function showLoadingIndicator() {
    // Create loading overlay if it doesn't exist
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

// Toggle auto-next setting
function toggleAutoNext() {
    const toggle = document.getElementById('auto-next-toggle');
    autoNextEnabled = toggle.checked;
}



// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set initial state
    gameArea.style.display = 'none';
    gameInfo.style.display = 'none';
    gameOver.style.display = 'none';
    resultContainer.style.display = 'none';
    
    // Add event listener for auto-next toggle
    const autoNextToggle = document.getElementById('auto-next-toggle');
    if (autoNextToggle) {
        autoNextToggle.addEventListener('change', toggleAutoNext);
        // Set initial state
        autoNextEnabled = autoNextToggle.checked;
    }
}); 