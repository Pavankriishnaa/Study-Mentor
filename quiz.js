// --- QUIZ & REMINDER MODULE ---
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const quizForm = document.getElementById('quizForm');
    const quizQuestionsList = document.getElementById('quizQuestionsList');
    const quizBankCount = document.getElementById('quizBankCount');
    const startPracticeBtn = document.getElementById('startPracticeBtn');
    
    // Reminder DOM Elements
    const reminderActiveCheckbox = document.getElementById('reminderActive');
    const reminderIntervalInput = document.getElementById('reminderInterval');
    const saveReminderSettingsBtn = document.getElementById('saveReminderSettings');
    const quizReminderToggleBtn = document.getElementById('quizReminderToggleBtn');
    const reminderStatusBadge = document.getElementById('reminderStatusBadge');

    // Interactive Quiz Modal DOM
    const quizReminderModal = document.getElementById('quizReminderModal');
    const quizModalHeaderTag = document.getElementById('quizModalHeaderTag');
    const quizModalCategory = document.getElementById('quizModalCategory');
    const quizModalQuestion = document.getElementById('quizModalQuestion');
    const quizModalOptionsContainer = document.getElementById('quizModalOptionsContainer');
    const quizModalFeedback = document.getElementById('quizModalFeedback');
    const quizModalFeedbackText = document.getElementById('quizModalFeedbackText');
    const quizModalNextBtn = document.getElementById('quizModalNextBtn');
    const quizModalCloseFooterBtn = document.getElementById('quizModalCloseFooterBtn');
    const closeQuizModalBtn = document.getElementById('closeQuizModalBtn');

    // Practice / Reminder Session State
    let quizSessionQuestions = [];
    let currentQuizIndex = 0;
    let isReminderMode = false;
    let reminderIntervalTimer = null;

    // Core app listeners
    window.addEventListener('appStateLoaded', () => {
        loadReminderSettings();
        renderQuizBank();
        setupReminderInterval();
        requestNotificationPermission();
    });

    if (window.StudySpaceState) {
        loadReminderSettings();
        renderQuizBank();
        setupReminderInterval();
    }

    // Event Listeners - Quiz Builder Form
    if (quizForm) {
        quizForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const question = document.getElementById('quizQuestion').value.trim();
            const category = document.getElementById('quizCategory').value.trim() || 'General';
            const correctIndex = parseInt(document.querySelector('input[name="correctOption"]:checked').value, 10);
            
            // Collect options
            const options = [];
            const opt0 = document.getElementById('opt0').value.trim();
            const opt1 = document.getElementById('opt1').value.trim();
            const opt2 = document.getElementById('opt2').value.trim();
            const opt3 = document.getElementById('opt3').value.trim();

            options.push(opt0);
            options.push(opt1);
            if (opt2) options.push(opt2);
            if (opt3) options.push(opt3);

            const newQuestion = {
                id: 'quiz_' + Date.now(),
                question,
                options,
                correctIndex,
                category
            };

            window.StudySpaceState.quizzes.push(newQuestion);
            window.saveAppState();
            renderQuizBank();
            
            quizForm.reset();
            // Default radio back to option A
            document.querySelector('input[name="correctOption"][value="0"]').checked = true;
        });
    }

    // Event Listeners - Practice Triggers
    if (startPracticeBtn) {
        startPracticeBtn.addEventListener('click', () => {
            if (window.StudySpaceState.quizzes.length === 0) {
                alert("Your Quiz Bank is empty! Please create at least one question first.");
                return;
            }
            isReminderMode = false;
            quizModalHeaderTag.textContent = "🎮 QUICK PRACTICE SESSION";
            quizSessionQuestions = shuffleArray([...window.StudySpaceState.quizzes]);
            currentQuizIndex = 0;
            openQuizModal(currentQuizIndex);
        });
    }

    // Event Listeners - Quiz Modal Controls
    if (quizModalNextBtn) {
        quizModalNextBtn.addEventListener('click', () => {
            currentQuizIndex++;
            if (currentQuizIndex < quizSessionQuestions.length) {
                openQuizModal(currentQuizIndex);
            } else {
                alert("Practice completed! Nice work. 🎉");
                window.ModalHelper.close('quizReminderModal');
            }
        });
    }

    const closeQuizModal = () => window.ModalHelper.close('quizReminderModal');
    if (quizModalCloseFooterBtn) quizModalCloseFooterBtn.addEventListener('click', closeQuizModal);
    if (closeQuizModalBtn) closeQuizModalBtn.addEventListener('click', closeQuizModal);

    // Event Listeners - Reminder Settings
    if (saveReminderSettingsBtn) {
        saveReminderSettingsBtn.addEventListener('click', () => {
            const active = reminderActiveCheckbox.checked;
            const interval = parseInt(reminderIntervalInput.value, 10) || 10;

            window.StudySpaceState.reminders.active = active;
            window.StudySpaceState.reminders.intervalMinutes = interval;
            window.saveAppState();

            setupReminderInterval();
            updateReminderHeaderBtn();

            // Saved notification effect
            saveReminderSettingsBtn.textContent = 'Settings Saved!';
            saveReminderSettingsBtn.classList.remove('btn-secondary');
            saveReminderSettingsBtn.classList.add('btn-success');
            setTimeout(() => {
                saveReminderSettingsBtn.textContent = 'Update Reminder Settings';
                saveReminderSettingsBtn.classList.remove('btn-success');
                saveReminderSettingsBtn.classList.add('btn-secondary');
            }, 2000);
        });
    }

    // Quick toggle reminders in header
    if (quizReminderToggleBtn) {
        quizReminderToggleBtn.addEventListener('click', () => {
            const nextActive = !window.StudySpaceState.reminders.active;
            window.StudySpaceState.reminders.active = nextActive;
            if (reminderActiveCheckbox) reminderActiveCheckbox.checked = nextActive;
            
            window.saveAppState();
            setupReminderInterval();
            updateReminderHeaderBtn();
        });
    }

    // Load Settings into forms
    function loadReminderSettings() {
        const config = window.StudySpaceState.reminders;
        if (reminderActiveCheckbox) reminderActiveCheckbox.checked = config.active;
        if (reminderIntervalInput) reminderIntervalInput.value = config.intervalMinutes;
        updateReminderHeaderBtn();
    }

    function updateReminderHeaderBtn() {
        if (!quizReminderToggleBtn || !reminderStatusBadge) return;
        const active = window.StudySpaceState.reminders.active;
        if (active) {
            quizReminderToggleBtn.classList.remove('reminder-off');
            reminderStatusBadge.textContent = 'ON';
            reminderStatusBadge.style.backgroundColor = 'var(--emerald)';
        } else {
            quizReminderToggleBtn.classList.add('reminder-off');
            reminderStatusBadge.textContent = 'OFF';
            reminderStatusBadge.style.backgroundColor = 'var(--danger)';
        }
    }

    // Reminder Interval Setup
    function setupReminderInterval() {
        if (reminderIntervalTimer) clearInterval(reminderIntervalTimer);

        if (!window.StudySpaceState.reminders.active) return;

        const intervalMs = window.StudySpaceState.reminders.intervalMinutes * 60 * 1000;
        
        reminderIntervalTimer = setInterval(() => {
            triggerPopQuizReminder();
        }, intervalMs);
    }

    function triggerPopQuizReminder() {
        if (window.StudySpaceState.quizzes.length === 0) return;
        
        isReminderMode = true;
        quizModalHeaderTag.textContent = "📚 POP QUIZ REMINDER";
        
        // Pick a random question
        const randIndex = Math.floor(Math.random() * window.StudySpaceState.quizzes.length);
        quizSessionQuestions = [window.StudySpaceState.quizzes[randIndex]];
        currentQuizIndex = 0;

        // Try pushing standard browser alert
        sendSystemQuizNotification(quizSessionQuestions[0]);

        openQuizModal(currentQuizIndex);
    }

    // Modal Builder
    function openQuizModal(index) {
        if (index >= quizSessionQuestions.length) return;
        
        const q = quizSessionQuestions[index];
        
        quizModalCategory.textContent = q.category;
        quizModalQuestion.textContent = q.question;
        quizModalFeedback.classList.add('hidden');
        
        if (isReminderMode) {
            quizModalNextBtn.classList.add('hidden');
        } else {
            // practice mode has multiple questions
            quizModalNextBtn.classList.remove('hidden');
            if (index === quizSessionQuestions.length - 1) {
                quizModalNextBtn.textContent = 'Finish Practice';
            } else {
                quizModalNextBtn.textContent = 'Next Question';
            }
        }

        // Render option buttons
        let optionSelected = false;
        quizModalOptionsContainer.innerHTML = q.options.map((opt, optIdx) => {
            return `
                <button class="modal-quiz-option" data-idx="${optIdx}">
                    ${escapeHTML(opt)}
                </button>
            `;
        }).join('');

        // Option click handlers
        const optionButtons = quizModalOptionsContainer.querySelectorAll('.modal-quiz-option');
        optionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                if (optionSelected) return; // Prevent double answers
                optionSelected = true;

                const selectedIdx = parseInt(btn.getAttribute('data-idx'), 10);
                const correctIdx = q.correctIndex;

                // Update Stats
                window.StudySpaceState.stats.quizTotal++;
                if (selectedIdx === correctIdx) {
                    btn.classList.add('selected-correct');
                    window.StudySpaceState.stats.quizCorrect++;
                    
                    // Show correct feedback
                    quizModalFeedback.classList.remove('hidden');
                    quizModalFeedback.querySelector('.feedback-alert').style.borderColor = 'rgba(16, 185, 129, 0.2)';
                    quizModalFeedback.querySelector('.feedback-alert').style.backgroundColor = 'rgba(16, 185, 129, 0.08)';
                    quizModalFeedbackText.textContent = "Correct! Spot on! 🎉";
                    quizModalFeedbackText.style.color = '#34d399';
                } else {
                    btn.classList.add('selected-wrong');
                    // Highlight the correct answer
                    optionButtons[correctIdx].classList.add('selected-correct');
                    
                    // Show wrong feedback
                    quizModalFeedback.classList.remove('hidden');
                    quizModalFeedback.querySelector('.feedback-alert').style.borderColor = 'rgba(239, 68, 68, 0.2)';
                    quizModalFeedback.querySelector('.feedback-alert').style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
                    quizModalFeedbackText.textContent = `Incorrect. The correct answer was: ${escapeHTML(q.options[correctIdx])}`;
                    quizModalFeedbackText.style.color = '#f87171';
                }

                window.saveAppState();
            });
        });

        window.ModalHelper.open('quizReminderModal');
    }

    // Render Quiz Bank List in View
    function renderQuizBank() {
        if (!quizQuestionsList) return;

        const quizCount = window.StudySpaceState.quizzes.length;
        if (quizBankCount) quizBankCount.textContent = quizCount;

        if (quizCount === 0) {
            quizQuestionsList.innerHTML = `
                <p class="empty-list-msg">No quiz questions added yet. Create some using the form on the left!</p>
            `;
            return;
        }

        quizQuestionsList.innerHTML = window.StudySpaceState.quizzes.map((q, qIdx) => {
            return `
                <div class="quiz-bank-item">
                    <div class="quiz-bank-item-header">
                        <span class="quiz-bank-category">${escapeHTML(q.category)}</span>
                        <button class="task-action-btn delete-btn" onclick="deleteQuizQuestion('${q.id}')" title="Delete Question">
                            <svg class="icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                    <p class="quiz-bank-question">${escapeHTML(q.question)}</p>
                    <ul class="quiz-bank-options">
                        ${q.options.map((opt, optIdx) => `
                            <li class="quiz-bank-option ${optIdx === q.correctIndex ? 'correct' : ''}">
                                ${optIdx === q.correctIndex ? `<svg class="icon text-success" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>` : ''}
                                ${escapeHTML(opt)}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        }).join('');
    }

    // Global deletion hook
    window.deleteQuizQuestion = function(quizId) {
        const index = window.StudySpaceState.quizzes.findIndex(q => q.id === quizId);
        if (index !== -1) {
            window.StudySpaceState.quizzes.splice(index, 1);
            window.saveAppState();
            renderQuizBank();
        }
    };

    // Helper functions
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function requestNotificationPermission() {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }

    function sendSystemQuizNotification(quizItem) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification("Time for a pop quiz! 📝", {
                body: `Topic: ${quizItem.category} - Click to answer!`,
                icon: 'https://cdn-icons-png.flaticon.com/512/3233/3233957.png'
            });
        }
    }

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
});
