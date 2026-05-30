import { Module } from '@nestjs/common';
import { LocationAvailabilityService } from './location-availability.service';
import { LocationAvailabilityController } from './location-availability.controller';
import { NominatimModule } from '../nominatim/nominatim.module';

@Module({
  imports: [NominatimModule],
  providers: [LocationAvailabilityService],
  controllers: [LocationAvailabilityController],
  exports: [LocationAvailabilityService],
})
export class LocationAvailabilityModule {}
