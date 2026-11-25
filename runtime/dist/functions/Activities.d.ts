import type { MicrosoftRewardsBot } from '../index';
import type { Page } from 'patchright';
import type { BasePromotion, DashboardData } from '../interface/DashboardData';
import type { AppDashboardData, Promotion } from '../interface/AppDashBoardData';
import type { QuestChild } from '../browser/ReactFunc';
export default class Activities {
    private bot;
    constructor(bot: MicrosoftRewardsBot);
    doSearch: (page: Page, isMobile: boolean) => Promise<number>;
    doBonusSearches: (page: Page) => Promise<number>;
    doSearchOnBing: (promotion: BasePromotion, page: Page) => Promise<boolean>;
    doDailySet: (data: DashboardData) => Promise<boolean>;
    doMorePromotions: (data: DashboardData) => Promise<boolean>;
    doPunchCardsMobile: (data: DashboardData) => Promise<boolean>;
    doPunchCardsDesktop: () => Promise<void>;
    doUrlReward: (promotion: BasePromotion) => Promise<boolean>;
    doClaimBonusPoints: () => Promise<void>;
    doEnsureStreakProtection: () => Promise<void>;
    doClaimReward: (child: QuestChild, parentId: string) => Promise<boolean>;
    doActivateSearchPerk: (data: DashboardData) => Promise<boolean>;
    doVisualSearch: (data: DashboardData) => Promise<number>;
    doAppReward: (promotion: Promotion) => Promise<void>;
    doReadToEarn: () => Promise<boolean>;
    doDailyCheckIn: () => Promise<boolean>;
    doAppPromotions: (data: AppDashboardData) => Promise<boolean>;
    doEdgeBrowsing: (data: DashboardData, signal?: AbortSignal) => Promise<void>;
}
//# sourceMappingURL=Activities.d.ts.map