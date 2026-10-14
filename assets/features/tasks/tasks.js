import { state } from "../../core/state.js";
import { moveToNextTask } from "../history/recording.js";
import { isAggregationEnabled } from "../settings/settings.js";
import { tasksSession } from "./state.js";
import { render } from "../timer/view.js";
import { loadRecords, saveState } from "../../storage/repository.js";
import { elements } from "../../ui/elements.js";

export function normalizeTaskName(value) {
  return value.trim().replace(/\s+/g, " ").slice(0, 80);
}

export function taskNameDistance(left, right) {
  const a = Array.from(left.toLocaleLowerCase("ja"));
  const b = Array.from(right.toLocaleLowerCase("ja"));
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let row = 0; row < a.length; row += 1) {
    const current = [row + 1];
    for (let column = 0; column < b.length; column += 1) {
      current.push(
        Math.min(
          current[column] + 1,
          previous[column + 1] + 1,
          previous[column] + (a[row] === b[column] ? 0 : 1),
        ),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[b.length];
}

export function existingTaskNames() {
  const names = [];
  [
    ...state.records.map((record) => record.taskName),
    ...state.timerTabs.map((tab) => tab.taskName),
  ]
    .map(normalizeTaskName)
    .filter(Boolean)
    .forEach((name) => {
      if (
        !names.some(
          (existing) =>
            existing.toLocaleLowerCase("ja") === name.toLocaleLowerCase("ja"),
        )
      )
        names.push(name);
    });
  return names;
}

export function resolveTaskName(name) {
  const normalizedName = normalizeTaskName(name);
  if (!normalizedName || !isAggregationEnabled()) return normalizedName;
  const comparableName = normalizedName.toLocaleLowerCase("ja");
  const names = existingTaskNames();
  const exactMatch = names.find(
    (existing) => existing.toLocaleLowerCase("ja") === comparableName,
  );
  if (exactMatch) return exactMatch;
  const similarName = names
    .map((existing) => {
      const comparableExisting = existing.toLocaleLowerCase("ja");
      const maximumLength = Math.max(
        Array.from(comparableName).length,
        Array.from(comparableExisting).length,
      );
      const distance = taskNameDistance(comparableName, comparableExisting);
      const contains =
        Math.min(
          Array.from(comparableName).length,
          Array.from(comparableExisting).length,
        ) >= 3 &&
        (comparableName.includes(comparableExisting) ||
          comparableExisting.includes(comparableName));
      return { existing, distance, maximumLength, contains };
    })
    .filter(
      (candidate) =>
        candidate.contains ||
        candidate.distance <=
          Math.max(1, Math.floor(candidate.maximumLength * 0.25)),
    )
    .sort((a, b) => a.distance - b.distance)[0];
  if (!similarName) return normalizedName;
  const shouldUnify = elements.app.ownerDocument.defaultView.confirm(
    `入力した「${normalizedName}」は、既存の「${similarName.existing}」と似ています。\n\n` +
      "同じタスクとして既存名に統一しますか？\nOK：既存名に統一 ／ キャンセル：別タスクとして使用",
  );
  return shouldUnify ? similarName.existing : normalizedName;
}

export function recentTaskNames() {
  const latestTasks = new Map();
  state.records.forEach((record, index) => {
    const taskName = normalizeTaskName(record.taskName);
    if (!taskName) return;
    const timestamps = [record.registeredAt, record.updatedAt, record.createdAt]
      .map((value) => Date.parse(value))
      .filter(Number.isFinite);
    const usedAt = timestamps.length ? Math.max(...timestamps) : index;
    const previous = latestTasks.get(taskName);
    if (
      !previous ||
      usedAt > previous.usedAt ||
      (usedAt === previous.usedAt && index > previous.index)
    ) {
      latestTasks.set(taskName, { taskName, usedAt, index });
    }
  });
  const names = [...latestTasks.values()]
    .sort(
      (left, right) =>
        right.usedAt - left.usedAt || right.index - left.index,
    )
    .map((task) => task.taskName);
  const currentTaskName = normalizeTaskName(state.taskName);
  if (currentTaskName) {
    const currentIndex = names.indexOf(currentTaskName);
    if (currentIndex >= 0) names.splice(currentIndex, 1);
    names.unshift(currentTaskName);
  }
  return names.slice(0, 10);
}

export function renderRecentTasks(list, input) {
  loadRecords();
  list.replaceChildren();
  const names = recentTaskNames();
  if (!names.length) {
    const empty = document.createElement("p");
    empty.className = "empty-message";
    empty.textContent = "履歴はまだありません";
    list.append(empty);
    return;
  }
  names.forEach((name) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "recent-task-button";
    button.textContent = name;
    button.addEventListener("click", () => {
      input.value = name;
      input.focus();
    });
    list.append(button);
  });
}

export function openTaskDialog(recordAfterInput = false) {
  tasksSession.pendingRecordAfterTaskInput = recordAfterInput === true;
  elements.taskInput.value = state.taskName;
  elements.taskMemoInput.value = state.taskMemo;
  renderRecentTasks(elements.recentTaskList, elements.taskInput);
  elements.taskDialog.showModal();
  window.setTimeout(() => elements.taskInput.focus(), 0);
}

export function setTask(name, memo = "") {
  state.taskName = resolveTaskName(name);
  state.taskMemo = memo.trim().slice(0, 300);
  saveState();
  render();
}

export function bindTasksEvents() {
  elements.taskButton.addEventListener("click", () => openTaskDialog(false));
  elements.taskDialogForm.addEventListener("submit", (event) => {
    event.preventDefault();
    setTask(elements.taskInput.value, elements.taskMemoInput.value);
    if (!state.taskName) return;
    const shouldRecord = tasksSession.pendingRecordAfterTaskInput;
    tasksSession.pendingRecordAfterTaskInput = false;
    elements.taskDialog.close();
    if (shouldRecord) moveToNextTask();
  });
  elements.taskDialog.addEventListener("close", () => {
    tasksSession.pendingRecordAfterTaskInput = false;
  });
}
