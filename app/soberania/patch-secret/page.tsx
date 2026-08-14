"use client";

/**
 * KAIROS_PATCH_SECRET_BROWSER_RETIRED_V1
 *
 * KAIROS_PATCH_SECRET es una credencial exclusivamente server-side.
 * Esta página histórica permanece únicamente para explicar el cambio.
 */
export default function PatchSecretPage() {
  return (
    <div
      style={{
        padding: 40,
        fontFamily: "system-ui",
        maxWidth: 760,
      }}
    >
      <h1>Firma HMAC de Kairos</h1>

      <p>
        La firma sensible ya no se almacena ni se introduce en el navegador.
      </p>

      <p>
        El navegador presenta únicamente la autoridad KAIROS_SEAL.
        Las rutas Node autorizadas generan la firma HMAC server-side
        antes de comunicarse con ORA Core.
      </p>

      <p>
        Estado: <strong>HMAC SERVER-SIDE</strong>
      </p>
    </div>
  );
}
