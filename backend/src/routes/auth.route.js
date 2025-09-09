const express = require('express');
const router = express.Router();
const authCtrl = require('../controllers/auth.controller');

// CHÚ Ý: truyền function, không gọi trực tiếp
router.post('/login', authCtrl.loginUser);
router.post('/logout', authCtrl.logoutUser);

module.exports = router;
