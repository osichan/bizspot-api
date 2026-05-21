import { Injectable } from '@nestjs/common';
import { RecommendationItem } from './types';
import { Verdict } from '../scoring/types';
import { BusinessType } from 'src/data/business-types.data';

type getRecommendationsProps = {
  currentType: BusinessType;
  verdict: Verdict;
};

@Injectable()
export class RecommendationService {
  getRecommendations({
    currentType,
    verdict,
  }: getRecommendationsProps): RecommendationItem[] {
    if (verdict !== 'RED') {
      return [];
    }
    return [];
  }
}
