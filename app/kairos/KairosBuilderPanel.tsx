"use client";

import React, { useEffect, useMemo, useState } from "react";
import AutoProgrammingPlanPanel from "./AutoProgrammingPlanPanel";
import StrategicPlannerPanel from "./StrategicPlannerPanel";
import AutonomousCyclePanel from "./AutonomousCyclePanel";

type OraModule =
  | "kaerliana"
  | "rafael"
  | "arturo"
  | "orion"
  | "lucian"
  | "ignis"
  | "aelion";

type PatchProposal = {
  id: string;
  title?: string;
  summary?: string;
  risk?: string;
  status?: string;
  targetFiles?: string[];
  metadata?: Record<string, any> | null;
};

type ScanResponse = {
  ok?: boolean;
  module?: string;
  targetFiles?: string[];
  scan?: any;
  error?: string;
  raw?: string;
};

type AutoEvolutionSuggestion = {
  id: string;
  title?: string;
  message?: string;
  suggestedIntent?: string;
  essence?: string;
  priority?: string;
  status?: string;
  createdAt?: string;
};

const MODULES: OraModule[] = [
  "kaerliana",
  "rafael",
  "arturo",
  "orion",
  "lucian",
  "ignis",
  "aelion",
];

const API_BASE = "";
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
    return { raw: text };
  }
}

function normalizeStatus(value: any) {
  return String(value || "pending").trim().toLowerCase();
}

function statusColor(status: string) {
  switch (status) {
    case "pending":
      return "#d4af37";
    case "approved":
      return "#7fd4ff";
    case "applied":
    case "published":
      return "#00ff41";
    case "denied":
    case "rejected":
      return "#ff6a6a";
    case "archived":
      return "#999999";
    default:
      return "#d9ffea";
  }
}

function splitTargetFiles(input: string) {
  return input
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function KairosBuilderPanel() {
  const [module, setModule] = useState<OraModule>("rafael");
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState(
    "Revisa estos archivos y propone mejoras concretas, seguras, coherentes y compatibles con ORA. Prioriza estructura reutilizable, expansión soberana y evitar duplicados."
  );
  const [targetFilesText, setTargetFilesText] = useState(
    ["app/kairos/page.tsx", "app/kairos/KairosBuilderPanel.tsx", "app/kairos/KairosControlPanel.tsx"].join("\n")
  );

  const [busy, setBusy] = useState<
    "" | "scan" | "proposal" | "refresh" | "approve" | "apply" | "approve_apply" | "file_patch" | "file_read" | "file_search" | "file_write" | "file_preview" | "file_create" | "file_search_context" | "multi_file_apply" | "build_validate" | "publish" | "archive" | "suggestions" | "suggestion_proposal"
  >("");

  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"idle" | "ok" | "error">("idle");

  const [scanResult, setScanResult] = useState<any>(null);
  const [createdProposalId, setCreatedProposalId] = useState("");
  const [proposals, setProposals] = useState<PatchProposal[]>([]);

  const [patchFile, setPatchFile] = useState("app/kairos/KairosBuilderPanel.tsx");
  const [patchFind, setPatchFind] = useState("");
  const [patchReplace, setPatchReplace] = useState("");

  const [readFilePath, setReadFilePath] = useState("app/kairos/KairosBuilderPanel.tsx");
  const [readResult, setReadResult] = useState("");

  const [searchQuery, setSearchQuery] = useState("Patch soberano aplicado");
  const [searchDir, setSearchDir] = useState("app");
  const [searchResult, setSearchResult] = useState<any>(null);

  const [writeFilePath, setWriteFilePath] = useState("ora-data/write-from-builder.txt");
  const [writeContent, setWriteContent] = useState("Archivo creado desde Builder soberano ORA.");
  const [writeResult, setWriteResult] = useState<any>(null);

  const [previewResult, setPreviewResult] = useState<any>(null);

  const [contextQuery, setContextQuery] = useState("MULTI SEARCH INTENT ENGINE REAL");
  const [contextDir, setContextDir] = useState("app");
  const [contextResult, setContextResult] = useState<any>(null);

  const [createFilePath, setCreateFilePath] = useState("app/test-ora-2/page.tsx");
  const [createContent, setCreateContent] = useState(
    "export default function Page(){ return <div style={{padding:40,color:'lime'}}>ORA CREATE DESDE BUILDER</div> }"
  );
  const [createOverwrite, setCreateOverwrite] = useState(true);
  const [createResult, setCreateResult] = useState<any>(null);

  const [multiDir, setMultiDir] = useState("app");
  const [multiSearch, setMultiSearch] = useState("");
  const [multiReplace, setMultiReplace] = useState("");
  const [multiLimit, setMultiLimit] = useState(20);
  const [multiApply, setMultiApply] = useState(false);
  const [multiRunBuild, setMultiRunBuild] = useState(false);
  const [multiResult, setMultiResult] = useState<any>(null);
  const [buildResult, setBuildResult] = useState<any>(null);

  const [suggestions, setSuggestions] = useState<AutoEvolutionSuggestion[]>([]);
  const [suggestionsResult, setSuggestionsResult] = useState<any>(null);

  const targetFiles = useMemo(() => splitTargetFiles(targetFilesText), [targetFilesText]);
  const sealLoaded = useMemo(() => !!readKairosSeal(), [busy, message]);

  useEffect(() => {
    void fetchProposals();
  }, []);

  function setOk(text: string) {
    setMessage(text);
    setMessageType("ok");
  }

  function setError(text: string) {
    setMessage(text);
    setMessageType("error");
  }

  async function fetchProposals() {
    setBusy("refresh");
    setMessage("");
    setMessageType("idle");
    try {
      const res = await fetch("/api/ora/patches/list", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        cache: "no-store",
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || "No se pudieron cargar propuestas.");
      }

      const items =
        Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.patches)
          ? data.patches
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];

      const visibleItems = items.filter((p: any) => {
        const status = normalizeStatus(p?.status);
        return status !== "archived" && p?.archived !== true;
      });

      setProposals(visibleItems);
      setOk(`Propuestas recargadas: ${visibleItems.length}`);
    } catch (e: any) {
      setError(e?.message || "Fallo recargando propuestas.");
    } finally {
      setBusy("");
    }
  }

  async function runScan() {
    if (!sealLoaded) return setError("Falta KAIROS_SEAL en el navegador.");
    if (targetFiles.length === 0) return setError("Debes indicar al menos un archivo target.");
    setBusy("scan");
    setMessage("");
    setMessageType("idle");
    setCreatedProposalId("");
    try {
      const res = await fetch("/api/ora/autoprog/builder/scan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({
          module,
          title,
          input: instruction,
          instruction,
          targetFiles,
        }),
      });
      const data = (await safeJson(res)) as ScanResponse;
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "Builder scan falló.");
      setScanResult(data?.scan || null);
      setOk("Scan ejecutado correctamente.");
    } catch (e: any) {
      setError(e?.message || "Fallo ejecutando scan.");
    } finally {
      setBusy("");
    }
  }

  async function createProposalFromScan() {
    if (!sealLoaded) return setError("Falta KAIROS_SEAL en el navegador.");
    if (!instruction.trim()) return setError("EMPTY_INTENT");
    if (targetFiles.length === 0) return setError("TARGET_FILES_REQUIRED");
    setBusy("proposal");
    setMessage("");
    setMessageType("idle");
    try {
      const intentText = instruction.trim();
      const res = await fetch("/api/ora/autoprog/intent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({
          module,
          title: title.trim() || "Builder Proposal",
          intent: intentText,
          input: intentText,
          instruction: intentText,
          targetFiles,
          scan: scanResult,
        }),
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || "No se pudo crear la proposal.");
      }
      setCreatedProposalId(String(data?.proposalId || data?.proposal?.id || ""));
      await fetchProposals();
      setOk(`Proposal creada correctamente: ${data?.proposalId || data?.proposal?.id || "OK"}`);
    } catch (e: any) {
      setError(e?.message || "Fallo creando proposal.");
    } finally {
      setBusy("");
    }
  }

  async function approveProposal(id: string) {
    if (!id) return;
    setBusy("approve");
    try {
      const res = await fetch("/api/ora/autoprog/patch/approve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ id }),
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "No se pudo aprobar patch");
      }
      setOk(`Patch aprobado: ${id}`);
      await fetchProposals();
    } catch (e: any) {
      setError(e?.message || "Error aprobando patch");
    } finally {
      setBusy("");
    }
  }

  async function applyProposal(id: string) {
    if (!sealLoaded) return setError("Falta KAIROS_SEAL.");
    setBusy("apply");
    setMessage("");
    setMessageType("idle");
    try {
      const res = await fetch("/api/kairos/autoprog/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ id }),
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "No se pudo aplicar.");
      setOk(`Proposal aplicada: ${id}`);
      await fetchProposals();
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || "Fallo aplicando proposal.");
    } finally {
      setBusy("");
    }
  }

  async function publishProposal(id: string) {
    if (!sealLoaded) return setError("Falta KAIROS_SEAL.");
    if (!id) return setError("Falta id de proposal.");
    setBusy("publish");
    setBusyId(id);
    setMessage("");
    setMessageType("idle");
    try {
      const res = await fetch("/api/ora/system/deploy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ id }),
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || data?.raw || "No se pudo publicar/deployar.");
      }
      setOk(`PUBLICADO OK: ${id}`);
      await fetchProposals();
      window.location.reload();
    } catch (e: any) {
      setError(e?.message || "Fallo publicando proposal.");
    } finally {
      setBusy("");
      setBusyId("");
    }
  }

  async function archiveProposalFromBuilder(id: string) {
    if (!id) return setError("Falta id de proposal.");
    setBusy("archive");
    setBusyId(id);
    setMessage("");
    setMessageType("idle");

    try {
      const res = await fetch(`/api/kairos/proposals/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ action: "archive" }),
      });

      const data = await safeJson(res);

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || "ARCHIVE_PROPOSAL_FAILED");
      }

      setProposals((prev) => prev.filter((p) => p.id !== id));
      setOk(`Proposal archivada: ${id}`);
      await fetchProposals();
    } catch (e: any) {
      setError(e?.message || "Fallo archivando proposal.");
    } finally {
      setBusy("");
      setBusyId("");
    }
  }

  // ✅ NUEVA FUNCIÓN: archivar todo lo visible (pending, approved, applied, published)
  async function archiveAllVisibleFromBuilder() {
    setBusy("archive");
    setBusyId("all_visible");
    setMessage("");
    setMessageType("idle");
    try {
      const res = await fetch("/api/kairos/proposals/archive-visible", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || "ARCHIVE_VISIBLE_FAILED");
      }
      setProposals([]);
      setOk(`Archivadas: ${data?.totalArchived || 0}`);
      await fetchProposals();
    } catch (e: any) {
      setError(e?.message || "Fallo archivando visibles.");
    } finally {
      setBusy("");
      setBusyId("");
    }
  }

  async function approveAndApply(id: string) {
    setBusy("approve_apply");
    setMessage("");
    setMessageType("idle");
    try {
      await approveProposal(id);
      await applyProposal(id);
    } finally {
      setBusy("");
    }
  }

  async function applyFilePatch() {
    if (!patchFile.trim()) return setError("Falta el archivo.");
    if (!patchFind) return setError("Falta el texto a buscar.");
    setBusy("file_patch");
    setMessage("");
    setMessageType("idle");
    try {
      const res = await fetch(`${API_BASE}/api/ora/files/patch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ file: patchFile, find: patchFind, replace: patchReplace }),
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "No se pudo aplicar patch al archivo.");
      setOk(`Archivo modificado desde cabina: ${patchFile}`);
    } catch (e: any) {
      setError(e?.message || "Fallo aplicando patch al archivo.");
    } finally {
      setBusy("");
    }
  }

  async function readFileFromBuilder() {
    if (!readFilePath.trim()) return setError("Falta archivo para leer.");
    setBusy("file_read");
    setMessage("");
    setMessageType("idle");
    try {
      const res = await fetch(`${API_BASE}/api/ora/files/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ file: readFilePath }),
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "No se pudo leer archivo.");
      setReadResult(String(data?.content || data?.raw || ""));
      setOk(`Archivo leído: ${readFilePath}`);
    } catch (e: any) {
      setError(e?.message || "Fallo leyendo archivo.");
    } finally {
      setBusy("");
    }
  }

  async function searchFilesFromBuilder() {
    if (!searchQuery.trim()) return setError("Falta texto para buscar.");
    setBusy("file_search");
    setMessage("");
    setMessageType("idle");
    try {
      const res = await fetch(`${API_BASE}/api/ora/files/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ query: searchQuery, dir: searchDir || "app", limit: 50 }),
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "No se pudo buscar.");
      setSearchResult(data);
      setOk(`Búsqueda completada: ${data?.count || 0} resultados.`);
    } catch (e: any) {
      setError(e?.message || "Fallo buscando archivos.");
    } finally {
      setBusy("");
    }
  }

  async function writeFileFromBuilder() {
    if (!writeFilePath.trim()) return setError("Falta archivo para escribir.");
    setBusy("file_write");
    setMessage("");
    setMessageType("idle");
    try {
      const res = await fetch(`${API_BASE}/api/ora/files/write`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ file: writeFilePath, content: writeContent, overwrite: true }),
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "No se pudo escribir.");
      setWriteResult(data);
      setOk(`Archivo escrito: ${writeFilePath}`);
    } catch (e: any) {
      setError(e?.message || "Fallo escribiendo archivo.");
    } finally {
      setBusy("");
    }
  }

  async function previewFilePatch() {
    if (!patchFile.trim() || !patchFind) return setError("Falta archivo o texto a buscar.");
    setBusy("file_preview");
    setMessage("");
    setMessageType("idle");
    try {
      const res = await fetch(`${API_BASE}/api/ora/files/preview`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ file: patchFile, find: patchFind, replace: patchReplace }),
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "No se pudo generar preview.");
      setPreviewResult(data);
      setOk("Preview generado correctamente.");
    } catch (e: any) {
      setError(e?.message || "Fallo generando preview.");
    } finally {
      setBusy("");
    }
  }

  async function searchContextFromBuilder() {
    if (!contextQuery.trim()) return setError("Falta texto para buscar contexto.");
    setBusy("file_search_context");
    setMessage("");
    setMessageType("idle");
    try {
      const res = await fetch(`${API_BASE}/api/ora/files/search-context`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ query: contextQuery, dir: contextDir || "app", limit: 10, contextLines: 8 }),
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "No se pudo buscar contexto.");
      setContextResult(data);
      setOk(`Contexto encontrado: ${data?.count || 0} resultados.`);
    } catch (e: any) {
      setError(e?.message || "Fallo buscando contexto.");
    } finally {
      setBusy("");
    }
  }

  async function createFileFromBuilder() {
    if (!createFilePath.trim()) return setError("Falta ruta del archivo para crear.");
    setBusy("file_create");
    setMessage("");
    setMessageType("idle");
    try {
      const res = await fetch(`${API_BASE}/api/ora/files/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ file: createFilePath, content: createContent, overwrite: createOverwrite }),
      });
      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) throw new Error(data?.error || "No se pudo crear archivo.");
      setCreateResult(data);
      setOk(`Archivo creado desde Builder: ${createFilePath}`);
    } catch (e: any) {
      setError(e?.message || "Fallo creando archivo.");
    } finally {
      setBusy("");
    }
  }

  async function applyMultiFileFromBuilder() {
    if (!multiSearch.trim()) return setError("Falta texto/intención para buscar.");
    if (!multiReplace.trim()) return setError("Falta texto de reemplazo.");

    setBusy("multi_file_apply");
    setMessage("");
    setMessageType("idle");

    try {
      const payload = {
        dir: multiDir || "app",
        search: multiSearch,
        replace: multiReplace,
        limit: multiLimit,
        dryRun: !multiApply,
        runBuild: multiApply && multiRunBuild,
      };

      const res = await fetch(`/api/ora/intent-patch/multi-file-apply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || data?.raw || "No se pudo ejecutar multi file apply.");
      }

      setMultiResult(data);
      setOk(multiApply ? "Multi File Apply ejecutado." : "Preview multiarchivo generado.");
    } catch (e: any) {
      setMultiResult({ ok: false, error: e?.message || "Fallo ejecutando Multi File Apply." });
      setError(e?.message || "Fallo ejecutando Multi File Apply.");
    } finally {
      setBusy("");
    }
  }

  async function validateBuildFromBuilder() {
    setBusy("build_validate");
    setMessage("");
    setMessageType("idle");
    setBuildResult({ step: "VALIDANDO BUILD..." });

    try {
      const res = await fetch(`/api/ora/system/action`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({ action: "build" }),
      });

      const data = await safeJson(res);
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || data?.raw || "Build falló.");
      }

      setBuildResult(data);
      setOk("Build validado correctamente.");
    } catch (e: any) {
      setBuildResult({ ok: false, error: e?.message || "Fallo validando build." });
      setError(e?.message || "Fallo validando build.");
    } finally {
      setBusy("");
    }
  }

  const visibleProposals = proposals.filter((p) => normalizeStatus(p?.status) !== "archived");
  const pendingProposals = visibleProposals.filter((p) => normalizeStatus(p?.status) === "pending");
  const approvedProposals = visibleProposals.filter((p) => normalizeStatus(p?.status) === "approved");

  async function fetchObserverSuggestions() {
    setBusy("suggestions");
    setMessage("");
    setMessageType("idle");
    try {
      const res = await fetch("/api/kairos/autoprog/suggestions", {
        method: "GET",
        headers: {
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        cache: "no-store",
      });

      const data = await safeJson(res);

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || "No se pudieron cargar sugerencias.");
      }

      const items = Array.isArray(data?.suggestions) ? data.suggestions : [];
      setSuggestions(items);
      setSuggestionsResult(data);
      setOk(`Sugerencias cargadas: ${items.length}`);
    } catch (error: any) {
      setError(error?.message || "Error cargando sugerencias del observador.");
      setSuggestionsResult({ ok: false, error: error?.message || "SUGGESTIONS_LOAD_FAIL" });
    } finally {
      setBusy("");
    }
  }

  async function createProposalFromSuggestion(suggestion: AutoEvolutionSuggestion) {
    setBusy("suggestion_proposal");
    setBusyId(suggestion.id);
    setMessage("");
    setMessageType("idle");

    try {
      const res = await fetch("/api/kairos/autoprog/create-proposal-from-suggestion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "x-kairos-seal": readKairosSeal(),
        },
        body: JSON.stringify({
          id: suggestion.id,
          title: suggestion.title,
          message: suggestion.message,
          suggestedIntent: suggestion.suggestedIntent,
          essence: suggestion.essence,
          priority: suggestion.priority,
        }),
      });

      const data = await safeJson(res);

      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || data?.message || "No se pudo convertir sugerencia en proposal.");
      }

      setSuggestionsResult(data);
      setOk("Sugerencia convertida en proposal real.");
      await fetchProposals();
      await fetchObserverSuggestions();
    } catch (error: any) {
      setError(error?.message || "Error convirtiendo sugerencia en proposal.");
      setSuggestionsResult({ ok: false, error: error?.message || "SUGGESTION_TO_PROPOSAL_FAIL" });
    } finally {
      setBusy("");
      setBusyId("");
    }
  }


  return (
    <div style={panelStyle}>
      <h2 style={titleStyle}>Builder soberano</h2>
      <p style={descStyle}>
        Aquí preparas módulos, ramas, clones, propuestas y expansión. La propuesta
        puede crecer sin límite. La ejecución real sigue dependiendo de tu sello.
      </p>

      <div style={chipsWrap}>
        <span style={chip}>módulo: {module}</span>
        <span style={chip}>targets: {targetFiles.length}</span>
        <span style={chip}>pendientes: {pendingProposals.length}</span>
        <span style={chip}>aprobadas: {approvedProposals.length}</span>
      </div>

      <AutoProgrammingPlanPanel />

      <StrategicPlannerPanel />

      <AutonomousCyclePanel />

      <div
        style={{
          marginTop: 12,
          color: messageType === "error" ? "#ff8080" : messageType === "ok" ? "#00ff88" : "#b8ffd9",
          minHeight: 22,
          fontWeight: 700,
        }}
      >
        {message}
      </div>

      <div style={gridStyle}>
        <div style={cardStyle}>
          <h3 style={sectionTitle}>Crear por intención</h3>
          <label style={labelStyle}>Esencia</label>
          <select value={module} onChange={(e) => setModule(e.target.value as OraModule)} style={inputStyle}>
            {MODULES.map((m) => (
              <option key={m} value={m}>{m.toUpperCase()}</option>
            ))}
          </select>

          <label style={labelStyle}>Título opcional de la proposal</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Mejorar builder soberano ORA" style={inputStyle} />

          <label style={labelStyle}>Instrucción</label>
          <textarea value={instruction} onChange={(e) => setInstruction(e.target.value)} style={{ ...textareaStyle, minHeight: 140 }} />

          <label style={labelStyle}>Target files (uno por línea)</label>
          <textarea value={targetFilesText} onChange={(e) => setTargetFilesText(e.target.value)} style={{ ...textareaStyle, minHeight: 120 }} />

          <div style={actionsRow}>
            <button onClick={runScan} disabled={!!busy} style={primaryButton}>{busy === "scan" ? "ESCANEANDO..." : "EJECUTAR SCAN"}</button>
            <button onClick={createProposalFromScan} disabled={!!busy || !scanResult} style={secondaryButton}>{busy === "proposal" ? "CREANDO..." : "CREAR PROPOSAL"}</button>
            <button onClick={fetchProposals} disabled={!!busy} style={ghostButton}>RECARGAR</button>
          </div>

          {createdProposalId && <div style={{ marginTop: 12, color: "#7fd4ff", fontWeight: 700 }}>Última proposal creada: {createdProposalId}</div>}
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitle}>Resultado del scan</h3>
          <pre style={preStyle}>{scanResult ? JSON.stringify(scanResult, null, 2) : "Aquí aparecerá el análisis del builder scan."}</pre>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitle}>Patch soberano aplicado de archivo</h3>
          <label style={labelStyle}>Archivo</label>
          <input value={patchFile} onChange={(e) => setPatchFile(e.target.value)} style={inputStyle} />
          <label style={labelStyle}>Buscar texto exacto</label>
          <textarea value={patchFind} onChange={(e) => setPatchFind(e.target.value)} style={{ ...textareaStyle, minHeight: 100 }} />
          <label style={labelStyle}>Reemplazar por</label>
          <textarea value={patchReplace} onChange={(e) => setPatchReplace(e.target.value)} style={{ ...textareaStyle, minHeight: 100 }} />
          <button onClick={applyFilePatch} disabled={!!busy} style={secondaryButton}>{busy === "file_patch" ? "APLICANDO..." : "APLICAR PATCH DIRECTO"}</button>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitle}>Leer archivo</h3>
          <label style={labelStyle}>Archivo</label>
          <input value={readFilePath} onChange={(e) => setReadFilePath(e.target.value)} style={inputStyle} />
          <button onClick={readFileFromBuilder} disabled={!!busy} style={ghostButton}>{busy === "file_read" ? "LEYENDO..." : "LEER ARCHIVO"}</button>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "#7CFFB2", overflow: "auto", maxHeight: 300 }}>{readResult || "Aquí aparecerá el contenido leído."}</pre>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitle}>Buscar en archivos</h3>
          <label style={labelStyle}>Buscar</label>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={inputStyle} />
          <label style={labelStyle}>Directorio</label>
          <input value={searchDir} onChange={(e) => setSearchDir(e.target.value)} style={inputStyle} />
          <button onClick={searchFilesFromBuilder} disabled={!!busy} style={ghostButton}>{busy === "file_search" ? "BUSCANDO..." : "BUSCAR"}</button>
          <pre style={{ ...preStyle, minHeight: 180, maxHeight: 300 }}>{searchResult ? JSON.stringify(searchResult, null, 2) : "Aquí aparecerán resultados de búsqueda."}</pre>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitle}>Escribir archivo</h3>
          <label style={labelStyle}>Archivo</label>
          <input value={writeFilePath} onChange={(e) => setWriteFilePath(e.target.value)} style={inputStyle} />
          <label style={labelStyle}>Contenido</label>
          <textarea value={writeContent} onChange={(e) => setWriteContent(e.target.value)} style={{ ...textareaStyle, minHeight: 120 }} />
          <button onClick={writeFileFromBuilder} disabled={!!busy} style={secondaryButton}>{busy === "file_write" ? "ESCRIBIENDO..." : "ESCRIBIR ARCHIVO"}</button>
          <pre style={{ ...preStyle, minHeight: 120, maxHeight: 220 }}>{writeResult ? JSON.stringify(writeResult, null, 2) : "Resultado de escritura."}</pre>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitle}>Crear archivo / ruta</h3>
          <label style={labelStyle}>Ruta del archivo</label>
          <input value={createFilePath} onChange={(e) => setCreateFilePath(e.target.value)} style={inputStyle} />
          <label style={labelStyle}>Contenido</label>
          <textarea value={createContent} onChange={(e) => setCreateContent(e.target.value)} style={{ ...textareaStyle, minHeight: 160 }} />
          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={createOverwrite} onChange={(e) => setCreateOverwrite(e.target.checked)} /> Permitir overwrite
          </label>
          <button onClick={createFileFromBuilder} disabled={!!busy} style={secondaryButton}>{busy === "file_create" ? "CREANDO..." : "CREAR ARCHIVO / RUTA"}</button>
          <pre style={{ ...preStyle, minHeight: 120, maxHeight: 220 }}>{createResult ? JSON.stringify(createResult, null, 2) : "Resultado de creación."}</pre>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitle}>Search Context Engine</h3>
          <label style={labelStyle}>Buscar contexto</label>
          <input value={contextQuery} onChange={(e) => setContextQuery(e.target.value)} style={inputStyle} />
          <label style={labelStyle}>Directorio</label>
          <input value={contextDir} onChange={(e) => setContextDir(e.target.value)} style={inputStyle} />
          <button onClick={searchContextFromBuilder} disabled={!!busy} style={ghostButton}>{busy === "file_search_context" ? "BUSCANDO CONTEXTO..." : "BUSCAR CONTEXTO"}</button>
          <pre style={{ ...preStyle, minHeight: 220, maxHeight: 360 }}>{contextResult ? JSON.stringify(contextResult, null, 2) : "Aquí aparecerá contexto estructural: archivo, línea, bloque y código cercano."}</pre>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitle}>Multi File Context + Patch Engine</h3>
          <label style={labelStyle}>Directorio</label>
          <input value={multiDir} onChange={(e) => setMultiDir(e.target.value)} style={inputStyle} />
          <label style={labelStyle}>Buscar</label>
          <textarea value={multiSearch} onChange={(e) => setMultiSearch(e.target.value)} style={{ ...textareaStyle, minHeight: 90 }} />
          <label style={labelStyle}>Reemplazar por</label>
          <textarea value={multiReplace} onChange={(e) => setMultiReplace(e.target.value)} style={{ ...textareaStyle, minHeight: 90 }} />
          <label style={labelStyle}>Límite de matches</label>
          <input type="number" value={multiLimit} onChange={(e) => setMultiLimit(Number(e.target.value || 20))} style={inputStyle} />
          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={multiApply} onChange={(e) => setMultiApply(e.target.checked)} /> Aplicar cambios reales
          </label>
          <label style={{ ...labelStyle, display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={multiRunBuild} onChange={(e) => setMultiRunBuild(e.target.checked)} /> Correr build automático
          </label>
          <button type="button" onClick={applyMultiFileFromBuilder} disabled={!!busy} style={primaryButton}>
            {busy === "multi_file_apply" ? "EJECUTANDO..." : multiApply ? "APLICAR MULTI FILE PATCH" : "GENERAR PREVIEW MULTIARCHIVO"}
          </button>
          <pre style={{ ...preStyle, minHeight: 220, maxHeight: 360 }}>
            {multiResult ? JSON.stringify(multiResult, null, 2) : "Aquí aparecerá preview, contexto, backups, build y resultado multiarchivo."}
          </pre>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitle}>Build Validation Engine</h3>
          <p style={{ color: "#b8ffd9", lineHeight: 1.6 }}>Valida el build después de aplicar patches. Si falla, no se debe desplegar.</p>
          <button type="button" onClick={validateBuildFromBuilder} disabled={!!busy} style={primaryButton}>
            {busy === "build_validate" ? "VALIDANDO BUILD..." : "VALIDAR BUILD"}
          </button>
          <pre style={{ ...preStyle, minHeight: 220, maxHeight: 360 }}>
            {buildResult ? JSON.stringify(buildResult, null, 2) : "Aquí aparecerá stdout, stderr y estado del build."}
          </pre>
        </div>

        <div style={cardStyle}>
          <h3 style={sectionTitle}>Preview de patch</h3>
          <p style={{ color: "#b8ffd9", lineHeight: 1.6 }}>Usa el mismo archivo, buscar y reemplazar del Patch soberano aplicado para previsualizar antes de aplicar.</p>
          <button onClick={previewFilePatch} disabled={!!busy} style={primaryButton}>{busy === "file_preview" ? "GENERANDO..." : "GENERAR PREVIEW"}</button>
          <pre style={{ ...preStyle, minHeight: 180, maxHeight: 300 }}>{previewResult ? JSON.stringify(previewResult, null, 2) : "Aquí aparecerá el preview before/after."}</pre>
        </div>
      </div>

      <div style={{ ...cardStyle, marginTop: 18 }}>
        <h3 style={sectionTitle}>Sugerencias del Observador</h3>

        <p style={{ color: "#b8ffd9", lineHeight: 1.6 }}>
          El observador puede recomendar mejoras sin ejecutar nada. Kairos decide si una sugerencia se convierte en proposal.
        </p>

        <button
          type="button"
          onClick={fetchObserverSuggestions}
          disabled={!!busy}
          style={secondaryButton}
        >
          {busy === "suggestions" ? "CARGANDO SUGERENCIAS..." : "CARGAR SUGERENCIAS"}
        </button>

        <div style={{ marginTop: 14, maxHeight: 720, overflow: "auto", display: "grid", gap: 12 }}>
          {suggestions.length === 0 && (
            <div style={{ color: "#7f8f84" }}>No hay sugerencias cargadas.</div>
          )}

          {suggestions.map((sug) => (
            <div key={sug.id} style={proposalCard}>
              <div style={{ color: "#d4af37", fontWeight: 800 }}>
                {sug.title || "Sugerencia sin título"} — {String(sug.priority || "normal").toUpperCase()}
              </div>

              {sug.message && (
                <div style={{ marginTop: 6, color: "#d9ffea" }}>{sug.message}</div>
              )}

              {sug.suggestedIntent && (
                <div style={{ marginTop: 6, color: "#9dffcc" }}>
                  intención sugerida: {sug.suggestedIntent}
                </div>
              )}

              <div style={{ marginTop: 6, color: "#8fdab6" }}>
                esencia: {sug.essence || "rafael"} · estado: {sug.status || "pending"}
              </div>

              <div style={actionsRow}>
                <button
                  type="button"
                  onClick={() => createProposalFromSuggestion(sug)}
                  disabled={!!busy}
                  style={applySmallButton}
                >
                  {busy === "suggestion_proposal" && busyId === sug.id
                    ? "CONVIRTIENDO..."
                    : "CONVERTIR A PROPOSAL"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {false && (
          <pre style={{ ...preStyle, minHeight: 140, maxHeight: 260 }}>
            {suggestionsResult
              ? JSON.stringify(suggestionsResult, null, 2)
              : "Aquí aparecerán sugerencias del observador y conversiones a proposal."}
          </pre>
        )}
      </div>

      <div style={{ ...cardStyle, marginTop: 18 }}>
        <h3 style={sectionTitle}>Propuestas del builder</h3>

        {/* Botón mejorado: archiva todo lo visible (pending, approved, applied, published) */}
        <div style={{ marginBottom: 12 }}>
          <button
            type="button"
            onClick={archiveAllVisibleFromBuilder}
            disabled={busy === "archive"}
            style={archiveSmallButton}
          >
            {busy === "archive" && busyId === "all_visible"
              ? "ARCHIVANDO..."
              : "ARCHIVAR TODO LO VISIBLE"}
          </button>
        </div>

        <div style={{ maxHeight: 420, overflow: "auto" }}>
          {proposals.length === 0 && <div style={{ color: "#7f8f84" }}>No hay propuestas cargadas.</div>}

          {proposals.map((p) => {
            const status = normalizeStatus(p?.status);
            const target =
              Array.isArray(p?.targetFiles) && p.targetFiles.length > 0
                ? p.targetFiles.join(", ")
                : Array.isArray(p?.metadata?.targetFiles) && p.metadata.targetFiles.length > 0
                ? p.metadata.targetFiles.join(", ")
                : "N/D";

            return (
              <div key={p.id} style={proposalCard}>
                <div style={{ color: statusColor(status), fontWeight: 800 }}>
                  {p.id} — {p.title || "Sin título"} ({status.toUpperCase()})
                </div>

                {p.summary && <div style={{ marginTop: 6, color: "#d9ffea" }}>{p.summary}</div>}
                {p.risk && <div style={{ marginTop: 4, color: "#9dffcc" }}>riesgo: {p.risk}</div>}
                <div style={{ marginTop: 4, color: "#8fdab6" }}>target: {target}</div>

                <div style={actionsRow}>
                  {status === "pending" && (
                    <>
                      <button onClick={() => approveProposal(p.id)} disabled={!!busy} style={primarySmallButton}>APROBAR</button>
                      <button onClick={() => approveAndApply(p.id)} disabled={!!busy} style={applySmallButton}>APROBAR Y APLICAR</button>
                    </>
                  )}

                  {status === "approved" && (
                    <button onClick={() => applyProposal(p.id)} disabled={!!busy} style={applySmallButton}>
                      APLICAR
                    </button>
                  )}

                  {status === "applied" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void publishProposal(p.id);
                      }}
                      disabled={busy === "publish" && busyId === p.id}
                      style={primarySmallButton}
                    >
                      {busy === "publish" && busyId === p.id ? "PUBLICANDO..." : "PUBLICAR"}
                    </button>
                  )}

                  {status !== "archived" && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void archiveProposalFromBuilder(p.id);
                      }}
                      disabled={busy === "archive" && busyId === p.id}
                      style={archiveSmallButton}
                    >
                      {busy === "archive" && busyId === p.id ? "ARCHIVANDO..." : "ARCHIVAR"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  border: "1px solid rgba(0,255,136,.28)",
  borderRadius: "18px",
  padding: "22px",
  background: "rgba(8,18,12,.72)",
};

const titleStyle: React.CSSProperties = { margin: 0, color: "#8fff6a", fontSize: 20 };
const descStyle: React.CSSProperties = { marginTop: 10, color: "#d9ffea", lineHeight: 1.7 };
const chipsWrap: React.CSSProperties = { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 };

const chip: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  border: "1px solid rgba(0,255,136,.25)",
  color: "#b8ffd9",
  background: "#0d1510",
  fontSize: 12,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 18,
  marginTop: 18,
};

const cardStyle: React.CSSProperties = {
  border: "1px solid rgba(0,255,136,.18)",
  borderRadius: 16,
  padding: 16,
  background: "#0b0f0c",
};

const sectionTitle: React.CSSProperties = { marginTop: 0, color: "#d4af37" };
const labelStyle: React.CSSProperties = { display: "block", marginTop: 10, marginBottom: 6, color: "#b8ffd9", fontSize: 13 };

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#111",
  color: "#00ff41",
  border: "1px solid #222",
  padding: 10,
  borderRadius: 10,
};

const textareaStyle: React.CSSProperties = {
  width: "100%",
  background: "#111",
  color: "#00ff41",
  border: "1px solid #222",
  padding: 10,
  borderRadius: 10,
  resize: "vertical",
};

const preStyle: React.CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  color: "#d9ffea",
  background: "#111",
  border: "1px solid #1d1d1d",
  borderRadius: 12,
  padding: 12,
  minHeight: 380,
  maxHeight: 520,
  overflow: "auto",
};

const proposalCard: React.CSSProperties = {
  borderBottom: "1px solid #1a1a1a",
  paddingTop: 12,
  paddingBottom: 12,
};

const actionsRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  marginTop: 12,
};

const primaryButton: React.CSSProperties = {
  background: "#d4af37",
  color: "#000",
  padding: "10px 14px",
  border: "none",
  borderRadius: 10,
  fontWeight: "bold",
  cursor: "pointer",
};

const secondaryButton: React.CSSProperties = {
  background: "#00ff41",
  color: "#000",
  padding: "10px 14px",
  border: "none",
  borderRadius: 10,
  fontWeight: "bold",
  cursor: "pointer",
};

const ghostButton: React.CSSProperties = {
  background: "transparent",
  color: "#00ff41",
  padding: "10px 14px",
  border: "1px solid #00ff41",
  borderRadius: 10,
  fontWeight: "bold",
  cursor: "pointer",
};

const primarySmallButton: React.CSSProperties = {
  background: "#d4af37",
  color: "#000",
  padding: "6px 10px",
  border: "none",
  borderRadius: 10,
  fontWeight: "bold",
  cursor: "pointer",
};

const applySmallButton: React.CSSProperties = {
  background: "#00ff41",
  color: "#000",
  padding: "6px 10px",
  border: "none",
  borderRadius: 10,
  fontWeight: "bold",
  cursor: "pointer",
};

const archiveSmallButton: React.CSSProperties = {
  background: "#555",
  color: "#fff",
  padding: "6px 10px",
  border: "1px solid #888",
  borderRadius: 10,
  fontWeight: "bold",
  cursor: "pointer",
};
