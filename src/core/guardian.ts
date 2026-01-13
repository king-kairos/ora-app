export type ModuleName = 'rafael' | 'kaerliana' | 'orion';

export class Guardian {
  private authorizedByKairos = true;

  authorize(module: ModuleName, action: string): boolean {
    if (!this.authorizedByKairos) {
      console.log(`❌ Acción bloqueada: ${module} → ${action}`);
      return false;
    }

    console.log(`✅ Acción autorizada por Kairos: ${module} → ${action}`);
    return true;
  }
}

export const guardian = new Guardian();
