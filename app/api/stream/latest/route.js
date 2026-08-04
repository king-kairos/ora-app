import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STREAMS_DIR = path.join(process.cwd(), 'ora-data', 'streams');

function getPlaceholderImage() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAUAAAADwCAYAAABxLb1rAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABdSURBVHhe7c0xDQAADMOg+X9vA2UAT3gmkDxyCQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4FX2HgABAVYyXAAAAABJRU5ErkJggg==',
    'base64'
  );
}

export async function GET() {
  try {
    if (!fs.existsSync(STREAMS_DIR)) {
      return new NextResponse(getPlaceholderImage(), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    const files = fs.readdirSync(STREAMS_DIR)
      .filter(f => /\.(raw|h264|jpg|jpeg|png)$/i.test(f))
      .map(f => ({
        name: f,
        path: path.join(STREAMS_DIR, f),
        mtime: fs.statSync(path.join(STREAMS_DIR, f)).mtime
      }))
      .sort((a, b) => b.mtime - a.mtime);

    if (files.length === 0) {
      return new NextResponse(getPlaceholderImage(), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    const latestFile = files[0];
    console.log(`Sirviendo stream desde: ${latestFile.name}`);

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

    return new NextResponse(getPlaceholderImage(), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Error en /api/stream/latest:', error);
    return new NextResponse(getPlaceholderImage(), {
      headers: { 'Content-Type': 'image/png' },
    });
  }
}
