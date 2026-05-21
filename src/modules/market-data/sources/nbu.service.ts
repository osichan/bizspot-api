import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { CacheService } from '../cache.service';
import { classifyAxiosError, REQUEST_TIMEOUT_MS } from 'src/common/external-api';

const CACHE_KEY = 'nbu:usd';

type NbuRateResponse = {
  r030: number;
  txt: string;
  rate: number;
  cc: string;
  exchangedate: string;
};

@Injectable()
export class NbuService {
  private readonly logger = new Logger(NbuService.name);

  constructor(
    private readonly http: HttpService,
    private readonly cache: CacheService,
  ) {}

  async getUsdRate(): Promise<number> {
    const cached = this.cache.get<number>(CACHE_KEY);
    if (cached !== null) return cached;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await firstValueFrom(
        this.http.get<NbuRateResponse[]>(
          'https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json',
          { signal: controller.signal },
        ),
      );
      clearTimeout(timer);

      const rate = response.data[0].rate;
      this.cache.set(CACHE_KEY, rate);
      return rate;
    } catch (err) {
      clearTimeout(timer);
      const classified = classifyAxiosError(err, 'nbu');
      this.logger.warn(`getUsdRate [${classified.kind}]: ${classified.message}`);
      throw new ServiceUnavailableException(`NBU [${classified.kind}]`);
    }
  }
}
