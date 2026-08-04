import { NextRequest, NextResponse } from "next/server"
import fs from "fs"
import path from "path"

const PROPOSALS_FILE = path.join(process.cwd(), "data/autoprog/proposals.json")

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ ok: false, error: "ID_REQUIRED" })
    }

    // Leer propuestas
    const raw = fs.readFileSync(PROPOSALS_FILE, "utf-8")
    const data = JSON.parse(raw)

    const proposal = data.proposals.find((p: any) => p.id === id)

    if (!proposal) {
      return NextResponse.json({ ok: false, error: "NOT_FOUND" })
    }

    // Cambiar estado
    proposal.status = "approved"

    // ⚡ Aquí puedes luego ejecutar el patch real
    proposal.status = "applied"

    fs.writeFileSync(PROPOSALS_FILE, JSON.stringify(data, null, 2))

    return NextResponse.json({
      ok: true,
      applied: true,
      id
    })

  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      error: err.message
    })
  }
}
