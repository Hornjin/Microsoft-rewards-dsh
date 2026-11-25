"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchManager = void 0;
const index_1 = require("../../../index");
const urls_1 = require("../../../constants/urls");
const SearchProgress_1 = require("./SearchProgress");
class SearchManager {
    bot;
    progress;
    constructor(bot) {
        this.bot = bot;
        this.progress = new SearchProgress_1.SearchProgress(bot);
    }
    async getSearchPoints() {
        const counters = await this.progress.getCounters();
        const quotas = this.progress.calculateQuotas(counters);
        const mobileMissing = quotas.mobile.remaining;
        const desktopQuota = this.progress.calculateQuota(counters.pcSearch);
        const desktopMissing = desktopQuota.remaining;
        const mobileEnabled = this.bot.config.workers.doMobileSearch;
        const desktopEnabled = this.bot.config.workers.doDesktopSearch;
        // 现代 Rewards 门户（flyout 兜底）只返回 PCSearch/ActivityAndQuiz/DailyPoint，
        // 不再提供 MobileSearch 计数器。此时不能直接跳过移动端搜索，
        // 而是以"余额增量"为判断依据继续搜索（见 PointsTracker 的 balanceMode）。
        const doMobile = mobileEnabled && (quotas.mobile.known ? mobileMissing > 0 : true);
        const doDesktop = desktopEnabled && desktopQuota.known && desktopMissing > 0;
        this.bot.logger.info('main', 'SEARCH-MANAGER', `移动端: ${this.describeQuota(mobileEnabled, quotas.mobile, true)}` +
            ` | 桌面端: ${this.describeQuota(desktopEnabled, desktopQuota, false)}` +
            `${quotas.edge.max > 0 ? ` | Edge: ${quotas.edge.earned}/${quotas.edge.max}` : ''}`);
        return { doMobile, doDesktop, mobileMissing, desktopMissing };
    }
    describeQuota(enabled, quota, fallbackOnUnknown = false) {
        if (!enabled)
            return `skip (disabled, ${quota.earned}/${quota.max})`;
        if (!quota.known)
            return fallbackOnUnknown ? 'run (quota not provided, using balance delta)' : 'skip (quota not provided)';
        if (quota.remaining <= 0)
            return `skip (complete, ${quota.earned}/${quota.max})`;
        return `run (${quota.earned}/${quota.max}, missing ${quota.remaining})`;
    }
    searchMobile(account) {
        return this.search(account, true);
    }
    searchDesktop(account) {
        return this.search(account, false);
    }
    search(account, isMobile) {
        const platform = isMobile ? 'Mobile' : 'Desktop';
        const page = isMobile ? this.bot.mainMobilePage : this.bot.mainDesktopPage;
        return index_1.executionContext.run({ isMobile, account }, async () => {
            try {
                return await this.bot.activities.doSearch(page, isMobile);
            }
            catch (error) {
                this.bot.logger.error('main', 'SEARCH-MANAGER', `${platform} 搜索失败 | ${error instanceof Error ? error.message : String(error)}`);
                return 0;
            }
        });
    }
    async bonusMobile(account) {
        this.bot.logger.info('main', 'SEARCH-MANAGER', '开始奖励搜索');
        const gained = await index_1.executionContext.run({ isMobile: true, account }, async () => {
            try {
                return await this.bot.activities.doBonusSearches(this.bot.mainMobilePage);
            }
            catch (error) {
                this.bot.logger.error('main', 'SEARCH-MANAGER', `奖励搜索失败 | ${error instanceof Error ? error.message : String(error)}`);
                return 0;
            }
            finally {
                if (!this.bot.mainMobilePage.isClosed()) {
                    await this.bot.mainMobilePage.goto(urls_1.URLs.bing.origin).catch(() => { });
                }
            }
        });
        this.bot.logger.info('main', 'SEARCH-MANAGER', `奖励搜索汇总 | 获得积分=${gained} | 当前余额=${this.bot.userData.currentPoints}`);
        return gained;
    }
}
exports.SearchManager = SearchManager;
//# sourceMappingURL=SearchManager.js.map