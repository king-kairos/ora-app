import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "ora-health");
const PATIENTS_FILE = path.join(DATA_DIR, "patients.json");
const CONSULTATIONS_FILE = path.join(DATA_DIR, "consultations.json");
const PRESCRIPTIONS_FILE = path.join(DATA_DIR, "prescriptions.json");
const ANALYTICS_FILE = path.join(DATA_DIR, "analytics.json");

type Patient = {
  id: string;
  name: string;
  cedula?: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  emergencyContact?: string;
  createdAt: number;
};

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

type Prescription = {
  id: string;
  patientId: string;
  doctorId: string;
  consultationId?: string;
  medicationName: string;
  dose: string;
  frequency: string;
  duration: string;
  notes?: string;
  createdAt: number;
};

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

export async function runPatientRecordParaOraHealthSmgModule(input?: any) {
  const patientId = input?.patientId;

  if (!patientId) {
    return {
      ok: false,
      moduleName: "patient-record-para-ora-health-smg",
      error: "missing_patient_id",
    };
  }

  const patients = await readJsonFile<Patient>(PATIENTS_FILE);
  const consultations = await readJsonFile<Consultation>(CONSULTATIONS_FILE);
  const prescriptions = await readJsonFile<Prescription>(PRESCRIPTIONS_FILE);
  const analytics = await readJsonFile<AnalyticRecord>(ANALYTICS_FILE);

  const patient = patients.find((p) => p.id === patientId);

  if (!patient) {
    return {
      ok: false,
      moduleName: "patient-record-para-ora-health-smg",
      error: "patient_not_found",
      patientId,
    };
  }

  const patientConsultations = consultations.filter((c) => c.patientId === patientId);
  const patientPrescriptions = prescriptions.filter((p) => p.patientId === patientId);
  const patientAnalytics = analytics.filter((a) => a.patientId === patientId);

  return {
    ok: true,
    moduleName: "patient-record-para-ora-health-smg",
    patientId,
    patient,
    summary: {
      consultations: patientConsultations.length,
      prescriptions: patientPrescriptions.length,
      analytics: patientAnalytics.length,
    },
    record: {
      consultations: patientConsultations,
      prescriptions: patientPrescriptions,
      analytics: patientAnalytics,
    },
  };
}
