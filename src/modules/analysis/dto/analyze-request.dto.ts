import { IsIn, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import * as businessTypesData from 'src/data/business-types.data';

const BUSINESS_TYPE_VALUES = businessTypesData.BUSINESS_TYPES as unknown as string[];

export class AnalyzeRequestDto {
  @ApiProperty({ example: 50.4501, description: 'Latitude of the candidate location' })
  @IsNumber() lat: number;

  @ApiProperty({ example: 30.5234, description: 'Longitude of the candidate location' })
  @IsNumber() lng: number;

  @ApiProperty({
    enum: BUSINESS_TYPE_VALUES,
    example: 'coffee_shop',
    description:
      'Business type. Determines the OSM search tag, search radius, saturation threshold, and minimum budget.',
  })
  @IsIn(businessTypesData.BUSINESS_TYPES)
  businessType: businessTypesData.BusinessType;

  @ApiProperty({
    example: 50000,
    description: 'Available startup budget in USD. Must be positive.',
    minimum: 1,
  })
  @IsNumber() @IsPositive() budget: number;
}
