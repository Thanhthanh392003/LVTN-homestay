// src/pages/owner/OwnerHomestayCalendar.jsx
import { useEffect, useState } from "react";
import { Calendar, Badge, Spin, message } from "antd";
import dayjs from "dayjs";
import { homestayApi } from "../../services/homestays";

export default function OwnerHomestayCalendar({ H_ID }) {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async (value) => {
        try {
            setLoading(true);
            const from = dayjs(value).startOf("month").format("YYYY-MM-DD");
            const to = dayjs(value).endOf("month").add(2, "month").format("YYYY-MM-DD"); // xem rộng thêm
            const rows = await homestayApi.getOwnerCalendar(H_ID, { from, to });
            setEvents(rows || []);
        } catch {
            message.error("Không tải được calendar");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(dayjs());
        // eslint-disable-next-line
    }, [H_ID]);

    const dateCellRender = (value) => {
        const d = value.format("YYYY-MM-DD");
        // Lấy những event chứa ngày d trong [start, end)
        const todays = events.filter(e => {
            return dayjs(d).isSameOrAfter(dayjs(e.start), "day") &&
                dayjs(d).isBefore(dayjs(e.end), "day"); // end exclusive
        });
        if (!todays.length) return null;

        return (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {todays.slice(0, 3).map(ev => (
                    <li key={`${ev.Booking_ID}-${ev.start}`}>
                        <Badge
                            status={
                                ev.Booking_status === "confirmed" ? "success" :
                                    ev.Booking_status === "pending" ? "warning" :
                                        "processing"
                            }
                            text={`${ev.guest_name || "Khách"} (${ev.Guests})`}
                        />
                    </li>
                ))}
                {todays.length > 3 && <div>+{todays.length - 3} more</div>}
            </ul>
        );
    };

    return (
        <Spin spinning={loading}>
            <Calendar
                dateCellRender={dateCellRender}
                onPanelChange={load}
                onChange={load}
            />
        </Spin>
    );
}
