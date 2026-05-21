import { BusinessType } from 'src/data/business-types.data';

export type RecommendationItem = {
  type: BusinessType;
  label: string;
  minBudget: number;
};
