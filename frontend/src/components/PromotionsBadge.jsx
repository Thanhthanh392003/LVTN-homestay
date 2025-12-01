import { Tag, Tooltip } from "antd";
export default function PromotionsBadge({ promos = [] }) {
    if (!promos.length) return null;
    const best = promos[0];
    const text = best.P_Type === "percent" ? `-${best.Discount}%` : `-${Number(best.Discount).toLocaleString()}₫`;
    return (
        <Tooltip title={`${promos.length} mã đang hoạt động`}>
            <Tag color="green" style={{ borderRadius: 999 }}>Có mã: {text}</Tag>
        </Tooltip>
    );
}
