import { Button, Card, Typography } from "antd";
import { useAuth } from "../context/AuthContext";
const { Title, Text } = Typography;

export default function HomeOwner() {
    const { user, logout } = useAuth();
    return (
        <div style={{ padding: 24 }}>
            <Card>
                <Title level={3}>Trang Chủ Nhà (Owner)</Title>
                <Text>Xin chào, {user?.fullname || user?.email}</Text>
                <div style={{ marginTop: 16 }}>
                    <Button danger onClick={logout}>Đăng xuất</Button>
                </div>
            </Card>
        </div>
    );
}
