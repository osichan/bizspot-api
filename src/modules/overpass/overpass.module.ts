import { Module } from '@nestjs/common';
import { OverpassService } from './overpass.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  providers: [OverpassService],
  imports: [HttpModule],
  exports: [OverpassService],
})
export class OverpassModule {}
