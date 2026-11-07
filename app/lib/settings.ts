export type PlanItem = {
  name: string;
  speedMbps: number;
  price: number;
};

export const DEFAULT_PLANS: PlanItem[] = [
  { name: 'Fiber 100 Mbps', speedMbps: 100, price: 999 },
  { name: 'Fiber 200 Mbps', speedMbps: 200, price: 1299 },
  { name: 'Fiber 300 Mbps', speedMbps: 300, price: 1499 },
];

export const DEFAULT_SETTINGS = {
  id: 'singleton',
  companyName: 'Sky-Tech Fiber ISP',
  companyEmail: 'support@skytech.net',
  phone: '0917-SKY-TECH',
  address: 'Poblacion, Sibagat, Agusan del Norte',
  lateFeePercent: 5,
  gracePeriodDays: 7,
  billingDay: 1,
  plans: DEFAULT_PLANS,
};

