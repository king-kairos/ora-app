import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "ora-health");
const CONSULTATIONS_FILE = path.join(DATA_DIR, "consultations.json");
const PATIENTS_FILE = path.join(DATA_DIR, "patients.json");
const DOCTORS_FILE = path.join(DATA_DIR, "doctors.json");

type Consultation = {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  reason: string;
  diagnosis?: string;
  notes?: string;
  createdAt: number;
};

type Patient = {
  id: string;
  name: string;
};

type Doctor = {
  id: string;
  name: string;
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

async function saveConsultations(consultations: Consultation[]) {
  await fs.writeFile(
    CONSULTATIONS_FILE,
    JSON.stringify(consultations, null, 2),
    "utf-8"
  );
}

function generateId() {
  return "con_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
}

export async function runConsultationsParaOraHealthSmgModule(input?: any) {
  const action = input?.action ?? "list";

  const consultations = await readJsonFile<Consultation>(CONSULTATIONS_FILE);
  const patients = await readJsonFile<Patient>(PATIENTS_FILE);
  const doctors = await readJsonFile<Doctor>(DOCTORS_FILE);

  if (action === "create") {
    const patientId = input?.patientId;
    const doctorId = input?.doctorId;
    const date = input?.date;
    const reason = input?.reason;

    if (!patientId || !doctorId || !date || !reason) {
      return {
        ok: false,
        moduleName: "consultations-para-ora-health-smg",
        action: "create",
        error: "missing_required_fields",
        required: ["patientId", "doctorId", "date", "reason"],
      };
    }

    const patientExists = patients.some((p) => p.id === patientId);
    if (!patientExists) {
      return {
        ok: false,
        moduleName: "consultations-para-ora-health-smg",
        action: "create",
        error: "patient_not_found",
        patientId,
      };
    }

    const doctorExists = doctors.some((d) => d.id === doctorId);
    if (!doctorExists) {
      return {
        ok: false,
        moduleName: "consultations-para-ora-health-smg",
        action: "create",
        error: "doctor_not_found",
        doctorId,
      };
    }

    const newConsultation: Consultation = {
      id: generateId(),
      patientId,
      doctorId,
      date,
      reason,
      diagnosis: input?.diagnosis,
      notes: input?.notes,
      createdAt: Date.now(),
    };

    consultations.push(newConsultation);
    await saveConsultations(consultations);

    return {
      ok: true,
      moduleName: "consultations-para-ora-health-smg",
      action: "create",
      consultation: newConsultation,
      total: consultations.length,
    };
  }

  if (action === "listByPatient") {
    const patientId = input?.patientId;

    if (!patientId) {
      return {
        ok: false,
        moduleName: "consultations-para-ora-health-smg",
        action: "listByPatient",
        error: "missing_patient_id",
      };
    }

    const filtered = consultations.filter((c) => c.patientId === patientId);

    return {
      ok: true,
      moduleName: "consultations-para-ora-health-smg",
      action: "listByPatient",
      patientId,
      total: filtered.length,
      consultations: filtered,
    };
  }

  return {
    ok: true,
    moduleName: "consultations-para-ora-health-smg",
    action: "list",
    total: consultations.length,
    consultations,
  };
}
