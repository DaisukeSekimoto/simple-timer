import { getFinishSoundVolume } from "../settings/settings.js";
import { audioSession } from "./audio-state.js";

export function playFinishSound() {
  try {
    const volume = getFinishSoundVolume();
    if (volume <= 0) return;
    audioSession.audioContext = audioSession.audioContext || new AudioContext();
    const oscillator = audioSession.audioContext.createOscillator();
    const gain = audioSession.audioContext.createGain();
    const relativeVolume =
      volume <= 50 ? volume / 50 : 1 + ((volume - 50) / 50) * 9;
    const peakGain = 0.08 * relativeVolume;
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, audioSession.audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      peakGain,
      audioSession.audioContext.currentTime + 0.02,
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      audioSession.audioContext.currentTime + 0.35,
    );
    oscillator.connect(gain);
    gain.connect(audioSession.audioContext.destination);
    oscillator.start();
    oscillator.stop(audioSession.audioContext.currentTime + 0.38);
  } catch {
    /* 音声が使えなくても完了表示は維持する */
  }
}

export function startCountdownAlert() {
  if (audioSession.finishSoundIntervalId) return;
  playFinishSound();
  audioSession.finishSoundIntervalId = window.setInterval(playFinishSound, 900);
}

export function stopCountdownAlert() {
  if (!audioSession.finishSoundIntervalId) return;
  window.clearInterval(audioSession.finishSoundIntervalId);
  audioSession.finishSoundIntervalId = 0;
}
