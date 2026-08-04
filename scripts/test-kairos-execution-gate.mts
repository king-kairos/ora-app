import assert from "node:assert/strict";
import {
  authorizeKairosExecution,
  KAIROS_EXECUTION_ACTIONS,
} from "../src/security/kairosExecutionGate";

const previousSeal = process.env.KAIROS_SEAL;

function requestWithSeal(seal?: string): Request {
  const headers = new Headers();

  if (seal !== undefined) {
    headers.set("x-kairos-seal", seal);
  }

  return new Request("http://localhost/internal-test", {
    method: "POST",
    headers,
  });
}

try {
  delete process.env.KAIROS_SEAL;

  const noServerSeal = authorizeKairosExecution(
    requestWithSeal("cualquier-valor"),
    "apply_patch"
  );

  assert.equal(noServerSeal.ok, false);
  assert.equal(
    noServerSeal.ok ? null : noServerSeal.error,
    "KAIROS_SEAL_NOT_CONFIGURED"
  );

  process.env.KAIROS_SEAL =
    "prueba-local-kairos-no-es-sello-real";

  const missingSeal = authorizeKairosExecution(
    requestWithSeal(),
    "write_file"
  );

  assert.equal(missingSeal.ok, false);
  assert.equal(
    missingSeal.ok ? null : missingSeal.error,
    "KAIROS_SEAL_MISSING"
  );

  const invalidSeal = authorizeKairosExecution(
    requestWithSeal("sello-equivocado"),
    "deploy"
  );

  assert.equal(invalidSeal.ok, false);
  assert.equal(
    invalidSeal.ok ? null : invalidSeal.error,
    "KAIROS_SEAL_INVALID"
  );

  const validSeal = authorizeKairosExecution(
    requestWithSeal(
      "prueba-local-kairos-no-es-sello-real"
    ),
    "rollback"
  );

  assert.equal(validSeal.ok, true);

  for (const action of KAIROS_EXECUTION_ACTIONS) {
    const result = authorizeKairosExecution(
      requestWithSeal(
        "prueba-local-kairos-no-es-sello-real"
      ),
      action
    );

    assert.equal(
      result.ok,
      true,
      `La acción ${action} debía autorizarse`
    );
  }

  console.log("KAIROS_EXECUTION_GATE_TEST: OK");
  console.log(
    `ACCIONES PROTEGIDAS: ${KAIROS_EXECUTION_ACTIONS.length}`
  );
  console.log("FAIL-CLOSED: CONFIRMADO");
} finally {
  if (previousSeal === undefined) {
    delete process.env.KAIROS_SEAL;
  } else {
    process.env.KAIROS_SEAL = previousSeal;
  }
}
