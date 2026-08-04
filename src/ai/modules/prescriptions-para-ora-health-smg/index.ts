import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "ora-health");
const PRESCRIPTIONS_FILE = path.join(DATA_DIR, "prescriptions.json");
const PATIENTS_FILE = path.join(DATA_DIR, "patients.json");
const DOCTORS_FILE = path.join(DATA_DIR, "doctors.json");
const CONSULTATIONS_FILE = path.join(DATA_DIR, "consultations.json");

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

type Patient = {
  id: string;
  name: string;
};

type Doctor = {
  id: string;
  name: string;
};

type Consultation = {
  id: string;
  patientId: string;
  doctorId: string;
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

async function savePrescriptions(prescriptions: Prescription[]) {
  await fs.writeFile(
    PRESCRIPTIONS_FILE,
    JSON.stringify(prescriptions, null, 2),
    "utf-8"
  );
}

function generateId() {
  return "rx_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
}

export async function runPrescriptionsParaOraHealthSmgModule(input?: any) {
  const action = input?.action ?? "list";

  const prescriptions = await readJsonFile<Prescription>(PRESCRIPTIONS_FILE);
  const patients = await readJsonFile<Patient>(PATIENTS_FILE);
  const doctors = await readJsonFile<Doctor>(DOCTORS_FILE);
  const consultations = await readJsonFile<Consultation>(CONSULTATIONS_FILE);

  if (action === "create") {
    const patientId = input?.patientId;
    const doctorId = input?.doctorId;
    const consultationId = input?.consultationId;
    const medicationName = input?.medicationName;
    const dose = input?.dose;
    const frequency = input?.frequency;
    const duration = input?.duration;

    if (!patientId || !doctorId || !medicationName || !dose || !frequency || !duration) {
      return {
        ok: false,
        moduleName: "prescriptions-para-ora-health-smg",
        action: "create",
        error: "missing_required_fields",
        required: [
          "patientId",
          "doctorId",
          "medicationName",
          "dose",
          "frequency",
          "duration"
        ],
      };
    }

    const patientExists = patients.some((p) => p.id === patientId);
    if (!patientExists) {
      return {
        ok: false,
        moduleName: "prescriptions-para-ora-health-smg",
        action: "create",
        error: "patient_not_found",
        patientId,
      };
    }

    const doctorExists = doctors.some((d) => d.id === doctorId);
    if (!doctorExists) {
      return {
        ok: false,
        moduleName: "prescriptions-para-ora-health-smg",
        action: "create",
        error: "doctor_not_found",
        doctorId,
      };
    }

    if (consultationId) {
      const consultation = consultations.find((c) => c.id === consultationId);

      if (!consultation) {
        return {
          ok: false,
          moduleName: "prescriptions-para-ora-health-smg",
          action: "create",
          error: "consultation_not_found",
          consultationId,
        };
      }

      if (consultation.patientId !== patientId) {
        return {
          ok: false,
          moduleName: "prescriptions-para-ora-health-smg",
          action: "create",
          error: "consultation_patient_mismatch",
          consultationId,
          patientId,
        };
      }

      if (consultation.doctorId !== doctorId) {
        return {
          ok: false,
          moduleName: "prescriptions-para-ora-health-smg",
          action: "create",
          error: "consultation_doctor_mismatch",
          consultationId,
          doctorId,
        };
      }
    }

    const newPrescription: Prescription = {
      id: generateId(),
      patientId,
      doctorId,
      consultationId,
      medicationName,
      dose,
      frequency,
      duration,
      notes: input?.notes,
      createdAt: Date.now(),
    };

    prescriptions.push(newPrescription);
    await savePrescriptions(prescriptions);

    return {
      ok: true,
      moduleName: "prescriptions-para-ora-health-smg",
      action: "create",
      prescription: newPrescription,
      total: prescriptions.length,
    };
  }

  if (action === "listByPatient") {
    const patientId = input?.patientId;

    if (!patientId) {
      return {
        ok: false,
        moduleName: "prescriptions-para-ora-health-smg",
        action: "listByPatient",
        error: "missing_patient_id",
      };
    }

    const filtered = prescriptions.filter((p) => p.patientId === patientId);

    return {
      ok: true,
      moduleName: "prescriptions-para-ora-health-smg",
      action: "listByPatient",
      patientId,
      total: filtered.length,
      prescriptions: filtered,
    };
  }

  if (action === "listByConsultation") {
    const consultationId = input?.consultationId;

    if (!consultationId) {
      return {
        ok: false,
        moduleName: "prescriptions-para-ora-health-smg",
        action: "listByConsultation",
        error: "missing_consultation_id",
      };
    }

    const filtered = prescriptions.filter((p) => p.consultationId === consultationId);

    return {
      ok: true,
      moduleName: "prescriptions-para-ora-health-smg",
      action: "listByConsultation",
      consultationId,
      total: filtered.length,
      prescriptions: filtered,
    };
  }

  return {
    ok: true,
    moduleName: "prescriptions-para-ora-health-smg",
    action: "list",
    total: prescriptions.length,
    prescriptions,
  };
}
