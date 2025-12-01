// src/services/promotion.service.js
const knex = require('../database/knex');
const ApiError = require('../api-error');

const isAdmin = (req) => req.session?.role_id === 1 || req.session?.role_id === 0;
const isOwner = (req) => req.session?.role_id === 2;

async function assertLogin(req) {
    if (!req.session?.user_id) throw new ApiError(401, 'Unauthorized');
}

async function getPromoScopeTable() {
    const hasPH = await knex.schema.hasTable('PROMOTION_HOMESTAY');
    const hasPA = await knex.schema.hasTable('PROMOTION_APPLICABLE');
    return hasPH ? 'PROMOTION_HOMESTAY' : (hasPA ? 'PROMOTION_APPLICABLE' : null);
}

// ✅ helper còn thiếu trong file cũ
function getSessionUserId(req) {
    return req?.session?.user_id ?? req?.user?.U_ID ?? null;
}

const pickId = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
};
const pickCode = (v) => (typeof v === 'string' ? v.trim().toUpperCase() : null);

async function ensureOwnerOwnsHomestay(ownerId, h_id) {
    const own = await knex('HOMESTAY').select('U_ID').where('H_ID', h_id).first();
    if (!own) throw new ApiError(404, 'Homestay not found');
    if (ownerId && own.U_ID !== ownerId) throw new ApiError(403, 'Forbidden');
}

/* -------------------- CRUD & LIST (giữ nguyên các phần bạn đang dùng) -------------------- */
async function createPromotion(req, body) {
    await assertLogin(req);
    if (!isAdmin(req) && !isOwner(req)) throw new ApiError(403, 'Forbidden');

    const now = knex.fn.now();
    const payload = {
        P_Code: (body.P_Code ?? body.code ?? '').toString().trim().toUpperCase(),
        P_Name: body.P_Name ?? body.name,
        Discount: Number(body.Discount ?? body.discount ?? 0),
        P_Type: body.P_Type ?? body.type ?? 'percent',
        Start_date: body.Start_date ?? body.start_date,
        End_date: body.End_date ?? body.end_date,
        Max_discount: body.Max_discount ?? body.max_discount ?? null,
        Min_order_amount: body.Min_order_amount ?? body.min_order_amount ?? 0,
        Usage_limit_total: body.Usage_limit_total ?? body.usage_limit_total ?? null,
        Usage_limit_per_user: body.Usage_limit_per_user ?? body.usage_limit_per_user ?? null,
        Is_stackable: body.Is_stackable ?? (typeof body.is_stackable === 'boolean' ? (body.is_stackable ? 1 : 0) : 0),
        P_Status: body.P_Status ?? body.status ?? 'active',
        Promotion_Description: body.Promotion_Description ?? body.description ?? null,
        Owner_ID: isOwner(req) ? req.session.user_id : (body.Owner_ID ?? body.owner_id ?? null),
        Promotion_created_at: now,
        Promotion_updated_at: now,
    };

    if (!payload.P_Code || !payload.P_Name || payload.Discount == null || !payload.Start_date || !payload.End_date) {
        throw new ApiError(400, 'Missing required fields');
    }
    if (!['percent', 'fixed'].includes(payload.P_Type)) throw new ApiError(400, 'Invalid P_Type');
    if (payload.P_Type === 'percent' && (payload.Discount < 0 || payload.Discount > 100)) {
        throw new ApiError(400, 'Percent Discount must be 0..100');
    }

    const [id] = await knex('PROMOTION').insert(payload);
    return await knex('PROMOTION').where('Promotion_ID', id).first();
}

async function updatePromotion(req, id, body) {
    await assertLogin(req);
    if (!isAdmin(req) && !isOwner(req)) throw new ApiError(403, 'Forbidden');

    const patch = {};
    const setIf = (k, v) => { if (v !== undefined) patch[k] = v; };

    setIf('P_Name', body.P_Name ?? body.name);
    setIf('P_Code', (body.P_Code ?? body.code)?.toString().trim().toUpperCase());
    setIf('Discount', body.Discount != null ? Number(body.Discount) : undefined);
    setIf('P_Type', body.P_Type ?? body.type);
    setIf('Max_discount', body.Max_discount ?? body.max_discount);
    setIf('Start_date', body.Start_date ?? body.start_date);
    setIf('End_date', body.End_date ?? body.end_date);
    setIf('Min_order_amount', body.Min_order_amount ?? body.min_order_amount);
    setIf('Usage_limit_total', body.Usage_limit_total ?? body.usage_limit_total);
    setIf('Usage_limit_per_user', body.Usage_limit_per_user ?? body.usage_limit_per_user);
    setIf('Is_stackable', body.Is_stackable ?? (typeof body.is_stackable === 'boolean' ? (body.is_stackable ? 1 : 0) : undefined));
    setIf('P_Status', body.P_Status ?? body.status);
    setIf('Promotion_Description', body.Promotion_Description ?? body.description);

    if (!Object.keys(patch).length) throw new ApiError(400, 'No data to update');
    patch.Promotion_updated_at = knex.fn.now();

    const ret = await knex('PROMOTION').update(patch).where('Promotion_ID', id);
    if (!ret) throw new ApiError(404, 'Promotion not found');

    return await knex('PROMOTION').where('Promotion_ID', id).first();
}

async function listPromotions(query = {}, req) {
    const q = knex('PROMOTION').select('*');

    if (query.q) {
        q.where(b => b.where('P_Name', 'like', `%${query.q}%`).orWhere('P_Code', 'like', `%${query.q}%`));
    }
    if (query.name) q.where('P_Name', 'like', `%${query.name}%`);
    if (query.code) q.whereRaw('UPPER(P_Code)=UPPER(?)', [query.code]);
    if (query.status && query.status !== 'all') q.where('P_Status', query.status);
    if (query.type && query.type !== 'all') q.where('P_Type', query.type);

    if (req?.session?.role_id === 2) {
        q.where(b => b.whereNull('Owner_ID').orWhere('Owner_ID', req.session.user_id));
    } else if (query.owner_id != null && query.owner_id !== '') {
        if (query.owner_id === 'null') q.whereNull('Owner_ID');
        else q.where('Owner_ID', query.owner_id);
    }

    if (query.active === '1') {
        q.where('P_Status', 'active').whereRaw('CURDATE() BETWEEN Start_date AND End_date');
    }

    return await q.orderBy('Promotion_created_at', 'desc');
}

/* =================== Core: Gán/Bỏ gán promotion =================== */
async function applyPromotionToHomestay(req, body) {
    const uid = getSessionUserId(req);
    const hId =
        pickId(body?.h_id) ?? pickId(body?.H_ID) ?? pickId(body?.homestay_id) ?? pickId(body?.hid);
    const pid = pickId(body?.promotion_id) ?? pickId(body?.Promotion_ID) ?? pickId(body?.id);
    const code = pickCode(body?.code ?? body?.P_Code);

    console.log("[promo.apply] raw body =", body);
    console.log("[promo.apply] parsed =>", { hId, pid, code, uid });

    if (!hId) throw new ApiError(400, "Missing h_id");

    const table = await getPromoScopeTable();      // ✅ sửa tên hàm
    if (!table) throw new ApiError(400, "Promotion scope table not found");

    await ensureOwnerOwnsHomestay(uid, hId);

    if (pid) {
        await knex(table)
            .insert({ Promotion_ID: pid, H_ID: hId })
            .onConflict(["Promotion_ID", "H_ID"])
            .ignore();
        return { ok: true, Promotion_ID: pid, H_ID: hId };
    }

    if (!code) throw new ApiError(400, "Missing promotion_id or code");

    const promo = await knex("PROMOTION").whereRaw("UPPER(P_Code)=?", [code]).first();
    if (!promo) throw new ApiError(404, "Promotion not found by code");

    await knex(table)
        .insert({ Promotion_ID: promo.Promotion_ID, H_ID: hId })
        .onConflict(["Promotion_ID", "H_ID"])
        .ignore();

    return { ok: true, Promotion_ID: promo.Promotion_ID, H_ID: hId };
}

async function removePromotionFromHomestay(req, body) {
    const uid = getSessionUserId(req);
    const hId =
        pickId(body?.h_id) ?? pickId(body?.H_ID) ?? pickId(body?.homestay_id) ?? pickId(body?.hid);
    const pid = pickId(body?.promotion_id) ?? pickId(body?.Promotion_ID) ?? pickId(body?.id);
    const code = pickCode(body?.code ?? body?.P_Code);

    console.log("[promo.unapply] parsed =>", { hId, pid, code, uid });

    if (!hId) throw new ApiError(400, "Missing h_id");

    const table = await getPromoScopeTable();      // ✅ sửa tên hàm
    if (!table) throw new ApiError(400, "Promotion scope table not found");

    await ensureOwnerOwnsHomestay(uid, hId);

    let where = { H_ID: hId };
    if (pid) where.Promotion_ID = pid;
    else if (code) {
        const promo = await knex("PROMOTION").whereRaw("UPPER(P_Code)=?", [code]).first();
        if (!promo) return { ok: true, deleted: 0 };
        where.Promotion_ID = promo.Promotion_ID;
    } else {
        throw new ApiError(400, "Missing promotion_id or code");
    }

    const deleted = await knex(table).where(where).del();
    return { ok: true, deleted };
}

/* ============== Khác (giữ nguyên chữ ký hàm cũ) ============== */
async function listActivePromotionsByHomestay(h_id) {
    const scopeTable = await getPromoScopeTable();
    const own = await knex('HOMESTAY').select('U_ID').where('H_ID', h_id).first();
    if (!own) throw new ApiError(404, 'Homestay not found');
    const ownerId = own.U_ID;

    if (!scopeTable) {
        return await knex('PROMOTION as P')
            .select('P.*')
            .where('P.P_Status', 'active')
            .whereRaw('Start_date <= CURDATE()')
            .whereRaw('End_date >= CURDATE()')
            .where(function () { this.whereNull('P.Owner_ID').orWhere('P.Owner_ID', ownerId); })
            .orderBy('P.Discount', 'desc');
    }

    const alias = scopeTable === 'PROMOTION_APPLICABLE' ? 'PA' : 'PH';
    return knex(`${scopeTable} as ${alias}`)
        .join('PROMOTION as P', 'P.Promotion_ID', `${alias}.Promotion_ID`)
        .select('P.*')
        .where(`${alias}.H_ID`, h_id)
        .andWhere('P.P_Status', 'active')
        .andWhere('P.Start_date', '<=', knex.fn.now())
        .andWhere('P.End_date', '>=', knex.fn.now())
        .orderBy('P.Discount', 'desc');
}

async function validatePromotion(body) { /* giữ nguyên như bạn đang dùng */ }
async function applyPromotionUsage(body) { /* giữ nguyên như bạn đang dùng */ }
async function getPromotionById(_req, id) { /* giữ nguyên như bạn đang dùng */ }
async function deletePromotion(req, id) { /* giữ nguyên như bạn đang dùng */ }

module.exports = {
    createPromotion,
    updatePromotion,
    deletePromotion,
    getPromotionById,
    listPromotions,
    applyPromotionToHomestay,
    removePromotionFromHomestay,
    listActivePromotionsByHomestay,
    validatePromotion,
    applyPromotionUsage,
};
