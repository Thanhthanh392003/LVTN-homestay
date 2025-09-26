import { Card, Row, Col, DatePicker, InputNumber, Select, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";
const { RangePicker } = DatePicker;

const CITIES = ["Hà Nội", "Đà Nẵng", "TP. Hồ Chí Minh", "Đà Lạt", "Nha Trang"];

export default function SearchBar({ onSearch }) {
    const [form, setForm] = React.useState({
        city: undefined,
        guests: 2,
        dates: null,
    });

    const handle = (patch) => setForm((s) => ({ ...s, ...patch }));

    return (
        <Card
            style={{
                borderRadius: 16,
                border: "1px solid #e2e8f0",
                boxShadow: "0 8px 24px rgba(0,0,0,.06)",
            }}
            bodyStyle={{ padding: 16 }}
        >
            <Row gutter={[12, 12]}>
                <Col xs={24} md={8}>
                    <Select
                        placeholder="Chọn thành phố"
                        size="large"
                        style={{ width: "100%" }}
                        allowClear
                        options={CITIES.map((c) => ({ value: c, label: c }))}
                        onChange={(v) => handle({ city: v })}
                    />
                </Col>
                <Col xs={24} md={10}>
                    <RangePicker
                        size="large"
                        style={{ width: "100%" }}
                        onChange={(v) => handle({ dates: v })}
                        format="YYYY-MM-DD"
                    />
                </Col>
                <Col xs={24} md={4}>
                    <InputNumber
                        size="large"
                        min={1}
                        style={{ width: "100%" }}
                        placeholder="Số khách"
                        value={form.guests}
                        onChange={(v) => handle({ guests: v })}
                    />
                </Col>
                <Col xs={24} md={2}>
                    <Button
                        type="primary"
                        size="large"
                        icon={<SearchOutlined />}
                        block
                        onClick={() => onSearch?.(form)}
                    >
                        Tìm
                    </Button>
                </Col>
            </Row>
        </Card>
    );
}
