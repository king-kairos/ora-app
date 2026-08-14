"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const AUTONOMOUS_CYCLE_STORAGE_KEY =
  "KAIROS_AUTONOMOUS_CYCLE_ACTIVE_V1";

type StoredCycleState = {
  planId?: string;
  proposalId?: string;
  operationId?: string;
  targetPath?: string;
  phase?: string;
  nextAction?: string;
  savedAt?: string;
};

function readStoredCycleState(): StoredCycleState | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw =
      localStorage.getItem(
        AUTONOMOUS_CYCLE_STORAGE_KEY
      );

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);

    return parsed &&
      typeof parsed === "object"
      ? parsed
      : null;
  } catch {
    return null;
  }
}

function writeStoredCycleState(
  state: StoredCycleState
) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.setItem(
      AUTONOMOUS_CYCLE_STORAGE_KEY,
      JSON.stringify({
        ...state,
        savedAt:
          new Date().toISOString(),
      })
    );
  } catch {
    // La continuidad no debe romper la cabina.
  }
}

function clearStoredCycleState() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(
      AUTONOMOUS_CYCLE_STORAGE_KEY
    );
  } catch {
    // No bloquear la interfaz.
  }
}

type CycleTask = {
  id?: string;
  order?: number;
  title?: string;
  kind?: string;
  status?: string;
  proposalId?: string | null;
  operationId?: string | null;
  targets?: string[];
};

type CyclePlan = {
  planId?: string;
  intent?: string;
  branch?: string | null;
  status?: string;
  leader?: string;
  risk?: string;
  tasks?: CycleTask[];
};

function clean(value: unknown) {
  return String(value || "").trim();
}

function readKairosSeal() {
  if (typeof window === "undefined") {
    return "";
  }

  return clean(
    localStorage.getItem("KAIROS_SEAL") ||
      localStorage.getItem("kairos_seal") ||
      sessionStorage.getItem("KAIROS_SEAL") ||
      sessionStorage.getItem("kairos_seal")
  );
}

async function safeJson(
  response: Response
) {
  const text = await response.text();

  try {
    return text
      ? JSON.parse(text)
      : {};
  } catch {
    return {
      raw: text,
    };
  }
}

function statusColor(value: unknown) {
  const status = clean(value).toLowerCase();

  switch (status) {
    case "completed":
      return "#00ff88";

    case "proposal-created":
    case "awaiting-approval":
      return "#ffe270";

    case "ready":
    case "running":
      return "#7fd4ff";

    case "failed":
    case "recovery-pending":
      return "#ff7272";

    default:
      return "#a6c8b5";
  }
}

export default function AutonomousCyclePanel() {
  const [intent, setIntent] = useState(
    "Describe aquí la mejora completa que ORA debe construir."
  );

  const [branch, setBranch] =
    useState("");

  const [preferredEssence, setPreferredEssence] =
    useState("");

  const [planId, setPlanId] =
    useState("");

  const [proposalId, setProposalId] =
    useState("");

  const [operationId, setOperationId] =
    useState("");

  const [targetPath, setTargetPath] =
    useState("");

  const [plan, setPlan] =
    useState<CyclePlan | null>(null);

  const [result, setResult] =
    useState<any>(null);

  const [busy, setBusy] = useState<
    | ""
    | "create"
    | "inspect"
    | "authorize"
    | "verify"
  >("");

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  const recoveryStartedRef =
    useRef(false);

  const [recoveryMessage, setRecoveryMessage] =
    useState("");


  useEffect(() => {
    if (
      recoveryStartedRef.current
    ) {
      return;
    }

    recoveryStartedRef.current = true;

    const stored =
      readStoredCycleState();

    if (!stored) {
      return;
    }

    if (clean(stored.planId)) {
      setPlanId(
        clean(stored.planId)
      );
    }

    if (clean(stored.proposalId)) {
      setProposalId(
        clean(stored.proposalId)
      );
    }

    if (clean(stored.operationId)) {
      setOperationId(
        clean(stored.operationId)
      );
    }

    if (clean(stored.targetPath)) {
      setTargetPath(
        clean(stored.targetPath)
      );
    }

    setRecoveryMessage(
      "Estado local encontrado. Sincronizando ciclo..."
    );

    void recoverCycle({
      silent: true,
      stored,
    });
  }, []);

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

  async function callCycle(
    action:
      | "create"
      | "inspect"
      | "authorize-proposal"
      | "verify",
    body: Record<string, unknown>
  ) {
    const seal = readKairosSeal();

    if (!seal) {
      throw new Error(
        "Falta el Sello de Kairos en el navegador."
      );
    }

    const response = await fetch(
      "/api/kairos/autonomous-cycle",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Accept: "application/json",
          "x-kairos-seal": seal,
        },
        cache: "no-store",
        body: JSON.stringify({
          action,
          ...body,
        }),
      }
    );

    const data = await safeJson(
      response
    );

    if (
      !response.ok ||
      data?.ok === false
    ) {
      throw new Error(
        data?.error ||
          data?.message ||
          `HTTP_${response.status}`
      );
    }

    return data;
  }

  function absorbResult(data: any) {
    const nextPlan =
      data?.plan ||
      data?.proposalGeneration?.plan ||
      data?.verify?.strategicPlan?.plan ||
      null;

    if (nextPlan) {
      setPlan(nextPlan);
    }

    const discoveredPlanId =
      clean(data?.planId) ||
      clean(nextPlan?.planId);

    if (discoveredPlanId) {
      setPlanId(discoveredPlanId);
    }

    const discoveredProposalId =
      clean(data?.proposalId) ||
      clean(data?.nextProposalId) ||
      clean(
        data?.pendingProposal
          ?.proposalId
      );

    if (discoveredProposalId) {
      setProposalId(
        discoveredProposalId
      );
    }

    const discoveredOperationId =
      clean(data?.operationId) ||
      clean(
        data?.completedOperationId
      );

    if (discoveredOperationId) {
      setOperationId(
        discoveredOperationId
      );
    }

    setResult(data);

    setMessage(
      data?.message ||
        "Acción completada."
    );

    const persistentProposalId =
      clean(data?.proposalId) ||
      clean(data?.nextProposalId) ||
      clean(
        data?.pendingProposal
          ?.proposalId
      );

    const persistentOperationId =
      clean(data?.operationId) ||
      clean(
        data?.completedOperationId
      );

    const persistentPhase =
      clean(data?.phase) ||
      clean(nextPlan?.status);

    const persistentNextAction =
      clean(data?.nextAction);

    const finalPlanId =
      discoveredPlanId ||
      planId.trim();

    const finalOperationId =
      persistentOperationId ||
      operationId.trim();

    if (
      data?.phase === "completed" ||
      data?.strategicStatus ===
        "completed" ||
      data?.allCompleted === true
    ) {
      clearStoredCycleState();
    } else if (
      finalPlanId ||
      finalOperationId
    ) {
      writeStoredCycleState({
        planId: finalPlanId,
        proposalId:
          persistentProposalId,
        operationId:
          finalOperationId,
        targetPath:
          targetPath.trim(),
        phase:
          persistentPhase,
        nextAction:
          persistentNextAction,
      });
    }
  }


  async function readOperationStatus(
    currentOperationId: string
  ) {
    const seal = readKairosSeal();

    if (!seal || !currentOperationId) {
      return null;
    }

    const url = new URL(
      "/api/kairos/orchestrator/status",
      window.location.origin
    );

    url.searchParams.set(
      "operationId",
      currentOperationId
    );

    const response = await fetch(
      url.toString(),
      {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-kairos-seal": seal,
        },
        cache: "no-store",
      }
    );

    const data = await safeJson(response);

    if (
      !response.ok ||
      data?.ok === false
    ) {
      return null;
    }

    return data;
  }

  async function recoverCycle(
    options: {
      silent?: boolean;
      stored?: StoredCycleState | null;
    } = {}
  ) {
    const stored =
      options.stored ||
      readStoredCycleState();

    const recoveredPlanId =
      clean(stored?.planId) ||
      planId.trim();

    const recoveredOperationId =
      clean(stored?.operationId) ||
      operationId.trim();

    if (
      !recoveredPlanId &&
      !recoveredOperationId
    ) {
      if (!options.silent) {
        setRecoveryMessage(
          "No existe un ciclo guardado para recuperar."
        );
      }

      return;
    }

    if (!options.silent) {
      setBusy("inspect");
      setError("");
      setMessage("");
    }

    try {
      if (stored) {
        if (clean(stored.planId)) {
          setPlanId(
            clean(stored.planId)
          );
        }

        if (clean(stored.proposalId)) {
          setProposalId(
            clean(stored.proposalId)
          );
        }

        if (clean(stored.operationId)) {
          setOperationId(
            clean(stored.operationId)
          );
        }

        if (clean(stored.targetPath)) {
          setTargetPath(
            clean(stored.targetPath)
          );
        }
      }

      let inspected: any = null;

      if (recoveredPlanId) {
        inspected = await callCycle(
          "inspect",
          {
            planId:
              recoveredPlanId,
          }
        );

        absorbResult(inspected);

        const pendingId =
          clean(
            inspected
              ?.pendingProposal
              ?.proposalId
          );

        if (pendingId) {
          setProposalId(pendingId);
        } else if (
          inspected?.status ===
            "completed" ||
          inspected?.allCompleted === true
        ) {
          setProposalId("");
        }
      }

      let operationStatus: any = null;

      if (recoveredOperationId) {
        operationStatus =
          await readOperationStatus(
            recoveredOperationId
          );

        const stage =
          clean(
            operationStatus
              ?.operation?.stage
          );

        if (
          stage === "completed"
        ) {
          setRecoveryMessage(
            "Ciclo recuperado. La operación ya está completada."
          );
        } else if (
          [
            "build_passed",
            "restart_pending",
            "restarting",
            "smoke_testing",
            "smoke_passed",
            "health_checking",
            "health_passed",
            "deploy_history",
          ].includes(stage)
        ) {
          setRecoveryMessage(
            "Ciclo recuperado después del reinicio. Verify está disponible."
          );
        } else if (stage) {
          setRecoveryMessage(
            `Ciclo recuperado. Operación en fase: ${stage}.`
          );
        }
      }

      if (
        inspected?.status ===
          "completed" ||
        inspected?.allCompleted === true
      ) {
        clearStoredCycleState();

        setRecoveryMessage(
          "El plan recuperado ya está completamente cerrado."
        );
      } else if (
        !operationStatus
      ) {
        setRecoveryMessage(
          "Ciclo recuperado y sincronizado con el Strategic Planner."
        );
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "AUTONOMOUS_RECOVERY_FAILED"
      );
    } finally {
      if (!options.silent) {
        setBusy("");
      }
    }
  }

  async function createCycle() {
    const cleanIntent =
      intent.trim();

    if (!cleanIntent) {
      setError(
        "Escribe una intención."
      );
      return;
    }

    setBusy("create");
    setError("");
    setMessage("");
    setResult(null);

    try {
      const data = await callCycle(
        "create",
        {
          intent: cleanIntent,
          branch:
            branch.trim() ||
            undefined,
          preferredEssence:
            preferredEssence.trim() ||
            undefined,
        }
      );

      absorbResult(data);
    } catch (err: any) {
      setError(
        err?.message ||
          "AUTONOMOUS_CREATE_FAILED"
      );
    } finally {
      setBusy("");
    }
  }

  async function inspectCycle() {
    const id = planId.trim();

    if (!id) {
      setError(
        "Falta planId."
      );
      return;
    }

    setBusy("inspect");
    setError("");
    setMessage("");

    try {
      const data = await callCycle(
        "inspect",
        {
          planId: id,
        }
      );

      absorbResult(data);

      if (
        !data?.pendingProposal
      ) {
        setProposalId("");
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "AUTONOMOUS_INSPECT_FAILED"
      );
    } finally {
      setBusy("");
    }
  }

  async function authorizeProposal() {
    const currentPlanId =
      planId.trim();

    const currentProposalId =
      proposalId.trim();

    if (!currentPlanId) {
      setError(
        "Falta planId."
      );
      return;
    }

    if (!currentProposalId) {
      setError(
        "No existe propuesta pendiente para autorizar."
      );
      return;
    }

    setBusy("authorize");
    setError("");
    setMessage("");

    try {
      const data = await callCycle(
        "authorize-proposal",
        {
          planId:
            currentPlanId,
          proposalId:
            currentProposalId,
        }
      );

      absorbResult(data);

      if (
        clean(data?.nextProposalId)
      ) {
        setProposalId(
          clean(
            data.nextProposalId
          )
        );
      } else {
        setProposalId("");
      }
    } catch (err: any) {
      setError(
        err?.message ||
          "AUTONOMOUS_AUTHORIZE_FAILED"
      );
    } finally {
      setBusy("");
    }
  }

  async function verifyCycle() {
    const id =
      operationId.trim();

    if (!id) {
      setError(
        "Falta operationId para Verify."
      );
      return;
    }

    setBusy("verify");
    setError("");
    setMessage("");

    try {
      const data = await callCycle(
        "verify",
        {
          operationId: id,
          targetPath:
            targetPath.trim() ||
            undefined,
        }
      );

      absorbResult(data);
      setProposalId("");
    } catch (err: any) {
      setError(
        err?.message ||
          "AUTONOMOUS_VERIFY_FAILED"
      );
    } finally {
      setBusy("");
    }
  }

  const phase =
    clean(result?.phase) ||
    clean(plan?.status) ||
    "idle";

  const nextAction =
    clean(result?.nextAction) ||
    "inspect";

  return (
    <section style={panel}>
      <div style={header}>
        <div>
          <div style={eyebrow}>
            UPDATE 174
          </div>

          <h2 style={title}>
            AUTONOMOUS CYCLE
          </h2>

          <p style={description}>
            Intención → plan →
            propuestas → aprobación por
            tarea → build → reinicio →
            verify.
          </p>
        </div>

        <div style={statusBox}>
          <div>
            Fase
          </div>

          <strong
            style={{
              color:
                statusColor(phase),
            }}
          >
            {phase}
          </strong>

          <div
            style={{
              marginTop: 6,
            }}
          >
            Próximo paso
          </div>

          <strong
            style={{
              color: "#ffe270",
            }}
          >
            {nextAction || "cerrado"}
          </strong>
        </div>
      </div>

      <div style={formGrid}>
        <div
          style={{
            gridColumn:
              "1 / -1",
          }}
        >
          <label style={label}>
            Intención completa
          </label>

          <textarea
            value={intent}
            onChange={(event) =>
              setIntent(
                event.target.value
              )
            }
            style={textarea}
          />
        </div>

        <div>
          <label style={label}>
            Rama opcional
          </label>

          <input
            value={branch}
            onChange={(event) =>
              setBranch(
                event.target.value
              )
            }
            placeholder="health, security, pollera..."
            style={input}
          />
        </div>

        <div>
          <label style={label}>
            Esencia preferida
          </label>

          <input
            value={
              preferredEssence
            }
            onChange={(event) =>
              setPreferredEssence(
                event.target.value
              )
            }
            placeholder="rafael, aelion, arturo..."
            style={input}
          />
        </div>
      </div>

      <div style={actions}>

        <button
          type="button"
          onClick={() =>
            void recoverCycle()
          }
          disabled={busy !== ""}
          style={blueButton}
        >
          {busy === "inspect"
            ? "RECUPERANDO..."
            : "RECUPERAR CICLO"}
        </button>

        <button
          type="button"
          onClick={createCycle}
          disabled={busy !== ""}
          style={goldButton}
        >
          {busy === "create"
            ? "CREANDO CICLO..."
            : "CREAR CICLO"}
        </button>

        <button
          type="button"
          onClick={inspectCycle}
          disabled={
            busy !== "" ||
            !planId.trim()
          }
          style={blueButton}
        >
          {busy === "inspect"
            ? "INSPECCIONANDO..."
            : "INSPECCIONAR"}
        </button>

        <button
          type="button"
          onClick={
            authorizeProposal
          }
          disabled={
            busy !== "" ||
            !planId.trim() ||
            !proposalId.trim()
          }
          style={greenButton}
        >
          {busy === "authorize"
            ? "AUTORIZANDO..."
            : "AUTORIZAR PROPUESTA"}
        </button>

        <button
          type="button"
          onClick={verifyCycle}
          disabled={
            busy !== "" ||
            !operationId.trim()
          }
          style={purpleButton}
        >
          {busy === "verify"
            ? "VERIFICANDO..."
            : "EJECUTAR VERIFY"}
        </button>
      </div>

      <div style={identityGrid}>
        <div>
          <label style={label}>
            Plan ID
          </label>

          <input
            value={planId}
            onChange={(event) =>
              setPlanId(
                event.target.value
              )
            }
            style={input}
          />
        </div>

        <div>
          <label style={label}>
            Propuesta pendiente
          </label>

          <input
            value={proposalId}
            onChange={(event) =>
              setProposalId(
                event.target.value
              )
            }
            style={input}
          />
        </div>

        <div>
          <label style={label}>
            Operation ID final
          </label>

          <input
            value={operationId}
            onChange={(event) =>
              setOperationId(
                event.target.value
              )
            }
            style={input}
          />
        </div>

        <div>
          <label style={label}>
            Ruta para Verify
          </label>

          <input
            value={targetPath}
            onChange={(event) =>
              setTargetPath(
                event.target.value
              )
            }
            placeholder="/ruta-publica o /api/ruta"
            style={input}
          />
        </div>
      </div>

      {recoveryMessage && (
        <div style={recoveryBox}>
          {recoveryMessage}
        </div>
      )}

      {error && (
        <div style={errorBox}>
          ERROR: {error}
        </div>
      )}

      {message && (
        <div style={successBox}>
          {message}
        </div>
      )}

      {plan && (
        <div style={planBox}>
          <div style={planHeader}>
            <div>
              <strong
                style={{
                  color: "#ffe270",
                }}
              >
                {plan.planId}
              </strong>

              <div
                style={{
                  color: "#b8ffd9",
                  marginTop: 6,
                }}
              >
                Rama:{" "}
                {plan.branch ||
                  "sin rama"}
              </div>
            </div>

            <div
              style={{
                color: statusColor(
                  plan.status
                ),
                fontWeight: 900,
              }}
            >
              {plan.status}
            </div>
          </div>

          <div style={taskGrid}>
            {tasks.map((task) => {
              const color =
                statusColor(
                  task.status
                );

              return (
                <article
                  key={
                    task.id ||
                    `${task.order}`
                  }
                  style={{
                    ...taskCard,
                    border:
                      `1px solid ${color}55`,
                  }}
                >
                  <div
                    style={{
                      color,
                      fontWeight: 900,
                    }}
                  >
                    {task.order}.{" "}
                    {task.kind ||
                      "task"}
                  </div>

                  <div
                    style={{
                      color: "#d9ffea",
                      marginTop: 6,
                    }}
                  >
                    {task.title ||
                      task.id}
                  </div>

                  <div
                    style={{
                      color,
                      marginTop: 8,
                      fontSize: 12,
                    }}
                  >
                    {task.status}
                  </div>

                  {task.proposalId && (
                    <div
                      style={taskMeta}
                    >
                      Proposal:{" "}
                      {task.proposalId}
                    </div>
                  )}

                  {task.operationId && (
                    <div
                      style={taskMeta}
                    >
                      Operation:{" "}
                      {task.operationId}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}

      {result && (
        <details style={detailsBox}>
          <summary
            style={{
              cursor: "pointer",
              color: "#7fd4ff",
              fontWeight: 800,
            }}
          >
            Ver respuesta técnica
          </summary>

          <pre style={pre}>
            {JSON.stringify(
              result,
              null,
              2
            )}
          </pre>
        </details>
      )}

      <div style={sovereignty}>
        Cada propuesta necesita una
        autorización sellada nueva. El
        panel no aprueba automáticamente
        cambios futuros.
      </div>
    </section>
  );
}

const panel: React.CSSProperties = {
  border:
    "1px solid rgba(0,255,136,.3)",
  borderRadius: 18,
  padding: 18,
  background:
    "linear-gradient(180deg, rgba(5,18,10,.96), rgba(2,7,4,.98))",
  marginBottom: 18,
  boxShadow:
    "0 0 30px rgba(0,255,136,.07)",
};

const header: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};

const eyebrow: React.CSSProperties = {
  color: "#7fd4ff",
  fontSize: 12,
  fontWeight: 900,
  letterSpacing: 2,
};

const title: React.CSSProperties = {
  color: "#d4af37",
  margin:
    "5px 0 8px",
};

const description: React.CSSProperties = {
  color: "#b8ffd9",
  lineHeight: 1.6,
  margin: 0,
};

const statusBox: React.CSSProperties = {
  minWidth: 190,
  border:
    "1px solid rgba(127,212,255,.25)",
  borderRadius: 12,
  padding: 12,
  color: "#90aa9b",
  background: "#050907",
};

const formGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
  marginTop: 18,
};

const identityGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(240px, 1fr))",
  gap: 12,
  marginTop: 16,
};

const label: React.CSSProperties = {
  display: "block",
  color: "#aaffcc",
  fontWeight: 800,
  fontSize: 13,
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: "100%",
  border:
    "1px solid rgba(0,255,136,.25)",
  borderRadius: 10,
  background: "#050805",
  color: "#d9ffea",
  padding: 11,
  outline: "none",
  boxSizing: "border-box",
};

const textarea: React.CSSProperties = {
  ...input,
  minHeight: 105,
  resize: "vertical",
};

const actions: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 10,
  marginTop: 14,
};

const baseButton: React.CSSProperties = {
  border: 0,
  borderRadius: 10,
  padding: "12px 10px",
  fontWeight: 900,
  cursor: "pointer",
};

const goldButton: React.CSSProperties = {
  ...baseButton,
  background: "#d4af37",
  color: "#181200",
};

const blueButton: React.CSSProperties = {
  ...baseButton,
  background: "#29c8ff",
  color: "#00131c",
};

const greenButton: React.CSSProperties = {
  ...baseButton,
  background: "#00ff88",
  color: "#00170d",
};

const purpleButton: React.CSSProperties = {
  ...baseButton,
  background: "#b388ff",
  color: "#120022",
};

const errorBox: React.CSSProperties = {
  marginTop: 14,
  border:
    "1px solid rgba(255,80,80,.35)",
  borderRadius: 10,
  padding: 11,
  color: "#ff9191",
  background:
    "rgba(255,40,40,.06)",
};

const successBox: React.CSSProperties = {
  marginTop: 14,
  border:
    "1px solid rgba(0,255,136,.3)",
  borderRadius: 10,
  padding: 11,
  color: "#8fffbc",
  background:
    "rgba(0,255,136,.06)",
};

const planBox: React.CSSProperties = {
  marginTop: 16,
  border:
    "1px solid rgba(212,175,55,.25)",
  borderRadius: 14,
  padding: 14,
  background: "#040604",
};

const planHeader: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
};

const taskGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 10,
  marginTop: 14,
};

const taskCard: React.CSSProperties = {
  borderRadius: 11,
  padding: 11,
  background: "#071008",
};

const taskMeta: React.CSSProperties = {
  color: "#789988",
  fontSize: 11,
  marginTop: 6,
  overflowWrap: "anywhere",
};

const detailsBox: React.CSSProperties = {
  marginTop: 14,
  border:
    "1px solid rgba(127,212,255,.22)",
  borderRadius: 10,
  padding: 11,
  background: "#020403",
};

const pre: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  overflowX: "auto",
  color: "#aaffcc",
  fontSize: 11,
  maxHeight: 420,
};

const sovereignty: React.CSSProperties = {
  marginTop: 14,
  color: "#789988",
  fontSize: 12,
  lineHeight: 1.5,
};


const recoveryBox: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  border:
    "1px solid rgba(127,212,255,.45)",
  borderRadius: 10,
  color: "#9fe8ff",
  background:
    "rgba(0,110,160,.12)",
  fontWeight: 700,
};
