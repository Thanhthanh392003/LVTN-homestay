// frontend/src/components/TopBar.jsx
import React from "react";
import { Layout, Space, Typography, Avatar, Dropdown, Button, Badge } from "antd";
import {
    UserOutlined,
    LogoutOutlined,
    SettingOutlined,
    BellOutlined,
    DownOutlined,
} from "@ant-design/icons";

const { Header } = Layout;
const { Text, Title } = Typography;

export default function TopBar({ user, role = "Owner", onLogout, onUserClick }) {
    const name = user?.U_Fullname || user?.full_name || user?.username || "User";
    const initials = React.useMemo(() => {
        const s = String(name).trim();
        if (!s) return "U";
        const parts = s.split(/\s+/);
        const a = parts[0]?.[0] || "U";
        const b = parts.length > 1 ? parts[parts.length - 1][0] : "";
        return (a + b).toUpperCase();
    }, [name]);

    const menuItems = [
        { key: "profile", icon: <SettingOutlined />, label: "Sửa hồ sơ", onClick: () => onUserClick && onUserClick() },
        { type: "divider" },
        { key: "logout", icon: <LogoutOutlined />, label: "Đăng xuất", danger: true, onClick: () => onLogout && onLogout() },
    ];

    return (
        <>
            <style>{`
        /* ===== Animations ===== */
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes blobFloat {
          0%   { transform: translate(0,0) scale(1); }
          50%  { transform: translate(20px, -10px) scale(1.05); }
          100% { transform: translate(0,0) scale(1); }
        }
        @keyframes ringSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulseDot {
          0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(239,68,68,.5); }
          50%     { transform: scale(1.1); box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }

        /* ===== Pretty helpers ===== */
        .tb-wrap {
          position: relative;
          overflow: hidden;
          border-bottom: 1px solid rgba(0,0,0,.06);
          box-shadow: 0 8px 24px rgba(0,0,0,.04) inset;
          background: linear-gradient(90deg, rgba(99,102,241,.08), rgba(34,197,94,.08));
          background-size: 200% 200%;
          animation: gradientShift 18s ease infinite;
          backdrop-filter: saturate(1.2) blur(6px);
        }
        .tb-blob {
          position: absolute;
          width: 220px; height: 220px;
          filter: blur(28px);
          opacity: .35;
          border-radius: 50%;
          pointer-events: none;
          mix-blend-mode: multiply;
          animation: blobFloat 12s ease-in-out infinite;
        }
        .tb-blob.b1 { left: -60px; top: -80px; background: #60a5fa; }
        .tb-blob.b2 { right: -80px; top: -40px; background: #34d399; animation-duration: 16s; }

        .tb-logo {
          width: 44px; height: 44px; border-radius: 14px;
          display: grid; place-items: center; color: #fff; font-weight: 800;
          background: linear-gradient(135deg,#22c55e 0%, #3b82f6 100%);
          position: relative; isolation: isolate;
        }
        .tb-logo::after{
          content:"";
          position:absolute; inset:-3px; border-radius:16px;
          background: conic-gradient(from 0deg, #22c55e, #3b82f6, #22c55e);
          z-index:-1; filter: blur(10px); opacity:.35;
          animation: ringSpin 12s linear infinite;
        }

        .tb-chip {
          font-size:12px; padding:2px 10px; border-radius:999px;
          color:#065f46; background:rgba(16,185,129,.14);
          border:1px solid rgba(5,150,105,.2);
        }

        .tb-avatarRing {
          position: relative; border-radius: 999px; padding: 2px;
          background: conic-gradient(#60a5fa, #10b981, #60a5fa);
          animation: ringSpin 10s linear infinite;
        }
        .tb-avatarRing .ant-avatar { background: linear-gradient(135deg, #60a5fa, #10b981); font-weight:700; }
        .tb-pill {
          cursor:pointer; padding: 4px 10px; border-radius: 999px;
          border:1px solid rgba(0,0,0,.06); background:#fff; transition: all .2s;
        }
        .tb-pill:hover { box-shadow: 0 6px 16px rgba(2,132,199,.12); transform: translateY(-1px); }

        .tb-bell { position: relative; }
        .tb-bell::after{
          content:""; position:absolute; top:2px; right:2px; width:8px; height:8px;
          background:#ef4444; border-radius:999px; animation:pulseDot 1.6s ease infinite;
        }
      `}</style>

            <Header className="tb-wrap" style={{ height: 68, paddingInline: 16, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {/* background blobs */}
                <span className="tb-blob b1" />
                <span className="tb-blob b2" />

                {/* Left: logo + title */}
                <Space size={12} align="center" style={{ zIndex: 1 }}>
                    <div className="tb-logo">HS</div>
                    <div style={{ lineHeight: 1 }}>
                        <Title level={5} style={{ margin: 0 }}>Homestay Manager</Title>
                        <Space size={8}>
                            <Typography.Text type="secondary" style={{ fontSize: 12 }}>Bảng điều khiển</Typography.Text>
                            <span className="tb-chip">{role}</span>
                        </Space>
                    </div>
                </Space>

                {/* Right: bell + avatar dropdown */}
                <Space size={12} align="center" style={{ zIndex: 1 }}>
                    <Button className="tb-bell" type="text" shape="circle" icon={<BellOutlined />} />

                    <Dropdown menu={{ items: menuItems }} trigger={["click"]} placement="bottomRight" arrow>
                        <Space className="tb-pill">
                            <span className="tb-avatarRing">
                                <Avatar size={34} icon={<UserOutlined />}>
                                    {initials}
                                </Avatar>
                            </span>
                            <Text strong>{name}</Text>
                            <DownOutlined style={{ fontSize: 10, opacity: .65 }} />
                        </Space>
                    </Dropdown>
                </Space>
            </Header>
        </>
    );
}
