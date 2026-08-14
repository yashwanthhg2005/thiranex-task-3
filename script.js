/* -------------------------------------------------------------
 * TaskFlow Application Logic
 * State-driven Vanilla JavaScript App
 * ------------------------------------------------------------- */

// Central State
const state = {
  tasks: [],            // Array of task items: { id: string, title: string, completed: boolean }
  filter: 'all',        // Active view filter: 'all' | 'active' | 'completed'
  editingId: null,      // ID of task currently being inline-edited
  confirmDeleteId: null // ID of task showing inline delete confirmation
};

// LocalStorage Configurations
const STORAGE_KEY = 'taskflow_tasks';

// DOM Cache
const dom = {
  taskForm: document.getElementById('add-task-form'),
  taskInput: document.getElementById('task-input'),
  taskList: document.getElementById('task-list'),
  emptyState: document.getElementById('empty-state'),
  filterNav: document.getElementById('filter-nav'),
  clearCompletedBtn: document.getElementById('clear-completed-btn'),
  
  // Dashboard Stat Elements
  statTotal: document.getElementById('stat-total'),
  statActive: document.getElementById('stat-active'),
  statCompleted: document.getElementById('stat-completed'),

  // Filter Count Elements
  countAll: document.getElementById('count-all'),
  countActive: document.getElementById('count-active'),
  countCompleted: document.getElementById('count-completed'),

  // Modal Dialog Elements
  confirmModal: document.getElementById('confirm-modal'),
  modalCancelBtn: document.getElementById('modal-cancel-btn'),
  modalConfirmBtn: document.getElementById('modal-confirm-btn')
};

/* -------------------------------------------------------------
 * Central Operations (CRUD & Persistence)
 * ------------------------------------------------------------- */

/**
 * Loads tasks from window.localStorage.
 * Gracefully defaults to empty array on failure or corrupt JSON structure.
 */
const loadTasks = () => {
  try {
    const rawData = localStorage.getItem(STORAGE_KEY);
    if (rawData) {
      const parsedData = JSON.parse(rawData);
      if (Array.isArray(parsedData)) {
        // Validate scheme of loaded tasks
        return parsedData.filter(task => 
          task &&
          typeof task.id === 'string' &&
          typeof task.title === 'string' &&
          typeof task.completed === 'boolean'
        );
      }
    }
  } catch (error) {
    console.error('TaskFlow: Error parsing localStorage data. Initializing empty list.', error);
  }
  return [];
};

/**
 * Saves state.tasks directly to localStorage
 */
const saveTasks = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.tasks));
  } catch (error) {
    console.error('TaskFlow: Error writing tasks to localStorage', error);
  }
};

/**
 * Creates and appends a new task to state
 * @param {string} title - The task content
 */
const addTask = (title) => {
  const trimmed = title.trim();
  if (!trimmed) return;

  const newTask = {
    id: Date.now().toString(),
    title: trimmed,
    completed: false
  };

  state.tasks.push(newTask);
  saveTasks();
  render();
};

/**
 * Toggles a task completion state
 * @param {string} id - The task ID
 */
const toggleTask = (id) => {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    render();
  }
};

/**
 * Updates the title of an existing task
 * @param {string} id - The task ID
 * @param {string} newTitle - The updated task title content
 */
const updateTask = (id, newTitle) => {
  const task = state.tasks.find(t => t.id === id);
  const trimmed = newTitle.trim();

  if (task) {
    if (trimmed) {
      task.title = trimmed;
      saveTasks();
    }
    // If edit content is empty, cancel edit and retain original content
    state.editingId = null;
    render();
  }
};

/**
 * Deletes a task from the state
 * @param {string} id - The task ID
 */
const deleteTask = (id) => {
  state.tasks = state.tasks.filter(t => t.id !== id);
  
  // Clean up selection states if deleted task was active in them
  if (state.editingId === id) state.editingId = null;
  if (state.confirmDeleteId === id) state.confirmDeleteId = null;
  
  saveTasks();
  render();
};

/**
 * Triggers leaving animation for individual task elements
 * @param {string} id - The task ID to animate out
 */
const animateDeleteTask = (id) => {
  const taskEl = dom.taskList.querySelector(`.task-item[data-id="${id}"]`);
  if (taskEl) {
    taskEl.classList.add('leaving');
    // Listen for animation transition to complete before triggering state change
    taskEl.addEventListener('animationend', () => {
      deleteTask(id);
    }, { once: true });
  } else {
    deleteTask(id);
  }
};

/**
 * Clears completed tasks from state list
 */
const clearCompleted = () => {
  state.tasks = state.tasks.filter(t => !t.completed);
  saveTasks();
  render();
};

/* -------------------------------------------------------------
 * UI Rendering Functions
 * ------------------------------------------------------------- */

/**
 * Updates stats dashboard UI counts & filter counts
 */
const updateStats = () => {
  const total = state.tasks.length;
  const active = state.tasks.filter(t => !t.completed).length;
  const completed = total - active;

  // Header Dashboard Counters
  dom.statTotal.textContent = total;
  dom.statActive.textContent = active;
  dom.statCompleted.textContent = completed;

  // Filter Buttons Sub-Badges
  dom.countAll.textContent = total;
  dom.countActive.textContent = active;
  dom.countCompleted.textContent = completed;
};

/**
 * Renders empty state graphics depending on active filter
 */
const renderEmptyState = () => {
  let iconHtml = '';
  let title = '';
  let subtitle = '';

  if (state.filter === 'all') {
    iconHtml = `
      <svg class="empty-state-svg" width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5C15 6.10457 14.1046 7 13 7H11C9.89543 7 9 6.10457 9 5Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M9 14.5L10.5 16L15 11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    title = "You're all caught up!";
    subtitle = "No tasks here. Add something you want to accomplish.";
  } else if (state.filter === 'active') {
    iconHtml = `
      <svg class="empty-state-svg" width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 3V5M12 19V21M5 12H3M21 12H19M18.364 5.636L16.95 7.05M7.05 16.95L5.636 18.364M18.364 18.364L16.95 16.95M7.05 7.05L5.636 5.636M16 12C16 14.2091 14.2091 16 12 16C9.79086 16 8 14.2091 8 12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    title = "No active tasks!";
    subtitle = "Time to relax, or create a new task to work on.";
  } else if (state.filter === 'completed') {
    iconHtml = `
      <svg class="empty-state-svg" width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;
    title = "No completed tasks yet!";
    subtitle = "Check off tasks from your list to complete them.";
  }

  dom.emptyState.innerHTML = `
    ${iconHtml}
    <div class="empty-title">${title}</div>
    <div class="empty-subtitle">${subtitle}</div>
  `;
};

/**
 * Creates the HTML block structure of an individual task card
 * @param {Object} task - The task object
 * @returns {string} HTML string
 */
const createTaskMarkup = (task) => {
  const isEditing = state.editingId === task.id;
  const isConfirmingDelete = state.confirmDeleteId === task.id;

  let contentArea = '';
  let actionsArea = '';

  // Render Inline Input if in editing state
  if (isEditing) {
    contentArea = `
      <form class="edit-task-form" data-action="save-edit-form">
        <input type="text" class="edit-task-input" value="${escapeHtml(task.title)}" aria-label="Edit task description" required autocomplete="off">
      </form>
    `;
  } else {
    contentArea = `
      <span class="task-title" data-action="start-edit" title="Double click to edit">${escapeHtml(task.title)}</span>
    `;
  }

  // Render Action buttons based on status
  if (isConfirmingDelete) {
    actionsArea = `
      <div class="confirm-delete-container">
        <span class="confirm-delete-label">Delete?</span>
        <button class="btn-confirm-yes" data-action="confirm-delete" aria-label="Confirm task deletion">Yes</button>
        <button class="btn-confirm-no" data-action="cancel-delete" aria-label="Cancel task deletion">No</button>
      </div>
    `;
  } else if (!isEditing) {
    actionsArea = `
      <div class="task-actions">
        <button class="btn-action btn-edit" data-action="start-edit" aria-label="Edit task title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M12 20H21M16.5 3.5L20.5 7.5L7 21H3V17L16.5 3.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="btn-action btn-delete" data-action="request-delete" aria-label="Delete task">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M19 7L18.1327 19.1422C18.0579 20.1891 17.187 21 16.1378 21H7.86224C6.81296 21 5.94208 20.1891 5.86732 19.1422L5 7M10 11V17M14 11V17M15 7V4C15 3.44772 14.5523 3 14 3H10C9.44772 3 9 3.44772 9 4V7M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
    `;
  } else {
    // Actions are hidden/empty during editing mode (Enter/blur to commit)
    actionsArea = '';
  }

  return `
    <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
      <div class="task-content-wrapper">
        <label class="checkbox-container" aria-label="Mark task ${task.completed ? 'incomplete' : 'complete'}">
          <input type="checkbox" data-action="toggle-complete" ${task.completed ? 'checked' : ''}>
          <span class="checkmark">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </span>
        </label>
        ${contentArea}
      </div>
      ${actionsArea}
    </li>
  `;
};

/**
 * Re-renders the entire tasks dashboard list view, updating statistics and filters
 */
const render = () => {
  // Filter Tasks
  const filteredTasks = state.tasks.filter(task => {
    if (state.filter === 'active') return !task.completed;
    if (state.filter === 'completed') return task.completed;
    return true; // 'all'
  });

  // Render Tasks Markup
  if (filteredTasks.length === 0) {
    dom.taskList.innerHTML = '';
    renderEmptyState();
    dom.emptyState.classList.remove('hidden');
  } else {
    dom.emptyState.classList.add('hidden');
    dom.taskList.innerHTML = filteredTasks.map(task => createTaskMarkup(task)).join('');
    
    // Focus inline editing elements immediately if rendered
    if (state.editingId) {
      const editInput = dom.taskList.querySelector('.edit-task-input');
      if (editInput) {
        editInput.focus();
        // Move focus pointer cursor to the end of the input text
        const length = editInput.value.length;
        editInput.setSelectionRange(length, length);
      }
    }
  }

  // Update statistics dashboards
  updateStats();

  // Handle Clear Completed button visibility
  const completedExist = state.tasks.some(t => t.completed);
  if (completedExist) {
    dom.clearCompletedBtn.classList.remove('hidden');
  } else {
    dom.clearCompletedBtn.classList.add('hidden');
  }
};

/* -------------------------------------------------------------
 * Event Handlers & Core Init
 * ------------------------------------------------------------- */

/**
 * Open confirmation modal
 */
const openModal = () => {
  dom.confirmModal.classList.remove('hidden');
  // Keyboard focus management: focus cancel button for safety
  dom.modalCancelBtn.focus();
};

/**
 * Close confirmation modal
 */
const closeModal = () => {
  dom.confirmModal.classList.add('hidden');
};

/**
 * Helper to escape raw HTML text inside templates to prevent XSS injection
 * @param {string} text - Raw input string
 * @returns {string} Sanitized output HTML
 */
const escapeHtml = (text) => {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
};

/**
 * Sets up active UI styling classes on filter buttons
 * @param {string} activeFilter - Filter tag type
 */
const setFilterActiveStyle = (activeFilter) => {
  const filterButtons = dom.filterNav.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    if (btn.dataset.filter === activeFilter) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
};

/**
 * Attach UI event listeners with delegation
 */
const setupListeners = () => {
  // Create Form Listener
  dom.taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = dom.taskInput.value;
    if (title.trim()) {
      addTask(title);
      dom.taskInput.value = '';
    }
  });

  // Filter Buttons Navigation Listener
  dom.filterNav.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (btn) {
      state.filter = btn.dataset.filter;
      // Close active operations
      state.editingId = null;
      state.confirmDeleteId = null;
      setFilterActiveStyle(state.filter);
      render();
    }
  });

  // Event Delegation for Task Items Interactions
  dom.taskList.addEventListener('click', (e) => {
    const target = e.target;
    
    // Find closest list task card wrapper
    const taskItem = target.closest('.task-item');
    if (!taskItem) return;
    const id = taskItem.dataset.id;

    // Detect action button click target types
    const actionEl = target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.dataset.action;

    if (action === 'toggle-complete') {
      toggleTask(id);
    } else if (action === 'start-edit') {
      state.editingId = id;
      state.confirmDeleteId = null; // Close active confirmations
      render();
    } else if (action === 'request-delete') {
      state.confirmDeleteId = id;
      state.editingId = null; // Close active edit states
      render();
    } else if (action === 'confirm-delete') {
      animateDeleteTask(id);
    } else if (action === 'cancel-delete') {
      state.confirmDeleteId = null;
      render();
    }
  });

  // Event Delegation for Double Click to Edit
  dom.taskList.addEventListener('dblclick', (e) => {
    const target = e.target;
    if (target.classList.contains('task-title')) {
      const taskItem = target.closest('.task-item');
      if (taskItem) {
        state.editingId = taskItem.dataset.id;
        state.confirmDeleteId = null;
        render();
      }
    }
  });

  // Handle Input key events inside Editing forms
  dom.taskList.addEventListener('keydown', (e) => {
    const target = e.target;
    if (target.classList.contains('edit-task-input')) {
      const taskItem = target.closest('.task-item');
      if (!taskItem) return;
      const id = taskItem.dataset.id;

      if (e.key === 'Enter') {
        e.preventDefault();
        updateTask(id, target.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        state.editingId = null;
        render();
      }
    }
  });

  // Handle blur / focusout for Editing forms
  dom.taskList.addEventListener('focusout', (e) => {
    const target = e.target;
    if (target.classList.contains('edit-task-input')) {
      const taskItem = target.closest('.task-item');
      if (!taskItem) return;
      const id = taskItem.dataset.id;
      
      // Save changes if the event wasn't fired by a state override (e.g. Escape key re-render)
      if (state.editingId === id) {
        updateTask(id, target.value);
      }
    }
  });

  // Clear Completed Trigger
  dom.clearCompletedBtn.addEventListener('click', openModal);

  // Modal Actions
  dom.modalCancelBtn.addEventListener('click', closeModal);
  dom.modalConfirmBtn.addEventListener('click', () => {
    clearCompleted();
    closeModal();
  });

  // Keyboard navigation & accessibility overrides for overlay click
  dom.confirmModal.addEventListener('click', (e) => {
    if (e.target === dom.confirmModal) {
      closeModal();
    }
  });

  // Global Keyboard Actions
  document.addEventListener('keydown', (e) => {
    // Escape closes modal overlay if active
    if (e.key === 'Escape' && !dom.confirmModal.classList.contains('hidden')) {
      closeModal();
    }
  });

  // Global Click Actions
  document.addEventListener('click', (e) => {
    // Reset confirmation delete panels if clicking elsewhere in body
    if (state.confirmDeleteId) {
      const target = e.target;
      // Close delete confirmation panels if click is not inside the task action buttons
      if (!target.closest('.confirm-delete-container') && !target.closest('.btn-delete')) {
        state.confirmDeleteId = null;
        render();
      }
    }
  });
};

/**
 * Initializes TaskFlow
 */
const init = () => {
  state.tasks = loadTasks();
  setupListeners();
  render();
};

// Start the Application
document.addEventListener('DOMContentLoaded', init);
