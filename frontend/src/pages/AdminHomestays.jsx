// src/pages/AdminHomestays.jsx
import React from "react";
import {
    Layout,
    Card,
    Row,
    Col,
    Segmented,
    Input,
    Button,
    Table,
    Tag,
    Space,
    Empty,
    message,
    Typography,
    Popconfirm,
    Image,
    Tooltip,
} from "antd";
import {
    HomeOutlined,
    CheckOutlined,
    StopOutlined,
    DeleteOutlined,
    ArrowLeftOutlined,
    ReloadOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import TopBar from "../components/TopBar";
import { useAuth } from "../context/AuthContext";
import { homestaysApi, toPublicUrl } from "../services/homestays";

const { Title } = Typography;

export default function AdminHomestays() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // ✅ Mặc định hiển thị TẤT CẢ để không bị bảng trống
    const [statusTab, setStatusTab] = React.useState("all"); // all | pending | active | rejected | blocked
    const [q, setQ] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [rows, setRows] = React.useState([]);

    const fetchList = async () => {
        setLoading(true);
        try {
            const data = await homestaysApi.adminList({
                status: statusTab === "all" ? undefined : statusTab,
                q: q || undefined,
            });
            // service có thể trả {data: [...] } hoặc array; chuẩn hoá nhẹ
            const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
            const normalized = list.map((it) => ({
                ...it,
                Image_url: toPublicUrl(it.Image_url || it.main_image || it.cover),
            }));
            setRows(normalized);
        } catch (e) {
            console.error("[adminList error]", e);
            const code = e?.response?.status;
            if (code === 401) {
                message.warning("Bạn cần đăng nhập lại để xem dữ liệu.");
            } else {
                message.error(e?.response?.data?.message || "Không tải được danh sách homestay");
            }
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    const approve = async (r) => {
        try {
            await homestaysApi.adminApprove(r.H_ID ?? r.id);
            message.success("Đã phê duyệt");
            fetchList();
        } catch (e) {
            console.error(e);
            message.error(e?.response?.data?.message || "Phê duyệt thất bại");
        }
    };

    const reject = async (r) => {
        try {
            await homestaysApi.adminReject(r.H_ID ?? r.id);
            message.success("Đã từ chối");
            fetchList();
        } catch (e) {
            console.error(e);
            message.error(e?.response?.data?.message || "Từ chối thất bại");
        }
    };

    const removeHs = async (r) => {
        try {
            await homestaysApi.adminRemove(r.H_ID ?? r.id);
            message.success("Đã xoá homestay khỏi hệ thống");
            fetchList();
        } catch (e) {
            console.error(e);
            message.error(e?.response?.data?.message || "Xoá thất bại");
        }
    };

    // load lần đầu & khi đổi tab
    React.useEffect(() => {
        fetchList();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [statusTab]);

    const bg = {
        minHeight: "100vh",
        background:
            "radial-gradient(900px 240px at 10% 0%, rgba(16,185,129,.10), transparent 60%), radial-gradient(900px 240px at 85% 0%, rgba(59,130,246,.10), transparent 60%), #f6fbff",
    };

    const columns = [
        {
            title: "Ảnh",
            dataIndex: "Image_url",
            width: 110,
            render: (v) =>
                v ? (
                    <Image
                        src={v}
                        width={84}
                        height={60}
                        style={{ objectFit: "cover", borderRadius: 8 }}
                        preview={false}
                    />
                ) : null,
        },
        { title: "Tên", dataIndex: "H_Name", render: (v, r) => v || r.name },
        { title: "Thành phố", dataIndex: "H_City", width: 140, render: (v, r) => v || r.city },
        { title: "Chủ nhà", dataIndex: "OwnerEmail", render: (v, r) => v || r.owner || r.owner_email },
        {
            title: "Trạng thái",
            dataIndex: "Status",
            width: 140,
            render: (v, r) => {
                const s = (v || r.status || "pending").toLowerCase();
                const color =
                    s === "active" ? "green" : s === "pending" ? "gold" : s === "blocked" ? "purple" : "volcano";
                return <Tag color={color}>{s}</Tag>;
            },
        },
        {
            title: "Thao tác",
            width: 320,
            render: (_, r) => {
                const s = (r.Status || r.status || "").toLowerCase();
                return (
                    <Space wrap>
                        <Tooltip title="Phê duyệt">
                            <Button
                                type="primary"
                                icon={<CheckOutlined />}
                                onClick={() => approve(r)}
                                disabled={s === "active"}
                            >
                                Phê duyệt
                            </Button>
                        </Tooltip>
                        <Tooltip title="Từ chối">
                            <Button icon={<StopOutlined />} danger onClick={() => reject(r)} disabled={s === "rejected"}>
                                Từ chối
                            </Button>
                        </Tooltip>
                        <Popconfirm title="Xoá homestay này khỏi hệ thống?" onConfirm={() => removeHs(r)}>
                            <Button danger icon={<DeleteOutlined />}>
                                Xoá
                            </Button>
                        </Popconfirm>
                    </Space>
                );
            },
        },
    ];

    return (
        <Layout style={bg}>
            <TopBar user={user} role="Admin" onLogout={logout} />

            <Layout.Content style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
                <div style={{ marginBottom: 12 }}>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate("/admin")}>
                        Về bảng điều khiển
                    </Button>
                </div>

                <Card
                    bordered={false}
                    style={{
                        borderRadius: 20,
                        marginBottom: 12,
                        background: "linear-gradient(135deg,#ffffff,#f7fffb)",
                        boxShadow: "0 18px 40px rgba(15,23,42,.08)",
                    }}
                    bodyStyle={{ padding: 16 }}
                >
                    <Row justify="space-between" align="middle" gutter={[16, 12]}>
                        <Col flex="auto">
                            <Space size={12} align="center">
                                <div
                                    style={{
                                        width: 44,
                                        height: 44,
                                        borderRadius: 12,
                                        display: "grid",
                                        placeItems: "center",
                                        color: "#fff",
                                        background: "linear-gradient(135deg,#22c55e,#1677ff)",
                                    }}
                                >
                                    <HomeOutlined />
                                </div>
                                <Title level={3} style={{ margin: 0 }}>
                                    Quản lý Homestay
                                </Title>
                            </Space>
                        </Col>
                        <Col>
                            <Segmented
                                options={[
                                    { label: "Tất cả", value: "all" },        // ✅ đưa “Tất cả” lên đầu
                                    { label: "Chờ phê duyệt", value: "pending" },
                                    { label: "Đã phê duyệt", value: "active" },
                                    { label: "Bị từ chối", value: "rejected" },
                                    { label: "Bị chặn", value: "blocked" },
                                ]}
                                value={statusTab}
                                onChange={setStatusTab}
                            />
                        </Col>
                    </Row>
                </Card>

                <Card style={{ borderRadius: 18 }}>
                    <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                        <Col>
                            <Input
                                allowClear
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onPressEnter={fetchList}
                                placeholder="Tìm theo tên / thành phố / email chủ nhà..."
                                prefix={<SearchOutlined style={{ color: "#94a3b8" }} />}
                                style={{ width: 380, borderRadius: 12 }}
                            />
                        </Col>
                        <Col>
                            <Button icon={<ReloadOutlined />} onClick={fetchList}>
                                Làm mới
                            </Button>
                        </Col>
                    </Row>

                    <Table
                        rowKey={(r) => r.H_ID ?? r.id}
                        dataSource={rows}
                        loading={loading}
                        pagination={{ pageSize: 10 }}
                        locale={{ emptyText: <Empty description="Chưa có homestay nào" /> }}
                        columns={columns}
                    />
                </Card>
            </Layout.Content>
        </Layout>
    );
}
