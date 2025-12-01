import { useState } from "react";
import { Space, Input, Button, Typography, message } from "antd";
import promotionsApi from "@/services/promotions";
const { Text } = Typography;

export default function CheckoutPromoBox({ userId, homestayId, subtotal, onApplied }) {
    const [code, setCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [res, setRes] = useState(null);

    const apply = async () => {
        setLoading(true);
        const r = await promotionsApi.validate({
            code, userId, homestayId, subtotal
        });
        setLoading(false);
        if (!r.ok) return message.error("Mã không hợp lệ/hết hạn/không đủ điều kiện");
        setRes(r);
        onApplied?.(r); // {ok, discount, payable, promo{...}}
    };

    return (
        <div>
            <Space.Compact style={{ width: "100%" }}>
                <Input
                    placeholder="Nhập mã khuyến mãi"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    disabled={!!res}
                />
                <Button type="primary" onClick={apply} loading={loading} disabled={!code || !!res}>
                    Áp dụng
                </Button>
            </Space.Compact>
            {res && (
                <div style={{ marginTop: 8 }}>
                    <Text type="success">Giảm: {res.discount.toLocaleString()} ₫</Text>
                    <br />
                    <Text>Tạm tính sau giảm: <b>{res.payable.toLocaleString()} ₫</b></Text>
                </div>
            )}
        </div>
    );
}
