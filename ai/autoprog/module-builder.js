const fs = require("fs");
const path = require("path");

function createModule(name) {

  const base = path.join(process.cwd(), "app", name);

  if (fs.existsSync(base)) {
    return { ok: false, message: "módulo ya existe" };
  }

  fs.mkdirSync(base, { recursive: true });

  const page = `
export default function ${name}Page() {
  return (
    <div>
      <h1>Módulo ${name}</h1>
    </div>
  );
}
`;

  fs.writeFileSync(path.join(base, "page.tsx"), page);

  return {
    ok: true,
    module: name
  };
}

module.exports = {
  createModule
};
