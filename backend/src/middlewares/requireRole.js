// src/middlewares/requireRole.js
const ApiError = require('../api-error');

function getRoleName(session) {
    const byName = session?.role || session?.user?.role || session?.user?.ROLE_Name;
    if (typeof byName === 'string') return byName.toLowerCase();
    const id = session?.role_id ?? session?.user?.ROLE_ID ?? session?.user?.role_id;
    if (id === 1 || id === 0) return 'admin';
    if (id === 2) return 'owner';
    if (id === 3) return 'customer';
    return undefined;
}

module.exports = (...allow) => {
    const allowNorm = allow.map(a =>
        typeof a === 'number'
            ? (a === 1 || a === 0 ? 'admin' : a === 2 ? 'owner' : 'customer')
            : String(a).toLowerCase()
    );
    return (req, res, next) => {
        const rn = getRoleName(req.session);
        if (!rn) return next(new ApiError(401, 'Unauthorized'));
        if (!allowNorm.includes(rn)) return next(new ApiError(403, `Forbidden: require ${allowNorm.join('/')}, got ${rn}`));
        next();
    };
};
