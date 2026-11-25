"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseActivity = void 0;
class BaseActivity {
    bot;
    executed = false;
    constructor(bot) {
        this.bot = bot;
    }
    markExecuted() {
        this.executed = true;
    }
    didExecute() {
        return this.executed;
    }
}
exports.BaseActivity = BaseActivity;
//# sourceMappingURL=BaseActivity.js.map