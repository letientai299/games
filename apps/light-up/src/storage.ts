import type { Profile } from "./constants";

const STORAGE_KEY = "memory-profiles";

export function loadProfiles(): Profile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Profile[];
  } catch {
    return [];
  }
}

function saveProfiles(profiles: Profile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

export function createProfile(name: string): Profile {
  const profiles = loadProfiles();
  const profile: Profile = { name, level: 1, streak: 0, streakType: "correct" };
  profiles.push(profile);
  saveProfiles(profiles);
  return profile;
}

export function deleteProfile(name: string): void {
  const profiles = loadProfiles().filter((p) => p.name !== name);
  saveProfiles(profiles);
}

export function updateProfile(profile: Profile): void {
  const profiles = loadProfiles();
  const idx = profiles.findIndex((p) => p.name === profile.name);
  if (idx >= 0) profiles[idx] = profile;
  saveProfiles(profiles);
}

export function getProfile(name: string): Profile | undefined {
  return loadProfiles().find((p) => p.name === name);
}
