import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import { CacheService } from '../cache.service';
import { classifyAxiosError, ExternalApiError, REQUEST_TIMEOUT_MS } from 'src/common/external-api';


const DIM_RIA_STATES = [
  {
    lang_id: 4,
    stateID: 1,
    name: 'Вінницька',
    eng_name: 'vinnicya',
    declension: 'Вінницької області',
    center_declension: 'Вінниці',
    region_name: 'Вінниця',
    translit: 'vinnitskaya',
  },
  {
    lang_id: 4,
    stateID: 18,
    name: 'Волинська',
    eng_name: 'luck',
    declension: 'Волинської області',
    center_declension: 'Луцька',
    region_name: 'Луцьк',
    translit: 'volynskaya',
  },
  {
    lang_id: 4,
    stateID: 11,
    name: 'Дніпропетровська',
    eng_name: 'dnepropetrovsk',
    declension: 'Дніпропетровської області',
    center_declension: 'Дніпра',
    region_name: 'Дніпро',
    translit: 'dnepropetrovskaya',
  },
  {
    lang_id: 4,
    stateID: 13,
    name: 'Донецька',
    eng_name: 'doneck',
    declension: 'Донецької області',
    center_declension: 'Донецька',
    region_name: 'Донецьк',
    translit: 'donetskaya',
  },
  {
    lang_id: 4,
    stateID: 2,
    name: 'Житомирська',
    eng_name: 'jitomir',
    declension: 'Житомирської області',
    center_declension: 'Житомира',
    region_name: 'Житомир',
    translit: 'zhitomirskaya',
  },
  {
    lang_id: 4,
    stateID: 22,
    name: 'Закарпатська',
    eng_name: 'ujgorod',
    declension: 'Закарпатської області',
    center_declension: 'Ужгорода',
    region_name: 'Ужгород',
    translit: 'zakarpatskaya',
  },
  {
    lang_id: 4,
    stateID: 14,
    name: 'Запорізька',
    eng_name: 'zaporijjya',
    declension: 'Запорізької області',
    center_declension: 'Запоріжжя',
    region_name: 'Запоріжжя',
    translit: 'zaporozhskaya',
  },
  {
    lang_id: 4,
    stateID: 15,
    name: 'Івано-Франківська',
    eng_name: 'ivano-frankivsk',
    declension: 'Івано-Франківської області',
    center_declension: 'Івано-Франківська',
    region_name: 'Івано-Франківськ',
    translit: 'ivano-frankovskaya',
  },
  {
    lang_id: 4,
    stateID: 10,
    name: 'Київська',
    eng_name: 'kiyv',
    declension: 'Київської області',
    center_declension: 'Києва',
    region_name: 'Київ',
    translit: 'kievskaya',
  },
  {
    lang_id: 4,
    stateID: 16,
    name: 'Кіровоградська',
    eng_name: 'kirovograd',
    declension: 'Кіровоградської області',
    center_declension: 'Кропивницького',
    region_name: 'Кропивницький',
    translit: 'kirovogradskaya',
  },
  {
    lang_id: 4,
    stateID: 17,
    name: 'Луганська',
    eng_name: 'lugansk',
    declension: 'Луганської області',
    center_declension: 'Луганська',
    region_name: 'Луганськ',
    translit: 'luganskaya',
  },
  {
    lang_id: 4,
    stateID: 5,
    name: 'Львівська',
    eng_name: 'lviv',
    declension: 'Львівської області',
    center_declension: 'Львова',
    region_name: 'Львів',
    translit: 'lvovskaya',
  },
  {
    lang_id: 4,
    stateID: 19,
    name: 'Миколаївська',
    eng_name: 'mikolayv',
    declension: 'Миколаївської області',
    center_declension: 'Миколаєва',
    region_name: 'Миколаїв',
    translit: 'nikolaevskaya',
  },
  {
    lang_id: 4,
    stateID: 12,
    name: 'Одеська',
    eng_name: 'odesa',
    declension: 'Одеської області',
    center_declension: 'Одеси',
    region_name: 'Одеса',
    translit: 'odesskaya',
  },
  {
    lang_id: 4,
    stateID: 20,
    name: 'Полтавська',
    eng_name: 'poltava',
    declension: 'Полтавської області',
    center_declension: 'Полтави',
    region_name: 'Полтава',
    translit: 'poltavskaya',
  },
  {
    lang_id: 4,
    stateID: 9,
    name: 'Рівненська',
    eng_name: 'rivne',
    declension: 'Рівенської області',
    center_declension: 'Рівного',
    region_name: 'Рівне',
    translit: 'rovenskaya',
  },
  {
    lang_id: 4,
    stateID: 8,
    name: 'Сумська',
    eng_name: 'sumi',
    declension: 'Сумської області',
    center_declension: 'Сум',
    region_name: 'Суми',
    translit: 'sumskaya',
  },
  {
    lang_id: 4,
    stateID: 3,
    name: 'Тернопільська',
    eng_name: 'ternopil',
    declension: 'Тернопільської області',
    center_declension: 'Тернополя',
    region_name: 'Тернопіль',
    translit: 'ternopolskaya',
  },
  {
    lang_id: 4,
    stateID: 7,
    name: 'Харківська',
    eng_name: 'harkiv',
    declension: 'Харківської області',
    center_declension: 'Харкова',
    region_name: 'Харків',
    translit: 'kharkovskaya',
  },
  {
    lang_id: 4,
    stateID: 23,
    name: 'Херсонська',
    eng_name: 'herson',
    declension: 'Херсонської області',
    center_declension: 'Херсону',
    region_name: 'Херсон',
    translit: 'khersonskaya',
  },
  {
    lang_id: 4,
    stateID: 4,
    name: 'Хмельницька',
    eng_name: 'hmelnickiy',
    declension: 'Хмельницької області',
    center_declension: 'Хмельницького',
    region_name: 'Хмельницький',
    translit: 'khmelnytskaya',
  },
  {
    lang_id: 4,
    stateID: 24,
    name: 'Черкаська',
    eng_name: 'cherkasi',
    declension: 'Черкаської області',
    center_declension: 'Черкас',
    region_name: 'Черкаси',
    translit: 'cherkasskaya',
  },
  {
    lang_id: 4,
    stateID: 25,
    name: 'Чернівецька',
    eng_name: 'chernivci',
    declension: 'Чернівецької області',
    center_declension: 'Чернівців',
    region_name: 'Чернівці',
    translit: 'chernovytskaya',
  },
  {
    lang_id: 4,
    stateID: 6,
    name: 'Чернігівська',
    eng_name: 'chernigiv',
    declension: 'Чернігівської області',
    center_declension: 'Чернігова',
    region_name: 'Чернігів',
    translit: 'chernigovskaya',
  },
] as const;

type getAvgPriceProps = {
  city: string;
  state: string;
};

type CityDimriaResponse = {
  lang_id: number;
  cityID: number;
  stateID: number;
  name: string;
  eng: string;
  declension: string;
};

type AvgPriceDimriaResponse = {
  total: number;
  arithmeticMean: number;
  prices: [
    {
      count: number;
      value: number;
    },
  ];
};

@Injectable()
export class DimRiaProvider {
  private readonly logger = new Logger(DimRiaProvider.name);

  constructor(
    private readonly http: HttpService,
    private readonly cache: CacheService,
  ) {}

  private async httpGet<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await firstValueFrom(
        this.http.get<T>(url, { signal: controller.signal }),
      );
      clearTimeout(timer);
      return response.data;
    } catch (err) {
      clearTimeout(timer);
      throw classifyAxiosError(err, 'dimria');
    }
  }

  async getAvgPrice({ city, state }: getAvgPriceProps): Promise<number> {
    const cacheKey = `dimria:${city}:${state}`;
    const cached = this.cache.get<number>(cacheKey);
    if (cached !== null) return cached;

    const apiKey = process.env.DIM_RIA_API_KEY;
    if (!apiKey) {
      this.logger.warn('getAvgPrice: DIM_RIA_API_KEY is not configured');
      throw new ServiceUnavailableException('DimRia [unavailable]: DIM_RIA_API_KEY is not configured');
    }

    const stateData = DIM_RIA_STATES.find(
      (dimriaState) => dimriaState.eng_name.toLowerCase() === state,
    );
    const now = new Date();
    const dateTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const fromDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const dateFrom = `${fromDate.getFullYear()}-${String(fromDate.getMonth() + 1).padStart(2, '0')}`;

    try {
      let price: number;

      if (!stateData) {
        const data = await this.httpGet<AvgPriceDimriaResponse>(
          `https://developers.ria.com/dom/average_price?category=13&sub_category=21&operation=3&date_from=${dateFrom}&date_to=${dateTo}&api_key=${apiKey}`,
        );
        price = data.arithmeticMean;
      } else {
        const cities = await this.httpGet<CityDimriaResponse[]>(
          `https://developers.ria.com/dom/cities/${stateData.stateID}?api_key=${apiKey}`,
        );

        const cityData = cities.find(
          (dimriaCity) => dimriaCity.eng.toLowerCase() === city,
        );

        if (!cityData) {
          const data = await this.httpGet<AvgPriceDimriaResponse>(
            `https://developers.ria.com/dom/average_price?category=13&sub_category=21&operation=3&state_id=${stateData.stateID}&date_from=${dateFrom}&date_to=${dateTo}&api_key=${apiKey}`,
          );
          price = data.arithmeticMean;
        } else {
          const data = await this.httpGet<AvgPriceDimriaResponse>(
            `https://developers.ria.com/dom/average_price?category=13&sub_category=21&operation=3&state_id=${stateData.stateID}&city_id=${cityData.cityID}&date_from=${dateFrom}&date_to=${dateTo}&api_key=${apiKey}`,
          );
          price = data.arithmeticMean;
        }
      }

      this.cache.set(cacheKey, price);
      return price;
    } catch (err) {
      if (err instanceof ExternalApiError) {
        this.logger.warn(`getAvgPrice [${err.kind}] city=${city} state=${state}: ${err.message}`);
        throw new ServiceUnavailableException(`DimRia [${err.kind}]`);
      }
      throw err;
    }
  }
}
