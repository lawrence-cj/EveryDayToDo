const storageKey = "everyday-todo.tasks";
const templates = Array.isArray(window.EveryDayToDoTemplates) ? window.EveryDayToDoTemplates : [];
const state = {
  filter: "today",
  tasks: loadTasks(),
  templateQuery: "",
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const shortDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
});

const elements = {
  clearCompleted: document.querySelector("#clear-completed"),
  completedTotal: document.querySelector("#completed-total"),
  emptyState: document.querySelector("#empty-state"),
  filters: document.querySelectorAll(".filter"),
  form: document.querySelector("#task-form"),
  list: document.querySelector("#task-list"),
  listSummary: document.querySelector("#list-summary"),
  listTitle: document.querySelector("#list-title"),
  priority: document.querySelector("#task-priority"),
  progressCount: document.querySelector("#progress-count"),
  taskDate: document.querySelector("#task-date"),
  taskTemplate: document.querySelector("#task-template"),
  taskTitle: document.querySelector("#task-title"),
  todayDate: document.querySelector("#today-date"),
  todayTotal: document.querySelector("#today-total"),
  upcomingTotal: document.querySelector("#upcoming-total"),
  allTotal: document.querySelector("#all-total"),
  closeTemplates: document.querySelector("#close-templates"),
  openTemplates: document.querySelector("#open-templates"),
  templateDialog: document.querySelector("#template-dialog"),
  templateDate: document.querySelector("#template-date"),
  templateList: document.querySelector("#template-list"),
  templateSearch: document.querySelector("#template-search"),
};

function localDateString(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function loadTasks() {
  try {
    const storedTasks = JSON.parse(localStorage.getItem(storageKey));
    return Array.isArray(storedTasks) ? storedTasks : [];
  } catch {
    return [];
  }
}

function saveTasks() {
  localStorage.setItem(storageKey, JSON.stringify(state.tasks));
}

function getVisibleTasks() {
  const today = localDateString();

  return state.tasks
    .filter((task) => {
      if (state.filter === "today") return task.date === today && !task.completed;
      if (state.filter === "upcoming") return task.date > today && !task.completed;
      if (state.filter === "completed") return task.completed;
      return true;
    })
    .sort((first, second) => {
      if (first.completed !== second.completed) return Number(first.completed) - Number(second.completed);
      if (first.date !== second.date) return first.date.localeCompare(second.date);
      return first.createdAt.localeCompare(second.createdAt);
    });
}

function pluralize(count, singular, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function renderCounts() {
  const today = localDateString();
  const activeTasks = state.tasks.filter((task) => !task.completed);
  const completed = state.tasks.filter((task) => task.completed);
  const todayTasks = activeTasks.filter((task) => task.date === today);
  const upcomingTasks = activeTasks.filter((task) => task.date > today);
  const doneToday = state.tasks.filter((task) => task.date === today && task.completed);

  elements.todayTotal.textContent = todayTasks.length;
  elements.upcomingTotal.textContent = upcomingTasks.length;
  elements.allTotal.textContent = state.tasks.length;
  elements.completedTotal.textContent = completed.length;
  elements.progressCount.textContent = `${doneToday.length}/${todayTasks.length + doneToday.length}`;
  elements.clearCompleted.disabled = completed.length === 0;
}

function renderTask(task) {
  const fragment = elements.taskTemplate.content.cloneNode(true);
  const item = fragment.querySelector(".task-item");
  const toggle = fragment.querySelector(".task-toggle");
  const title = fragment.querySelector(".task-title");
  const date = fragment.querySelector(".task-date");
  const priority = fragment.querySelector(".task-priority");
  const removeButton = fragment.querySelector(".delete-button");

  item.dataset.id = task.id;
  item.classList.toggle("is-complete", task.completed);
  toggle.checked = task.completed;
  toggle.setAttribute("aria-label", task.completed ? "Mark task incomplete" : "Mark task complete");
  title.textContent = task.title;
  date.dateTime = task.date;
  date.textContent = task.date === localDateString() ? "Today" : shortDateFormatter.format(new Date(`${task.date}T12:00:00`));
  priority.textContent = task.priority;
  priority.classList.add(task.priority);
  removeButton.addEventListener("click", () => deleteTask(task.id));
  toggle.addEventListener("change", () => toggleTask(task.id));

  return fragment;
}

function getFilterCopy(count) {
  const copy = {
    today: ["Today", pluralize(count, "task")],
    upcoming: ["Upcoming", pluralize(count, "task")],
    all: ["All tasks", pluralize(count, "task")],
    completed: ["Completed", pluralize(count, "task")],
  };

  return copy[state.filter];
}

function render() {
  const visibleTasks = getVisibleTasks();
  const [title, summary] = getFilterCopy(visibleTasks.length);

  elements.list.replaceChildren(...visibleTasks.map(renderTask));
  elements.listTitle.textContent = title;
  elements.listSummary.textContent = summary;
  elements.emptyState.hidden = visibleTasks.length !== 0;

  elements.filters.forEach((filter) => {
    filter.classList.toggle("is-active", filter.dataset.filter === state.filter);
  });

  renderCounts();
}

function createTask(event) {
  event.preventDefault();
  const title = elements.taskTitle.value.trim();

  if (!title) {
    elements.taskTitle.focus();
    return;
  }

  const id = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  state.tasks.unshift({
    id,
    title,
    date: elements.taskDate.value,
    priority: elements.priority.value,
    completed: false,
    createdAt: new Date().toISOString(),
  });

  saveTasks();
  elements.form.reset();
  elements.taskDate.value = localDateString();
  elements.taskTitle.focus();
  render();
}

function toggleTask(id) {
  state.tasks = state.tasks.map((task) => task.id === id ? { ...task, completed: !task.completed } : task);
  saveTasks();
  render();
}

function deleteTask(id) {
  state.tasks = state.tasks.filter((task) => task.id !== id);
  saveTasks();
  render();
}

function clearCompleted() {
  state.tasks = state.tasks.filter((task) => !task.completed);
  saveTasks();
  render();
}

function applyTemplate(template) {
  const date = elements.taskDate.value || localDateString();
  const createdAt = new Date().toISOString();
  const templateTasks = template.tasks.map((task) => ({
    id: typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title: task.title,
    date,
    priority: task.priority,
    completed: false,
    createdAt,
  }));

  state.tasks.unshift(...templateTasks);
  saveTasks();
  elements.templateDialog.close();
  state.filter = date === localDateString() ? "today" : "all";
  render();
}

function renderTemplates() {
  const normalizedQuery = state.templateQuery.trim().toLowerCase();
  const matchingTemplates = templates.filter((template) => {
    const searchableContent = [
      template.title,
      template.category,
      template.description,
      ...template.tasks.map((task) => task.title),
    ].join(" ").toLowerCase();

    return searchableContent.includes(normalizedQuery);
  });

  const cards = matchingTemplates.map((template) => {
    const button = document.createElement("button");
    const title = document.createElement("strong");
    const category = document.createElement("small");
    const description = document.createElement("span");

    button.className = "template-card";
    button.type = "button";
    title.textContent = template.title;
    category.className = "template-category";
    category.textContent = template.category || "General";
    description.textContent = template.description;
    button.append(title, category, description);
    button.addEventListener("click", () => applyTemplate(template));
    return button;
  });

  elements.templateList.replaceChildren(...cards);
}

function openTemplateDialog() {
  const selectedDate = elements.taskDate.value || localDateString();
  elements.templateDate.textContent = dateFormatter.format(new Date(`${selectedDate}T12:00:00`));
  elements.templateDialog.showModal();
}

function initialize() {
  elements.todayDate.textContent = dateFormatter.format(new Date());
  elements.taskDate.value = localDateString();
  elements.form.addEventListener("submit", createTask);
  elements.clearCompleted.addEventListener("click", clearCompleted);
  elements.openTemplates.addEventListener("click", openTemplateDialog);
  elements.closeTemplates.addEventListener("click", () => elements.templateDialog.close());
  elements.templateSearch.addEventListener("input", (event) => {
    state.templateQuery = event.target.value;
    renderTemplates();
  });
  elements.filters.forEach((filter) => {
    filter.addEventListener("click", () => {
      state.filter = filter.dataset.filter;
      render();
    });
  });
  renderTemplates();
  render();
}

initialize();
