import { useSyncExternalStore } from "react";

const STORAGE_KEY = "effects-paused";

type Listener = () => void;

const listeners = new Set<Listener>();

function readInitial(): boolean {
  try {
    if (typeof sessionStorage === "undefined") return false;
    return sessionStorage.getItem(STORAGE_KEY) === "true";
  } catch (error) {
    reportError(error);
    return false;
  }
}

let paused = readInitial();

export function getEffectsPaused(): boolean {
  return paused;
}

export function setEffectsPaused(value: boolean): void {
  paused = value;
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(STORAGE_KEY, String(value));
    }
  } catch (error) {
    reportError(error);
  }
  for (const listener of listeners) listener();
}

export function subscribeEffectsPaused(callback: Listener): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function useEffectsPaused(): boolean {
  return useSyncExternalStore(
    subscribeEffectsPaused,
    getEffectsPaused,
    () => false,
  );
}
