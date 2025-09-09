const express = require('express');
const cors = require('cors');
const path = require('path');

const session = require('./middlewares/session');
const JSend = require('./jsend');
const ApiError = require('./api-error');

const authRoutes = require('./routes/auth.route');
const userRoutes = require('./routes/user.route');
const homestayRoutes = require('./routes/homestay.route');
const bookingRoutes = require('./routes/booking.route');
const paymentRoutes = require('./routes/payment.route');
const amenityRoutes = require('./routes/amenity.route');
const feedbackRoutes = require('./routes/feedback.route');
const complaintRoutes = require('./routes/complaint.route');
const promotionRoutes = require('./routes/promotion.route');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(session);

app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

app.get('/health', (_req, res) =>
    res.json(JSend.success({ uptime: process.uptime() }, 'OK'))
);


app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/homestays', homestayRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/amenities', amenityRoutes);
app.use('/api/feedbacks', feedbackRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/promotions', promotionRoutes);

// 404
app.use((_req, res) => res.status(404).json(JSend.fail('Endpoint not found')));

// error handler
app.use((err, _req, res, _next) => {
    const status = err instanceof ApiError ? err.statusCode : 500;
    res.status(status).json(JSend.fail(err.message || 'Internal Server Error'));
});

module.exports = app; // CHỈ export app, không listen ở đây
