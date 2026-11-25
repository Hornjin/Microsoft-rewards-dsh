import type { Promotion } from '../../../interface/AppDashBoardData';
export interface CheckInState {
    status: 'complete' | 'pending' | 'unknown';
    remaining: number | null;
    updatedAt: string | null;
    reason: string;
}
/**
 * 判断今日签到是否需要提交。
 *
 * 只信任签到推广自身的 `attributes.complete`。`last_updated` 在生产日志中被观察到
 * 等于“服务器刷新时间”而不是真实签到时间（宿主机慢 5 分钟时它反而超前 6 分钟），
 * 因此绝不能作为“今日已签到”的依据；这里只把它写进 reason，方便对账时识别。
 * 无法确认完成时一律返回 pending / unknown，让调用方继续提交（接口幂等）。
 */
export declare function resolveCheckInState(promotions: Pick<Promotion, 'name' | 'attributes'>[], country: string, now?: Date): CheckInState;
//# sourceMappingURL=CheckInState.d.ts.map