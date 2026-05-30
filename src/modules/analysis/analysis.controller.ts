import { Body, Controller, Post } from '@nestjs/common'
import { ApiExtraModels, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { AnalyzeRequestDto } from './dto/analyze-request.dto'
import {
  AnalyzeResponseDto,
  MetricsDto,
  LatentFactorsDto,
  ReportResultDto,
} from './dto/analyze-response.dto'
import { AnalysisService } from './analysis.service'

@ApiExtraModels(AnalyzeResponseDto, MetricsDto, LatentFactorsDto, ReportResultDto)
@ApiTags('analysis')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly AnalysisService: AnalysisService) {}

  @Post('analyze')
  @ApiOperation({
    summary: 'Analyze a business location',
    description:
      'Runs a full viability analysis for a given lat/lng coordinate and business type. ' +
      'Fetches real-time competitor density from Overpass, reverse-geocodes via Nominatim, ' +
      'and pulls commercial rent data from DimRia. ' +
      'Returns a scored verdict with metrics, latent factors, and a human-readable report.',
  })
  @ApiResponse({
    status: 201,
    description:
      'Analysis complete. ' +
      'verdict is GREEN (score ≥ 75), YELLOW (50–74), or RED (< 50 or override). ' +
      'verdictSource indicates the decision path.',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/AnalyzeResponseDto' },
        examples: {
          green: {
            summary: 'GREEN — strong opportunity (score ≥ 75)',
            value: {
              score: 82,
              verdict: 'GREEN',
              verdictSource: 'score',
              metrics: {
                demand: 0.78,
                marketCapacity: 0.42,
                rent: 0.65,
                budget: 0.85,
                runway: 18,
                monthlyBurn: 2800,
              },
              latentFactors: {
                marketAttractiveness: 0.74,
                financialFeasibility: 0.72,
                riskLevel: 0.28,
              },
              report: {
                paybackMonths: '14–18 months',
                risks: [],
                summary:
                  'This location shows strong potential. Demand is healthy, competition is limited, and the budget covers operating costs with a comfortable runway.',
              },
            },
          },
          yellow: {
            summary: 'YELLOW — moderate potential (score 50–74)',
            value: {
              score: 71,
              verdict: 'YELLOW',
              verdictSource: 'score',
              metrics: {
                demand: 0.65,
                marketCapacity: 0.58,
                rent: 0.55,
                budget: 0.72,
                runway: 14,
                monthlyBurn: 3100,
              },
              latentFactors: {
                marketAttractiveness: 0.61,
                financialFeasibility: 0.63,
                riskLevel: 0.39,
              },
              report: {
                paybackMonths: '18–24 months',
                risks: ['competition is manageable', 'rent is a significant financial pressure'],
                summary:
                  'Moderate opportunity. The location is viable but faces meaningful competition and cost pressure. Proceed with a lean setup.',
              },
            },
          },
          red_saturation: {
            summary: 'RED — market critically saturated (saturation_override)',
            value: {
              score: 39,
              verdict: 'RED',
              verdictSource: 'saturation_override',
              metrics: {
                demand: 0.72,
                marketCapacity: 1.38,
                rent: 0.55,
                budget: 0.8,
                runway: 16,
                monthlyBurn: 2950,
              },
              latentFactors: {
                marketAttractiveness: 0.25,
                financialFeasibility: 0.66,
                riskLevel: 0.75,
              },
              report: {
                paybackMonths: '36+ months',
                risks: ['market is heavily saturated'],
                summary:
                  'Not recommended. The number of existing competitors significantly exceeds the market capacity for this area.',
              },
            },
          },
          red_budget_gate: {
            summary: 'RED — budget below minimum (budget_gate, inference skipped)',
            value: {
              score: 0,
              verdict: 'RED',
              verdictSource: 'budget_gate',
              metrics: {
                demand: 0,
                marketCapacity: 0,
                rent: 0,
                budget: 0,
                runway: 0,
                monthlyBurn: 0,
              },
              latentFactors: { marketAttractiveness: 0, financialFeasibility: 0, riskLevel: 1 },
              report: {
                paybackMonths: '',
                risks: ['budget is critically below minimum requirements'],
                summary:
                  'Budget of $5000 is below the minimum required $20000 for this business type. Increase your budget before proceeding.',
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Field validation error — invalid lat, lng, businessType, or budget.',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'businessType must be one of the following values: coffee_shop, barbershop, grocery_store, bakery, fitness_studio, flower_shop, pet_store, car_wash, auto_repair, pharmacy',
        ],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 422,
    description:
      'Location not available for analysis. Coordinates are valid but the location is outside Ukraine or in a restricted territory. ' +
      'Read `reason` to show the correct UI state: outside_ukraine or restricted_safety_area.',
    content: {
      'application/json': {
        examples: {
          outside_ukraine: {
            summary: 'Outside Ukraine',
            value: {
              available: false,
              reason: 'outside_ukraine',
              message: 'Analysis is currently available only for locations within Ukraine.',
              country: 'Poland',
              countryCode: 'pl',
              region: 'Masovian Voivodeship',
              district: null,
              settlement: 'Warsaw',
            },
          },
          restricted: {
            summary: 'Restricted / occupied territory',
            value: {
              available: false,
              reason: 'restricted_safety_area',
              message:
                'Standard business analysis is unavailable for this location due to limited market data reliability and safety risks.',
              country: 'Ukraine',
              countryCode: 'ua',
              region: 'Donetsk Oblast',
              district: null,
              settlement: 'Donetsk',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 503,
    description:
      'External API unavailable — Overpass, Nominatim, or DimRia timed out or returned an error. The request is safe to retry.',
    schema: {
      example: {
        statusCode: 503,
        message: 'Overpass [timeout]: all mirrors failed',
        error: 'Service Unavailable',
      },
    },
  })
  analyze(@Body() data: AnalyzeRequestDto): Promise<AnalyzeResponseDto> {
    return this.AnalysisService.analyze(data)
  }
}
