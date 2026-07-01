// --- TODO MODULE ---
document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const tasksList = document.getElementById('tasksList');
    const openAddTaskModalBtn = document.getElementById('openAddTaskModalBtn');
    const addTaskModal = document.getElementById('addTaskModal');
    const closeAddTaskModalBtn = document.getElementById('closeAddTaskModalBtn');
    const cancelAddTaskBtn = document.getElementById('cancelAddTaskBtn');
    const addTaskForm = document.getElementById('addTaskForm');
    const taskSortSelect = document.getElementById('taskSort');
    const filterButtons = document.querySelectorAll('.filter-btn');

    let currentFilter = 'all';

    // Event Listeners
    if (openAddTaskModalBtn) {
        openAddTaskModalBtn.addEventListener('click', () => {
            document.getElementById('editTaskId').value = '';
            document.getElementById('saveTaskBtn').textContent = 'Create Task';
            addTaskForm.reset();
            // Default due date to end of today
            const today = new Date();
            today.setHours(23, 59, 0, 0);
            const offset = today.getTimezoneOffset();
            const localToday = new Date(today.getTime() - (offset * 60 * 1000));
            document.getElementById('taskDueDate').value = localToday.toISOString().slice(0, 16);
            window.ModalHelper.open('addTaskModal');
        });
    }

    if (closeAddTaskModalBtn) closeAddTaskModalBtn.addEventListener('click', () => window.ModalHelper.close('addTaskModal'));
    if (cancelAddTaskBtn) cancelAddTaskBtn.addEventListener('click', () => window.ModalHelper.close('addTaskModal'));

    if (addTaskForm) {
        addTaskForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const editId = document.getElementById('editTaskId').value;
            const title = document.getElementById('taskTitle').value.trim();
            const description = document.getElementById('taskDescription').value.trim();
            const priority = document.getElementById('taskPriority').value;
            const category = document.getElementById('taskCategory').value.trim() || 'General';
            const dueDate = document.getElementById('taskDueDate').value;

            if (editId) {
                // Editing existing task
                const task = window.StudySpaceState.tasks.find(t => t.id === editId);
                if (task) {
                    task.title = title;
                    task.description = description;
                    task.priority = priority;
                    task.category = category;
                    task.dueDate = dueDate;
                }
            } else {
                // Creating new task
                const newTask = {
                    id: 'task_' + Date.now(),
                    title,
                    description,
                    priority,
                    category,
                    dueDate,
                    completed: false
                };
                window.StudySpaceState.tasks.push(newTask);
            }

            window.saveAppState();
            renderTasks();
            window.ModalHelper.close('addTaskModal');
        });
    }

    if (taskSortSelect) {
        taskSortSelect.addEventListener('change', () => {
            renderTasks();
        });
    }

    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderTasks();
        });
    });

    // Handle incoming events from core app
    window.addEventListener('tasksStateUpdated', () => {
        renderTasks();
    });

    window.addEventListener('appStateLoaded', () => {
        renderTasks();
    });

    // Initialize rendering
    renderTasks();

    // Render Tasks Function
    function renderTasks() {
        if (!tasksList) return;

        let filteredTasks = [...window.StudySpaceState.tasks];

        // Apply filters
        if (currentFilter === 'pending') {
            filteredTasks = filteredTasks.filter(t => !t.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = filteredTasks.filter(t => t.completed);
        }

        // Apply sorting
        const sortBy = taskSortSelect ? taskSortSelect.value : 'dueDate';
        filteredTasks.sort((a, b) => {
            if (sortBy === 'dueDate') {
                return new Date(a.dueDate) - new Date(b.dueDate);
            } else if (sortBy === 'priority') {
                const priorityWeight = { high: 3, medium: 2, low: 1 };
                return priorityWeight[b.priority] - priorityWeight[a.priority];
            } else if (sortBy === 'title') {
                return a.title.localeCompare(b.title);
            }
            return 0;
        });

        if (filteredTasks.length === 0) {
            tasksList.innerHTML = `
                <div class="empty-list-msg">
                    <p>No tasks found matching your filter rules.</p>
                </div>
            `;
            return;
        }

        tasksList.innerHTML = filteredTasks.map(task => {
            const isCompleted = task.completed;
            const dueDateObj = new Date(task.dueDate);
            const isOverdue = !isCompleted && dueDateObj < new Date();
            
            // Format due date elegantly
            const formattedDate = dueDateObj.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
                                  dueDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return `
                <div class="task-item ${isCompleted ? 'completed' : ''}" data-id="${task.id}">
                    <div class="task-item-left">
                        <div class="checkbox-custom" onclick="toggleTask('${task.id}')">
                            <svg class="icon" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                        <div class="task-details-col">
                            <span class="task-title-text">${escapeHTML(task.title)}</span>
                            ${task.description ? `<p class="text-muted text-sm" style="font-size: 13px; margin-top: 2px;">${escapeHTML(task.description)}</p>` : ''}
                            <div class="task-meta">
                                <span class="task-badge-priority priority-${task.priority}">${task.priority}</span>
                                <span class="task-badge-category">${escapeHTML(task.category)}</span>
                                <span class="task-due-date ${isOverdue ? 'overdue' : ''}">
                                    ${isOverdue 
                                        ? `<svg class="icon text-danger" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>` 
                                        : `<svg class="icon" viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 4px;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`
                                    }
                                    ${formattedDate} ${isOverdue ? '(Overdue)' : ''}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="task-item-actions">
                        <button class="task-action-btn" onclick="editTask('${task.id}')" title="Edit Task">
                            <svg class="icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </button>
                        <button class="task-action-btn delete-btn" onclick="deleteTask('${task.id}')" title="Delete Task">
                            <svg class="icon" viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Exposed operations to global scope
    window.toggleTask = function(taskId) {
        const task = window.StudySpaceState.tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            // Update stats
            if (task.completed) {
                window.StudySpaceState.stats.tasksCompleted++;
            } else {
                window.StudySpaceState.stats.tasksCompleted = Math.max(0, window.StudySpaceState.stats.tasksCompleted - 1);
            }
            window.saveAppState();
            renderTasks();
        }
    };

    window.editTask = function(taskId) {
        const task = window.StudySpaceState.tasks.find(t => t.id === taskId);
        if (task) {
            document.getElementById('editTaskId').value = task.id;
            document.getElementById('taskTitle').value = task.title;
            document.getElementById('taskDescription').value = task.description || '';
            document.getElementById('taskPriority').value = task.priority;
            document.getElementById('taskCategory').value = task.category;
            document.getElementById('taskDueDate').value = task.dueDate;
            
            document.getElementById('saveTaskBtn').textContent = 'Save Changes';
            window.ModalHelper.open('addTaskModal');
        }
    };

    window.deleteTask = function(taskId) {
        const taskIndex = window.StudySpaceState.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            const task = window.StudySpaceState.tasks[taskIndex];
            if (task.completed) {
                window.StudySpaceState.stats.tasksCompleted = Math.max(0, window.StudySpaceState.stats.tasksCompleted - 1);
            }
            window.StudySpaceState.tasks.splice(taskIndex, 1);
            window.saveAppState();
            renderTasks();
        }
    };

    function escapeHTML(str) {
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }
});
