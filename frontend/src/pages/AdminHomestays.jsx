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

    const [statusTab, setStatusTab] = React.useState("all");
    const [q, setQ] = React.useState("");
    const [loading, setLoading] = React.useState(false);
    const [rows, setRows] = React.useState([]);

    // 🌈 BACKGROUND GRADIENT ĐẸP
    const bg = {
        minHeight: "100vh",
        background:
            "linear-gradient(165deg, #f0fdfa 0%, #f0f9ff 40%, #eff6ff 100%)",
        paddingBottom: 50,
    };

    const fetchList = async () => {
        setLoading(true);
        try {
            const data = await homestaysApi.adminList({
                status: statusTab === "all" ? undefined : statusTab,
                q: q || undefined,
            });

            const list = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];
            const normalized = list.map((it) => ({
                ...it,
                Image_url: toPublicUrl(it.Image_url || it.main_image || it.cover),
            }));

            setRows(normalized);
        } catch (e) {
            console.error("[adminList error]", e);
            message.error("Không tải được danh sách homestay");
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
        } catch {
            message.error("Phê duyệt thất bại");
        }
    };

    const reject = async (r) => {
        try {
            await homestaysApi.adminReject(r.H_ID ?? r.id);
            message.success("Đã từ chối");
            fetchList();
        } catch {
            message.error("Từ chối thất bại");
        }
    };

    const removeHs = async (r) => {
        try {
            await homestaysApi.adminRemove(r.H_ID ?? r.id);
            message.success("Đã xoá homestay");
            fetchList();
        } catch {
            message.error("Xoá thất bại");
        }
    };

    const blockHs = async (r) => {
        try {
            await homestaysApi.adminBlock(r.H_ID ?? r.id);
            message.success("Đã chặn homestay");
            fetchList();
        } catch {
            message.error("Chặn thất bại");
        }
    };

    const unblockHs = async (r) => {
        try {
            await homestaysApi.adminUnblock(r.H_ID ?? r.id);
            message.success("Đã bỏ chặn");
            fetchList();
        } catch {
            message.error("Bỏ chặn thất bại");
        }
    };

    React.useEffect(() => {
        fetchList();
    }, [statusTab]);

    const mapStatusVI = (s) => {
        switch (s) {
            case "pending":
                return "Chờ phê duyệt";
            case "active":
                return "Đã phê duyệt";
            case "rejected":
                return "Bị từ chối";
            case "blocked":
                return "Bị chặn";
            default:
                return s;
        }
    };

    // 🌈 status pastel đẹp mắt
    const statusColors = {
        pending: "gold",
        active: "green",
        rejected: "volcano",
        blocked: "purple",
    };

    const columns = [
        {
            title: "Ảnh",
            dataIndex: "Image_url",
            width: 120,
            render: (v) =>
                v ? (
                    <div style={{ borderRadius: 10, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
                        <Image
                            src={v}
                            width={100}
                            height={70}
                            style={{ objectFit: "cover" }}
                            preview={false}
                        />
                    </div>
                ) : null,
        },
        { title: "Tên", dataIndex: "H_Name" },
        { title: "Thành phố", dataIndex: "H_City" },
        {
            title: "Chủ nhà",
            dataIndex: "OwnerEmail",
            render: (v, r) => v || r.owner_email,
        },
        {
            title: "Trạng thái",
            dataIndex: "Status",
            render: (v, r) => {
                const s = (v || r.status || "").toLowerCase();
                return (
                    <Tag
                        color={statusColors[s]}
                        style={{ padding: "4px 10px", borderRadius: 8, fontWeight: 500 }}
                    >
                        {mapStatusVI(s)}
                    </Tag>
                );
            },
        },
        {
            title: "Thao tác",
            render: (_, r) => {
                const s = (r.Status || r.status).toLowerCase();
                const isActive = s === "active";
                const isRejected = s === "rejected";
                const isBlocked = s === "blocked";

                return (
                    <Space wrap size="small">

                        {/* Nút đẹp + hover scale */}
                        <Button
                            type="primary"
                            icon={<CheckOutlined />}
                            onClick={() => approve(r)}
                            disabled={isActive || isBlocked}
                            style={{ borderRadius: 8, transform: "scale(1)", transition: "0.2s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        >
                            Phê duyệt
                        </Button>

                        <Button
                            icon={<StopOutlined />}
                            danger
                            disabled={isActive || isRejected || isBlocked}
                            onClick={() => reject(r)}
                            style={{ borderRadius: 8, transform: "scale(1)", transition: "0.2s" }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
                        >
                            Từ chối
                        </Button>

                        {!isBlocked && (
                            <Popconfirm
                                title="Chặn homestay này?"
                                onConfirm={() => blockHs(r)}
                            >
                                <Button
                                    danger
                                    type="dashed"
                                    icon={<StopOutlined />}
                                    style={{ borderRadius: 8 }}
                                >
                                    Chặn
                                </Button>
                            </Popconfirm>
                        )}

                        {isBlocked && (
                            <Popconfirm
                                title="Bỏ chặn homestay này?"
                                onConfirm={() => unblockHs(r)}
                            >
                                <Button
                                    type="primary"
                                    style={{ borderRadius: 8 }}
                                >
                                    Bỏ chặn
                                </Button>
                            </Popconfirm>
                        )}

                        <Popconfirm
                            title="Xoá homestay này?"
                            onConfirm={() => removeHs(r)}
                        >
                            <Button danger icon={<DeleteOutlined />} style={{ borderRadius: 8 }}>
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

                {/* Nút quay lại */}
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={() => navigate("/admin")}
                    style={{
                        marginBottom: 15,
                        borderRadius: 8,
                        paddingInline: 18,
                        background: "#fff",
                        boxShadow: "0 3px 9px rgba(0,0,0,0.05)",
                    }}
                >
                    Về bảng điều khiển
                </Button>

                {/* CARD TITLE */}
                <Card
                    style={{
                        marginBottom: 20,
                        borderRadius: 22,
                        background: "white",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
                    }}
                    bodyStyle={{ padding: 20 }}
                >
                    <Row justify="space-between" align="middle">
                        <Col>
                            <Title level={3} style={{ margin: 0, color: "#0f172a" }}>
                                Quản lý Homestay
                            </Title>
                        </Col>
                        <Col>
                            <Segmented
                                options={[
                                    { label: "Tất cả", value: "all" },
                                    { label: "Chờ phê duyệt", value: "pending" },
                                    { label: "Đã phê duyệt", value: "active" },
                                    { label: "Bị từ chối", value: "rejected" },
                                    { label: "Bị chặn", value: "blocked" },
                                ]}
                                value={statusTab}
                                onChange={setStatusTab}
                                style={{
                                    padding: 5,
                                    background: "#f8fafc",
                                    borderRadius: 12,
                                    boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
                                }}
                            />
                        </Col>
                    </Row>
                </Card>

                {/* TABLE */}
                <Card
                    style={{ borderRadius: 18, boxShadow: "0 8px 25px rgba(0,0,0,0.04)" }}
                    bodyStyle={{ padding: 20 }}
                >
                    {/* SEARCH */}
                    <Row justify="space-between" style={{ marginBottom: 18 }}>
                        <Col>
                            <Input
                                allowClear
                                placeholder="Tìm theo tên / thành phố / email chủ nhà..."
                                value={q}
                                onChange={(e) => setQ(e.target.value)}
                                onPressEnter={fetchList}
                                prefix={<SearchOutlined />}
                                style={{
                                    width: 380,
                                    borderRadius: 12,
                                    padding: "6px 12px",
                                    boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                                }}
                            />
                        </Col>
                        <Col>
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={fetchList}
                                style={{
                                    borderRadius: 10,
                                    paddingInline: 16,
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                                }}
                            >
                                Làm mới
                            </Button>
                        </Col>
                    </Row>

                    <Table
                        rowKey={(r) => r.H_ID ?? r.id}
                        columns={columns}
                        loading={loading}
                        dataSource={rows}
                        pagination={{ pageSize: 10 }}
                        locale={{ emptyText: <Empty description="Chưa có homestay nào" /> }}
                        style={{
                            borderRadius: 12,
                        }}
                    />
                </Card>

            </Layout.Content>
        </Layout>
    );
}
