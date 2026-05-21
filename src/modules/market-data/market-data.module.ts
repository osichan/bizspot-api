import { Module } from '@nestjs/common';
import { UaMarketProvider } from './providers/ua-market.provider';
import { NominatimModule } from '../nominatim/nominatim.module';
import { OverpassModule } from '../overpass/overpass.module';
import { MARKET_DATA_PROVIDER } from './market-data.provider.interface';
import { HttpModule } from '@nestjs/axios';
import { DimRiaProvider } from './sources/dim-ria.service';
import { NbuService } from './sources/nbu.service';
import { PopulationService } from './sources/population.service';
import { CacheService } from './cache.service';

@Module({
  imports: [NominatimModule, OverpassModule, HttpModule],
  providers: [
    { provide: MARKET_DATA_PROVIDER, useClass: UaMarketProvider },
    UaMarketProvider,
    CacheService,
    DimRiaProvider,
    NbuService,
    PopulationService,
  ],
  exports: [
    { provide: MARKET_DATA_PROVIDER, useClass: UaMarketProvider },
    UaMarketProvider,
  ],
})
export class MarketDataModule {}
