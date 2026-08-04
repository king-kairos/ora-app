import {
  readCameras,
  writeCameras,
} from "@/lib/securityMemory";

export type SecurityCamera = {
  id: string;
  name: string;
  location: string;
  zone: string;
  status: "online" | "offline";
  feedType: "simulated" | "rtsp" | "ip";
};

const defaultCameras: SecurityCamera[] = [
  {
    id: "cam_001",
    name: "Cámara Caja Principal",
    location: "Supermercado ORA",
    zone: "Caja Principal",
    status: "online",
    feedType: "simulated",
  },
  {
    id: "cam_002",
    name: "Cámara Entrada",
    location: "Supermercado ORA",
    zone: "Entrada",
    status: "online",
    feedType: "simulated",
  },
  {
    id: "cam_003",
    name: "Cámara Almacén",
    location: "Supermercado ORA",
    zone: "Almacén",
    status: "offline",
    feedType: "simulated",
  },
];

function ensureCameras() {
  const cameras = readCameras();

  if (cameras.length === 0) {
    writeCameras(defaultCameras);
    return defaultCameras;
  }

  return cameras;
}

export const securityCameras = ensureCameras();

export function listSecurityCameras() {
  const cameras = ensureCameras();

  return {
    ok: true,
    totalCameras: cameras.length,
    cameras,
  };
}

export function addSecurityCamera(camera: Omit<SecurityCamera, "id">) {
  const cameras = ensureCameras();

  const newCamera: SecurityCamera = {
    id: `cam_${Date.now()}`,
    ...camera,
  };

  cameras.push(newCamera);
  writeCameras(cameras);

  return {
    ok: true,
    camera: newCamera,
    totalCameras: cameras.length,
  };
}

export function updateSecurityCamera(
  id: string,
  data: Partial<SecurityCamera>
) {
  const cameras = ensureCameras();

  const index = cameras.findIndex((camera: SecurityCamera) => camera.id === id);

  if (index === -1) {
    return {
      ok: false,
      error: "camera_not_found",
      id,
    };
  }

  cameras[index] = {
    ...cameras[index],
    ...data,
    id,
  };

  writeCameras(cameras);

  return {
    ok: true,
    camera: cameras[index],
  };
}

export function deleteSecurityCamera(id: string) {
  const cameras = ensureCameras();

  const filtered = cameras.filter((camera: SecurityCamera) => camera.id !== id);

  writeCameras(filtered);

  return {
    ok: true,
    deleted: id,
    totalCameras: filtered.length,
  };
}
