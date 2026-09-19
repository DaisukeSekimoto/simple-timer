import { createTimerStorage } from "./shared-storage.js";

export const storage = createTimerStorage(
  window.localStorage,
  window.sessionStorage,
);
