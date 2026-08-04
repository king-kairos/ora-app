import { securityCameras, type SecurityCamera } from "./cameraMemory";

export function analyzeSecurityCamera(cameraId: string) {
  const camera = securityCameras.find(
    (cam: SecurityCamera) => cam.id === cameraId
  );

  if (!camera) {
    return {
      ok: false,
      error: "camera_not_found",
      cameraId,
    };
  }

  let risk: "bajo" | "medio" | "alto" = "bajo";
  let status = "estable";
  let recommendation = "Cámara operando normalmente.";
  let requiresHuman = false;

  if (camera.status === "offline") {
    risk = "medio";
    status = "offline";
    recommendation = "Revisar conexión o energía de la cámara.";
    requiresHuman = true;
  }

  if (camera.zone.toLowerCase().includes("caja")) {
    risk = "alto";
    status = "zona_sensible";
    recommendation =
      "Zona sensible: mantener monitoreo activo y revisar eventos recientes.";
    requiresHuman = true;
  }

  return {
    ok: true,
    observer: "ORA Security Multi-Feed Observer",
    branch: "ora-security",
    nucleusAccess: false,
    camera: {
      id: camera.id,
      name: camera.name,
      location: camera.location,
      zone: camera.zone,
      status: camera.status,
      feedType: camera.feedType,
    },
    analysis: {
      risk,
      status,
      requiresHuman,
      recommendation,
    },
  };
}

export function analyzeAllSecurityCameras() {
  return {
    ok: true,
    observer: "ORA Security Multi-Feed Observer",
    branch: "ora-security",
    nucleusAccess: false,
    totalCameras: securityCameras.length,
    results: securityCameras.map((camera: SecurityCamera) =>
      analyzeSecurityCamera(camera.id)
    ),
  };
}
