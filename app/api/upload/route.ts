import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: "No hay archivo" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadDir = path.join(process.cwd(), 'uploads');
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filePath = path.join(uploadDir, file.name);
    await fs.writeFile(filePath, buffer);

    return NextResponse.json({ 
      text: `[KAERLIANA]: He recibido el archivo '${file.name}'. Los datos están en la bóveda y estoy lista para procesarlos.` 
    });
  } catch (error) {
    return NextResponse.json({ error: "Fallo en la carga" }, { status: 500 });
  }
}
