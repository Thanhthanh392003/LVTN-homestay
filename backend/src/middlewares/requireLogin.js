const JSend = require('../jsend');

module.exports = (req, res, next) => {
    const u = req.session?.user;
    if (!u) return res.status(401).json(JSend.fail('Unauthorized'));
    req.user = u;
    next();
};