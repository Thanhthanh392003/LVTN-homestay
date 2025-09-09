import { Layout, Menu, Input, Dropdown, Typography, Space, Avatar } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { SearchOutlined, HomeOutlined, DashboardOutlined, ApartmentOutlined, UserOutlined, LogoutOutlined } from "@ant-design/icons";

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

export default function AppLayout() {
    const { user, logout } = useAuth();
    const role = user?.role?.name || (user?.role_id === 1 ? "admin" : user?.role_id === 2 ? "owner" : "customer");
    const navigate = useNavigate();
    const location = useLocation();

    const items = [
        role === "admin" && { key: "/admin", icon: <DashboardOutlined />, label: "Dashboard" },
        role === "owner" && { key: "/owner", icon: <ApartmentOutlined />, label: "Quản lý Homestay" },
        (role === "customer" || role === "admin" || role === "owner") && { key: "/customer", icon: <HomeOutlined />, label: "Khám phá" },
    ].filter(Boolean);

    const userMenu = {
        items: [
            { key: "logout", icon: <LogoutOutlined />, label: "Đăng xuất", onClick: logout }
        ]
    };

    return (
        <Layout style={{ minHeight: "100vh" }}>
            <Header className="site-header" style={{ display: "flex", alignItems: "center", gap: 16, paddingInline: 20 }}>
                <div className="brand" onClick={() => navigate(`/${role}`)} style={{ cursor: 'pointer' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 11.5L12 4l9 7.5V21a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" stroke="currentColor" strokeWidth="1.6" /></svg>
                    StayFinder
                </div>

                <Menu
                    mode="horizontal"
                    selectedKeys={[location.pathname]}
                    items={items}
                    onClick={({ key }) => navigate(key)}
                    style={{ flex: 1, minWidth: 220 }}
                />

                <div className="search-mini">
                    <Input prefix={<SearchOutlined />} placeholder="Tìm thành phố, khu vực..." size="large" />
                </div>

                <Space align="center">
                    <Text style={{ color: "#111" }}>{user?.U_Fullname || user?.username || user?.U_Email}</Text>
                    <Dropdown menu={userMenu} placement="bottomRight">
                        <Avatar style={{ background: "#ff69b4" }} icon={<UserOutlined />} />
                    </Dropdown>
                </Space>
            </Header>

            <Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
                <Outlet />
            </Content>

            <Footer className="site-footer">
                © {new Date().getFullYear()} StayFinder • Thuê homestay khắp Việt Nam • Yêu thương những chuyến đi
            </Footer>
        </Layout>
    );
}
