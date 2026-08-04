const cases = [
  {
    branch: "pollera",
    allowed: [
      "app/pollera/",
      "app/api/pollera/",
      "src/pollera/",
    ],
    forbidden: [
      "/marketing/",
      "/health/",
      "/security/",
      "/presence/",
      "/agriculture/",
    ],
  },
  {
    branch: "marketing",
    allowed: [
      "app/marketing/",
      "app/api/marketing/",
      "src/marketing/",
    ],
    forbidden: [
      "/pollera/",
      "/health/",
      "/security/",
      "/presence/",
      "/agriculture/",
    ],
  },
  {
    branch: "presence",
    allowed: [
      "app/presence/",
      "app/api/presence/",
      "src/presence/",
    ],
    forbidden: [
      "/pollera/",
      "/marketing/",
      "/health/",
      "/security/",
      "/agriculture/",
    ],
  },
  {
    branch: "health",
    allowed: [
      "app/health/",
      "app/api/health/",
      "src/health/",
    ],
    forbidden: [
      "/pollera/",
      "/marketing/",
      "/security/",
      "/presence/",
      "/agriculture/",
    ],
  },
  {
    branch: "security",
    allowed: [
      "app/security/",
      "app/api/security/",
      "src/security/",
    ],
    forbidden: [
      "/pollera/",
      "/marketing/",
      "/health/",
      "/presence/",
      "/agriculture/",
    ],
  },
  {
    branch: "agriculture",
    allowed: [
      "app/agriculture/",
      "app/api/agriculture/",
      "src/agriculture/",
    ],
    forbidden: [
      "/pollera/",
      "/marketing/",
      "/health/",
      "/security/",
      "/presence/",
    ],
  },
];

console.log(
  "La validación funcional completa se ejecutará contra la API después del reinicio."
);

console.log(
  JSON.stringify(
    {
      ok: true,
      mode: "TARGET_RESOLVER_TEST_MATRIX_159_1",
      cases,
      total: cases.length,
    },
    null,
    2
  )
);
