// src/middlewares/requireRole.js
const ApiError = require('../api-error');

module.exports = function requireRole(...roles) {
    // đảm bảo roles toàn số
    const allowed = roles.map((r) => Number(r));
    return (req, _res, next) => {
        const roleId = Number(req.session?.role_id);
        if (!roleId) return next(new ApiError(401, 'Unauthorized'));
        if (!allowed.includes(roleId)) return next(new ApiError(403, 'Forbidden'));
        next();
    };
};
