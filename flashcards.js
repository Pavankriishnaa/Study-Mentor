// --- FLASHCARDS MODULE ---
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const decksGrid = document.getElementById('decksGrid');
    const openAddDeckModalBtn = document.getElementById('openAddDeckModalBtn');
    const addDeckModal = document.getElementById('addDeckModal');
    const closeAddDeckModalBtn = document.getElementById('closeAddDeckModalBtn');
    const cancelAddDeckBtn = document.getElementById('cancelAddDeckBtn');
    const addDeckForm = document.getElementById('addDeckForm');

    // Add Card Modal Elements
    const addCardModal = document.getElementById('addCardModal');
    const addCardForm = document.getElementById('addCardForm');
    const addCardDeckIdInput = document.getElementById('addCardDeckId');
    const addCardModalDeckTitle = document.getElementById('addCardModalDeckTitle');
    const deckCardCountStatus = document.getElementById('deckCardCountStatus');
    const closeAddCardModalBtn = document.getElementById('closeAddCardModalBtn');
    const cancelAddCardBtn = document.getElementById('cancelAddCardBtn');

    // Study Mode Elements
    const studySessionContainer = document.getElementById('studySessionContainer');
    const studyDeckTitle = document.getElementById('studyDeckTitle');
    const currentCardIndexText = document.getElementById('currentCardIndexText');
    const totalStudyCardsText = document.getElementById('totalStudyCardsText');
    const studyCard = document.getElementById('studyCard');
    const cardQuestionText = document.getElementById('cardQuestionText');
    const cardAnswerText = document.getElementById('cardAnswerText');
    const flipCardBtn = document.getElementById('flipCardBtn');
    const flipCardPrompt = document.getElementById('flipCardPrompt');
    const feedbackControls = document.getElementById('feedbackControls');
    const closeStudyBtn = document.getElementById('closeStudyBtn');

    // Active Study State
    let activeStudyDeck = null;
    let activeStudyCards = [];
    let currentStudyIndex = 0;

    // Core app listeners
    window.addEventListener('appStateLoaded', renderDecks);
    if (window.StudySpaceState) renderDecks();

    // Event Listeners - Deck Creation
    if (openAddDeckModalBtn) {
        openAddDeckModalBtn.addEventListener('click', () => {
            addDeckForm.reset();
            window.ModalHelper.open('addDeckModal');
        });
    }
    if (closeAddDeckModalBtn) closeAddDeckModalBtn.addEventListener('click', () => window.ModalHelper.close('addDeckModal'));
    if (cancelAddDeckBtn) cancelAddDeckBtn.addEventListener('click', () => window.ModalHelper.close('addDeckModal'));

    if (addDeckForm) {
        addDeckForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('deckName').value.trim();
            const description = document.getElementById('deckDescription').value.trim();
            const color = document.querySelector('input[name="deckColor"]:checked').value;

            const newDeck = {
                id: 'deck_' + Date.now(),
                name,
                description,
                color,
                cards: []
            };

            window.StudySpaceState.decks.push(newDeck);
            window.saveAppState();
            renderDecks();
            window.ModalHelper.close('addDeckModal');
        });
    }

    // Event Listeners - Card Insertion
    if (closeAddCardModalBtn) closeAddCardModalBtn.addEventListener('click', () => window.ModalHelper.close('addCardModal'));
    if (cancelAddCardBtn) cancelAddCardBtn.addEventListener('click', () => window.ModalHelper.close('addCardModal'));

    if (addCardForm) {
        addCardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const deckId = addCardDeckIdInput.value;
            const question = document.getElementById('cardQuestion').value.trim();
            const answer = document.getElementById('cardAnswer').value.trim();

            const deck = window.StudySpaceState.decks.find(d => d.id === deckId);
            if (deck) {
                deck.cards.push({
                    id: 'card_' + Date.now(),
                    question,
                    answer
                });
                window.saveAppState();
                
                // Reset form inputs for quick subsequent additions
                document.getElementById('cardQuestion').value = '';
                document.getElementById('cardAnswer').value = '';
                document.getElementById('cardQuestion').focus();
                
                // Update count in status bar
                deckCardCountStatus.textContent = `${deck.cards.length} cards in deck`;
                
                renderDecks();
            }
        });
    }

    // Event Listeners - Study Interaction
    if (studyCard) {
        studyCard.addEventListener('click', () => {
            studyCard.classList.toggle('flipped');
            if (studyCard.classList.contains('flipped')) {
                flipCardPrompt.classList.add('hidden');
                feedbackControls.classList.remove('hidden');
            } else {
                flipCardPrompt.classList.remove('hidden');
                feedbackControls.classList.add('hidden');
            }
        });
    }

    if (flipCardBtn) {
        flipCardBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Avoid double toggling
            studyCard.classList.add('flipped');
            flipCardPrompt.classList.add('hidden');
            feedbackControls.classList.remove('hidden');
        });
    }

    if (closeStudyBtn) {
        closeStudyBtn.addEventListener('click', () => {
            studySessionContainer.classList.add('hidden');
            decksGrid.classList.remove('hidden');
            // Re-render decks to update card counts
            renderDecks();
        });
    }

    // Feedback response button listeners
    const feedbackButtons = document.querySelectorAll('.feedback-buttons .btn');
    feedbackButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const grade = btn.getAttribute('data-grade');
            
            // Track study statistic
            window.StudySpaceState.stats.cardsReviewed++;
            window.saveAppState();

            if (grade === 'hard') {
                // If it's hard, put it at the back of the deck queue to repeat
                const currentCard = activeStudyCards[currentStudyIndex];
                activeStudyCards.push(currentCard);
                totalStudyCardsText.textContent = activeStudyCards.length;
            }

            nextCard();
        });
    });


    // Render Decks grid list
    function renderDecks() {
        if (!decksGrid || studySessionContainer && !studySessionContainer.classList.contains('hidden')) return;

        if (window.StudySpaceState.decks.length === 0) {
            decksGrid.innerHTML = `
                <div class="empty-list-msg" style="grid-column: 1 / -1;">
                    <p>No flashcard decks created yet. Click "Create Deck" to begin.</p>
                </div>
            `;
            return;
        }

        decksGrid.innerHTML = window.StudySpaceState.decks.map(deck => {
            return `
                <div class="card deck-card ${deck.color}" onclick="startStudySession('${deck.id}')">
                    <div class="deck-info">
                        <h4>${escapeHTML(deck.name)}</h4>
                        <p class="text-muted">${escapeHTML(deck.description) || 'No description provided'}</p>
                    </div>
                    <div class="deck-actions-row">
                        <span class="card-count-badge">${deck.cards.length} cards</span>
                        <div class="deck-btn-group">
                            <button class="task-action-btn" onclick="openAddCardModal(event, '${deck.id}')" title="Add Cards">
                                <svg class="icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                            <button class="task-action-btn delete-btn" onclick="deleteDeck(event, '${deck.id}')" title="Delete Deck">
                                <svg class="icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Study flow triggers
    window.startStudySession = function(deckId) {
        const deck = window.StudySpaceState.decks.find(d => d.id === deckId);
        if (!deck) return;

        if (deck.cards.length === 0) {
            alert("This deck has no cards yet! Add some cards first.");
            return;
        }

        activeStudyDeck = deck;
        // Make a copy of cards so we can manipulate queue safely during review
        activeStudyCards = [...deck.cards];
        currentStudyIndex = 0;

        studyDeckTitle.textContent = deck.name;
        totalStudyCardsText.textContent = activeStudyCards.length;

        // Hide decks and show study interface
        decksGrid.classList.add('hidden');
        studySessionContainer.classList.remove('hidden');

        showCard(0);
    };

    function showCard(index) {
        if (index >= activeStudyCards.length) return;

        currentCardIndexText.textContent = index + 1;
        const card = activeStudyCards[index];

        // Reset flip state
        studyCard.classList.remove('flipped');
        flipCardPrompt.classList.remove('hidden');
        feedbackControls.classList.add('hidden');

        // Insert card text
        cardQuestionText.textContent = card.question;
        cardAnswerText.textContent = card.answer;
    }

    function nextCard() {
        currentStudyIndex++;
        if (currentStudyIndex < activeStudyCards.length) {
            showCard(currentStudyIndex);
        } else {
            // Study Session Finished
            alert("Awesome! You completed reviewing this deck! 🎉");
            studySessionContainer.classList.add('hidden');
            decksGrid.classList.remove('hidden');
            renderDecks();
        }
    }

    // Deck management actions
    window.openAddCardModal = function(e, deckId) {
        e.stopPropagation(); // Avoid triggering study mode
        const deck = window.StudySpaceState.decks.find(d => d.id === deckId);
        if (deck) {
            addCardDeckIdInput.value = deck.id;
            addCardModalDeckTitle.textContent = deck.name;
            deckCardCountStatus.textContent = `${deck.cards.length} cards in deck`;
            
            document.getElementById('cardQuestion').value = '';
            document.getElementById('cardAnswer').value = '';
            
            window.ModalHelper.open('addCardModal');
        }
    };

    window.deleteDeck = function(e, deckId) {
        e.stopPropagation(); // Avoid triggering study mode
        if (confirm("Are you sure you want to delete this deck and all of its cards?")) {
            const index = window.StudySpaceState.decks.findIndex(d => d.id === deckId);
            if (index !== -1) {
                window.StudySpaceState.decks.splice(index, 1);
                window.saveAppState();
                renderDecks();
            }
        }
    };

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
});
