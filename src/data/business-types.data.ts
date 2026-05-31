export const businessTypesData = {
  coffee_shop: {
    label: 'Кав’ярня',
    description: 'Невелике локальне кафе або точка кави на винос',
    minBudget: 20_000,
    urbanDependency: 0.9,
    osmTags: ['amenity=cafe', 'shop=coffee'],
    radius: 500,
    saturationDensityPerKm2: 40,
    employees: 3,
    avgMonthlySalaryUsd: 350,
    utilitiesMultiplier: 0.2,
  },

  barbershop: {
    label: 'Барбершоп / перукарня',
    description: 'Перукарня або салон барбера',
    minBudget: 15_000,
    urbanDependency: 0.8,
    // shop=beauty catches beauty salons that compete for the same customers
    osmTags: ['shop=hairdresser', 'shop=beauty'],
    radius: 700,
    saturationDensityPerKm2: 40,
    employees: 3,
    avgMonthlySalaryUsd: 400,
    utilitiesMultiplier: 0.15,
  },

  grocery_store: {
    label: 'Продуктовий магазин',
    description: 'Локальна продуктова торгівля, зокрема формат "у дворі"',
    minBudget: 35_000,
    urbanDependency: 0.85,
    osmTags: ['shop=supermarket', 'shop=convenience', 'shop=grocery'],
    radius: 800,
    saturationDensityPerKm2: 10,
    employees: 4,
    avgMonthlySalaryUsd: 350,
    utilitiesMultiplier: 0.2,
  },

  bakery: {
    label: 'Пекарня',
    description: 'Магазин свіжого хліба, випічки та хлібобулочних виробів',
    minBudget: 25_000,
    urbanDependency: 0.8,
    osmTags: ['shop=bakery'],
    radius: 700,
    saturationDensityPerKm2: 20,
    employees: 3,
    avgMonthlySalaryUsd: 350,
    utilitiesMultiplier: 0.25,
  },

  fitness_studio: {
    label: 'Фітнес-студія',
    description: 'Спортзал, фітнес-центр або студія групових тренувань',
    minBudget: 50_000,
    urbanDependency: 0.85,
    osmTags: ['leisure=fitness_centre', 'sport=fitness'],
    radius: 1_200,
    saturationDensityPerKm2: 5,
    employees: 4,
    avgMonthlySalaryUsd: 450,
    utilitiesMultiplier: 0.3,
  },

  flower_shop: {
    label: 'Квітковий магазин',
    description: 'Продаж свіжих квітів, букетів та подарункових композицій',
    minBudget: 12_000,
    urbanDependency: 0.75,
    osmTags: ['shop=florist'],
    radius: 600,
    saturationDensityPerKm2: 15,
    employees: 2,
    avgMonthlySalaryUsd: 300,
    utilitiesMultiplier: 0.1,
  },

  pet_store: {
    label: 'Зоомагазин',
    description: 'Тварини, корми, аксесуари та засоби догляду для домашніх улюбленців',
    minBudget: 20_000,
    urbanDependency: 0.8,
    osmTags: ['shop=pet'],
    radius: 900,
    saturationDensityPerKm2: 8,
    employees: 2,
    avgMonthlySalaryUsd: 350,
    utilitiesMultiplier: 0.15,
  },

  car_wash: {
    label: 'Автомийка',
    description: 'Самообслуговування або автоматична мийка автомобілів',
    minBudget: 30_000,
    urbanDependency: 0.7,
    osmTags: ['amenity=car_wash'],
    radius: 4_000,
    saturationDensityPerKm2: 2,
    employees: 4,
    avgMonthlySalaryUsd: 300,
    utilitiesMultiplier: 0.3,
  },

  auto_repair: {
    label: 'Автосервіс',
    description: 'Майстерня з ремонту автомобілів та технічного обслуговування',
    minBudget: 50_000,
    urbanDependency: 0.75,
    osmTags: ['shop=car_repair'],
    radius: 10_000,
    saturationDensityPerKm2: 1,
    employees: 5,
    avgMonthlySalaryUsd: 500,
    utilitiesMultiplier: 0.15,
  },

  pharmacy: {
    label: 'Аптека',
    description: 'Продаж рецептурних та безрецептурних лікарських засобів',
    minBudget: 60_000,
    urbanDependency: 0.65,
    // healthcare=pharmacy is the primary tag used for Ukrainian pharmacies in OSM;
    // amenity=pharmacy exists but is less consistently applied in UA; shop=chemist for drugstores
    osmTags: ['amenity=pharmacy', 'healthcare=pharmacy', 'shop=chemist'],
    radius: 500,
    saturationDensityPerKm2: 20,
    employees: 4,
    avgMonthlySalaryUsd: 450,
    utilitiesMultiplier: 0.1,
  },
} as const

export type BusinessType = keyof typeof businessTypesData
export const BUSINESS_TYPES = Object.keys(businessTypesData) as BusinessType[]

/**
 * Population-based saturation override for business types where area-density alone
 * produces unrealistic saturation thresholds.
 *
 * When set, saturationCompetitors = min(area-based, population / value).
 * This ensures small-city markets are correctly flagged as saturated when the
 * per-capita competitor count exceeds what the local population can sustain,
 * while large-city behavior remains unchanged (area-based is binding there).
 *
 * pharmacy: 1 per 2 000 people is moderate saturation; 22 in a 23k city → oversaturated.
 */
export const SATURATION_BY_POPULATION: Partial<Record<BusinessType, number>> = {
  pharmacy: 2_000,
}
