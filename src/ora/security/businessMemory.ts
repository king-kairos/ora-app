export type ORASecurityBusiness = {
  id: string;
  name: string;
  type: "supermarket" | "colmado" | "house" | "building" | "neighborhood" | "other";
  location: string;
  status: "active" | "inactive";
  zones: string[];
};

export const securityBusinesses: ORASecurityBusiness[] = [
  {
    id: "biz_001",
    name: "Supermercado ORA",
    type: "supermarket",
    location: "República Dominicana",
    status: "active",
    zones: ["Entrada", "Caja Principal", "Almacén", "Salida", "Patio"],
  },
];

export function getSecurityBusinesses() {
  return securityBusinesses;
}

export function getSecurityZones() {
  return securityBusinesses.flatMap((business) =>
    business.zones.map((zone) => ({
      id: `${business.id}_${zone.toLowerCase().replaceAll(" ", "_")}`,
      businessId: business.id,
      businessName: business.name,
      zone,
      status: business.status,
    }))
  );
}
