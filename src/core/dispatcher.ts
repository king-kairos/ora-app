import { ora } from "./ora";

// importar módulos
import { rafael } from "../modules/rafael";

// registrar módulos
ora.register(rafael);

// export opcional (por si luego crecemos)
export { ora };
