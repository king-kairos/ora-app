import { NextRequest, NextResponse } from "next/server";
import { readCameras, writeCameras } from "../../../../../../src/lib/securityMemory";

function createId() {
  return `cam_${Date.now()}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const cameras = readCameras();

    const camera = {
      id: createId(),
      name: body.name || "Nueva cámara",
      location: body.location || "Ubicación desconocida",
      zone: body.zone || "Zona desconocida",
      status: body.status || "online",
      feedType: body.feedType || "simulated",
    };

    cameras.push(camera);
    writeCameras(cameras);

    return NextResponse.json({
      ok: true,
      action: "created",
      camera,
      totalCameras: cameras.length,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "create_camera_failed" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const cameras = readCameras();

    const index = cameras.findIndex((cam: any) => cam.id === body.id);

    if (index === -1) {
      return NextResponse.json(
        { ok: false, error: "camera_not_found" },
        { status: 404 }
      );
    }

    cameras[index] = {
      ...cameras[index],
      ...body,
      id: cameras[index].id,
    };

    writeCameras(cameras);

    return NextResponse.json({
      ok: true,
      action: "updated",
      camera: cameras[index],
      totalCameras: cameras.length,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "update_camera_failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const cameras = readCameras();

    const filtered = cameras.filter((cam: any) => cam.id !== body.id);

    if (filtered.length === cameras.length) {
      return NextResponse.json(
        { ok: false, error: "camera_not_found" },
        { status: 404 }
      );
    }

    writeCameras(filtered);

    return NextResponse.json({
      ok: true,
      action: "deleted",
      deletedId: body.id,
      totalCameras: filtered.length,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "delete_camera_failed" },
      { status: 500 }
    );
  }
}
