import { Module } from '@nestjs/common';
import { AnalysisService } from './analysis.service';
import { AnalysisController } from './analysis.controller';
import { BusinessTypesController } from './business-types.controller';
import { MarketDataModule } from '../market-data/market-data.module';
import { MetricsModule } from '../metrics/metrics.module';
import { InferenceModule } from '../inference/inference.module';
import { ReportModule } from '../report/report.module';
import { LocationAvailabilityModule } from '../location-availability/location-availability.module';
import { CsvLoggerService } from './csv-logger.service';

@Module({
  providers: [AnalysisService, CsvLoggerService],
  controllers: [AnalysisController, BusinessTypesController],
  imports: [MarketDataModule, MetricsModule, InferenceModule, ReportModule, LocationAvailabilityModule],
})
export class AnalysisModule {}
