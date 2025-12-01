import { pool } from "../utils/db.js";

export async function createBooking({
    uId,
    hId,
    checkin,
    checkout,
    guests,
    unitPrice,          // ⭐ FE phải truyền đúng
    subtotal = 0,
    discount = 0,
    total = 0,
    status,
    method,
    promoCode = null
}) {
    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        // ⭐ Lưu tổng đúng theo FE gửi (subtotal - discount)
        const [r] = await conn.execute(
            `INSERT INTO BOOKING (U_ID, Booking_status, Total_price, Payment_method)
             VALUES (?, ?, ?, ?)`,
            [uId, status, total, method || null]
        );
        const bookingId = r.insertId;

        // ⭐ Lưu unitPrice là đơn giá 1 đêm (đúng)
        await conn.execute(
            `INSERT INTO BOOKING_DETAIL 
                (Booking_ID, H_ID, Checkin_date, Checkout_date, Guests, Unit_price)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                bookingId,
                hId,
                checkin,
                checkout,
                guests,
                Number(unitPrice || 0)
            ]
        );

        // ⭐ Lưu lịch sử dùng mã khuyến mãi nếu có
        if (promoCode && discount > 0) {
            await conn.execute(
                `INSERT INTO PROMOTION_USAGE (Promotion_ID, Booking_ID, U_ID, Used_amount)
                 SELECT Promotion_ID, ?, ?, ?
                 FROM PROMOTION WHERE P_Code = ? LIMIT 1`,
                [bookingId, uId, discount, promoCode]
            );
        }

        await conn.commit();
        return bookingId;

    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
}

export async function updateBookingStatus(id, status) {
    await pool.execute(
        `UPDATE BOOKING SET Booking_status=?, Updated_at=NOW() WHERE Booking_ID=?`,
        [status, id]
    );
}
