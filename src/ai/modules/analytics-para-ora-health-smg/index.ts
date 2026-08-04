import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "ora-health");
const ANALYTICS_FILE = path.join(DATA_DIR, "analytics.json");
const PATIENTS_FILE = path.join(DATA_DIR, "patients.json");
const CONSULTATIONS_FILE = path.join(DATA_DIR, "consultations.json");

type AnalyticRecord = {
  id: string;
  patientId: string;
  consultationId?: string;
  testName: string;
  result: string;
  unit?: string;
  referenceRange?: string;
  date: string;
  notes?: string;
  createdAt: number;
};

type Patient = {
  id: string;
  name: string;
};

type Consultation = {
  id: string;
  patientId: string;
};

async function ensureFile(filePath: string) {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, "[]", "utf-8");
  }
}

async function readJsonFile<T>(filePath: string): Promise<T[]> {
  await ensureFile(filePath);
  const raw = await fs.readFile(filePath, "utf-8");
  return JSON.parse(raw);
}

async function saveAnalytics(records: AnalyticRecord[]) {
  await fs.writeFile(
    ANALYTICS_FILE,
    JSON.stringify(records, null, 2),
    "utf-8"
  );
}

function generateId() {
  return "lab_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
}

export async function runAnalyticsParaOraHealthSmgModule(input?: any) {
  const action = input?.action ?? "list";

  const analytics = await readJsonFile<AnalyticRecord>(ANALYTICS_FILE);
  const patients = await readJsonFile<Patient>(PATIENTS_FILE);
  const consultations = await readJsonFile<Consultation>(CONSULTATIONS_FILE);

  if (action === "create") {
    const patientId = input?.patientId;
    const consultationId = input?.consultationId;
    const testName = input?.testName;
    const result = input?.result;
    const date = input?.date;

    if (!patientId || !testName || !result || !date) {
      return {
        ok: false,
        moduleName: "analytics-para-ora-health-smg",
        action: "create",
        error: "missing_required_fields",
        required: ["patientId", "testName", "result", "date"],
      };
    }

    const patientExists = patients.some((p) => p.id === patientId);
    if (!patientExists) {
      return {
        ok: false,
        moduleName: "analytics-para-ora-health-smg",
        action: "create",
        error: "patient_not_found",
        patientId,
      };
    }

    if (consultationId) {
      const consultation = consultations.find((c) => c.id === consultationId);

      if (!consultation) {
        return {
          ok: false,
          moduleName: "analytics-para-ora-health-smg",
          action: "create",
          error: "consultation_not_found",
          consultationId,
        };
      }

      if (consultation.patientId !== patientId) {
        return {
          ok: false,
          moduleName: "analytics-para-ora-health-smg",
          action: "create",
          error: "consultation_patient_mismatch",
          consultationId,
          patientId,
        };
      }
    }

    const newRecord: AnalyticRecord = {
      id: generateId(),
      patientId,
      consultationId,
      testName,
      result,
      unit: input?.unit,
      referenceRange: input?.referenceRange,
      date,
      notes: input?.notes,
      createdAt: Date.now(),
    };

    analytics.push(newRecord);
    await saveAnalytics(analytics);

    return {
      ok: true,
      moduleName: "analytics-para-ora-health-smg",
      action: "create",
      analytic: newRecord,
      total: analytics.length,
    };
  }

  if (action === "listByPatient") {
    const patientId = input?.patientId;

    if (!patientId) {
      return {
        ok: false,
        moduleName: "analytics-para-ora-health-smg",
        action: "listByPatient",
        error: "missing_patient_id",
      };
    }

    const filtered = analytics.filter((a) => a.patientId === patientId);

    return {
      ok: true,
      moduleName: "analytics-para-ora-health-smg",
      action: "listByPatient",
      patientId,
      total: filtered.length,
      analytics: filtered,
    };
  }

  if (action === "listByConsultation") {
    const consultationId = input?.consultationId;

    if (!consultationId) {
      return {
        ok: false,
        moduleName: "analytics-para-ora-health-smg",
        action: "listByConsultation",
        error: "missing_consultation_id",
      };
    }

    const filtered = analytics.filter((a) => a.consultationId === consultationId);

    return {
      ok: true,
      moduleName: "analytics-para-ora-health-smg",
      action: "listByConsultation",
      consultationId,
      total: filtered.length,
      analytics: filtered,
    };
  }

  return {
    ok: true,
    moduleName: "analytics-para-ora-health-smg",
    action: "list",
    total: analytics.length,
    analytics,
  };
}
