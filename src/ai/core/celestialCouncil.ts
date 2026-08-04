// src/ai/core/celestialCouncil.ts

import {
  CELESTIAL_COUNCIL,
  CelestialIdentity,
  CelestialModuleId,
  getCelestialIdentity,
  isCelestialModuleId,
} from "./kairosSovereignty";

export function listCelestialCouncil(): CelestialIdentity[] {
  return [...CELESTIAL_COUNCIL];
}

export function getCelestialCouncilMember(
  moduleId: CelestialModuleId
): CelestialIdentity | null {
  return getCelestialIdentity(moduleId);
}

export function requireCelestialCouncilMember(
  moduleId: string
): CelestialIdentity {
  if (!isCelestialModuleId(moduleId)) {
    throw new Error("INVALID_CELESTIAL_MODULE");
  }

  const member = getCelestialIdentity(moduleId);
  if (!member) {
    throw new Error("CELESTIAL_MEMBER_NOT_FOUND");
  }

  return member;
}

export function celestialExists(moduleId: string): boolean {
  return isCelestialModuleId(moduleId);
}
