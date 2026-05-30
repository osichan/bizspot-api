import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common'
import * as marketDataProviderInterface from '../market-data/market-data.provider.interface'
import { MetricsService } from '../metrics/metrics.service'
import { ReportService } from '../report/report.service'
import { InferenceService } from '../inference/inference.service'
import { LocationAvailabilityService } from '../location-availability/location-availability.service'
import { AnalyzeRequestDto } from './dto/analyze-request.dto'
import { AnalyzeResponseDto } from './dto/analyze-response.dto'
import { CsvLoggerService } from './csv-logger.service'

@Injectable()
export class AnalysisService {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly inferenceService: InferenceService,
    private readonly reportService: ReportService,
    @Inject(marketDataProviderInterface.MARKET_DATA_PROVIDER)
    private readonly uaMarketProvider: marketDataProviderInterface.IMarketDataProvider,
    private readonly csvLoggerService: CsvLoggerService,
    private readonly locationAvailability: LocationAvailabilityService,
  ) {}

  async analyze(data: AnalyzeRequestDto): Promise<AnalyzeResponseDto> {
    const availability = await this.locationAvailability.check(data.lat, data.lng)
    if (!availability.available) {
      throw new UnprocessableEntityException({
        available: false,
        reason: availability.reason,
        message: availability.message,
        country: availability.country,
        countryCode: availability.countryCode,
        region: availability.region,
        district: availability.district,
        settlement: availability.settlement,
      })
    }

    const startedAt = Date.now()
    const snapshot = await this.uaMarketProvider.getSnapshot(data)
    const metrics = this.metricsService.compute({
      snapshot,
      budget: data.budget,
    })
    const { demand, marketCapacity, rent, budget, runway, monthlyBurn } = metrics
    const csvBase = {
      lat: data.lat,
      lng: data.lng,
      businessType: data.businessType,
      budget: data.budget,
      cityName: snapshot.cityName,
      competitorRadius: snapshot.competitorRadius,
      population: snapshot.population,
      avgRent: snapshot.avgRent,
      commercialDensity: snapshot.commercialDensity,
      trafficMultiplier: snapshot.trafficMultiplier,
      competitors: snapshot.competitors,
      saturationCompetitors: snapshot.saturationCompetitors,
      minBudget: snapshot.minBudget,
      employees: snapshot.employees,
      avgMonthlySalaryUsd: snapshot.avgMonthlySalaryUsd,
      demand: metrics.demand,
      marketCapacity: metrics.marketCapacity,
      rent: metrics.rent,
      budgetMetric: metrics.budget,
      monthlyBurn: metrics.monthlyBurn,
      runway: metrics.runway,
    }

    // constraint gate: budget below minimum is a hard rejection, inference is skipped
    if (data.budget < snapshot.minBudget) {
      const constraintLatentFactors = {
        marketAttractiveness: 0,
        financialFeasibility: 0,
        riskLevel: 1,
      }
      const constraintReport = {
        risks: ['budget is critically below minimum requirements'],
        summary: `Budget of $${data.budget} is below the minimum required $${snapshot.minBudget} for this business type. Increase your budget before proceeding.`,
        paybackMonths: '',
      }
      this.csvLoggerService.writeNewData({
        ...csvBase,
        marketAttractiveness: 0,
        financialFeasibility: 0,
        riskLevel: 1,
        score: 0,
        verdict: 'RED',
        verdictSource: 'budget_gate',
        risks: constraintReport.risks.join('|'),
        summary: constraintReport.summary,
        paybackMonths: constraintReport.paybackMonths,
        durationMs: Date.now() - startedAt,
      })
      return {
        score: 0,
        verdict: 'RED',
        verdictSource: 'budget_gate',
        metrics: { demand, marketCapacity, rent, budget, runway, monthlyBurn },
        latentFactors: constraintLatentFactors,
        report: constraintReport,
      }
    }

    const { score, verdict, verdictSource, latentFactors } = this.inferenceService.infer(metrics)
    const report = this.reportService.generate({
      metrics,
      snapshot,
      verdict,
      budget: data.budget,
    })

    this.csvLoggerService.writeNewData({
      ...csvBase,
      marketAttractiveness: latentFactors.marketAttractiveness,
      financialFeasibility: latentFactors.financialFeasibility,
      riskLevel: latentFactors.riskLevel,
      score,
      verdict,
      verdictSource,
      risks: report.risks.join('|'),
      summary: report.summary,
      paybackMonths: report.paybackMonths,
      durationMs: Date.now() - startedAt,
    })

    return {
      score,
      verdict,
      verdictSource,
      metrics: { demand, marketCapacity, rent, budget, runway, monthlyBurn },
      latentFactors,
      report,
    }
  }
}
