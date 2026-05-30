import { Module } from '@nestjs/common';
import { OverpassModule } from './modules/overpass/overpass.module';
import { NominatimModule } from './modules/nominatim/nominatim.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { ReportModule } from './modules/report/report.module';
import { RecommendationModule } from './modules/recommendation/recommendation.module';
import { AnalysisModule } from './modules/analysis/analysis.module';
import { MarketDataModule } from './modules/market-data/market-data.module';
import { LocationAvailabilityModule } from './modules/location-availability/location-availability.module';

@Module({
  imports: [
    OverpassModule,
    NominatimModule,
    MetricsModule,
    ReportModule,
    RecommendationModule,
    AnalysisModule,
    MarketDataModule,
    LocationAvailabilityModule,
  ],
})
export class AppModule {}
