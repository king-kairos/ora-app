const fs = require("fs");
const path = require("path");
const { protectCoreMutation } = require("../core/core-guardian");

function applyProposal(proposal) {

  if (!proposal) {
    throw new Error("NO_PROPOSAL");
  }

  const actor = proposal.actor || "branch";
  const target = proposal.target || "branch";
  const hasKairosSeal = proposal.hasKairosSeal || false;

  // protección del núcleo
  const guard = protectCoreMutation({
    actor,
    target,
    hasKairosSeal
  });

  if (!guard.allowed) {
    throw new Error("CORE_GUARDIAN_BLOCK: " + guard.reason);
  }

  if (!proposal.files || !Array.isArray(proposal.files)) {
    throw new Error("INVALID_PROPOSAL_FILES");
  }

  const results = [];

  for (const file of proposal.files) {

    const filePath = path.join(process.cwd(), file.path);

    const dir = path.dirname(filePath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (file.action === "create") {

      fs.writeFileSync(
        filePath,
        file.content || "",
        "utf8"
      );

      results.push({
        action: "created",
        file: file.path
      });

    } else if (file.action === "update") {

      fs.writeFileSync(
        filePath,
        file.content || "",
        "utf8"
      );

      results.push({
        action: "updated",
        file: file.path
      });

    } else if (file.action === "delete") {

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      results.push({
        action: "deleted",
        file: file.path
      });

    } else {

      results.push({
        action: "skipped",
        file: file.path,
        reason: "unknown action"
      });

    }

  }

  return {
    ok: true,
    actor,
    target,
    results
  };
}

module.exports = {
  applyProposal
};
