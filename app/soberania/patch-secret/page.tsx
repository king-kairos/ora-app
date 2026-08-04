// src/app/soberania/patch-secret/page.tsx
"use client";

import { useEffect, useState } from "react";

const LS_KEY = "kairos_patch_secret";

export default function PatchSecretPage() {
  const [secret, setSecret] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = localStorage.getItem(LS_KEY) || "";
    setSecret(existing);
  }, []);

  function save() {
    localStorage.setItem(LS_KEY, secret.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function clear() {
    localStorage.removeItem(LS_KEY);
    setSecret("");
  }

  return (
    <div style={{ padding: 40, fontFamily: "system-ui" }}>
      <h1>Patch Secret (Kairos)</h1>

      <p>Este secreto vive solo en este navegador (localStorage).</p>

      <input
        type="password"
        value={secret}
        onChange={(e) => setSecret(e.target.value)}
        placeholder="Pega tu KAIROS_PATCH_SECRET aquí"
        style={{
          padding: 10,
          width: 400,
          maxWidth: "100%",
          marginBottom: 10,
        }}
      />

      <br />

      <button onClick={save} style={{ marginRight: 10 }}>
        Guardar
      </button>

      <button onClick={clear}>Borrar</button>

      {saved && <p style={{ color: "green" }}>Guardado ✅</p>}
    </div>
  );
}
