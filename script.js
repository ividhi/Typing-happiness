const textToTypeElement = document.getElementById('text-to-type');
const userInputElement = document.getElementById('user-input');
const timerElement = document.getElementById('timer');
const wpmElement = document.getElementById('wpm');
const accuracyElement = document.getElementById('accuracy');
const restartBtn = document.getElementById('restart-btn');
const difficultyRadios = document.querySelectorAll('input[name="difficulty"]');
const nextLevelBtn = document.getElementById('next-level-btn');

// -------- LocalStorage Keys & Constants --------
const TEXT_ELEMENTS_KEY = 'textElements'; // Example, if used elsewhere
const USER_PROGRESSED_DIFFICULTY_KEY_PREFIX = 'user_progress_difficulty_';

const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

// -------- Helper Functions for User Progressed Difficulty --------
function getUserProgressedDifficulty(username) {
    if (!username) return 'easy';
    const key = `${USER_PROGRESSED_DIFFICULTY_KEY_PREFIX}${username}`;
    try {
        const progressedDifficulty = localStorage.getItem(key);
        // Ensure the stored difficulty is valid, otherwise default to easy
        return DIFFICULTY_LEVELS.includes(progressedDifficulty) ? progressedDifficulty : 'easy';
    } catch (e) {
        console.error('Error getting user progressed difficulty:', e);
        return 'easy';
    }
}

function setUserProgressedDifficulty(username, difficulty) {
    if (!username || !DIFFICULTY_LEVELS.includes(difficulty)) return;
    const key = `${USER_PROGRESSED_DIFFICULTY_KEY_PREFIX}${username}`;
    try {
        localStorage.setItem(key, difficulty);
        // console.log(`User ${username} progressed difficulty set to ${difficulty}`);
    } catch (e) {
        console.error('Error setting user progressed difficulty:', e);
    }
}

// Sound Effects
const correctSound = new Audio('correct.mp3');
const incorrectSound = new Audio('incorrect.mp3');
correctSound.volume = 0.5; // Adjust volume as needed
incorrectSound.volume = 0.5;

const sampleTexts = {
    easy: [
        "cat hat run sun big fun",
        "the dog can see the man",
        "jump play sing look work",
        "one two red blue good nice",
        "like make come take give go"
    ],
    medium: [
        "The quick brown fox jumps over the lazy dog.",
        "Pack my box with five dozen liquor jugs.",
        "How vexingly quick daft zebras jump!",
        "Bright vixens jump; dozy fowl quack.",
        "Sphinx of black quartz, judge my vow."
    ],
    hard: [
        "Cryptography is the practice and study of techniques for secure communication in the presence of third parties called adversaries.",
        "JavaScript is a versatile scripting language, essential for web development, enabling interactive and dynamic content on websites.",
        "The phenomenon of quantum entanglement describes a situation where particles become interconnected and instantaneously affect each other's states, regardless of distance.",
        "Object-oriented programming paradigms emphasize modularity and reusability, structuring software as a collection of interacting objects.",
        "Artificial neural networks, inspired by the human brain, are powerful tools for machine learning, capable of recognizing complex patterns."
    ]
};

let timer;
let timeRemaining = 60;
let currentText = '';
let charIndex = 0;
let mistakes = 0;
let isTyping = false;
let currentDifficulty = 'easy'; // Default difficulty
let activeCaretIndex = 0;

function getSelectedDifficulty() {
    for (const radio of difficultyRadios) {
        if (radio.checked) {
            return radio.value;
        }
    }
    return 'easy'; // Fallback
}

function getRandomText() {
    // currentDifficulty is now reliably set by initializeGame based on user progression or default.
    // No need to re-fetch or re-determine it here.
    const textsForDifficulty = sampleTexts[currentDifficulty];
    if (!textsForDifficulty) {
        console.warn(`No texts found for difficulty: ${currentDifficulty}. Defaulting to easy.`);
        currentDifficulty = 'easy'; // Fallback
        const fallbackTexts = sampleTexts[currentDifficulty];
        const fallbackRandomIndex = Math.floor(Math.random() * fallbackTexts.length);
        return fallbackTexts[fallbackRandomIndex];
    }
    const randomIndex = Math.floor(Math.random() * textsForDifficulty.length);
    return textsForDifficulty[randomIndex];
}

function initializeGame() {
    // currentDifficulty is now assumed to be set by the caller (event listener or initial load logic)

    // Sync radio buttons to the global currentDifficulty
    difficultyRadios.forEach(radio => {
        radio.checked = (radio.value === currentDifficulty);
    });

    // Ensure buttons are in a known state for a new game/difficulty setting
    if (nextLevelBtn) nextLevelBtn.style.display = 'none';
    if (restartBtn) restartBtn.style.display = 'inline-block';

    currentText = getRandomText(); // getRandomText will use the global currentDifficulty
    textToTypeElement.innerHTML = '';
    activeCaretIndex = 0;
    currentText.split('').forEach((char, index) => {
        const charSpan = document.createElement('span');
        charSpan.innerText = char;
        if (index === 0) charSpan.classList.add('current-char'); // Add caret to first char
        textToTypeElement.appendChild(charSpan);
    });
    userInputElement.value = '';
    userInputElement.focus();
    timeRemaining = 60;
    timerElement.innerText = timeRemaining;
    wpmElement.innerText = 0;
    accuracyElement.innerText = 100;
    charIndex = 0;
    mistakes = 0;
    isTyping = false;
    clearInterval(timer);
    userInputElement.disabled = false;
    // Disable difficulty change during game
    difficultyRadios.forEach(radio => radio.disabled = false);
}

function startTimer() {
    isTyping = true;
    // Disable difficulty change once typing starts
    difficultyRadios.forEach(radio => radio.disabled = true);
    timer = setInterval(() => {
        timeRemaining--;
        timerElement.innerText = timeRemaining;
        if (timeRemaining === 0) {
            endGame();
        }
    }, 1000);
}

function handleInput() {
    if (!isTyping && timeRemaining > 0) {
        startTimer();
    }

    const typedText = userInputElement.value;
    const charSpans = textToTypeElement.querySelectorAll('span');

    // Handle current character
    if (charIndex < currentText.length && timeRemaining > 0) {
        const typedChar = typedText[charIndex]; // Get char at current index
        const sourceChar = currentText[charIndex];

        if (typedChar === sourceChar) {
            charSpans[charIndex].classList.add('correct');
            charSpans[charIndex].classList.remove('incorrect');
            playSound(correctSound);
        } else {
            charSpans[charIndex].classList.add('incorrect');
            charSpans[charIndex].classList.remove('correct');
            mistakes++; // Increment mistakes only on actual incorrect char
            playSound(incorrectSound);

            // Enhanced error highlighting for input field
            userInputElement.classList.add('input-error');
            setTimeout(() => {
                userInputElement.classList.remove('input-error');
            }, 300); // Remove error class after 300ms
        }
    }

    // Update charIndex based on input length
    // This handles both typing forward and backspacing correctly
    const oldCharIndex = charIndex;
    charIndex = typedText.length;
    activeCaretIndex = charIndex;

    // Update caret position
    charSpans.forEach((span, index) => {
        span.classList.remove('current-char');
        if (index === activeCaretIndex && timeRemaining > 0) {
            span.classList.add('current-char');
        }
    });

    // If backspacing, clear styling for characters that were backspaced over
    if (charIndex < oldCharIndex) {
        for (let i = charIndex; i < oldCharIndex; i++) {
            charSpans[i].classList.remove('correct', 'incorrect');
            // Note: Mistake count is not decremented here as it might become complex
            // to track if the backspaced char was originally a mistake.
            // Simpler to count mistakes only on forward typing.
        }
    }

    // Mark future characters as neutral (remove any prior styling if user types fast and backspaces)
    for (let i = charIndex; i < currentText.length; i++){
      charSpans[i].classList.remove('correct', 'incorrect');
    }


    if (charIndex === currentText.length && timeRemaining > 0) {
        endGame();
    }
    updateStats();
}

function updateStats() {
    const typedChars = charIndex;
    // Calculate elapsed time in minutes for WPM
    const elapsedTime = (60 - timeRemaining) / 60;
    let grossWPM = 0;
    if (elapsedTime > 0) {
      grossWPM = Math.round(((typedChars / 5) / elapsedTime));
    }
    wpmElement.innerText = grossWPM;

    let accuracy = 100;
    if (typedChars > 0) { // Avoid division by zero
        accuracy = Math.round(((typedChars - mistakes) / typedChars) * 100);
    }
    accuracyElement.innerText = Math.max(0, accuracy); // Ensure accuracy isn't negative
}

function endGame() {
    clearInterval(timer);
    userInputElement.disabled = true;
    isTyping = false;
    difficultyRadios.forEach(radio => radio.disabled = false); // Re-enable difficulty selection
    textToTypeElement.querySelectorAll('span').forEach(s => s.classList.remove('current-char')); // Remove caret

    const typedChars = charIndex;
    const elapsedTime = (60 - (timeRemaining > 0 ? timeRemaining : 0)) / 60; // Ensure timeRemaining isn't negative if game ends early
    let netWPM = 0;

    if (elapsedTime > 0) {
        const netTypedWords = Math.max(0, (typedChars - mistakes)) / 5;
        netWPM = Math.round(netTypedWords / elapsedTime);
    }
    wpmElement.innerText = netWPM;

    // Calculate final accuracy one last time
    let finalAccuracy = 100;
    if (charIndex > 0) { // charIndex is the number of typed characters
        finalAccuracy = Math.round(((charIndex - mistakes) / charIndex) * 100);
    }
    finalAccuracy = Math.max(0, finalAccuracy);
    if (accuracyElement) accuracyElement.innerText = finalAccuracy; // Update display

    // --- Score Saving for Logged-in User ---
    const currentUser = sessionStorage.getItem(SESSION_USER_KEY); 
    if (currentUser) {
        const scoreData = {
            wpm: netWPM,
            accuracy: finalAccuracy, 
            difficulty: currentDifficulty, // global variable, should be fine
            date: new Date().toISOString()
        };
        const userScoresKey = `scores_${currentUser}`;
        let scores = [];
        try {
            const storedScores = localStorage.getItem(userScoresKey);
            if (storedScores) {
                scores = JSON.parse(storedScores);
            }
        } catch (e) {
            console.error("Error parsing scores from localStorage: ", e);
            scores = []; // Initialize to empty array on error
        }
        scores.push(scoreData);
        try {
            localStorage.setItem(userScoresKey, JSON.stringify(scores));
            console.log(`Score saved for ${currentUser}: `, scoreData);

            // Debugging for Next Level Button
            console.log('[Debug EndGame] finalAccuracy:', finalAccuracy, '%ccurrentDifficulty:', 'color: blue', currentDifficulty);
            const debugPlayedDifficultyIndex = DIFFICULTY_LEVELS.indexOf(currentDifficulty);
            console.log('[Debug EndGame] %ccurrentPlayedDifficultyIndex:', 'color: blue', debugPlayedDifficultyIndex, '%c(Max Index for progression is:', 'color: gray', DIFFICULTY_LEVELS.length - 2 + ')');
            console.log('[Debug EndGame] %cnextLevelBtn found:', 'color: blue', nextLevelBtn ? 'Yes' : 'No', '%crestartBtn found:', 'color: blue', restartBtn ? 'Yes' : 'No');

            // --- Difficulty Progression Logic (Manual) ---
            if (finalAccuracy >= 60) {
                const currentPlayedDifficultyIndex = DIFFICULTY_LEVELS.indexOf(currentDifficulty);
                if (currentPlayedDifficultyIndex > -1 && currentPlayedDifficultyIndex < DIFFICULTY_LEVELS.length - 1) { // Not already on 'hard'
                    const nextDifficulty = DIFFICULTY_LEVELS[currentPlayedDifficultyIndex + 1];
                    nextLevelBtn.dataset.nextDifficulty = nextDifficulty;
                    nextLevelBtn.style.display = 'inline-block'; // Show the button
                    restartBtn.style.display = 'none'; // Optionally hide restart if next level is offered
                } else if (currentPlayedDifficultyIndex === DIFFICULTY_LEVELS.length - 1) {
                    // console.log('User is already at the highest difficulty level.');
                    // Ensure next level button is hidden if they somehow are on hard and it was shown
                    nextLevelBtn.style.display = 'none';
                    restartBtn.style.display = 'inline-block'; // Ensure restart is visible
                }
            } else {
                // If accuracy is too low, ensure next level button is hidden and restart is visible
                nextLevelBtn.style.display = 'none';
                restartBtn.style.display = 'inline-block';
            }
            // --- End Difficulty Progression Logic ---

        } catch (e) {
            console.error("Error saving scores to localStorage: ", e);
        }
    }
    // --- End of Score Saving ---
}

function playSound(sound) {
    sound.currentTime = 0; // Rewind to the start
    sound.play().catch(error => console.error("Error playing sound:", error)); // Play and catch potential errors
}

userInputElement.addEventListener('input', handleInput);

restartBtn.addEventListener('click', () => {
    const currentUser = sessionStorage.getItem(SESSION_USER_KEY);
    currentDifficulty = getUserProgressedDifficulty(currentUser); // Defaults to 'easy' if no user/progress
    // No need to explicitly hide nextLevelBtn or show restartBtn here, initializeGame will do it.
    initializeGame(); 
});
difficultyRadios.forEach(radio => {
    radio.addEventListener('change', (event) => {
        currentDifficulty = event.target.value;
        // No need to explicitly hide nextLevelBtn or show restartBtn here, initializeGame will do it.
        initializeGame(); 
    });
});

if (nextLevelBtn) {
    nextLevelBtn.addEventListener('click', () => {
        const currentUser = sessionStorage.getItem(SESSION_USER_KEY);
        const difficultyToSet = nextLevelBtn.dataset.nextDifficulty;

        if (currentUser && difficultyToSet && DIFFICULTY_LEVELS.includes(difficultyToSet)) {
            setUserProgressedDifficulty(currentUser, difficultyToSet);
            
            difficultyRadios.forEach(radio => {
                radio.checked = (radio.value === difficultyToSet);
            });
            currentDifficulty = difficultyToSet; // Update global currentDifficulty

            nextLevelBtn.style.display = 'none';
            delete nextLevelBtn.dataset.nextDifficulty; // Clear the data attribute
            restartBtn.style.display = 'inline-block'; // Ensure restart button is visible again

            initializeGame(); // Start new game at the new difficulty
        } else {
            console.error('Could not proceed to next level. User or difficulty missing.');
            // Ensure button is hidden and restart shown if there was an error
            nextLevelBtn.style.display = 'none';
            restartBtn.style.display = 'inline-block'; 
        }
    });
}

// --- Check login status on page load ---
// checkLoginStatus();

// Initial game setup after checking login status and determining user
// This ensures currentDifficulty is set based on potential user progress before the first initializeGame call.
// const initialCurrentUser = sessionStorage.getItem(SESSION_USER_KEY);
// currentDifficulty = getUserProgressedDifficulty(initialCurrentUser);
// initializeGame(); // Initialize game for the first time with the determined difficulty

// -------- Auth Feature Code Starts --------
const USERS_DB_KEY = 'typing_test_users';
const SESSION_USER_KEY = 'typing_test_session_user';

// Auth Modal Elements
const signupBtn = document.getElementById('signup-btn');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userProfileDiv = document.getElementById('user-profile');
const welcomeMsgSpan = document.getElementById('welcome-msg');

const signupModal = document.getElementById('signup-modal');
const loginModal = document.getElementById('login-modal');

const closeSignupModalBtn = document.getElementById('close-signup-modal');
const closeLoginModalBtn = document.getElementById('close-login-modal');

const signupUsernameInput = document.getElementById('signup-username');
const signupPasswordInput = document.getElementById('signup-password');
const signupSubmitBtn = document.getElementById('signup-submit-btn');

const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const loginSubmitBtn = document.getElementById('login-submit-btn');

// --- Helper: Simple non-secure hash (for demo only) ---
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
    }
    // XOR with a simple key to make it slightly less obvious, still not secure
    const key = 55; // Arbitrary key
    return (hash ^ key).toString(16);
}

// --- Modal Visibility --- 
function openModal(modal) {
    if (modal) modal.style.display = 'block';
}

function closeModal(modal) {
    if (modal) modal.style.display = 'none';
}

// --- UI Updates based on Login State ---
function updateUIForLogin(username) {
    if (signupBtn) signupBtn.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'none';
    if (userProfileDiv) userProfileDiv.style.display = 'block';
    if (welcomeMsgSpan) welcomeMsgSpan.textContent = `Welcome, ${username}!`;
}

function updateUIForLogout() {
    if (signupBtn) signupBtn.style.display = 'inline-block'; // or 'block' depending on original display
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (userProfileDiv) userProfileDiv.style.display = 'none';
    if (welcomeMsgSpan) welcomeMsgSpan.textContent = '';
}

// --- Event Listeners for Modals & Auth Buttons ---
if (signupBtn) {
    signupBtn.onclick = () => openModal(signupModal);
}
if (loginBtn) {
    loginBtn.onclick = () => openModal(loginModal);
}
if (closeSignupModalBtn) {
    closeSignupModalBtn.onclick = () => closeModal(signupModal);
}
if (closeLoginModalBtn) {
    closeLoginModalBtn.onclick = () => closeModal(loginModal);
}

// Close modals if user clicks outside of them
window.onclick = function(event) {
    if (event.target === signupModal) {
        closeModal(signupModal);
    }
    if (event.target === loginModal) {
        closeModal(loginModal);
    }
}

// --- Sign Up Logic ---
if (signupSubmitBtn) {
    signupSubmitBtn.onclick = () => {
        const username = signupUsernameInput.value.trim();
        const password = signupPasswordInput.value;

        if (!username || !password) {
            alert('Please enter both username and password.');
            return;
        }

        try {
            let users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || {};
            if (users[username]) {
                alert('Username already exists. Please choose another.');
                return;
            }
            users[username] = simpleHash(password); // Store "hashed" password
            localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
            alert('Sign up successful! You can now log in.');
            closeModal(signupModal);
            signupUsernameInput.value = '';
            signupPasswordInput.value = '';
        } catch (e) {
            console.error("Error during sign up:", e);
            alert('An error occurred during sign up. Please try again.');
        }
    };
}

// --- Login Logic ---
if (loginSubmitBtn) {
    loginSubmitBtn.onclick = () => {
        const username = loginUsernameInput.value.trim();
        const password = loginPasswordInput.value;

        if (!username || !password) {
            alert('Please enter both username and password.');
            return;
        }

        try {
            const users = JSON.parse(localStorage.getItem(USERS_DB_KEY)) || {};
            const hashedPassword = simpleHash(password);

            if (users[username] && users[username] === hashedPassword) {
                sessionStorage.setItem(SESSION_USER_KEY, username);
                alert('Login successful!');
                closeModal(loginModal);
                updateUIForLogin(username);
                loginUsernameInput.value = '';
                loginPasswordInput.value = '';
                initializeGame(); // Re-initialize game, perhaps to clear state or load user specific things if any
            } else {
                alert('Invalid username or password.');
            }
        } catch (e) {
            console.error("Error during login:", e);
            alert('An error occurred during login. Please try again.');
        }
    };
}

// --- Logout Logic ---
if (logoutBtn) {
    logoutBtn.onclick = () => {
        try {
            sessionStorage.removeItem(SESSION_USER_KEY);
            alert('Logged out successfully.');
            updateUIForLogout();
            initializeGame(); // Re-initialize game for a logged-out state
        } catch (e) {
            console.error("Error during logout:", e);
            alert('An error occurred during logout.');
        }
    };
}

// --- Check login status on page load ---
function checkLoginStatus() {
    try {
        const currentUser = sessionStorage.getItem(SESSION_USER_KEY);
        if (currentUser) {
            updateUIForLogin(currentUser);
        } else {
            updateUIForLogout();
        }
    } catch (e) {
        console.error("Error checking login status:", e);
        updateUIForLogout(); // Default to logged out state on error
    }
}

// -------- Auth Feature Code Ends --------

// -------- Scores Display Feature Code Starts --------
const myScoresBtn = document.getElementById('my-scores-btn');
const scoresModal = document.getElementById('scores-modal');
const closeScoresModalBtn = document.getElementById('close-scores-modal');
const personalBestsContentDiv = document.getElementById('personal-bests-content');
const allScoresContentDiv = document.getElementById('all-scores-content');

function displayUserScores() {
    if (!scoresModal || !personalBestsContentDiv || !allScoresContentDiv) {
        console.error('Scores modal elements not found.');
        return;
    }

    // Clear previous content
    personalBestsContentDiv.innerHTML = '';
    allScoresContentDiv.innerHTML = '';

    const currentUser = sessionStorage.getItem(SESSION_USER_KEY);
    if (!currentUser) {
        personalBestsContentDiv.innerHTML = '<p>Please log in to see your scores.</p>';
        openModal(scoresModal);
        return;
    }

    const userScoresKey = `scores_${currentUser}`;
    let scores = [];
    try {
        const storedScores = localStorage.getItem(userScoresKey);
        if (storedScores) {
            scores = JSON.parse(storedScores);
        }
    } catch (e) {
        console.error("Error parsing scores from localStorage: ", e);
        scores = [];
    }

    if (scores.length === 0) {
        personalBestsContentDiv.innerHTML = '<p>No games played yet for personal bests.</p>';
        allScoresContentDiv.innerHTML = '<p>You haven\'t played any games yet. Your scores will appear here!</p>';
        openModal(scoresModal);
        return;
    }

    // Calculate Personal Bests
    const personalBests = {
        easy: { wpm: 0, accuracy: 0, date: null },
        medium: { wpm: 0, accuracy: 0, date: null },
        hard: { wpm: 0, accuracy: 0, date: null }
    };

    scores.forEach(score => {
        const difficulty = score.difficulty.toLowerCase(); // Ensure consistent casing for keys
        if (personalBests.hasOwnProperty(difficulty)) { // Check if difficulty is a valid key
            if (score.wpm > personalBests[difficulty].wpm) {
                personalBests[difficulty] = { wpm: score.wpm, accuracy: score.accuracy, date: score.date };
            } else if (score.wpm === personalBests[difficulty].wpm && score.accuracy > personalBests[difficulty].accuracy) {
                personalBests[difficulty] = { wpm: score.wpm, accuracy: score.accuracy, date: score.date };
            }
        }
    });

    let bestsHTML = '';
    for (const diff in personalBests) {
        if (personalBests[diff].wpm > 0) {
            bestsHTML += `<p><strong>${diff.charAt(0).toUpperCase() + diff.slice(1)}:</strong> ${personalBests[diff].wpm} WPM (Accuracy: ${personalBests[diff].accuracy}%)</p>`;
        } else {
            bestsHTML += `<p><strong>${diff.charAt(0).toUpperCase() + diff.slice(1)}:</strong> No scores yet.</p>`;
        }
    }
    personalBestsContentDiv.innerHTML = bestsHTML;

    // Populate All Scores List
    let allScoresHTML = '<ul id="scores-ul">';
    scores.sort((a, b) => new Date(b.date) - new Date(a.date)); // Sort by date, most recent first

    scores.forEach(score => {
        const date = new Date(score.date);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        allScoresHTML += `<li class="score-item">
                            <span class="score-difficulty">${score.difficulty}</span>
                            <span>WPM: ${score.wpm}</span>
                            <span>Acc: ${score.accuracy}%</span>
                            <span class="score-date">${formattedDate}</span>
                         </li>`;
    });
    allScoresHTML += '</ul>';
    allScoresContentDiv.innerHTML = allScoresHTML;

    openModal(scoresModal);
}

if (myScoresBtn) {
    myScoresBtn.addEventListener('click', displayUserScores);
}

if (closeScoresModalBtn) {
    closeScoresModalBtn.addEventListener('click', () => {
        if (scoresModal) closeModal(scoresModal);
    });
}

window.addEventListener('click', function(event) {
    if (event.target === scoresModal) {
        closeModal(scoresModal);
    }
});

// -------- Scores Display Feature Code Ends --------

// -------- Achievements Feature Code Starts --------
const ACHIEVEMENTS_DEFINITIONS = [
    {
        id: 'first_game',
        name: 'First Steps',
        description: 'Complete your first typing test.',
        icon: 'fas fa-shoe-prints', // Example Font Awesome icon
        criteria: (scores) => scores.length >= 1
    },
    {
        id: 'easy_50_wpm',
        name: 'Easy Rider',
        description: 'Achieve 50 WPM on Easy difficulty.',
        icon: 'fas fa-feather-alt',
        criteria: (scores) => scores.some(s => s.difficulty.toLowerCase() === 'easy' && s.wpm >= 50)
    },
    {
        id: 'medium_60_wpm',
        name: 'Medium Mover',
        description: 'Achieve 60 WPM on Medium difficulty.',
        icon: 'fas fa-wind',
        criteria: (scores) => scores.some(s => s.difficulty.toLowerCase() === 'medium' && s.wpm >= 60)
    },
    {
        id: 'hard_70_wpm',
        name: 'Hard Hitter',
        description: 'Achieve 70 WPM on Hard difficulty.',
        icon: 'fas fa-bolt',
        criteria: (scores) => scores.some(s => s.difficulty.toLowerCase() === 'hard' && s.wpm >= 70)
    },
    {
        id: 'accuracy_master',
        name: 'Perfect Precision',
        description: 'Achieve 100% accuracy in any game.',
        icon: 'fas fa-bullseye',
        criteria: (scores) => scores.some(s => s.accuracy === 100)
    },
    {
        id: 'ten_games',
        name: 'Persistent Typer',
        description: 'Complete 10 typing tests.',
        icon: 'fas fa-medal',
        criteria: (scores) => scores.length >= 10
    },
    {
        id: 'all_difficulties_played',
        name: 'Jack of All Trades',
        description: 'Play a game on Easy, Medium, and Hard.',
        icon: 'fas fa-layer-group',
        criteria: (scores) => {
            const difficultiesPlayed = new Set(scores.map(s => s.difficulty.toLowerCase()));
            return difficultiesPlayed.has('easy') && difficultiesPlayed.has('medium') && difficultiesPlayed.has('hard');
        }
    }
    // Add more achievements here
];

const USER_ACHIEVEMENTS_KEY_PREFIX = 'user_achievements_';

function getUserUnlockedAchievements(username) {
    if (!username) return [];
    const key = `${USER_ACHIEVEMENTS_KEY_PREFIX}${username}`;
    try {
        const storedAchievements = localStorage.getItem(key);
        return storedAchievements ? JSON.parse(storedAchievements) : [];
    } catch (e) {
        console.error('Error getting user achievements:', e);
        return [];
    }
}

function saveUserUnlockedAchievements(username, unlockedIds) {
    if (!username) return;
    const key = `${USER_ACHIEVEMENTS_KEY_PREFIX}${username}`;
    try {
        localStorage.setItem(key, JSON.stringify(unlockedIds));
    } catch (e) {
        console.error('Error saving user achievements:', e);
    }
}

function checkAndDisplayUserAchievements(username, scores, achievementsContainerDiv) {
    if (!achievementsContainerDiv) {
        console.error('Achievements container div not found.');
        return;
    }
    achievementsContainerDiv.innerHTML = ''; // Clear previous achievements

    let unlockedAchievementIds = getUserUnlockedAchievements(username);
    let newAchievementsUnlockedThisSession = false;

    ACHIEVEMENTS_DEFINITIONS.forEach(achievement => {
        const isUnlocked = unlockedAchievementIds.includes(achievement.id);
        let newlyUnlocked = false;

        if (!isUnlocked && achievement.criteria(scores)) {
            unlockedAchievementIds.push(achievement.id);
            newlyUnlocked = true;
            newAchievementsUnlockedThisSession = true;
        }

        const achievementItem = document.createElement('div');
        achievementItem.classList.add('achievement-item');
        if (isUnlocked || newlyUnlocked) {
            achievementItem.classList.add('unlocked');
        }

        // Icon (using a generic one if not specified or if Font Awesome isn't fully set up)
        const iconHTML = `<div class="achievement-icon"><i class="${achievement.icon || 'fas fa-question-circle'}"></i></div>`;
        
        achievementItem.innerHTML = `
            ${iconHTML}
            <h4>${achievement.name}</h4>
            <p>${achievement.description}</p>
        `;
        achievementsContainerDiv.appendChild(achievementItem);
    });

    if (newAchievementsUnlockedThisSession) {
        saveUserUnlockedAchievements(username, unlockedAchievementIds);
    }
}

// Modify displayUserScores to include achievements
const originalDisplayUserScores = window.displayUserScores; // In case it was already defined

function displayUserScores() { // Redefining or defining for the first time
    const scoresModal = document.getElementById('scores-modal');
    const personalBestsContentDiv = document.getElementById('personal-bests-content');
    const allScoresContentDiv = document.getElementById('all-scores-content');
    const achievementsContentDiv = document.getElementById('achievements-content'); // Get achievements div

    if (!scoresModal || !personalBestsContentDiv || !allScoresContentDiv || !achievementsContentDiv) {
        console.error('Scores modal elements (including achievements) not found.');
        return;
    }

    personalBestsContentDiv.innerHTML = '';
    allScoresContentDiv.innerHTML = '';
    achievementsContentDiv.innerHTML = ''; // Clear achievements on open

    const currentUser = sessionStorage.getItem(SESSION_USER_KEY);
    if (!currentUser) {
        personalBestsContentDiv.innerHTML = '<p>Please log in to see your scores and achievements.</p>';
        openModal(scoresModal);
        return;
    }

    const userScoresKey = `scores_${currentUser}`;
    let scores = [];
    try {
        const storedScores = localStorage.getItem(userScoresKey);
        if (storedScores) {
            scores = JSON.parse(storedScores);
        }
    } catch (e) {
        console.error("Error parsing scores from localStorage: ", e);
        scores = []; // Default to empty array on error
    }

    if (scores.length === 0) {
        personalBestsContentDiv.innerHTML = '<p>No games played yet for personal bests.</p>';
        allScoresContentDiv.innerHTML = '<p>You haven\'t played any games yet. Your scores will appear here!</p>';
        // Still show achievements, some might be independent of scores or meta (like "signed up")
        checkAndDisplayUserAchievements(currentUser, scores, achievementsContentDiv);
        openModal(scoresModal);
        return;
    }

    // Calculate Personal Bests
    const personalBests = {
        easy: { wpm: 0, accuracy: 0, date: null },
        medium: { wpm: 0, accuracy: 0, date: null },
        hard: { wpm: 0, accuracy: 0, date: null }
    };
    scores.forEach(score => {
        const difficulty = score.difficulty.toLowerCase();
        if (personalBests.hasOwnProperty(difficulty)) {
            if (score.wpm > personalBests[difficulty].wpm || 
                (score.wpm === personalBests[difficulty].wpm && score.accuracy > personalBests[difficulty].accuracy)) {
                personalBests[difficulty] = { wpm: score.wpm, accuracy: score.accuracy, date: score.date };
            }
        }
    });
    let bestsHTML = '';
    for (const diff in personalBests) {
        if (personalBests[diff].wpm > 0) {
            bestsHTML += `<p><strong>${diff.charAt(0).toUpperCase() + diff.slice(1)}:</strong> ${personalBests[diff].wpm} WPM (Accuracy: ${personalBests[diff].accuracy}%)</p>`;
        } else {
            bestsHTML += `<p><strong>${diff.charAt(0).toUpperCase() + diff.slice(1)}:</strong> No scores yet.</p>`;
        }
    }
    personalBestsContentDiv.innerHTML = bestsHTML;

    // Populate All Scores List
    let allScoresHTML = '<ul id="scores-ul">';
    scores.sort((a, b) => new Date(b.date) - new Date(a.date));
    scores.forEach(score => {
        const date = new Date(score.date);
        const formattedDate = `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
        allScoresHTML += `<li class="score-item">
                            <span class="score-difficulty">${score.difficulty}</span>
                            <span>WPM: ${score.wpm}</span>
                            <span>Acc: ${score.accuracy}%</span>
                            <span class="score-date">${formattedDate}</span>
                         </li>`;
    });
    allScoresHTML += '</ul>';
    allScoresContentDiv.innerHTML = allScoresHTML;

    // Check and Display Achievements
    checkAndDisplayUserAchievements(currentUser, scores, achievementsContentDiv);

    openModal(scoresModal);
}

// Ensure the new displayUserScores is used if myScoresBtn exists
// The previous `if (myScoresBtn)` block that added the listener to originalDisplayUserScores might need to be removed or this new one takes precedence.
// For simplicity, if script is run top-to-bottom, this re-assignment of `displayUserScores` and then re-attaching should work.
// However, the original listener attachment should be removed if it exists elsewhere and simply re-assigning displayUserScores doesn't update the listener.

// Safely re-assign the event listener for myScoresBtn to use the new displayUserScores function
if (myScoresBtn) {
    // It's tricky to remove an anonymous function event listener directly without a reference.
    // A common robust way is to replace the element or ensure it's only added once.
    // For now, we assume this script block runs after the previous listener might have been set
    // and this re-definition of displayUserScores will be used by the existing listener IF
    // the listener was defined as `myScoresBtn.addEventListener('click', () => displayUserScores());`
    // OR if displayUserScores was a globally scoped named function from the start.

    // Let's ensure we're using the NEW displayUserScores.
    // The previous `if (myScoresBtn)` already adds the listener. 
    // Since displayUserScores is a global function, its redefinition here should be picked up by that listener.
    // No, the previous `displayUserScores` was a different function. We need to ensure this new definition is used.
    // The simplest way, given the prior structure, is to assume this is the primary definition block for displayUserScores
    // and that any prior event listener for myScoresBtn was attached to a function named displayUserScores.
}

// -------- Achievements Feature Code Ends --------

// Initialize game and check login status when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    checkLoginStatus(); // Handles user auth state and UI updates related to auth
    // Then, set up the game for the first time based on the (potentially now known) user.
    const currentUser = sessionStorage.getItem(SESSION_USER_KEY);
    currentDifficulty = getUserProgressedDifficulty(currentUser);
    initializeGame(); 
}); // Initialize game after DOM is ready and login status is checked

// -------- Auth Feature Code Ends --------
