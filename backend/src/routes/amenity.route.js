const router = require("express").Router();
const amen = require("../controllers/amenity.controller");
const requireLogin = require("../middlewares/requireLogin");

router.get("/", amen.listMaster);

router.get("/homestays/:id", amen.listByHomestay);

router.put("/homestays/:id", requireLogin.role("owner", "admin"), amen.syncForHomestay);
router.put(
    "/homestays/:id/full",
    requireLogin.role("owner", "admin"),
    amen.setAmenitiesForHomestay
);

module.exports = router;
