import { Card, Tag, Rate, Typography } from "antd";
const { Meta } = Card;
const { Text } = Typography;

export default function HomestayCard({ item }) {
    return (
        <Card
            hoverable
            cover={
                <img
                    alt={item.name}
                    src={item.image}
                    style={{ height: 200, objectFit: "cover" }}
                />
            }
            bodyStyle={{ padding: 16 }}
        >
            <Meta
                title={item.name}
                description={<Text type="secondary">{item.city}</Text>}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
                <Tag color="magenta">{item.price.toLocaleString()}đ/đêm</Tag>
                <Rate disabled defaultValue={item.rating} allowHalf />
            </div>
            <div style={{ marginTop: 8, color: "#6b7280", fontSize: 13 }}>
                {item.desc}
            </div>
        </Card>
    );
}
