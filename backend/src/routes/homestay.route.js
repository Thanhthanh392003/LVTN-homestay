const express = require('express');
const router = express.Router();
const knex = require('../database/knex');
const { uploadManyImages } = require('../middlewares/imageUpload');

router.post('/:id/images', (req, res) => {
    uploadManyImages(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        try {
            const H_ID = Number(req.params.id);
            if (!H_ID) return res.status(400).json({ error: 'H_ID không hợp lệ' });
            if (!req.files?.length) return res.status(400).json({ error: 'Chưa chọn ảnh' });

            const rows = req.files.map((f, i) => ({
                H_ID,
                Image_url: `/uploads/${f.filename}`,
                IsMain: i === 0,
                Sort_order: i + 1,
            }));
            await knex('IMAGE').insert(rows);
            res.json({ message: 'Upload thành công', images: rows });
        } catch (e) {
            console.error(e);
            res.status(500).json({ error: 'Lỗi server khi lưu ảnh' });
        }
    });
});

module.exports = router;
