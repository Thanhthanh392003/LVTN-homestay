// src/components/OwnerAmenityRuleDrawer.jsx
import React from "react";
import { Drawer, Tabs, Checkbox, Space, Button, message, Empty } from "antd";
import { amenityApi } from "../services/amenities";

const uniq = (arr) => Array.from(new Set(arr));
const uniqBy = (arr, keyFn) => {
    const s = new Set();
    return (arr || []).filter((x) => {
        const k = keyFn(x);
        if (s.has(k)) return false;
        s.add(k);
        return true;
    });
};

export default function OwnerAmenityRuleDrawer({ open, onClose, homestay }) {
    const H_ID = homestay?.H_ID;
    const [loading, setLoading] = React.useState(false);
    const [amenMaster, setAmenMaster] = React.useState([]);
    const [amenChecked, setAmenChecked] = React.useState([]);

    const loadAmenities = async () => {
        try {
            const [mRes, hsRes] = await Promise.allSettled([
                amenityApi.master(),
                H_ID ? amenityApi.getForHomestay(H_ID) : Promise.resolve({}),
            ]);

            if (mRes.status === "fulfilled") {
                setAmenMaster(
                    uniqBy(mRes.value, (x) => (x.Code ? x.Code : (x.Name || "").toLowerCase().trim()))
                );
            } else {
                console.error("[load amen master error]", mRes.reason);
                message.error("Không tải được danh mục tiện nghi");
            }

            if (hsRes.status === "fulfilled" && Array.isArray(hsRes.value)) {
                setAmenChecked(uniq(hsRes.value.map((x) => x.Code).filter(Boolean)));
            } else if (hsRes.status === "rejected") {
                console.warn("[load amen of homestay warn]", hsRes.reason);
                // vẫn cho hiển thị master để chọn
            }
        } catch (e) {
            console.error("[load amenities fatal]", e);
            message.error("Không tải được dữ liệu tiện nghi");
        }
    };

    React.useEffect(() => {
        if (open) loadAmenities();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, H_ID]);

    const saveAmen = async () => {
        if (!H_ID) return message.warning("Chưa xác định homestay.");
        const payload = { codes: uniq(amenChecked) };
        if (!payload.codes.length) {
            return message.warning("Hãy chọn ít nhất 1 tiện nghi trước khi lưu.");
        }
        try {
            setLoading(true);
            await amenityApi.setForHomestay(H_ID, payload);
            message.success("Đã lưu tiện nghi");
        } catch (e) {
            console.error("[saveAmen error]", e);
            const st = e?.response?.status;
            const msg =
                e?.response?.data?.message ||
                (st === 401
                    ? "Bạn chưa đăng nhập."
                    : st === 403
                        ? "Bạn không có quyền cập nhật tiện nghi."
                        : st === 422
                            ? "Danh sách tiện nghi không hợp lệ."
                            : "Lưu tiện nghi thất bại");
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Drawer
            open={open}
            onClose={onClose}
            title={`Tiện nghi & Nội quy — ${homestay?.H_Name || ""}`}
            width={560}
        >
            <Tabs
                defaultActiveKey="amen"
                items={[
                    {
                        key: "amen",
                        label: "Tiện nghi",
                        children: (
                            <>
                                <Checkbox.Group
                                    value={amenChecked}
                                    onChange={(v) => setAmenChecked(uniq(v))}
                                    style={{ width: "100%" }}
                                >
                                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                        {amenMaster?.length ? (
                                            amenMaster.map((a) => (
                                                <Checkbox key={a.Code || a.Name} value={a.Code}>
                                                    {a.Name}
                                                </Checkbox>
                                            ))
                                        ) : (
                                            <Empty description="Chưa có danh mục tiện nghi" />
                                        )}
                                    </Space>
                                </Checkbox.Group>

                                <div style={{ marginTop: 12 }}>
                                    <Button type="primary" loading={loading} onClick={saveAmen}>
                                        Lưu tiện nghi
                                    </Button>
                                </div>
                            </>
                        ),
                    },
                    {
                        key: "rules",
                        label: "Nội quy",
                        children: <Empty description="Chưa cấu hình API nội quy" />,
                    },
                ]}
            />
        </Drawer>
    );
}
