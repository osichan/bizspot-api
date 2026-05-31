import { ApiProperty } from '@nestjs/swagger'

export class BusinessTypeDto {
  @ApiProperty({ example: 'coffee_shop', description: 'Identifier used in POST /analysis/analyze' })
  id: string

  @ApiProperty({ example: 'Кав’ярня', description: 'Назва для відображення' })
  label: string

  @ApiProperty({ example: 'Невелике локальне кафе або точка кави на винос' })
  description: string

  @ApiProperty({ example: 20000, description: 'Minimum startup budget in USD required to proceed' })
  minBudget: number

  @ApiProperty({
    example: 500,
    description:
      'Base competitor search radius in metres. Actual radius used at runtime is adaptive — ' +
      'small settlements (< 20 000 pop) use at least 2 000 m regardless of this value.',
  })
  baseCompetitorRadius: number

  @ApiProperty({
    example: ['amenity=cafe', 'shop=coffee'],
    description: 'OpenStreetMap tags queried to detect competitors in the area',
    type: [String],
  })
  osmTags: string[]
}
