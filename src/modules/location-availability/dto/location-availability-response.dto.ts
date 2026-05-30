import { ApiProperty } from '@nestjs/swagger';

export type AvailabilityReason = 'outside_ukraine' | 'restricted_safety_area';

export class LocationAvailabilityResponseDto {
  @ApiProperty({ description: 'Whether business analysis is available for this location', example: true })
  available: boolean;

  @ApiProperty({
    nullable: true,
    enum: ['outside_ukraine', 'restricted_safety_area'],
    description:
      'Reason for unavailability. ' +
      'outside_ukraine: coordinates are outside Ukraine. ' +
      'restricted_safety_area: location is in an active conflict zone or temporarily occupied territory.',
    example: null,
  })
  reason: AvailabilityReason | null;

  @ApiProperty({
    nullable: true,
    description: 'Human-readable explanation of why the location is unavailable.',
    example: null,
  })
  message: string | null;

  @ApiProperty({ description: 'Country resolved from coordinates', example: 'Ukraine' })
  country: string;

  @ApiProperty({ nullable: true, description: 'ISO 3166-1 alpha-2 country code', example: 'ua' })
  countryCode: string | null;

  @ApiProperty({ nullable: true, description: 'Oblast / administrative region', example: 'Kyiv Oblast' })
  region: string | null;

  @ApiProperty({ nullable: true, description: 'Raion or city district', example: 'Pecherskyi District' })
  district: string | null;

  @ApiProperty({ nullable: true, description: 'City, town, or village', example: 'Kyiv' })
  settlement: string | null;
}
