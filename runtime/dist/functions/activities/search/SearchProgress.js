"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchProgress = void 0;
class SearchProgress {
    bot;
    constructor(bot) {
        this.bot = bot;
    }
    async getCounters() {
        const dashboard = await this.bot.browser.func.getDashboardData();
        return dashboard.dashboard.userStatus.counters;
    }
    /**
     * 一次请求同时取回计数器与可用余额。
     * 现代 Rewards 门户（flyout 兜底）可能只返回 PCSearch/ActivityAndQuiz/DailyPoint，
     * 不再提供 MobileSearch，此时配额为 unknown，需要用余额增量兜底估算搜索收益。
     */
    async getSnapshot() {
        const data = await this.bot.browser.func.getDashboardData();
        const userStatus = data?.dashboard?.userStatus ?? {};
        return {
            counters: userStatus.counters ?? {},
            availablePoints: Number.isFinite(userStatus.availablePoints) ? userStatus.availablePoints : null
        };
    }
    async getMissing(isMobile) {
        return this.calculateMissing(await this.getCounters(), isMobile);
    }
    calculateMissing(counters, isMobile) {
        const quotas = this.calculateQuotas(counters);
        const mobilePoints = quotas.mobile.remaining;
        const desktopPoints = quotas.desktop.remaining;
        const edgePoints = quotas.edge.remaining;
        return {
            mobilePoints,
            desktopPoints,
            edgePoints,
            mobileKnown: quotas.mobile.known,
            desktopKnown: quotas.desktop.known,
            edgeKnown: quotas.edge.known,
            totalPoints: isMobile ? mobilePoints : desktopPoints + edgePoints
        };
    }
    calculateQuotas(counters) {
        const pcCounters = counters.pcSearch ?? [];
        const explicitEdgeCounters = pcCounters.filter(counter => this.isEdgeCounter(counter));
        const desktopCounters = explicitEdgeCounters.length
            ? pcCounters.filter(counter => !this.isEdgeCounter(counter))
            : pcCounters;
        return {
            mobile: this.calculateQuota(counters.mobileSearch ?? []),
            desktop: this.calculateQuota(desktopCounters),
            edge: this.calculateQuota(explicitEdgeCounters)
        };
    }
    calculateQuota(counters) {
        if (!counters?.length ||
            counters.some(counter => !Number.isFinite(counter.pointProgressMax) || !Number.isFinite(counter.pointProgress))) {
            return { known: false, earned: 0, max: 0, remaining: 0 };
        }
        return counters.reduce((quota, counter) => {
            const max = Math.max(0, Number(counter.pointProgressMax) || 0);
            const earned = Math.min(max, Math.max(0, Number(counter.pointProgress) || 0));
            quota.earned += earned;
            quota.max += max;
            quota.remaining += max - earned;
            return quota;
        }, { known: true, earned: 0, max: 0, remaining: 0 });
    }
    isEdgeCounter(counter) {
        return [counter.offerId, counter.name, counter.title, counter.promotionSubtype].some(value => typeof value === 'string' && /(^|[_\s-])edge([_\s-]|$)/i.test(value));
    }
}
exports.SearchProgress = SearchProgress;
//# sourceMappingURL=SearchProgress.js.map