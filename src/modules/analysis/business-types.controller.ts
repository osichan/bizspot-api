import { Controller, Get } from '@nestjs/common'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { businessTypesData } from 'src/data/business-types.data'
import { BusinessTypeDto } from './dto/business-type.dto'

@ApiTags('business-types')
@Controller('business-types')
export class BusinessTypesController {
  @Get()
  @ApiOperation({
    summary: 'List supported business types',
    description:
      'Returns all business types supported by the analysis engine. ' +
      'Use the `id` field as the `businessType` value in POST /analysis/analyze. ' +
      'The `baseCompetitorRadius` shown here is the default; the actual radius used ' +
      'at runtime adapts to settlement size (wider for small towns).',
  })
  @ApiResponse({
    status: 200,
    description: 'List of supported business types',
    type: [BusinessTypeDto],
  })
  getAll(): BusinessTypeDto[] {
    return Object.entries(businessTypesData).map(([id, cfg]) => ({
      id,
      label: cfg.label,
      description: cfg.description,
      minBudget: cfg.minBudget,
      baseCompetitorRadius: cfg.radius,
      osmTags: [...cfg.osmTags],
    }))
  }
}
