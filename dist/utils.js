"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isEmptyString = void 0;
const isEmptyString = (value) => {
    if (value == null) {
        return true;
    }
    if (typeof value === 'string') {
        return value.trim().length === 0;
    }
};
exports.isEmptyString = isEmptyString;
//# sourceMappingURL=utils.js.map