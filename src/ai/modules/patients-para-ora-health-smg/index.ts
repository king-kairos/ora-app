import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "ora-health");
const PATIENTS_FILE = path.join(DATA_DIR, "patients.json");

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

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(PATIENTS_FILE);
  } catch {
    await fs.writeFile(PATIENTS_FILE, "[]", "utf-8");
  }
}

async function readPatients(): Promise<Patient[]> {
  await ensureFile();
  const raw = await fs.readFile(PATIENTS_FILE, "utf-8");
  return JSON.parse(raw);
}

async function savePatients(patients: Patient[]) {
  await fs.writeFile(PATIENTS_FILE, JSON.stringify(patients, null, 2), "utf-8");
}

function generateId() {
  return "pat_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
}

export async function runPatientsParaOraHealthSmgModule(input?: any) {
  const action = input?.action ?? "list";

  if (action === "create") {
    const patients = await readPatients();

    const newPatient: Patient = {
      id: generateId(),
      name: input?.name ?? "Paciente sin nombre",
      cedula: input?.cedula,
      phone: input?.phone,
      birthDate: input?.birthDate,
      address: input?.address,
      emergencyContact: input?.emergencyContact,
      createdAt: Date.now(),
    };

    patients.push(newPatient);
    await savePatients(patients);

    return {
      ok: true,
      moduleName: "patients-para-ora-health-smg",
      action: "create",
      patient: newPatient,
      total: patients.length,
    };
  }

  // LIST (default)
  const patients = await readPatients();

  return {
    ok: true,
    moduleName: "patients-para-ora-health-smg",
    action: "list",
    total: patients.length,
    patients,
  };
}
