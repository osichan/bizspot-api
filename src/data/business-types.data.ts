export const businessTypesData = {
  coffee_shop: {
    minBudget: 20000,
    urbanDependency: 0.9,
    osmTag: 'amenity=cafe',
    radius: 500,
    saturationDensityPerKm2: 40,
    employees: 3,
    avgMonthlySalaryUsd: 350,
    utilitiesMultiplier: 0.2,
  },

  car_wash: {
    minBudget: 30000,
    urbanDependency: 0.7,
    osmTag: 'amenity=car_wash',
    radius: 4000,
    saturationDensityPerKm2: 2,
    employees: 4,
    avgMonthlySalaryUsd: 300,
    utilitiesMultiplier: 0.3,
  },

  auto_repair: {
    minBudget: 50000,
    urbanDependency: 0.75,
    osmTag: 'shop=car_repair',
    radius: 10000,
    saturationDensityPerKm2: 1,
    employees: 5,
    avgMonthlySalaryUsd: 500,
    utilitiesMultiplier: 0.15,
  },

  barbershop: {
    minBudget: 15000,
    urbanDependency: 0.8,
    osmTag: 'shop=hairdresser',
    radius: 700,
    saturationDensityPerKm2: 40,
    employees: 3,
    avgMonthlySalaryUsd: 400,
    utilitiesMultiplier: 0.15,
  },

  grocery_store: {
    minBudget: 35000,
    urbanDependency: 0.85,
    osmTag: 'shop=supermarket',
    radius: 800,
    saturationDensityPerKm2: 10,
    employees: 6,
    avgMonthlySalaryUsd: 330,
    utilitiesMultiplier: 0.2,
  },

  pharmacy: {
    minBudget: 60000,
    urbanDependency: 0.65,
    osmTag: 'amenity=pharmacy',
    radius: 500,
    saturationDensityPerKm2: 20,
    employees: 4,
    avgMonthlySalaryUsd: 450,
    utilitiesMultiplier: 0.1,
  },
} as const;

export type BusinessType = keyof typeof businessTypesData;
export const BUSINESS_TYPES = Object.keys(businessTypesData);
