import "dotenv/config";
import { app, ensureEssenceSeeds, ensureProfileSeeds } from "./app";

async function start() {
  await ensureEssenceSeeds();
  await ensureProfileSeeds();

  const PORT = Number(process.env.PORT || 3001);

  app.listen(PORT, () => {
    console.log(`🔥 ORA corriendo en puerto ${PORT}`);
  });
}

start();
