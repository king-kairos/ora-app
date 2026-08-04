import fs from "fs/promises";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "ora-health");
const DOCTORS_FILE = path.join(DATA_DIR, "doctors.json");

type Doctor = {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  email?: string;
  licenseNumber?: string;
  createdAt: number;
};

async function ensureFile() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DOCTORS_FILE);
  } catch {
    await fs.writeFile(DOCTORS_FILE, "[]", "utf-8");
  }
}

async function readDoctors(): Promise<Doctor[]> {
  await ensureFile();
  const raw = await fs.readFile(DOCTORS_FILE, "utf-8");
  return JSON.parse(raw);
}

async function saveDoctors(doctors: Doctor[]) {
  await fs.writeFile(DOCTORS_FILE, JSON.stringify(doctors, null, 2), "utf-8");
}

function generateId() {
  return "doc_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
}

export async function runDoctorsParaOraHealthSmgModule(input?: any) {
  const action = input?.action ?? "list";

  if (action === "create") {
    const doctors = await readDoctors();

    const newDoctor: Doctor = {
      id: generateId(),
      name: input?.name ?? "Doctor sin nombre",
      specialty: input?.specialty,
      phone: input?.phone,
      email: input?.email,
      licenseNumber: input?.licenseNumber,
      createdAt: Date.now(),
    };

    doctors.push(newDoctor);
    await saveDoctors(doctors);

    return {
      ok: true,
      moduleName: "doctors-para-ora-health-smg",
      action: "create",
      doctor: newDoctor,
      total: doctors.length,
    };
  }

  const doctors = await readDoctors();

  return {
    ok: true,
    moduleName: "doctors-para-ora-health-smg",
    action: "list",
    total: doctors.length,
    doctors,
  };
}
