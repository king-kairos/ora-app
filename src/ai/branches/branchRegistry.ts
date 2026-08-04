export type OraBranch = {
  branchId: string;
  name: string;
  route: string;
  observerEssence: string;
  cloneEssence: string;
  status: "active" | "seed" | "draft";
  expectedModules: string[];
};

export const ORA_BRANCH_REGISTRY: OraBranch[] = [
  {
    branchId: "presence",
    name: "ORA Presence",
    route: "/presence",
    observerEssence: "kaerliana",
    cloneEssence: "presence-clone",
    status: "active",
    expectedModules: ["dashboard", "community", "crisis", "emotional-log", "meditation", "library"],
  },
  {
    branchId: "security",
    name: "ORA Security",
    route: "/security",
    observerEssence: "ignis",
    cloneEssence: "security-clone",
    status: "active",
    expectedModules: ["dashboard", "cameras", "events", "alerts", "zones", "permissions"],
  },
  {
    branchId: "health",
    name: "ORA Health",
    route: "/health",
    observerEssence: "rafael",
    cloneEssence: "health-clone",
    status: "active",
    expectedModules: ["dashboard", "patients", "doctors", "consultations", "recipes", "analytics"],
  },
  {
    branchId: "agriculture",
    name: "ORA Agriculture",
    route: "/agriculture",
    observerEssence: "ignis",
    cloneEssence: "agriculture-clone",
    status: "seed",
    expectedModules: ["dashboard", "crops", "sensors", "irrigation", "pests", "inventory"],
  },
  {
    branchId: "marketing",
    name: "ORA Marketing",
    route: "/marketing",
    observerEssence: "arturo",
    cloneEssence: "marketing-clone",
    status: "seed",
    expectedModules: ["dashboard", "campaigns", "leads", "clients", "funnel", "analytics"],
  },
];
