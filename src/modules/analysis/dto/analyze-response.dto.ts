import { ApiProperty } from '@nestjs/swagger';
import type { ReportResult } from 'src/modules/report/types';
import type { Verdict, NormalizedMetrics } from 'src/modules/scoring/types';
import type { LatentFactors, VerdictSource } from 'src/modules/inference/types';

export class MetricsDto implements Pick<NormalizedMetrics, 'demand' | 'marketCapacity' | 'rent' | 'budget' | 'runway' | 'monthlyBurn'> {
  @ApiProperty({ description: 'Population-adjusted demand index [0–1]', example: 0.72 })
  demand: number;

  @ApiProperty({ description: 'Competitor saturation ratio (competitors / saturation threshold)', example: 0.45 })
  marketCapacity: number;

  @ApiProperty({ description: 'Rent affordability relative to budget [0–1]', example: 0.6 })
  rent: number;

  @ApiProperty({ description: 'Budget adequacy score [0–1]', example: 0.8 })
  budget: number;

  @ApiProperty({ description: 'Estimated runway in months', example: 14 })
  runway: number;

  @ApiProperty({ description: 'Estimated monthly burn rate in USD (salaries + rent + utilities, 15% buffer)', example: 3200 })
  monthlyBurn: number;
}

export class LatentFactorsDto implements LatentFactors {
  @ApiProperty({ description: 'Market attractiveness composite score [0–1]', example: 0.65 })
  marketAttractiveness: number;

  @ApiProperty({ description: 'Financial feasibility composite score [0–1]', example: 0.58 })
  financialFeasibility: number;

  @ApiProperty({ description: 'Risk level composite score [0–1]', example: 0.3 })
  riskLevel: number;
}

export class ReportResultDto implements ReportResult {
  @ApiProperty({ description: 'Estimated payback period', example: '14–18 months' })
  paybackMonths: string;

  @ApiProperty({ description: 'Identified risk factors', example: ['high competition in the area'], type: [String] })
  risks: string[];

  @ApiProperty({ description: 'Human-readable analysis summary', example: 'This location shows strong potential for a coffee shop.' })
  summary: string;
}

export class AnalyzeResponseDto {
  @ApiProperty({ description: 'Overall viability score [0–100]', example: 71 })
  score: number;

  @ApiProperty({
    enum: ['GREEN', 'YELLOW', 'RED'],
    description: 'Viability verdict. GREEN ≥ 75, YELLOW 50–74, RED < 50 (or forced by an override).',
    example: 'YELLOW',
  })
  verdict: Verdict;

  @ApiProperty({
    enum: ['budget_gate', 'saturation_override', 'ff_hard_block', 'score'],
    description:
      'What triggered the verdict. ' +
      'budget_gate: budget below the minimum for this business type (inference skipped). ' +
      'saturation_override: market is critically oversaturated regardless of score. ' +
      'ff_hard_block: financial feasibility hard block (legacy guard). ' +
      'score: normal scoring path.',
    example: 'score',
  })
  verdictSource: VerdictSource;

  @ApiProperty({ type: MetricsDto })
  metrics: MetricsDto;

  @ApiProperty({ type: LatentFactorsDto })
  latentFactors: LatentFactorsDto;

  @ApiProperty({ type: ReportResultDto })
  report: ReportResultDto;
}
