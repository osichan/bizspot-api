import { Injectable } from '@nestjs/common';
import { NormalizedMetrics, ScoringResult } from './types';

@Injectable()
export class ScoringService {
  getScore(_metrics: NormalizedMetrics): ScoringResult {
    return { score: 0, verdict: 'RED' };
  }
}
