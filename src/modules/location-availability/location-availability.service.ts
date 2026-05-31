import { Injectable } from '@nestjs/common';
import { NominatimService } from '../nominatim/nominatim.service';
import { isRestrictedTerritory, normalizeState } from 'src/data/ua-restricted-territories.data';
import { LocationAvailabilityResponseDto } from './dto/location-availability-response.dto';

@Injectable()
export class LocationAvailabilityService {
  constructor(private readonly nominatim: NominatimService) {}

  async check(lat: number, lng: number): Promise<LocationAvailabilityResponseDto> {
    const addr = await this.nominatim.getAddressInfo({ lat, lng });

    const region = addr.region ?? null;
    const district = addr.county ?? null;
    const settlement = addr.settlement ?? null;
    const countryCode = addr.countryCode || null;

    if (addr.countryCode !== 'ua') {
      return {
        available: false,
        reason: 'outside_ukraine',
        message: 'Аналіз наразі доступний лише для локацій в Україні.',
        country: addr.country,
        countryCode,
        region,
        district,
        settlement,
      };
    }

    const normalizedState = normalizeState(region ?? '');
    if (isRestrictedTerritory(normalizedState)) {
      return {
        available: false,
        reason: 'restricted_safety_area',
        message:
          'Стандартний аналіз недоступний для цієї локації через обмежену надійність ринкових даних.',
        country: 'Ukraine',
        countryCode: 'ua',
        region,
        district,
        settlement,
      };
    }

    return {
      available: true,
      reason: null,
      message: null,
      country: 'Ukraine',
      countryCode: 'ua',
      region,
      district,
      settlement,
    };
  }
}
