"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Patient = {
  id: string;
  name: string;
  cedula?: string;
  phone?: string;
  address?: string;
  birthDate?: string;
  emergencyContact?: string;
};

export type Doctor = {
  id: string;
  name: string;
  specialty?: string;
  phone?: string;
  email?: string;
};

export type Consultation = {
  id: string;
  patientId: string;
  doctorId: string;
  date: string;
  reason: string;
  diagnosis?: string;
  notes?: string;
};

export type Prescription = {
  id: string;
  patientId: string;
  doctorId: string;
  consultationId?: string;
  medicationName: string;
  dose: string;
  frequency: string;
  duration: string;
  notes?: string;
};

export type Analytic = {
  id: string;
  patientId: string;
  consultationId?: string;
  testName: string;
  result: string;
  unit: string;
  referenceRange?: string;
  date: string;
  notes?: string;
};

type PatientsResponse = {
  result?: {
    ok?: boolean;
    error?: string;
    patients?: Patient[];
  };
};

type DoctorsResponse = {
  result?: {
    ok?: boolean;
    error?: string;
    doctors?: Doctor[];
  };
};

type ConsultationsResponse = {
  result?: {
    ok?: boolean;
    error?: string;
    consultations?: Consultation[];
  };
};

type PrescriptionsResponse = {
  result?: {
    ok?: boolean;
    error?: string;
    prescriptions?: Prescription[];
  };
};

type AnalyticsResponse = {
  result?: {
    ok?: boolean;
    error?: string;
    analytics?: Analytic[];
  };
};

type CreatePatientInput = {
  name: string;
  cedula: string;
  phone?: string;
  birthDate?: string;
  address?: string;
  emergencyContact?: string;
};

type HealthContextValue = {
  patients: Patient[];
  doctors: Doctor[];
  consultations: Consultation[];
  prescriptions: Prescription[];
  analytics: Analytic[];
  loading: boolean;
  savingPatient: boolean;
  error: string;
  reloadAll: () => Promise<void>;
  createPatient: (input: CreatePatientInput) => Promise<boolean>;
};

const HealthContext = createContext<HealthContextValue | undefined>(undefined);

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Request failed: ${res.status}`);
  }

  return (await res.json()) as T;
}

export function HealthProvider({ children }: { children: ReactNode }) {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [analytics, setAnalytics] = useState<Analytic[]>([]);

  const [loading, setLoading] = useState<boolean>(true);
  const [savingPatient, setSavingPatient] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const reloadAll = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError("");

      const [
        patientsRes,
        doctorsRes,
        consultationsRes,
        prescriptionsRes,
        analyticsRes,
      ] = await Promise.all([
        postJson<PatientsResponse>("/api/ora/health-smg/patients", {}),
        postJson<DoctorsResponse>("/api/ora/health-smg/doctors", {}),
        postJson<ConsultationsResponse>("/api/ora/health-smg/consultations", {}),
        postJson<PrescriptionsResponse>("/api/ora/health-smg/prescriptions", {}),
        postJson<AnalyticsResponse>("/api/ora/health-smg/analytics", {}),
      ]);

      setPatients(
        Array.isArray(patientsRes?.result?.patients) ? patientsRes.result.patients : []
      );
      setDoctors(
        Array.isArray(doctorsRes?.result?.doctors) ? doctorsRes.result.doctors : []
      );
      setConsultations(
        Array.isArray(consultationsRes?.result?.consultations)
          ? consultationsRes.result.consultations
          : []
      );
      setPrescriptions(
        Array.isArray(prescriptionsRes?.result?.prescriptions)
          ? prescriptionsRes.result.prescriptions
          : []
      );
      setAnalytics(
        Array.isArray(analyticsRes?.result?.analytics) ? analyticsRes.result.analytics : []
      );
    } catch (_err) {
      setError("No se pudo cargar ORA Health.");
      setPatients([]);
      setDoctors([]);
      setConsultations([]);
      setPrescriptions([]);
      setAnalytics([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const createPatient = useCallback(
    async (input: CreatePatientInput): Promise<boolean> => {
      try {
        setSavingPatient(true);
        setError("");

        const data = await postJson<PatientsResponse>("/api/ora/health-smg/patients", {
          action: "create",
          name: input.name,
          cedula: input.cedula,
          phone: input.phone || "",
          birthDate: input.birthDate || "",
          address: input.address || "",
          emergencyContact: input.emergencyContact || "",
        });

        if (!data?.result?.ok) {
          setError(data?.result?.error || "No se pudo crear el paciente.");
          return false;
        }

        await reloadAll();
        return true;
      } catch (_err) {
        setError("Error creando paciente.");
        return false;
      } finally {
        setSavingPatient(false);
      }
    },
    [reloadAll]
  );

  useEffect(() => {
    void reloadAll();
  }, [reloadAll]);

  const value = useMemo<HealthContextValue>(
    () => ({
      patients,
      doctors,
      consultations,
      prescriptions,
      analytics,
      loading,
      savingPatient,
      error,
      reloadAll,
      createPatient,
    }),
    [
      patients,
      doctors,
      consultations,
      prescriptions,
      analytics,
      loading,
      savingPatient,
      error,
      reloadAll,
      createPatient,
    ]
  );

  return <HealthContext.Provider value={value}>{children}</HealthContext.Provider>;
}

export function useHealth(): HealthContextValue {
  const context = useContext(HealthContext);

  if (!context) {
    throw new Error("useHealth must be used inside HealthProvider");
  }

  return context;
}
