import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

const CSV_FILE_NAME = 'test-statistic.csv';

type CsvRow = {
  lat: number;
  lng: number;
  businessType: string;
  budget: number;
  cityName: string;
  competitorRadius: number;
  // snapshot
  population: number;
  avgRent: number;
  commercialDensity: number;
  trafficMultiplier: number;
  competitors: number;
  saturationCompetitors: number;
  minBudget: number;
  employees: number;
  avgMonthlySalaryUsd: number;
  // metrics
  demand: number;
  marketCapacity: number;
  rent: number;
  budgetMetric: number;
  monthlyBurn: number;
  runway: number;
  // latent factors
  marketAttractiveness: number;
  financialFeasibility: number;
  riskLevel: number;
  // output
  score: number;
  verdict: string;
  verdictSource: string;
  risks: string;
  summary: string;
  paybackMonths: string;
  durationMs: number;
};

const HEADER =
  'timestamp,lat,lng,businessType,budget,cityName,competitorRadius,' +
  'population,avgRent,commercialDensity,trafficMultiplier,competitors,saturationCompetitors,minBudget,employees,avgMonthlySalaryUsd,' +
  'demand,marketCapacity,rent,budgetMetric,monthlyBurn,runway,' +
  'marketAttractiveness,financialFeasibility,riskLevel,' +
  'score,verdict,verdictSource,risks,summary,paybackMonths,durationMs\n';

@Injectable()
export class CsvLoggerService {
  writeNewData(data: CsvRow) {
    const relativePath = path.join(process.cwd(), CSV_FILE_NAME);

    const row =
      [
        new Date().toISOString(),
        data.lat,
        data.lng,
        data.businessType,
        data.budget,
        data.cityName,
        data.competitorRadius,
        data.population,
        data.avgRent.toFixed(2),
        data.commercialDensity.toFixed(2),
        data.trafficMultiplier.toFixed(2),
        data.competitors,
        data.saturationCompetitors.toFixed(2),
        data.minBudget,
        data.employees,
        data.avgMonthlySalaryUsd,
        data.demand.toFixed(4),
        data.marketCapacity.toFixed(4),
        data.rent.toFixed(4),
        data.budgetMetric.toFixed(4),
        data.monthlyBurn.toFixed(2),
        data.runway.toFixed(2),
        data.marketAttractiveness.toFixed(4),
        data.financialFeasibility.toFixed(4),
        data.riskLevel.toFixed(4),
        data.score,
        data.verdict,
        data.verdictSource,
        `"${data.risks}"`,
        `"${data.summary.replace(/"/g, "'")}"`,
        data.paybackMonths,
        data.durationMs,
      ].join(',') + '\n';

    const isEmpty =
      !fs.existsSync(relativePath) || fs.statSync(relativePath).size === 0;
    if (isEmpty) {
      fs.writeFileSync(relativePath, HEADER);
    }

    fs.appendFileSync(relativePath, row);
  }
}
