module.exports = function requireLogin(req, res, next) {
    if (!req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    req.user = req.session.user; // attach user vào request
    next();
};

// Nếu cần check role
module.exports.role = (...roles) => (req, res, next) => {
    const sessUser = req.session?.user;
    if (!sessUser) return res.status(401).json({ message: "Unauthorized" });

    const roleName = (sessUser.role || "").toLowerCase(); // "admin" | "owner" | "customer"
    const allow = roles.map(r => String(r).toLowerCase());

    if (!allow.includes(roleName)) {
        return res.status(403).json({ message: "Forbidden" });
    }
    req.user = sessUser;
    next();
};