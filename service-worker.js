/* eslint-disable no-undef */
const CACHE_NAME = "simple-timer-136b8bc0d3f9";
const APP_SHELL = [
  "./",
  "./index.html",
  "./assets/core/constants.js",
  "./assets/core/events.js",
  "./assets/core/lifecycle.js",
  "./assets/core/state.js",
  "./assets/features/backup/backup.js",
  "./assets/features/backup/state.js",
  "./assets/features/history/duration.js",
  "./assets/features/history/editor.js",
  "./assets/features/history/export.js",
  "./assets/features/history/format.js",
  "./assets/features/history/list.js",
  "./assets/features/history/memos.js",
  "./assets/features/history/recording.js",
  "./assets/features/history/state.js",
  "./assets/features/history/summary.js",
  "./assets/features/popup/state.js",
  "./assets/features/popup/window.js",
  "./assets/features/settings/events.js",
  "./assets/features/settings/settings.js",
  "./assets/features/settings/state.js",
  "./assets/features/tasks/state.js",
  "./assets/features/tasks/tasks.js",
  "./assets/features/timer/audio-state.js",
  "./assets/features/timer/audio.js",
  "./assets/features/timer/clock.js",
  "./assets/features/timer/controls.js",
  "./assets/features/timer/countdown.js",
  "./assets/features/timer/day.js",
  "./assets/features/timer/events.js",
  "./assets/features/timer/model.js",
  "./assets/features/timer/pomodoro.js",
  "./assets/features/timer/state.js",
  "./assets/features/timer/tabs.js",
  "./assets/features/timer/view.js",
  "./assets/features/todos/todos.js",
  "./assets/main.js",
  "./assets/shared/download.js",
  "./assets/shared/time.js",
  "./assets/storage/client.js",
  "./assets/storage/repository.js",
  "./assets/storage/shared-storage.js",
  "./assets/styles.css",
  "./assets/ui/activation.js",
  "./assets/ui/elements.js",
  "./assets/ui/events.js",
  "./assets/ui/keyboard.js",
  "./assets/ui/toast-state.js",
  "./assets/ui/toast.js",
  "./manifest.webmanifest",
  "./icon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const cached = await caches.match(event.request);
        if (cached) return cached;
        if (event.request.mode === "navigate")
          return caches.match("./index.html");
        throw new Error("Offline resource is not cached");
      }),
  );
});
