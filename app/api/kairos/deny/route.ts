import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  const body = await req.json();
  const { id } = body;

  const dir = path.join(process.cwd(), "data/coherencia/proposals");

  const file = fs
    .readdirSync(dir)
    .find((f) => f.includes(id));

  if (!file) {
    return NextResponse.json({ ok: false });
  }

  const full = path.join(dir, file);

  const data = JSON.parse(
    fs.readFileSync(full, "utf8")
  );

  data.status = "denied";

  fs.writeFileSync(
    full,
    JSON.stringify(data, null, 2)
  );

  return NextResponse.json({ ok: true });
}
