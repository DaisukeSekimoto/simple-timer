import { test, expect } from "@playwright/test";

async function openApp(page) {
  await page.goto("./");
  await expect(page.locator("#start-pause-button")).toHaveText("開始");
}
async function addTodo(page, text, date = "") {
  await page.locator("#todo-text").fill(text);
  await page.locator("#todo-due").fill(date);
  await page.locator("#todo-form button[type=submit]").click();
}

test("startup, Todo dates, deletion, theme and refresh", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.clock.setFixedTime(new Date("2026-09-12T12:00:00+09:00"));
  await openApp(page);
  await page.locator("#todo-button").click();
  await addTodo(page, "今日のTodo", "2026-09-12");
  await addTodo(page, "期限超過", "2026-09-11");
  await addTodo(page, "期限なし");
  await expect(page.locator(".todo-item.is-due-today")).toContainText(
    "今日のTodo",
  );
  await expect(page.locator(".todo-item.is-overdue")).toContainText("期限超過");
  await expect(page.locator(".todo-item")).toHaveCount(3);
  await page.reload();
  await page.locator("#todo-button").click();
  await expect(page.locator(".todo-item")).toHaveCount(3);
  await page
    .getByRole("button", { name: "期限超過を削除", exact: true })
    .click();
  await expect(page.locator(".todo-item")).toHaveCount(2);
  await page.locator("#close-todo-button").click();
  await page.locator("#settings-button").click();
  await page.locator("#theme-select").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  expect(errors).toEqual([]);
});

test("independent browser tabs keep Todo additions and paused timer state", async ({
  page,
  context,
}) => {
  const errors = [];
  context.on("page", (p) => p.on("pageerror", (e) => errors.push(e.message)));
  await openApp(page);
  const other = await context.newPage();
  await openApp(other);
  await page.locator("#todo-button").click();
  await other.locator("#todo-button").click();
  await Promise.all([addTodo(page, "Aから追加"), addTodo(other, "Bから追加")]);
  await expect(page.locator(".todo-item")).toHaveCount(2);
  await expect(other.locator(".todo-item")).toHaveCount(2);
  await page.locator("#close-todo-button").click();
  await other.locator("#close-todo-button").click();
  await page.locator("#task-button").click();
  await page.locator("#task-input").fill("タブA");
  await page
    .locator("#task-dialog-form")
    .evaluate((form) => form.requestSubmit());
  await page.locator("#start-pause-button").click();
  await expect(page.locator("#start-pause-button")).toHaveText("一時停止");
  await page.locator("#start-pause-button").click();
  await other.locator("#task-button").click();
  await other.locator("#task-input").fill("タブB");
  await other
    .locator("#task-dialog-form")
    .evaluate((form) => form.requestSubmit());
  await page.reload();
  await expect(page.locator("#task-name-display")).toHaveText("タブA");
  await expect(other.locator("#task-name-display")).toHaveText("タブB");
  expect(errors).toEqual([]);
});

test("history manual add, edit, memo, summary and backup roundtrip", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await openApp(page);
  await page.locator("#history-button").click();
  await page.locator("#add-history-button").click();
  await page.locator("#manual-task-input").fill("リファクタリング");
  await page.locator("#manual-minutes-input").fill("10");
  await page
    .locator("#add-history-form")
    .evaluate((form) => form.requestSubmit());
  await expect(page.locator("#history-list .history-item")).toHaveCount(1);
  await page.locator("#history-list .history-item").click();
  await page.locator("#edit-task-input").fill("編集済み");
  await page
    .locator("#edit-history-form")
    .evaluate((form) => form.requestSubmit());
  await expect(page.locator("#history-list")).toContainText("編集済み");
  await page.locator("#history-summary").click();
  await page.locator("#clock-in-input").fill("09:00");
  await page.locator("#clock-out-input").fill("18:00");
  await page.locator("#clock-out-input").blur();
  await expect(page.locator("#work-summary-task-table")).toContainText(
    "編集済み",
  );
  await expect(page.locator("#break-time-input")).toHaveValue("01:00");
  await page.locator("#work-summary-dialog .close-dialog").click();
  await page.locator("#daily-memo-input").fill("今日のメモ");
  await expect(page.locator("#daily-memo-status")).toHaveText("保存しました");
  await page.locator("#history-dialog .close-dialog").click();
  await page.locator("#settings-button").click();
  page.on("dialog", (dialog) => dialog.accept());
  const downloadPromise = page.waitForEvent("download");
  await page.locator("#backup-export-button").click();
  const download = await downloadPromise;
  const filepath = await download.path();
  await page.locator("#backup-file-input").setInputFiles(filepath);
  await page.locator("#merge-backup-import-button").click();
  await expect(page.locator("#start-pause-button")).toHaveText("開始");
  await page.locator("#history-button").click();
  await expect(page.locator("#history-list")).toContainText("編集済み");
  await expect(page.locator("#daily-memo-input")).toHaveValue("今日のメモ");
  expect(errors).toEqual([]);
});

test("daily history is displayed with the latest end time first", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-09-12T12:00:00+09:00"));
  await openApp(page);
  await page.locator("#history-button").click();

  const addHistory = async (taskName, startTime, endTime) => {
    await page.locator("#add-history-button").click();
    await page.locator("#manual-task-input").fill(taskName);
    await page.locator("#manual-start-time-input").fill(startTime);
    await page.locator("#manual-end-time-input").fill(endTime);
    await page
      .locator("#add-history-form")
      .evaluate((form) => form.requestSubmit());
  };

  await addHistory("終了1時", "00:00", "01:00");
  await addHistory("終了9時2分", "08:02", "09:02");
  await addHistory("終了2時", "00:30", "02:00");

  await expect(page.locator("#history-list .history-item strong")).toHaveText([
    "終了9時2分",
    "終了2時",
    "終了1時",
  ]);
});

test("CSP blocks script connections and offline reload still starts", async ({
  page,
  context,
}) => {
  await openApp(page);
  expect(
    await page.evaluate(async () => {
      try {
        await fetch("/blocked-connection");
        return false;
      } catch {
        return true;
      }
    }),
  ).toBe(true);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator("#start-pause-button")).toHaveText("開始");
  await page.locator("#todo-button").click();
  await addTodo(page, "オフラインTodo");
  await expect(page.locator("#todo-list")).toContainText("オフラインTodo");
});

test("countdown recording and history resume update the original record", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.clock.install({ time: new Date("2026-09-12T12:00:00+09:00") });
  await openApp(page);
  await page.locator("#task-button").click();
  await page.locator("#task-input").fill("計測から記録");
  await page
    .locator("#task-dialog-form")
    .evaluate((form) => form.requestSubmit());
  await page.locator("#countdown-duration-button").click();
  await page.locator("#minutes-input").fill("2");
  await page
    .locator("#countdown-duration-form")
    .evaluate((form) => form.requestSubmit());
  await expect(page.locator("#time-display")).toHaveText("00:02:00");
  await page.locator("#start-pause-button").click();
  await page.clock.fastForward(60000);
  await page.locator("#start-pause-button").click();
  await page.locator("#next-task-button").click();
  await page.locator("#history-button").click();
  await expect(page.locator("#history-list .history-item")).toHaveCount(1);
  await expect(page.locator("#history-list")).toContainText("1分");
  await page.locator("#history-list .history-item").click();
  await page.locator("#resume-history-button").click();
  await page.locator("#confirm-resume-history-button").click();
  await expect(page.locator("#history-resume-indicator")).toBeVisible();
  await page.clock.fastForward(30000);
  await page.locator("#start-pause-button").click();
  await page.locator("#next-task-button").click();
  await page.locator("#history-button").click();
  await expect(page.locator("#history-list .history-item")).toHaveCount(1);
  await expect(page.locator("#history-list")).toContainText("計測から記録");
  expect(errors).toEqual([]);
});

test("popup uses the bundled stylesheet and can register a Todo", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "documentPictureInPicture", {
      value: undefined,
      configurable: true,
    }),
  );
  await openApp(page);
  const popupPromise = page.waitForEvent("popup");
  await page.locator("#popup-button").click();
  const popup = await popupPromise;
  await expect(popup.locator("body")).toHaveClass(/is-popup/);
  await expect(popup.locator("link[rel=stylesheet]")).toHaveAttribute(
    "href",
    "./assets/styles.css",
  );
  await popup.locator("#todo-button").click();
  await addTodo(popup, "小窓から追加");
  await expect(popup.locator("#todo-list")).toContainText("小窓から追加");
});

test("Document PiP keeps Todo inside its window and hides the button when minimized", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openApp(page);
  const popupPromise = page.waitForEvent("popup");
  await page.locator("#popup-button").click();
  const pip = await popupPromise;
  pip.on("pageerror", (error) => errors.push(error.message));
  // This must exercise Document PiP, not the separate-window fallback.
  expect(
    await page.evaluate(() => Boolean(window.documentPictureInPicture?.window)),
  ).toBe(true);
  await expect(page.locator("#todo-dialog")).toHaveCount(0);
  await expect(pip.locator("#todo-button")).toBeVisible();
  await pip.locator("#todo-button").click();
  await expect(pip.locator("#todo-dialog")).toBeVisible();
  await addTodo(pip, "PiPで登録", "2026-09-12");
  await expect(pip.locator("#todo-list")).toContainText("PiPで登録");
  // Let the main window's date timer run while the DOM lives in PiP.
  await expect
    .poll(() => page.evaluate(() => document.querySelector(".app")))
    .toBeNull();
  await pip
    .getByRole("button", { name: "PiPで登録を削除", exact: true })
    .click();
  await expect(pip.locator(".todo-item")).toHaveCount(0);
  await addTodo(pip, "PiPを閉じても保持");
  await pip.locator("#close-todo-button").click();
  await pip.locator("#minimize-button").click();
  await expect(pip.locator("body")).toHaveClass(/is-minimized/);
  await expect(pip.locator("#todo-button")).toBeHidden();
  await pip.locator("#minimize-button").click();
  await expect(pip.locator("#todo-button")).toBeVisible();
  await pip.locator("#todo-button").click();
  await pip.close();
  await expect(page.locator("#todo-button")).toBeVisible();
  await page.locator("#todo-button").click();
  await expect(page.locator("#todo-dialog")).toBeVisible();
  await expect(page.locator("#todo-list")).toContainText("PiPを閉じても保持");
  expect(errors).toEqual([]);
});
