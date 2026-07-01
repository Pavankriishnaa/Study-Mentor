// --- POMODORO TIMER MODULE ---
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const timerDisplay = document.getElementById('timerDisplay');
    const startTimerBtn = document.getElementById('startTimerBtn');
    const pauseTimerBtn = document.getElementById('pauseTimerBtn');
    const resetTimerBtn = document.getElementById('resetTimerBtn');
    const timerRing = document.getElementById('timerRing');
    
    // Mode tabs
    const modeTabs = document.querySelectorAll('.mode-tab');
    
    // Duration Inputs
    const workDurationInput = document.getElementById('workDuration');
    const shortBreakDurationInput = document.getElementById('shortBreakDuration');
    const longBreakDurationInput = document.getElementById('longBreakDuration');
    const saveTimerSettingsBtn = document.getElementById('saveTimerSettingsBtn');
    
    // Session counters
    const sessionsCompletedCount = document.getElementById('sessionsCompletedCount');

    // Dashboard Widget Elements
    const widgetTimerText = document.getElementById('widget-timer-text');
    const widgetTimerState = document.getElementById('widget-timer-state');
    const widgetTimerBtn = document.getElementById('widget-timer-btn');

    // State Variables
    let timerState = 'idle'; // 'idle', 'running', 'paused'
    let currentMode = 'work'; // 'work', 'shortBreak', 'longBreak'
    let secondsRemaining = 0;
    let totalDurationSeconds = 0;
    let timerInterval = null;
    let statsInterval = null;

    // SVG Ring configuration
    const ringRadius = 130;
    const ringCircumference = 2 * Math.PI * ringRadius; // ~816.8

    // Initialize UI from state
    window.addEventListener('appStateLoaded', () => {
        loadSettingsToForm();
        resetTimer(false);
        updateSessionsDisplay();
    });

    // Initialize if state is already loaded
    if (window.StudySpaceState) {
        loadSettingsToForm();
        resetTimer(false);
        updateSessionsDisplay();
    }

    // Event listeners
    if (startTimerBtn) startTimerBtn.addEventListener('click', startTimer);
    if (pauseTimerBtn) pauseTimerBtn.addEventListener('click', pauseTimer);
    if (resetTimerBtn) resetTimerBtn.addEventListener('click', () => resetTimer(true));
    
    if (saveTimerSettingsBtn) {
        saveTimerSettingsBtn.addEventListener('click', () => {
            const w = parseInt(workDurationInput.value, 10) || 25;
            const sb = parseInt(shortBreakDurationInput.value, 10) || 5;
            const lb = parseInt(longBreakDurationInput.value, 10) || 15;

            window.StudySpaceState.pomodoro.workDuration = w;
            window.StudySpaceState.pomodoro.shortBreakDuration = sb;
            window.StudySpaceState.pomodoro.longBreakDuration = lb;

            window.saveAppState();
            resetTimer(true);
            
            // Temporary alert styling
            saveTimerSettingsBtn.textContent = 'Settings Saved!';
            saveTimerSettingsBtn.classList.remove('btn-secondary');
            saveTimerSettingsBtn.classList.add('btn-success');
            setTimeout(() => {
                saveTimerSettingsBtn.textContent = 'Apply & Reset';
                saveTimerSettingsBtn.classList.remove('btn-success');
                saveTimerSettingsBtn.classList.add('btn-secondary');
            }, 2000);
        });
    }

    modeTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modeTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentMode = tab.getAttribute('data-mode');
            resetTimer(true);
        });
    });

    // Dashboard widget button
    if (widgetTimerBtn) {
        widgetTimerBtn.addEventListener('click', () => {
            if (timerState === 'running') {
                pauseTimer();
            } else {
                // switch view to pomodoro if clicking dashboard and not running, or just run it
                startTimer();
            }
        });
    }

    // Listen for tab changes - if they visit Pomodoro, keep SVG progress correct
    window.addEventListener('tabChanged', (e) => {
        if (e.detail.tabId === 'pomodoro-view') {
            updateRingProgress();
        }
    });

    // Timer control functions
    function startTimer() {
        if (timerState === 'running') return;
        
        timerState = 'running';
        
        // Toggle play/pause buttons
        if (startTimerBtn) startTimerBtn.classList.add('hidden');
        if (pauseTimerBtn) pauseTimerBtn.classList.remove('hidden');
        
        // Update dashboard widget button text
        if (widgetTimerBtn) {
            widgetTimerBtn.textContent = 'Pause Session';
            widgetTimerBtn.className = 'btn btn-secondary';
        }

        // Start interval
        timerInterval = setInterval(() => {
            secondsRemaining--;
            
            // Accumulate study statistics (only for Work sessions)
            if (currentMode === 'work') {
                window.StudySpaceState.stats.studyTimeSeconds++;
                // throttled app save occurs every 10 seconds to protect disk, always saves on pause/stop
                if (secondsRemaining % 10 === 0) {
                    window.saveAppState();
                }
            }

            updateTimerDisplay();

            if (secondsRemaining <= 0) {
                timerCompleted();
            }
        }, 1000);

        updateTimerDisplay();
    }

    function pauseTimer() {
        if (timerState !== 'running') return;

        timerState = 'paused';
        
        // Toggle play/pause buttons
        if (startTimerBtn) startTimerBtn.classList.remove('hidden');
        if (pauseTimerBtn) pauseTimerBtn.classList.add('hidden');

        clearInterval(timerInterval);
        
        // Update dashboard widget button text
        if (widgetTimerBtn) {
            widgetTimerBtn.textContent = 'Resume Session';
            widgetTimerBtn.className = 'btn btn-primary';
        }

        window.saveAppState(); // save study time immediately
        updateTimerDisplay();
    }

    function resetTimer(forceStop = true) {
        if (forceStop) {
            clearInterval(timerInterval);
            timerState = 'idle';
            if (startTimerBtn) startTimerBtn.classList.remove('hidden');
            if (pauseTimerBtn) pauseTimerBtn.classList.add('hidden');
            
            if (widgetTimerBtn) {
                widgetTimerBtn.textContent = 'Start Session';
                widgetTimerBtn.className = 'btn btn-primary';
            }
        }

        const durationMinutes = getDurationForMode(currentMode);
        secondsRemaining = durationMinutes * 60;
        totalDurationSeconds = secondsRemaining;

        window.saveAppState();
        updateTimerDisplay();
    }

    function timerCompleted() {
        clearInterval(timerInterval);
        timerState = 'idle';
        
        // Play notification sound
        playBuzzer();

        // Increment stats
        if (currentMode === 'work') {
            window.StudySpaceState.pomodoro.completedSessions++;
            window.StudySpaceState.pomodoro.sessionHistory.push({
                timestamp: new Date().toISOString(),
                durationMinutes: getDurationForMode('work')
            });
            updateSessionsDisplay();
        }

        // Send browser notification if active
        sendLocalNotification();

        // Auto transition to next mode
        if (currentMode === 'work') {
            // Suggest break
            currentMode = window.StudySpaceState.pomodoro.completedSessions % 4 === 0 ? 'longBreak' : 'shortBreak';
        } else {
            // Suggest work
            currentMode = 'work';
        }

        // Update mode tabs active classes
        modeTabs.forEach(t => {
            t.classList.remove('active');
            if (t.getAttribute('data-mode') === currentMode) {
                t.classList.add('active');
            }
        });

        resetTimer(true);
    }

    // Helper functions
    function getDurationForMode(mode) {
        const config = window.StudySpaceState.pomodoro;
        if (mode === 'work') return config.workDuration;
        if (mode === 'shortBreak') return config.shortBreakDuration;
        if (mode === 'longBreak') return config.longBreakDuration;
        return 25;
    }

    function loadSettingsToForm() {
        const config = window.StudySpaceState.pomodoro;
        if (workDurationInput) workDurationInput.value = config.workDuration;
        if (shortBreakDurationInput) shortBreakDurationInput.value = config.shortBreakDuration;
        if (longBreakDurationInput) longBreakDurationInput.value = config.longBreakDuration;
    }

    function updateSessionsDisplay() {
        const count = window.StudySpaceState.pomodoro.completedSessions;
        if (sessionsCompletedCount) sessionsCompletedCount.textContent = count;
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(secondsRemaining / 60);
        const seconds = secondsRemaining % 60;
        const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // Primary Timer UI
        if (timerDisplay) timerDisplay.textContent = timeString;

        // Dashboard Widget UI
        if (widgetTimerText) widgetTimerText.textContent = timeString;
        if (widgetTimerState) {
            const states = {
                'work': 'Studying 📚',
                'shortBreak': 'Short Break ☕',
                'longBreak': 'Long Break 🌴'
            };
            widgetTimerState.textContent = timerState === 'running' ? states[currentMode] : 'Timer Idle';
        }

        // Browser Document Title
        let titleEmoji = '⏱️';
        if (timerState === 'running') {
            titleEmoji = currentMode === 'work' ? '📚' : '☕';
        }
        document.title = `${titleEmoji} ${timeString} | Study Space`;

        updateRingProgress();
    }

    function updateRingProgress() {
        if (!timerRing) return;
        
        if (totalDurationSeconds <= 0) {
            timerRing.style.strokeDashoffset = 0;
            return;
        }

        const percentage = secondsRemaining / totalDurationSeconds;
        const offset = ringCircumference * (1 - percentage);
        timerRing.style.strokeDashoffset = offset;
    }

    // Audio synthesizer using Web Audio API
    function playBuzzer() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            const ctx = new AudioContext();

            function beep(freq, duration, delay) {
                setTimeout(() => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    
                    osc.frequency.value = freq;
                    osc.type = 'sine';

                    gain.gain.setValueAtTime(0.15, ctx.currentTime);
                    // Smooth ramp down
                    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

                    osc.start();
                    osc.stop(ctx.currentTime + duration);
                }, delay);
            }

            // Triple synth notification sound
            beep(523.25, 0.2, 0);   // C5
            beep(659.25, 0.2, 250); // E5
            beep(783.99, 0.4, 500); // G5
        } catch (e) {
            console.error("Audio Context is blocked or not supported:", e);
        }
    }

    function sendLocalNotification() {
        const textMap = {
            'work': 'Time to take a break! You have earned it.',
            'shortBreak': 'Break is over, ready to focus again?',
            'longBreak': 'Long break finished. Let\'s get back to work!'
        };
        
        const titleMap = {
            'work': 'Session Completed! 🚀',
            'shortBreak': 'Break Ended ☕',
            'longBreak': 'Break Ended 🌴'
        };

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(titleMap[currentMode], {
                body: textMap[currentMode],
                icon: 'https://cdn-icons-png.flaticon.com/512/3233/3233957.png'
            });
        } else {
            console.log("Timer Completed Notification:", titleMap[currentMode] + " - " + textMap[currentMode]);
        }
    }
});
