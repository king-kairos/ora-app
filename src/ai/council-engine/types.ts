import type {
  CelestialModuleId,
} from "../core/kairosSovereignty";

export type ActiveCouncilModuleId =
  Exclude<CelestialModuleId, "lucian">;

export type CouncilSpecialty =
  | "coherence"
  | "human-purpose"
  | "strategy"
  | "architecture"
  | "implementation"
  | "programming"
  | "integration"
  | "ux"
  | "design"
  | "security"
  | "risk"
  | "performance"
  | "analysis"
  | "patterns"
  | "verification";

export type CouncilVote = {
  essence: ActiveCouncilModuleId;
  score: number;
  reason: string;
  specialties: CouncilSpecialty[];
};

export type CouncilDecision = {
  leader: ActiveCouncilModuleId;
  team: ActiveCouncilModuleId[];
  votes: CouncilVote[];
  confidence: number;
  reason: string;
  intent: string;
  generatedAt: string;
};

export type CouncilRoleDefinition = {
  essence: ActiveCouncilModuleId;
  title: string;
  mission: string;
  specialties: CouncilSpecialty[];
  baseScore: number;
};
