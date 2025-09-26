// middlewares/session.js
const session = require('express-session');
module.exports = session({
    secret: 'your-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'lax',   // dev: 'lax' OK, nếu cross-site thật sự -> 'none' + secure:true
        secure: false,     // dev HTTP thì false
    }
});
