import { Controller, Get, Query, ParseFloatPipe } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LocationAvailabilityService } from './location-availability.service';
import { LocationAvailabilityResponseDto } from './dto/location-availability-response.dto';

@ApiTags('location-availability')
@Controller('location-availability')
export class LocationAvailabilityController {
  constructor(private readonly service: LocationAvailabilityService) {}

  @Get()
  @ApiOperation({
    summary: 'Check whether a location is available for business analysis',
    description:
      'Resolves coordinates via Nominatim and validates them against two rules: ' +
      '(1) coordinates must be within Ukraine, ' +
      '(2) location must not be in an active conflict zone or temporarily occupied territory. ' +
      'The frontend should call this before allowing the user to proceed to analysis.',
  })
  @ApiQuery({ name: 'lat', required: true, type: Number, example: 50.4501, description: 'Latitude' })
  @ApiQuery({ name: 'lng', required: true, type: Number, example: 30.5234, description: 'Longitude' })
  @ApiResponse({
    status: 200,
    description: 'Location resolved. Check the `available` field — false does not mean an error.',
    type: LocationAvailabilityResponseDto,
    content: {
      'application/json': {
        examples: {
          available: {
            summary: 'Available — Kyiv',
            value: {
              available: true,
              reason: null,
              message: null,
              country: 'Ukraine',
              region: 'Kyiv Oblast',
              district: 'Pecherskyi District',
              settlement: 'Kyiv',
            },
          },
          outside_ukraine: {
            summary: 'Outside Ukraine — Warsaw, Poland',
            value: {
              available: false,
              reason: 'outside_ukraine',
              message: 'Analysis is currently available only for locations within Ukraine.',
              country: 'Poland',
              region: 'Masovian Voivodeship',
              district: null,
              settlement: 'Warsaw',
            },
          },
          restricted: {
            summary: 'Restricted — Donetsk Oblast',
            value: {
              available: false,
              reason: 'restricted_safety_area',
              message:
                'Standard business analysis is unavailable for this location due to limited market data reliability and safety risks.',
              country: 'Ukraine',
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
    description: 'Nominatim geocoding service unavailable. Safe to retry.',
    schema: {
      example: { statusCode: 503, message: 'Nominatim [timeout]', error: 'Service Unavailable' },
    },
  })
  check(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
  ): Promise<LocationAvailabilityResponseDto> {
    return this.service.check(lat, lng);
  }
}
