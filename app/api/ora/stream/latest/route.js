import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Ruta donde el gateway guarda los archivos .raw (o .h264)
const STREAMS_DIR = path.join(process.cwd(), 'ora-data', 'streams');

// Función para generar una imagen placeholder en base64 (un punto gris)
function getPlaceholderImage() {
  // PNG simple de 320x240 color gris oscuro con texto "Stream no disponible"
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAUAAAADwCAYAAABxLb1rAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABdSURBVHhe7c0xDQAADMOg+X9vA2UAT3gmkDxyCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4FX2HgABAVYyXAAAAABJRU5ErkJggg==',
    'base64'
  );
}

export async function GET() {
  try {
    // 1. Verificar si existe el directorio de streams
    if (!fs.existsSync(STREAMS_DIR)) {
      // Si no, devolver placeholder
      return new NextResponse(getPlaceholderImage(), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // 2. Buscar el archivo más reciente (cualquier extensión: .raw, .h264, .jpg)
    const files = fs.readdirSync(STREAMS_DIR)
      .filter(f => /\.(raw|h264|jpg|jpeg|png)$/i.test(f))
      .map(f => ({
        name: f,
        path: path.join(STREAMS_DIR, f),
        mtime: fs.statSync(path.join(STREAMS_DIR, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    // 3. Si no hay archivos, placeholder
    if (files.length === 0) {
      return new NextResponse(getPlaceholderImage(), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    const latestFile = files[0];
    console.log(`📹 Sirviendo stream desde: ${latestFile.name}`);

    // 4. Si es imagen (jpg/png) la servimos directamente
    if (/\.(jpg|jpeg|png)$/i.test(latestFile.name)) {
      const imageBuffer = fs.readFileSync(latestFile.path);
      const contentType = latestFile.name.endsWith('.png') ? 'image/png' : 'image/jpeg';
      return new NextResponse(imageBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    // 5. Si es raw o h264, por ahora devolvemos placeholder (más adelante haremos conversión)
    // Podríamos intentar extraer un frame con ffmpeg, pero lo dejamos para después
    console.log(`⚠️ Archivo ${latestFile.name} no es imagen, sirviendo placeholder`);
    return new NextResponse(getPlaceholderImage(), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Error en /api/ora/stream/latest:', error);
    return new NextResponse(getPlaceholderImage(), {
      headers: { 'Content-Type': 'image/png' },
    });
  }
}
