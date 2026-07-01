// --- GLOBALS & STATE DEFINITION ---
window.StudySpaceState = {
    tasks: [],
    decks: [],
    quizzes: [],
    stats: {
        tasksCompleted: 0,
        studyTimeSeconds: 0,
        cardsReviewed: 0,
        quizCorrect: 0,
        quizTotal: 0
    },
    pomodoro: {
        workDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        completedSessions: 0,
        sessionHistory: []
    },
    reminders: {
        active: true,
        intervalMinutes: 10,
        lastTriggerTime: null
    },
    theme: 'dark'
};

// --- STATE MANAGEMENT HELPERS ---
const STORAGE_KEY = 'cintrack_studyspace_state_v1';

window.saveAppState = function() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.StudySpaceState));
    updateDashboardStats();
};

function loadAppState() {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (rawData) {
        try {
            const parsed = JSON.parse(rawData);
            // Deep merge to ensure backward-compatibility if fields change
            window.StudySpaceState = {
                ...window.StudySpaceState,
                ...parsed,
                stats: { ...window.StudySpaceState.stats, ...parsed.stats },
                pomodoro: { ...window.StudySpaceState.pomodoro, ...parsed.pomodoro },
                reminders: { ...window.StudySpaceState.reminders, ...parsed.reminders }
            };
        } catch (e) {
            console.error("Failed to parse app state:", e);
        }
    } else {
        // Setup initial mock data if empty so the user doesn't see a blank app
        loadMockData();
    }
}

function loadMockData() {
    window.StudySpaceState.tasks = [
        { id: '1', title: 'Complete Math Exercise 3', description: 'Solve trigonometry questions 1-15', priority: 'high', category: 'Math', dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16), completed: false },
        { id: '2', title: 'Read History Chapter 5', description: 'Highlight key historical points about World War I', priority: 'medium', category: 'History', dueDate: new Date(Date.now() + 172800000).toISOString().slice(0, 16), completed: true }
    ];
    window.StudySpaceState.decks = [
        {
            id: '1',
            name: 'Javascript Basics',
            description: 'Core concepts, arrays, scope, and closures',
            color: 'color-indigo',
            cards: [
                { id: '1-1', question: 'What is a Closure in Javascript?', answer: 'A closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment).' },
                { id: '1-2', question: 'Explain block scope vs function scope.', answer: 'var is function-scoped. let and const are block-scoped, meaning they only exist within the closest enclosing curly braces {}' }
            ]
        }
    ];
    window.StudySpaceState.quizzes = [
        {
            id: 'q1',
            question: 'Which of the following is NOT a primitive data type in Javascript?',
            options: ['String', 'Boolean', 'Object', 'Undefined'],
            correctIndex: 2,
            category: 'Coding'
        },
        {
            id: 'q2',
            question: 'What is the powerhouse of the cell?',
            options: ['Mitochondria', 'Nucleus', 'Ribosome', 'Endoplasmic Reticulum'],
            correctIndex: 0,
            category: 'Biology'
        }
    ];
    window.StudySpaceState.stats = {
        tasksCompleted: 1,
        studyTimeSeconds: 1500, // 25 mins
        cardsReviewed: 2,
        quizCorrect: 1,
        quizTotal: 1
    };
    window.saveAppState();
}

// --- CORE UI CONTROLLER (SPA ROUTER) ---
document.addEventListener('DOMContentLoaded', () => {
    loadAppState();
    initAppRouting();
    initClock();
    initTheme();
    updateDashboardStats();
    
    // Trigger loaded callback events for modules
    window.dispatchEvent(new Event('appStateLoaded'));
});

// View Navigation Router
function initAppRouting() {
    const navItems = document.querySelectorAll('.nav-item');
    const viewPanels = document.querySelectorAll('.view-panel');
    const viewTitle = document.getElementById('view-title');
    const viewSubtitle = document.getElementById('view-subtitle');

    const subtitles = {
        'dashboard-view': 'Welcome back! Ready to learn?',
        'todo-view': 'Manage your assignments, priorities, and deadlines.',
        'pomodoro-view': 'Focus deeply by partitioning your study time.',
        'flashcards-view': 'Active recall and space-repetition to master concepts.',
        'quiz-view': 'Test your memory and construct pop-quiz schedules.'
    };

    const titles = {
        'dashboard-view': 'Dashboard',
        'todo-view': 'Study Tasks',
        'pomodoro-view': 'Pomodoro Timer',
        'flashcards-view': 'Flashcards',
        'quiz-view': 'Quiz Maker'
    };

    function switchView(targetViewId) {
        viewPanels.forEach(panel => {
            panel.classList.remove('active');
        });
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-target') === targetViewId) {
                item.classList.add('active');
            }
        });

        const targetPanel = document.getElementById(targetViewId);
        if (targetPanel) {
            targetPanel.classList.add('active');
            viewTitle.textContent = titles[targetViewId];
            viewSubtitle.textContent = subtitles[targetViewId];
            
            // Dispatch a custom tab load event in case modules need to refresh their UI
            window.dispatchEvent(new CustomEvent('tabChanged', { detail: { tabId: targetViewId } }));
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            switchView(target);
        });
    });

    // Make view links on the dashboard work
    document.addEventListener('click', (e) => {
        const goLink = e.target.closest('[data-go]');
        if (goLink) {
            e.preventDefault();
            const target = goLink.getAttribute('data-go');
            switchView(target);
        }
    });
}

// Clock Header Widget
function initClock() {
    const clockText = document.getElementById('headerTime');
    function updateClock() {
        const now = new Date();
        clockText.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 30000); // Update every 30 seconds
}

// Theme Switcher (Dark/Light)
function initTheme() {
    const themeBtn = document.getElementById('themeToggleBtn');
    const themeIcon = document.getElementById('theme-icon');
    const themeText = document.getElementById('theme-text');
    
    // Apply loaded theme
    if (window.StudySpaceState.theme === 'light') {
        document.body.classList.add('light-theme');
        if (themeText) themeText.textContent = 'Light Mode';
        if (themeIcon) {
            themeIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
        }
    }

    themeBtn.addEventListener('click', () => {
        const isLight = document.body.classList.toggle('light-theme');
        window.StudySpaceState.theme = isLight ? 'light' : 'dark';
        
        // Update button visual
        if (themeText) themeText.textContent = isLight ? 'Light Mode' : 'Dark Mode';
        if (themeIcon) {
            if (isLight) {
                themeIcon.innerHTML = `<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>`;
            } else {
                themeIcon.innerHTML = `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>`;
            }
        }
        
        window.saveAppState();
    });
}

// Update Dashboard Statistics Display
window.updateDashboardStats = function() {
    // Tasks Completed
    const completedTasksSpan = document.getElementById('stat-tasks-completed');
    if (completedTasksSpan) {
        completedTasksSpan.textContent = window.StudySpaceState.stats.tasksCompleted;
    }

    // Study Duration
    const studyDurationSpan = document.getElementById('stat-study-time');
    if (studyDurationSpan) {
        const totalMinutes = Math.floor(window.StudySpaceState.stats.studyTimeSeconds / 60);
        const hours = Math.floor(totalMinutes / 60);
        const mins = totalMinutes % 60;
        studyDurationSpan.textContent = `${hours}h ${mins}m`;
    }

    // Flashcards Learned (Reviewed)
    const cardsLearnedSpan = document.getElementById('stat-cards-learned');
    if (cardsLearnedSpan) {
        cardsLearnedSpan.textContent = window.StudySpaceState.stats.cardsReviewed;
    }

    // Quiz Accuracy
    const quizAccuracySpan = document.getElementById('stat-quiz-accuracy');
    if (quizAccuracySpan) {
        const accuracy = window.StudySpaceState.stats.quizTotal > 0
            ? Math.round((window.StudySpaceState.stats.quizCorrect / window.StudySpaceState.stats.quizTotal) * 100)
            : 0;
        quizAccuracySpan.textContent = `${accuracy}%`;
    }

    // Build Dashboard Todo Checklist (up to 3 items)
    const dashboardTaskList = document.getElementById('dashboard-tasks-list');
    if (dashboardTaskList) {
        const pendingTasks = window.StudySpaceState.tasks.filter(t => !t.completed).slice(0, 3);
        if (pendingTasks.length === 0) {
            dashboardTaskList.innerHTML = `<li class="empty-list-msg">No pending tasks due today. Hooray!</li>`;
        } else {
            dashboardTaskList.innerHTML = pendingTasks.map(task => `
                <li class="dashboard-list-item">
                    <div class="dashboard-list-item-left">
                        <div class="checkbox-custom" onclick="toggleTaskCompletion('${task.id}')">
                            <svg class="icon" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <span>${task.title}</span>
                    </div>
                    <span class="task-badge-priority priority-${task.priority}">${task.priority}</span>
                </li>
            `).join('');
        }
    }
};

// Global task toggle hook for Dashboard list items
window.toggleTaskCompletion = function(taskId) {
    const taskIndex = window.StudySpaceState.tasks.findIndex(t => t.id === taskId);
    if (taskIndex !== -1) {
        const task = window.StudySpaceState.tasks[taskIndex];
        task.completed = !task.completed;
        
        // Update stats
        if (task.completed) {
            window.StudySpaceState.stats.tasksCompleted++;
        } else {
            window.StudySpaceState.stats.tasksCompleted = Math.max(0, window.StudySpaceState.stats.tasksCompleted - 1);
        }
        
        window.saveAppState();
        window.dispatchEvent(new Event('tasksStateUpdated'));
    }
};

// Simple Modal UI Helper
window.ModalHelper = {
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('open');
    },
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.remove('open');
    }
};
