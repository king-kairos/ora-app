import fs from 'fs';
import path from 'path';

const LOG_PATH = path.join(process.cwd(), 'ops', 'ops.log.json');

export function logApproval(data: any) {
  // Asegurar carpeta y archivo
  if (!fs.existsSync(LOG_PATH)) {
    fs.mkdirSync(path.dirname(LOG_PATH), { recursive: true });
    fs.writeFileSync(LOG_PATH, JSON.stringify([], null, 2));
  }

  // Leer log actual
  const current = JSON.parse(fs.readFileSync(LOG_PATH, 'utf-8'));

  // Agregar nueva entrada
  current.push({
    ...data,
    loggedAt: new Date().toISOString(),
  });

  // Guardar log
  fs.writeFileSync(LOG_PATH, JSON.stringify(current, null, 2));
}
