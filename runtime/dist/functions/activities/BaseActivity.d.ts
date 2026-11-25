import type { MicrosoftRewardsBot } from '../../index';
export declare abstract class BaseActivity {
    protected readonly bot: MicrosoftRewardsBot;
    private executed;
    constructor(bot: MicrosoftRewardsBot);
    protected markExecuted(): void;
    didExecute(): boolean;
}
//# sourceMappingURL=BaseActivity.d.ts.map