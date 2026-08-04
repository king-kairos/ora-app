export type PolleraItem = {
  id: string;
  title: string;
  description: string;
  status: "active" | "pending" | "archived";
};
