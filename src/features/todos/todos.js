import { TODOS_KEY } from "../../core/constants.js";
import { localDateKey } from "../../shared/time.js";
import { storage } from "../../storage/client.js";

export function renderTodos() {
  const list = document.querySelector("#todo-list");
  list.replaceChildren();
  const today = localDateKey();
  list.dataset.date = today;
  const todos = JSON.parse(storage.getItem(TODOS_KEY) || "[]");
  todos.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  if (!todos.length) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "Todoはまだありません";
    list.append(empty);
  }
  for (const todo of todos) {
    const row = document.createElement("div");
    row.className = "history-item todo-item";
    row.classList.toggle("is-due-today", todo.due === today);
    row.classList.toggle("is-overdue", Boolean(todo.due) && todo.due < today);
    const details = document.createElement("div");
    details.className = "history-item-details";
    const text = document.createElement("strong");
    text.textContent = todo.text;
    const deadline = document.createElement("small");
    deadline.className = "history-item-meta";
    deadline.textContent = `期限：${todo.due || "未指定"}`;
    details.append(text, deadline);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button";
    button.textContent = "削除";
    button.setAttribute("aria-label", `${todo.text}を削除`);
    button.addEventListener("click", () => {
      const latest = JSON.parse(storage.getItem(TODOS_KEY));
      storage.setItem(
        TODOS_KEY,
        JSON.stringify(latest.filter((item) => item.id !== todo.id)),
      );
      renderTodos();
    });
    row.append(details, button);
    list.append(row);
  }
}

export function initializeTodos() {
  const dialog = document.querySelector("#todo-dialog");
  document.querySelector("#todo-button").addEventListener("click", () => {
    renderTodos();
    dialog.showModal();
  });
  document
    .querySelector("#close-todo-button")
    .addEventListener("click", () => dialog.close());
  document.querySelector("#todo-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.querySelector("#todo-text");
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }
    const todos = JSON.parse(storage.getItem(TODOS_KEY));
    todos.push({
      id: crypto.randomUUID(),
      text,
      due: document.querySelector("#todo-due").value,
    });
    storage.setItem(TODOS_KEY, JSON.stringify(todos));
    event.target.reset();
    renderTodos();
    input.focus();
  });
}
