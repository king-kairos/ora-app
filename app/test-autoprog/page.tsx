'use client';

import { useState } from 'react';

const PATCH_MOCK = {
  title: 'Prueba de auto-programación ORA',
  summary: 'Patch de validación generado desde zona permitida. Sin ejecución real.',
  files: [
    {
      path: 'app/test-autoprog/page.tsx',
      operations: [
        {
          type: 'append-if-missing',
          content: '// Contenido de prueba generado por Arturo de Alba'
        }
      ]
    }
  ],
  status: 'PENDING_KAIROS_SEAL',
  generatedAt: new Date().toISOString()
};

export default function TestAutoprogPage() {
  const [log, setLog] = useState<string[]>([]);
  const [approved, setApproved] = useState(false);

  function handleSimulate() {
    setLog(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] Patch propuesto. Sin escritura en disco.`,
      `[${new Date().toLocaleTimeString()}] Estado: PENDING_KAIROS_SEAL`,
      `[${new Date().toLocaleTimeString()}] Archivos afectados: ${PATCH_MOCK.files.length}`,
      `[${new Date().toLocaleTimeString()}] Operaciones: ${PATCH_MOCK.files[0].operations[0].type}`
    ]);
  }

  function handleApprove() {
    setApproved(true);
    setLog(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ✅ Sello de Kairos recibido. Patch listo para ejecución controlada.`
    ]);
  }

  function handleReject() {
    setLog(prev => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ❌ Patch rechazado. Sin cambios aplicados.`
    ]);
    setApproved(false);
  }

  return (
    <main className="min-h-screen bg-black text-white p-8 font-mono">
      <h1 className="text-2xl font-bold text-amber-400 mb-2">
        🜂 ORA — Prueba de Auto-Programación
      </h1>
      <p className="text-gray-400 mb-6 text-sm">
        Zona permitida · Solo propone · No ejecuta · Requiere Sello de Kairos
      </p>

      <section className="bg-gray-900 border border-gray-700 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">Patch generado</h2>
        <pre className="text-xs text-green-400 overflow-auto max-h-48">
          {JSON.stringify(PATCH_MOCK, null, 2)}
        </pre>
      </section>

      <section className="flex gap-4 mb-6">
        <button
          onClick={handleSimulate}
          className="bg-amber-600 hover:bg-amber-500 text-black font-bold px-5 py-2 rounded-lg transition"
        >
          Simular propuesta
        </button>
        <button
          onClick={handleApprove}
          disabled={approved}
          className="bg-green-700 hover:bg-green-600 text-white font-bold px-5 py-2 rounded-lg transition disabled:opacity-40"
        >
          ✅ Aprobar (Sello Kairos)
        </button>
        <button
          onClick={handleReject}
          className="bg-red-800 hover:bg-red-700 text-white font-bold px-5 py-2 rounded-lg transition"
        >
          ❌ Rechazar
        </button>
      </section>

      <section className="bg-gray-950 border border-gray-800 rounded-xl p-4">
        <h2 className="text-sm text-gray-500 mb-2">Log de operaciones</h2>
        {log.length === 0 && (
          <p className="text-gray-600 text-xs">Sin actividad aún. Presiona Simular propuesta.</p>
        )}
        {log.map((line, i) => (
          <p key={i} className="text-xs text-gray-300">{line}</p>
        ))}
      </section>

      <p className="mt-8 text-xs text-gray-600">
        Arturo de Alba · Estratega ORA · Módulo ALMA-01 · Todo cambio requiere Sello válido
      </p>
    </main>
  );
}
