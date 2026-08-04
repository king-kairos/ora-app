"use client";

import React, { useMemo, useState } from "react";

type StrategicTask = {
  id: string;
  order?: number;
  title?: string;
  description?: string;
  kind?: string;
  status?: string;
  dependsOn?: string[];
  targets?: string[];
  proposedBy?: string;
  risk?: string;
  proposalId?: string | null;
  operationId?: string | null;
};

type StrategicPlan = {
  planId: string;
  intent: string;
  branch?: string | null;
  title?: string;
  summary?: string;
  status?: string;
  leader?: string;
  team?: string[];
  risk?: string;
  targetFiles?: string[];
  tasks?: StrategicTask[];
  requiresKairosApproval?: boolean;
  sealRequired?: boolean;
  canExecute?: boolean;
  createdAt?: string;
  updatedAt?: string;
  branchAwareness?: {
    branch?: string;
    exists?: boolean;
    mode?: string;
    actionVerb?: string;
    message?: string;
  };
  council?: {
    leader?: string;
    team?: string[];
    votes?: Array<{
      essence?: string;
      score?: number;
      reason?: string;
    }>;
  };
};

const FALLBACK_KAIROS_SEAL = "";

function readKairosSeal() {
  if (typeof window === "undefined") return "";

  return String(
    localStorage.getItem("KAIROS_SEAL") ||
      localStorage.getItem("kairos_seal") ||
      sessionStorage.getItem("KAIROS_SEAL") ||
      sessionStorage.getItem("kairos_seal") ||
      FALLBACK_KAIROS_SEAL ||
      ""
  ).trim();
}

async function safeJson(res: Response) {
  const text = await res.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return {
      raw: text,
    };
  }
}

function normalizeStatus(value: unknown) {
  return String(value || "blocked")
    .trim()
    .toLowerCase();
}

function taskStatusColor(status: string) {
  switch (normalizeStatus(status)) {
    case "ready":
      return "#00ff88";

    case "completed":
    case "proposal_created":
    case "proposal-created":
    case "approved":
    case "applied":
      return "#55ff55";

    case "running":
      return "#7fd4ff";

    case "failed":
    case "rejected":
      return "#ff6a6a";

    case "blocked":
    default:
      return "#d4af37";
  }
}

function taskSymbol(status: string) {
  switch (normalizeStatus(status)) {
    case "ready":
      return "▶";

    case "completed":
    case "proposal_created":
    case "proposal-created":
    case "approved":
    case "applied":
      return "✓";

    case "running":
      return "◉";

    case "failed":
    case "rejected":
      return "✕";

    default:
      return "○";
  }
}

function formatDate(value?: string) {
  if (!value) return "N/D";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function StrategicPlannerPanel() {
  const [intent, setIntent] = useState(
    "Agregar control de inventario, ventas, pedidos y ganancias a la rama ORA Pollera sin duplicar la estructura existente"
  );

  const [branch, setBranch] = useState("");
  const [preferredEssence, setPreferredEssence] =
    useState("");

  const [plan, setPlan] =
    useState<StrategicPlan | null>(null);

  const [busy, setBusy] = useState<
    "" | "create" | "status" | "proposals"
  >("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const tasks = useMemo(
    () =>
      Array.isArray(plan?.tasks)
        ? [...plan.tasks].sort(
            (a, b) =>
              Number(a.order || 0) -
              Number(b.order || 0)
          )
        : [],
    [plan]
  );

  const targetFiles = useMemo(
    () =>
      Array.isArray(plan?.targetFiles)
        ? plan.targetFiles
        : [],
    [plan]
  );

  async function createPlan() {
    const cleanIntent = intent.trim();

    if (!cleanIntent) {
      setError("Escribe una intención.");
      return;
    }

    const seal = readKairosSeal();

    if (!seal) {
      setError(
        "Falta KAIROS_SEAL en el navegador."
      );
      return;
    }

    setBusy("create");
    setMessage("");
    setError("");
    setPlan(null);

    try {
      const res = await fetch(
        "/api/kairos/strategic-planner/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-kairos-seal": seal,
          },
          cache: "no-store",
          body: JSON.stringify({
            intent: cleanIntent,
            branch: branch.trim() || undefined,
            preferredEssence:
              preferredEssence.trim() || undefined,
          }),
        }
      );

      const data = await safeJson(res);

      if (!res.ok || data?.ok === false) {
        throw new Error(
          data?.error ||
            data?.message ||
            `HTTP_${res.status}`
        );
      }

      setPlan(data?.plan || null);

      setMessage(
        data?.message ||
          "Plan estratégico generado correctamente."
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "No se pudo generar el plan estratégico."
      );
    } finally {
      setBusy("");
    }
  }

  async function generateProposals() {
    if (!plan?.planId) {
      setError("Primero genera un plan estratégico.");
      return;
    }

    const seal = readKairosSeal();

    if (!seal) {
      setError("Falta KAIROS_SEAL en el navegador.");
      return;
    }

    setBusy("proposals");
    setMessage("");
    setError("");

    try {
      const res = await fetch(
        "/api/kairos/strategic-planner/create-proposals",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "x-kairos-seal": seal,
          },
          cache: "no-store",
          body: JSON.stringify({
            planId: plan.planId,
          }),
        }
      );

      const data = await safeJson(res);

      if (!res.ok || data?.ok === false) {
        throw new Error(
          data?.error ||
            data?.message ||
            `HTTP_${res.status}`
        );
      }

      setPlan(data?.plan || plan);

      setMessage(
        data?.message ||
          "Propuesta estratégica generada."
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "No se pudieron generar las propuestas."
      );
    } finally {
      setBusy("");
    }
  }

  async function refreshPlan() {
    if (!plan?.planId) {
      setError("No existe plan para consultar.");
      return;
    }

    const seal = readKairosSeal();

    if (!seal) {
      setError(
        "Falta KAIROS_SEAL en el navegador."
      );
      return;
    }

    setBusy("status");
    setMessage("");
    setError("");

    try {
      const url = new URL(
        "/api/kairos/strategic-planner/status",
        window.location.origin
      );

      url.searchParams.set(
        "planId",
        plan.planId
      );

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-kairos-seal": seal,
        },
        cache: "no-store",
      });

      const data = await safeJson(res);

      if (!res.ok || data?.ok === false) {
        throw new Error(
          data?.error ||
            data?.message ||
            `HTTP_${res.status}`
        );
      }

      setPlan(data?.plan || null);
      setMessage(
        "Estado estratégico actualizado."
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "No se pudo actualizar el plan."
      );
    } finally {
      setBusy("");
    }
  }

  return (
    <section
      style={{
        marginTop: 24,
        border:
          "1px solid rgba(212,175,55,.55)",
        borderRadius: 18,
        padding: 20,
        background:
          "linear-gradient(180deg, rgba(212,175,55,.08), rgba(0,255,136,.025))",
        boxShadow:
          "0 0 30px rgba(212,175,55,.06)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              color: "#d4af37",
              fontSize: 13,
              fontWeight: 900,
              letterSpacing: ".12em",
            }}
          >
            KAIROS STRATEGIC PLANNER
          </div>

          <h2
            style={{
              margin: "8px 0 6px",
              color: "#d9ffea",
            }}
          >
            Cerebro estratégico
          </h2>

          <p
            style={{
              margin: 0,
              maxWidth: 920,
              color: "#b8ffd9",
              lineHeight: 1.6,
            }}
          >
            Escribe normalmente lo que deseas
            construir o mejorar. ORA detecta la
            rama, evita duplicaciones, selecciona
            líder y consejo, resuelve archivos y
            prepara un grafo de tareas.
          </p>

          <p
            style={{
              margin: "8px 0 0",
              color: "#7fffb2",
              fontSize: 12,
            }}
          >
            Esta fase no crea propuestas, no
            modifica archivos y no ejecuta deploy.
          </p>
        </div>

        <div
          style={{
            border:
              "1px solid rgba(0,255,136,.25)",
            borderRadius: 12,
            padding: "10px 14px",
            color: "#8fff6a",
            background: "#071108",
            fontSize: 12,
          }}
        >
          SELLO REQUERIDO
        </div>
      </div>

      <textarea
        value={intent}
        onChange={(e) =>
          setIntent(e.target.value)
        }
        placeholder="Ej.: Mejorar ORA Pollera agregando inventario, ventas, pedidos y ganancias sin duplicar lo existente."
        style={{
          marginTop: 18,
          width: "100%",
          minHeight: 130,
          resize: "vertical",
          boxSizing: "border-box",
          border:
            "1px solid rgba(0,255,136,.3)",
          borderRadius: 12,
          padding: 15,
          background: "#050805",
          color: "#d9ffea",
          fontFamily: "inherit",
          fontSize: 14,
          lineHeight: 1.6,
          outline: "none",
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
          marginTop: 12,
        }}
      >
        <input
          value={branch}
          onChange={(e) =>
            setBranch(e.target.value)
          }
          placeholder="Rama opcional: pollera, security..."
          style={inputStyle}
        />

        <input
          value={preferredEssence}
          onChange={(e) =>
            setPreferredEssence(e.target.value)
          }
          placeholder="Esencia opcional: orion, arturo..."
          style={inputStyle}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          marginTop: 14,
        }}
      >
        <button
          type="button"
          onClick={createPlan}
          disabled={busy !== ""}
          style={{
            ...buttonStyle,
            color: "#181200",
            background:
              busy === "create"
                ? "#8c772f"
                : "linear-gradient(90deg, #d4af37, #ffe270)",
          }}
        >
          {busy === "create"
            ? "GENERANDO..."
            : "GENERAR PLAN ESTRATÉGICO"}
        </button>

        <button
          type="button"
          onClick={generateProposals}
              disabled={!!busy || !plan?.planId}
              style={{
                border: "1px solid rgba(0,255,136,.7)",
                borderRadius: 10,
                padding: "11px 16px",
                background: "rgba(0,255,136,.12)",
                color: "#8effbd",
                fontWeight: 800,
                cursor:
                  busy || !plan?.planId
                    ? "not-allowed"
                    : "pointer",
                opacity:
                  busy || !plan?.planId
                    ? 0.55
                    : 1,
              }}
            >
              {busy === "proposals"
                ? "GENERANDO..."
                : "GENERAR PROPUESTAS"}
            </button>

            <button
              onClick={refreshPlan}
          disabled={
            busy !== "" || !plan?.planId
          }
          style={{
            ...buttonStyle,
            color: "#00170d",
            background:
              !plan?.planId
                ? "#315441"
                : "linear-gradient(90deg, #00d97e, #65ffad)",
          }}
        >
          {busy === "status"
            ? "ACTUALIZANDO..."
            : "ACTUALIZAR ESTADO"}
        </button>
      </div>

      {error ? (
        <div
          style={{
            marginTop: 14,
            border:
              "1px solid rgba(255,80,80,.5)",
            borderRadius: 10,
            padding: 12,
            color: "#ff9b9b",
            background: "rgba(255,50,50,.06)",
          }}
        >
          {error}
        </div>
      ) : null}

      {message ? (
        <div
          style={{
            marginTop: 14,
            border:
              "1px solid rgba(0,255,136,.35)",
            borderRadius: 10,
            padding: 12,
            color: "#8fffbc",
            background:
              "rgba(0,255,136,.045)",
          }}
        >
          {message}
        </div>
      ) : null}

      {plan ? (
        <div style={{ marginTop: 20 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 10,
            }}
          >
            <InfoCard
              label="PLAN"
              value={plan.planId}
            />

            <InfoCard
              label="RAMA"
              value={
                plan.branch ||
                plan.branchAwareness?.branch ||
                "general"
              }
            />

            <InfoCard
              label="MODO"
              value={
                plan.branchAwareness?.mode ||
                "planning"
              }
            />

            <InfoCard
              label="LÍDER"
              value={plan.leader || "N/D"}
            />

            <InfoCard
              label="RIESGO"
              value={plan.risk || "unknown"}
            />

            <InfoCard
              label="ESTADO"
              value={plan.status || "draft"}
            />

            <InfoCard
              label="ARCHIVOS"
              value={String(
                targetFiles.length
              )}
            />

            <InfoCard
              label="TAREAS"
              value={String(tasks.length)}
            />
          </div>

          <div
            style={{
              marginTop: 14,
              border:
                "1px solid rgba(0,255,136,.2)",
              borderRadius: 12,
              padding: 15,
              background: "#050805",
            }}
          >
            <div
              style={{
                color: "#d4af37",
                fontWeight: 800,
              }}
            >
              {plan.title ||
                "Plan estratégico"}
            </div>

            <p
              style={{
                color: "#b8ffd9",
                lineHeight: 1.6,
                marginBottom: 0,
              }}
            >
              {plan.summary ||
                plan.branchAwareness?.message}
            </p>
          </div>

          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 14,
            }}
          >
            <div style={panelStyle}>
              <div style={panelTitleStyle}>
                CONSEJO
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#d9ffea",
                }}
              >
                Líder:{" "}
                <b style={{ color: "#d4af37" }}>
                  {String(
                    plan.council?.leader ||
                      plan.leader ||
                      "N/D"
                  ).toUpperCase()}
                </b>
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#9fffcc",
                  lineHeight: 1.5,
                }}
              >
                Equipo:{" "}
                {(
                  plan.council?.team ||
                  plan.team ||
                  []
                )
                  .map((x) =>
                    String(x).toUpperCase()
                  )
                  .join(", ") || "N/D"}
              </div>

              {Array.isArray(
                plan.council?.votes
              ) ? (
                <div
                  style={{
                    marginTop: 12,
                    display: "grid",
                    gap: 8,
                  }}
                >
                  {plan.council!.votes!.map(
                    (vote, index) => (
                      <div
                        key={`${vote.essence}-${index}`}
                        style={{
                          border:
                            "1px solid rgba(212,175,55,.18)",
                          borderRadius: 9,
                          padding: 10,
                          background:
                            "rgba(212,175,55,.025)",
                        }}
                      >
                        <div
                          style={{
                            color: "#ffe270",
                            fontWeight: 800,
                          }}
                        >
                          {String(
                            vote.essence ||
                              "esencia"
                          ).toUpperCase()}{" "}
                          — {vote.score ?? 0}
                        </div>

                        <div
                          style={{
                            color: "#a9cdbb",
                            fontSize: 12,
                            marginTop: 5,
                            lineHeight: 1.5,
                          }}
                        >
                          {vote.reason}
                        </div>
                      </div>
                    )
                  )}
                </div>
              ) : null}
            </div>

            <div style={panelStyle}>
              <div style={panelTitleStyle}>
                ARCHIVOS OBJETIVO
              </div>

              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gap: 7,
                }}
              >
                {targetFiles.length > 0 ? (
                  targetFiles.map((file) => (
                    <div
                      key={file}
                      style={{
                        border:
                          "1px solid rgba(0,255,136,.16)",
                        borderRadius: 8,
                        padding: "8px 10px",
                        color: "#aaffcc",
                        background:
                          "rgba(0,255,136,.025)",
                        overflowWrap:
                          "anywhere",
                      }}
                    >
                      {file}
                    </div>
                  ))
                ) : (
                  <div
                    style={{
                      color: "#ffcc80",
                    }}
                  >
                    Sin targets resueltos.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              border:
                "1px solid rgba(127,212,255,.25)",
              borderRadius: 14,
              padding: 16,
              background:
                "rgba(127,212,255,.025)",
            }}
          >
            <div style={panelTitleStyle}>
              GRAFO DE TAREAS
            </div>

            <div
              style={{
                display: "grid",
                gap: 10,
                marginTop: 12,
              }}
            >
              {tasks.map((task) => {
                const color =
                  taskStatusColor(
                    task.status || ""
                  );

                return (
                  <div
                    key={task.id}
                    style={{
                      border: `1px solid ${color}44`,
                      borderRadius: 12,
                      padding: 13,
                      background: `${color}08`,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent:
                          "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          color,
                          fontWeight: 900,
                        }}
                      >
                        {taskSymbol(
                          task.status || ""
                        )}{" "}
                        {String(
                          task.order || ""
                        ).padStart(2, "0")}{" "}
                        — {task.title}
                      </div>

                      <div
                        style={{
                          color,
                          fontSize: 12,
                          textTransform:
                            "uppercase",
                        }}
                      >
                        {task.status ||
                          "blocked"}
                      </div>
                    </div>

                    <p
                      style={{
                        color: "#b8d9c7",
                        margin:
                          "8px 0 0",
                        lineHeight: 1.5,
                      }}
                    >
                      {task.description}
                    </p>

                    <div
                      style={{
                        marginTop: 9,
                        color: "#8fb8a2",
                        fontSize: 12,
                        lineHeight: 1.5,
                      }}
                    >
                      Tipo:{" "}
                      {task.kind || "N/D"} ·
                      Esencia:{" "}
                      {String(
                        task.proposedBy ||
                          plan.leader ||
                          "N/D"
                      ).toUpperCase()}{" "}
                      · Riesgo:{" "}
                      {task.risk || "unknown"}
                    </div>

                    <div
                      style={{
                        marginTop: 6,
                        color: "#8fb8a2",
                        fontSize: 12,
                      }}
                    >
                      Depende de:{" "}
                      {Array.isArray(
                        task.dependsOn
                      ) &&
                      task.dependsOn.length > 0
                        ? task.dependsOn.join(
                            ", "
                          )
                        : "ninguna"}
                    </div>

                    {Array.isArray(
                      task.targets
                    ) &&
                    task.targets.length > 0 ? (
                      <div
                        style={{
                          marginTop: 8,
                          color: "#9fffcc",
                          fontSize: 12,
                          overflowWrap:
                            "anywhere",
                        }}
                      >
                        Targets:{" "}
                        {task.targets.join(
                          " · "
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              marginTop: 14,
              color: "#789988",
              fontSize: 11,
            }}
          >
            Creado:{" "}
            {formatDate(plan.createdAt)} ·
            Actualizado:{" "}
            {formatDate(plan.updatedAt)}
          </div>

          <div
            style={{
              marginTop: 14,
              border:
                "1px solid rgba(255,210,80,.3)",
              borderRadius: 10,
              padding: 12,
              color: "#ffe28a",
              background:
                "rgba(255,210,80,.04)",
            }}
          >
            Plan en modo lectura estratégica.
            La creación automática de propuestas
            por tarea será habilitada en el
            siguiente ciclo, conservando la
            aprobación soberana.
          </div>
        </div>
      ) : null}
    </section>
  );
}

function InfoCard(props: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        border:
          "1px solid rgba(0,255,136,.2)",
        borderRadius: 10,
        padding: 11,
        background: "#061008",
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: "#6da784",
          fontSize: 10,
          letterSpacing: ".1em",
        }}
      >
        {props.label}
      </div>

      <div
        style={{
          marginTop: 5,
          color: "#d9ffea",
          fontWeight: 800,
          overflowWrap: "anywhere",
        }}
      >
        {props.value}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid rgba(0,255,136,.25)",
  borderRadius: 10,
  padding: "12px 13px",
  color: "#d9ffea",
  background: "#050805",
  fontFamily: "inherit",
  outline: "none",
};

const buttonStyle: React.CSSProperties = {
  border: "none",
  borderRadius: 10,
  padding: "13px 18px",
  fontFamily: "inherit",
  fontWeight: 900,
  cursor: "pointer",
  letterSpacing: ".04em",
};

const panelStyle: React.CSSProperties = {
  border: "1px solid rgba(0,255,136,.2)",
  borderRadius: 12,
  padding: 15,
  background: "#050805",
  minWidth: 0,
};

const panelTitleStyle: React.CSSProperties = {
  color: "#7fd4ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: ".1em",
};
