import type { MicrosoftRewardsBot } from '../../../index';
import type { Counters, DashboardImpression } from '../../../interface/DashboardData';
import type { MissingSearchPoints } from '../../../interface/Points';
export interface SearchQuota {
    known: boolean;
    earned: number;
    max: number;
    remaining: number;
}
export interface SearchQuotas {
    mobile: SearchQuota;
    desktop: SearchQuota;
    edge: SearchQuota;
}
export declare class SearchProgress {
    private readonly bot;
    constructor(bot: MicrosoftRewardsBot);
    getCounters(): Promise<Counters>;
    getMissing(isMobile: boolean): Promise<MissingSearchPoints>;
    calculateMissing(counters: Counters, isMobile: boolean): MissingSearchPoints;
    calculateQuotas(counters: Counters): SearchQuotas;
    calculateQuota(counters: DashboardImpression[] | undefined): SearchQuota;
    private isEdgeCounter;
}
//# sourceMappingURL=SearchProgress.d.ts.map