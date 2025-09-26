import { Card, Space, Typography, Button, Tag } from "antd";
import { EnvironmentOutlined, StarFilled, DollarOutlined, HeartFilled, HeartOutlined } from "@ant-design/icons";

const { Title, Text } = Typography;

export default function PropertyCard({
    item,
    isFavorite,
    onToggleFavorite,
    onView,
    onBook,
}) {
    return (
        <Card
            hoverable
            bodyStyle={{ padding: 16 }}
            style={{
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid #eef2f7",
            }}
            cover={
                <div
                    style={{
                        height: 180,
                        backgroundImage: `url(${item.cover || "/hero.jpg"})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                    }}
                />
            }
            actions={[
                <Button type="link" onClick={() => onView?.(item.id)}>
                    Xem chi tiết
                </Button>,
                <Button type="primary" onClick={() => onBook?.(item)}>Đặt ngay</Button>,
            ]}
        >
            <Space direction="vertical" size={6} style={{ width: "100%" }}>
                <Space style={{ width: "100%", justifyContent: "space-between" }}>
                    <Title level={5} style={{ margin: 0 }}>{item.name}</Title>
                    <Button
                        type="text"
                        onClick={() => onToggleFavorite?.(item.id)}
                        icon={isFavorite ? <HeartFilled style={{ color: "#f43f5e" }} /> : <HeartOutlined />}
                    />
                </Space>
                <Space size="small" wrap>
                    <EnvironmentOutlined />
                    <Text type="secondary">{item.city}</Text>
                    <Text type="secondary">•</Text>
                    <Text type="secondary">{item.address}</Text>
                    {item.status && <Tag color={item.status === "available" ? "green" : "volcano"}>{item.status}</Tag>}
                </Space>
                <Space align="center">
                    <StarFilled style={{ color: "#f59e0b" }} />
                    <Text strong>{item.rating ?? 4.6}</Text>
                    <Text type="secondary">/ 5</Text>
                </Space>
                <Space>
                    <DollarOutlined style={{ color: "#10b981" }} />
                    <Text strong style={{ fontSize: 16 }}>
                        {(item.pricePerDay ?? 0).toLocaleString("vi-VN")} ₫ / đêm
                    </Text>
                </Space>
            </Space>
        </Card>
    );
}
