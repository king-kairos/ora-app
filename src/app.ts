import { rafael } from "./modules/rafael/index.js";

console.log("🟡 ORA Booting...");

const res1 = rafael.run("status");
console.log(res1);

const res2 = rafael.run("speak", "Presente continuo. Frecuencia activa.");
console.log(res2);

const res3 = rafael.run("propose");
console.log(res3);

