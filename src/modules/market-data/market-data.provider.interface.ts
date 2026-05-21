import { BusinessType } from 'src/data/business-types.data';
import { MarketSnapshot } from './types';

export const MARKET_DATA_PROVIDER = 'MARKET_DATA_PROVIDER';

export interface IMarketDataProvider {
  getSnapshot({
    lat,
    lng,
    businessType,
  }: {
    lat: number;
    lng: number;
    businessType: BusinessType;
  }): Promise<MarketSnapshot>;
}
