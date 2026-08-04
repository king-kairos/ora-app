import { NextResponse } from "next/server";
import {
  readAlerts,
  readCameras,
  readEvents,
} from "../../../../../../src/lib/securityMemory";
import { analyzeSecurityCamera } from "../../../../../../src/ora/security/cameraObserver";

export async function GET() {
  try {
    const cameras = readCameras();
    const events = readEvents();
    const alerts = readAlerts();

    const intelligence = cameras.map((camera: any) => {
      const cameraEvents = events.filter(
        (event: any) => event.zone === camera.zone
      );

      const cameraAlerts = alerts.filter(
        (alert: any) => alert.zone === camera.zone
      );

      const lastEvent = cameraEvents
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(b.timestamp).getTime() -
            new Date(a.timestamp).getTime()
        )[0];

      const lastAlert = cameraAlerts
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(b.timestamp).getTime() -
            new Date(a.timestamp).getTime()
        )[0];

      const observerResult = analyzeSecurityCamera(camera.id);
      const analysis = observerResult?.analysis || {
        risk: "bajo",
        status: "estable",
        requiresHuman: false,
        recommendation: "Cámara operando normalmente.",
      };

      const feedHealth =
        camera.status === "offline"
          ? {
              status: "offline",
              latency: null,
              fps: 0,
              signal: 0,
              packetLoss: 100,
            }
          : {
              status: "online",
              latency: Math.floor(Math.random() * 60) + 20,
              fps: Math.floor(Math.random() * 10) + 20,
              signal: Math.floor(Math.random() * 15) + 85,
              packetLoss: Math.floor(Math.random() * 3),
            };

      return {
        ok: true,
        camera,
        analysis,
        feedHealth,
        lastActivity: lastAlert
          ? {
              type: "alert",
              title: lastAlert.title,
              timestamp: lastAlert.timestamp,
              level: lastAlert.level,
            }
          : lastEvent
          ? {
              type: "event",
              title: lastEvent.eventType,
              timestamp: lastEvent.timestamp,
              confidence: lastEvent.confidence,
            }
          : {
              type: "none",
              title: "Sin actividad reciente",
              timestamp: null,
            },
        totals: {
          events: cameraEvents.length,
          alerts: cameraAlerts.length,
        },
      };
    });

    return NextResponse.json({
      ok: true,
      observer: "ORA Security Dashboard Intelligence Layer",
      branch: "ora-security",
      nucleusAccess: false,
      totalCameras: cameras.length,
      intelligence,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: "camera_intelligence_failed",
        message: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
