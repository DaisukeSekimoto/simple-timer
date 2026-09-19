import { elements } from "../../ui/elements.js";
import { TODOS_KEY } from "../../core/constants.js";
import { localDateKey } from "../../shared/time.js";
import { storage } from "../../storage/client.js";

export function renderTodos() {
  const list = elements.todoList;
  list.replaceChildren();
  const today = localDateKey();
  list.dataset.date = today;
  const todos = JSON.parse(storage.getItem(TODOS_KEY) || "[]");
  todos.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  if (!todos.length) {
    const empty = list.ownerDocument.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "Todoはまだありません";
    list.append(empty);
  }
  for (const todo of todos) {
    const row = list.ownerDocument.createElement("div");
    row.className = "history-item todo-item";
    row.classList.toggle("is-due-today", todo.due === today);
    row.classList.toggle("is-overdue", Boolean(todo.due) && todo.due < today);
    const details = list.ownerDocument.createElement("div");
    details.className = "history-item-details";
    const text = list.ownerDocument.createElement("strong");
    text.textContent = todo.text;
    const deadline = list.ownerDocument.createElement("small");
    deadline.className = "history-item-meta";
    deadline.textContent = `期限：${todo.due || "未指定"}`;
    details.append(text, deadline);
    const button = list.ownerDocument.createElement("button");
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
  const dialog = elements.todoDialog;
  elements.todoButton.addEventListener("click", () => {
    renderTodos();
    dialog.showModal();
  });
  elements.todoCloseButton.addEventListener("click", () => dialog.close());
  elements.todoForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = elements.todoText;
    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }
    const todos = JSON.parse(storage.getItem(TODOS_KEY));
    todos.push({
      id: crypto.randomUUID(),
      text,
      due: elements.todoDue.value,
    });
    storage.setItem(TODOS_KEY, JSON.stringify(todos));
    event.target.reset();
    renderTodos();
    input.focus();
  });
}
