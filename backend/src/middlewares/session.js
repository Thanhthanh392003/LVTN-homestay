// src/middlewares/session.js
const session = require('express-session');

module.exports = session({
    name: 'sid',                 // tên cookie (mặc định là connect.sid) -> dễ nhìn hơn
    secret: 'homestay_secret',   // đổi thành chuỗi bí mật của bạn
    resave: false,
    saveUninitialized: false,    // quan trọng: chỉ set cookie khi có dữ liệu session
    cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: false,             // chạy HTTP localhost -> phải false
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 ngày
    }
});
