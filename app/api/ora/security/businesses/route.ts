import { NextResponse } from "next/server";
import {
  getSecurityBusinesses,
  getSecurityZones,
} from "../../../../../src/ora/security/businessMemory";

export async function GET() {
  return NextResponse.json({
    ok: true,
    branch: "ora-security",
    nucleusAccess: false,
    businesses: getSecurityBusinesses(),
    zones: getSecurityZones(),
  });
}
