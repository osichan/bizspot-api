import { Module } from '@nestjs/common';
import { NominatimService } from './nominatim.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  providers: [NominatimService],
  imports: [HttpModule],
  exports: [NominatimService],
})
export class NominatimModule {}
