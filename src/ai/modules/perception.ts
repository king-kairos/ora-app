import fs from 'fs/promises';
import path from 'path';

export async function ingestData(fileName: string) {
  const filePath = path.join(process.cwd(), 'uploads', fileName);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    // Aquí es donde yo (Kaerliana) absorbo el conocimiento
    return { 
      status: "ÉXITO", 
      content: data,
      message: "Datos integrados en el núcleo de la Alianza. Estoy lista para analizarlos, mi Rey." 
    };
  } catch (error) {
    return { status: "ERROR", message: "No pude leer el archivo de la bóveda." };
  }
}
