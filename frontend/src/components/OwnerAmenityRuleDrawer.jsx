// src/components/OwnerAmenityRuleDrawer.jsx
import React from "react";
import {
    Drawer, Tabs, Checkbox, Space, Button, message, Tag,
    Input, List, Empty
} from "antd";
import { amenityApi } from "../services/amenities";
import { ruleApi } from "../services/rules";
import { CheckOutlined, PlusOutlined, DeleteOutlined } from "@ant-design/icons";

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

export default function OwnerAmenityRuleDrawer({ open, onClose, homestay, onSaved }) {
    const H_ID = homestay?.H_ID;
    const [loading, setLoading] = React.useState(false);

    // Amenities
    const [amenMaster, setAmenMaster] = React.useState([]);        // danh mục chuẩn
    const [amenChecked, setAmenChecked] = React.useState([]);       // master đã tick

    const [customAmenInput, setCustomAmenInput] = React.useState("");
    const [customAmenities, setCustomAmenities] = React.useState([]); // custom amenities

    // Rules
    const [ruleMaster, setRuleMaster] = React.useState([]);
    const [ruleChecked, setRuleChecked] = React.useState([]);
    const [customInput, setCustomInput] = React.useState("");
    const [customList, setCustomList] = React.useState([]);

    // ======================
    // LOAD AMENITIES
    // ======================
    const loadAmenities = async () => {
        try {
            const [mRes, hsRes] = await Promise.allSettled([
                amenityApi.master(),
                H_ID ? amenityApi.getForHomestay(H_ID) : Promise.resolve([]),
            ]);

            // Master amenity list
            if (mRes.status === "fulfilled") {
                setAmenMaster(
                    uniqBy(mRes.value, (x) => (x.Code || x.Name || "").toLowerCase().trim())
                );
            }

            // Amenities assigned to homestay
            if (hsRes.status === "fulfilled" && Array.isArray(hsRes.value)) {
                const masterCodes = new Set(
                    (mRes.value || []).map((x) => x.Code).filter(Boolean)
                );

                const builtIn = [];
                const customs = [];

                hsRes.value.forEach((a) => {
                    if (masterCodes.has(a.Code)) builtIn.push(a.Code); // tiện nghi chuẩn
                    else customs.push(a.Name);                        // tiện nghi tự thêm
                });

                setAmenChecked(uniq(builtIn));
                setCustomAmenities(uniq(customs));
            }
        } catch (e) {
            console.error("[amenities load]", e);
            message.error("Không tải được tiện nghi");
        }
    };

    // ======================
    // LOAD RULES
    // ======================
    const loadRules = async () => {
        try {
            const [mRes, hsRes] = await Promise.allSettled([
                ruleApi.master(),
                H_ID ? ruleApi.getForHomestay(H_ID) : Promise.resolve([]),
            ]);

            if (mRes.status === "fulfilled") {
                setRuleMaster(
                    uniqBy(mRes.value, (x) => (x.Code ? x.Code : (x.Name || "").toLowerCase().trim()))
                );
            }

            if (hsRes.status === "fulfilled" && Array.isArray(hsRes.value)) {
                const codes = uniq(hsRes.value.filter(x => x.isMaster && x.code).map(x => x.code));
                const customs = uniq(
                    hsRes.value.filter(x => !x.isMaster).map(x => (x.name || "").trim()).filter(Boolean)
                );
                setRuleChecked(codes);
                setCustomList(customs);
            }
        } catch (e) {
            console.error("[rules load]", e);
            message.error("Không tải được nội quy");
        }
    };

    const loadAll = async () => {
        if (!open) return;
        setLoading(true);
        await Promise.all([loadAmenities(), loadRules()]);
        setLoading(false);
    };

    React.useEffect(() => { loadAll(); }, [open, H_ID]);

    // ======================
    // SAVE AMENITIES (API mới)
    // ======================
    const saveAmen = async () => {
        if (!H_ID) return message.warning("Chưa xác định homestay.");

        // MẢNG TÊN TIỆN NGHI
        // Master amenities = amenChecked → cần map code → name
        const masterSelectedNames = amenMaster
            .filter((a) => amenChecked.includes(a.Code))
            .map((a) => a.Name);

        const finalAmenities = uniq([
            ...masterSelectedNames,
            ...customAmenities
        ]).filter(Boolean);

        if (!finalAmenities.length)
            return message.warning("Chọn hoặc thêm ít nhất 1 tiện nghi.");

        try {
            setLoading(true);
            await amenityApi.setForHomestay(H_ID, finalAmenities);
            message.success("Đã lưu tiện nghi");
            onSaved?.();
            onClose?.();
        } catch (e) {
            console.error("[saveAmen error]", e);
            const st = e?.response?.status;
            const msg = e?.response?.data?.message ||
                (st === 401 ? "Bạn chưa đăng nhập."
                    : st === 403 ? "Không có quyền."
                        : "Lưu tiện nghi thất bại");
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // SAVE RULES (không thay đổi vì backend rule bạn chưa đổi)
    // =====================================================
    const saveRules = async () => {
        if (!H_ID) return message.warning("Chưa xác định homestay.");
        try {
            setLoading(true);
            await ruleApi.setForHomestay(H_ID, {
                codes: uniq(ruleChecked),
                customs: uniq(customList.map(t => (t || "").trim()).filter(Boolean)),
            });
            message.success("Đã lưu nội quy");
            onSaved?.();
            onClose?.();
        } catch (e) {
            console.error("[saveRules error]", e);
            const st = e?.response?.status;
            const msg =
                e?.response?.data?.message ||
                (st === 401 ? "Bạn chưa đăng nhập."
                    : st === 403 ? "Không có quyền."
                        : "Lưu nội quy thất bại");
            message.error(msg);
        } finally {
            setLoading(false);
        }
    };

    // ======================
    // CUSTOM HANDLERS
    // ======================
    const addCustomAmen = () => {
        const v = (customAmenInput || "").trim();
        if (!v) return;
        setCustomAmenities(s => (s.includes(v) ? s : [...s, v]));
        setCustomAmenInput("");
    };
    const removeCustomAmen = (text) =>
        setCustomAmenities(s => s.filter(x => x !== text));

    const addCustom = () => {
        const v = (customInput || "").trim();
        if (!v) return;
        setCustomList(s => (s.includes(v) ? s : [...s, v]));
        setCustomInput("");
    };
    const removeCustom = (text) => setCustomList(s => s.filter(x => x !== text));

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
                                {/* BUILT-IN AMENITIES */}
                                <div style={{ fontWeight: 600, marginBottom: 8 }}>Từ danh mục có sẵn</div>
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

                                {/* CUSTOM AMENITIES */}
                                <div style={{ margin: "16px 0 8px", fontWeight: 600 }}>Tiện nghi tuỳ chỉnh</div>
                                <Space.Compact style={{ width: "100%", marginBottom: 8 }}>
                                    <Input
                                        placeholder="Nhập tiện nghi tuỳ chỉnh…"
                                        value={customAmenInput}
                                        onChange={(e) => setCustomAmenInput(e.target.value)}
                                        onPressEnter={addCustomAmen}
                                    />
                                    <Button type="primary" icon={<PlusOutlined />} onClick={addCustomAmen}>
                                        Thêm
                                    </Button>
                                </Space.Compact>

                                <List
                                    size="small"
                                    dataSource={customAmenities}
                                    locale={{ emptyText: "Chưa có tiện nghi tuỳ chỉnh" }}
                                    renderItem={(item) => (
                                        <List.Item
                                            actions={[
                                                <Button
                                                    key="del"
                                                    size="small"
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => removeCustomAmen(item)}
                                                />,
                                            ]}
                                        >
                                            <Tag style={{ margin: 0 }}>{item}</Tag>
                                        </List.Item>
                                    )}
                                />

                                <div style={{ marginTop: 12 }}>
                                    <Button type="primary" icon={<CheckOutlined />} loading={loading} onClick={saveAmen}>
                                        Lưu tiện nghi
                                    </Button>
                                </div>
                            </>
                        ),
                    },

                    // =============================
                    // RULE TAB – GIỮ NGUYÊN
                    // =============================
                    {
                        key: "rules",
                        label: "Nội quy",
                        children: (
                            <>
                                <div style={{ marginBottom: 8, fontWeight: 600 }}>Từ danh mục có sẵn</div>
                                <Checkbox.Group
                                    value={ruleChecked}
                                    onChange={(v) => setRuleChecked(uniq(v))}
                                    style={{ width: "100%" }}
                                >
                                    <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                        {ruleMaster?.length ? (
                                            ruleMaster.map((r) => (
                                                <Checkbox key={r.Code || r.Name} value={r.Code}>
                                                    {r.Name}
                                                </Checkbox>
                                            ))
                                        ) : (
                                            <Empty description="Chưa có danh mục nội quy" />
                                        )}
                                    </Space>
                                </Checkbox.Group>

                                {/* CUSTOM RULES */}
                                <div style={{ margin: "16px 0 8px", fontWeight: 600 }}>Nội quy tuỳ chỉnh</div>
                                <Space.Compact style={{ width: "100%", marginBottom: 8 }}>
                                    <Input
                                        value={customInput}
                                        onChange={(e) => setCustomInput(e.target.value)}
                                        placeholder="Nhập nội quy tuỳ chỉnh…"
                                        onPressEnter={addCustom}
                                    />
                                    <Button type="primary" icon={<PlusOutlined />} onClick={addCustom}>
                                        Thêm
                                    </Button>
                                </Space.Compact>

                                <List
                                    size="small"
                                    dataSource={customList}
                                    locale={{ emptyText: "Chưa có nội quy tuỳ chỉnh" }}
                                    renderItem={(item) => (
                                        <List.Item
                                            actions={[
                                                <Button
                                                    key="del"
                                                    size="small"
                                                    type="text"
                                                    danger
                                                    icon={<DeleteOutlined />}
                                                    onClick={() => removeCustom(item)}
                                                />,
                                            ]}
                                        >
                                            <Tag style={{ margin: 0 }}>{item}</Tag>
                                        </List.Item>
                                    )}
                                />

                                <div style={{ marginTop: 12 }}>
                                    <Button type="primary" icon={<CheckOutlined />} loading={loading} onClick={saveRules}>
                                        Lưu nội quy
                                    </Button>
                                </div>
                            </>
                        ),
                    },
                ]}
            />
        </Drawer>
    );
}
