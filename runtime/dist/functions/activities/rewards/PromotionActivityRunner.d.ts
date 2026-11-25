import { BaseActivity } from '../BaseActivity';
import type { BasePromotion } from '../../../interface/DashboardData';
export declare class PromotionActivityRunner extends BaseActivity {
    run(promotions: BasePromotion[]): Promise<boolean>;
    private runPromotion;
    private logDisabled;
}
//# sourceMappingURL=PromotionActivityRunner.d.ts.map