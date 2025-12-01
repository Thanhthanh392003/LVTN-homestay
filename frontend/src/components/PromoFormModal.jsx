// src/components/PromoFormModal.jsx
import { useEffect } from "react";
import { Modal, Form, Input, InputNumber, DatePicker, Switch, Radio, Select, Row, Col } from "antd";
import dayjs from "dayjs";
const { RangePicker } = DatePicker;

export default function PromoFormModal({ open, onCancel, onOk, initialValues }) {
    const [form] = Form.useForm();
    const isEdit = !!(
        initialValues?.Promotion_ID ??
        initialValues?.P_ID ??
        initialValues?.id ??
        initialValues?.P_Code
    );

    useEffect(() => {
        if (!open) return;
        const iv = initialValues || {};
        form.resetFields();
        form.setFieldsValue({
            P_Code: iv.P_Code ?? "",
            P_Name: iv.P_Name ?? "",
            P_Type: iv.P_Type ?? "percent",
            Discount: iv.Discount ?? undefined,
            Max_discount: iv.Max_discount ?? undefined,
            Min_order_amount: iv.Min_order_amount ?? undefined,
            Usage_limit_total: iv.Usage_limit_total ?? undefined,
            Usage_limit_per_user: iv.Usage_limit_per_user ?? undefined,
            Is_stackable: !!iv.Is_stackable,
            P_Status: iv.P_Status ?? "active",
            Promotion_Description: iv.Promotion_Description ?? "",
            dateRange:
                iv.Start_date && iv.End_date ? [dayjs(iv.Start_date), dayjs(iv.End_date)] : undefined,
        });
    }, [open, initialValues, form]);

    // theo dõi loại giảm để đổi UI/validate động
    const pType = Form.useWatch("P_Type", form) || "percent";
    const isPercent = pType === "percent";

    const handleValuesChange = (changed, all) => {
        if (Object.prototype.hasOwnProperty.call(changed, "P_Type")) {
            // nếu chuyển sang fixed thì bỏ Max_discount
            if (changed.P_Type === "fixed") form.setFieldsValue({ Max_discount: null });
            // ép Discount về khoảng hợp lệ
            const d = Number(all.Discount ?? 0);
            if (changed.P_Type === "percent") {
                if (d > 100) form.setFieldsValue({ Discount: 100 });
                if (d < 0) form.setFieldsValue({ Discount: 0 });
            } else if (d < 0) {
                form.setFieldsValue({ Discount: 0 });
            }
        }
    };

    return (
        <Modal
            title={isEdit ? "Sửa mã khuyến mãi" : "Tạo mã khuyến mãi"}
            open={open}
            onCancel={onCancel}
            onOk={() => form.submit()}
            okText="Lưu"
            destroyOnClose
            centered
            okButtonProps={{
                style: {
                    background: "linear-gradient(135deg,#16a34a,#22c55e 60%,#0ea5e9)",
                    border: 0,
                    fontWeight: 600,
                },
            }}
        >
            <Form
                form={form}
                layout="vertical"
                onValuesChange={handleValuesChange}
                onFinish={(v) => {
                    const payload = {
                        P_Code: (v.P_Code || initialValues?.P_Code || "").toString().trim().toUpperCase(),
                        P_Name: v.P_Name,
                        P_Type: v.P_Type,
                        Discount: Number(v.Discount),
                        Max_discount: isPercent ? (v.Max_discount ?? null) : null,
                        Min_order_amount: v.Min_order_amount ?? 0,
                        Usage_limit_total: v.Usage_limit_total ?? null,
                        Usage_limit_per_user: v.Usage_limit_per_user ?? null,
                        Is_stackable: v.Is_stackable ? 1 : 0,
                        P_Status: v.P_Status, // "active" | "inactive" | "draft"
                        Promotion_Description: v.Promotion_Description ?? null,
                        Start_date: v.dateRange?.[0]?.format("YYYY-MM-DD"),
                        End_date: v.dateRange?.[1]?.format("YYYY-MM-DD"),
                    };
                    onOk?.(payload);
                }}
            >
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item
                            name="P_Code"
                            label="Mã (code)"
                            rules={
                                isEdit
                                    ? undefined
                                    : [
                                        { required: true, message: "Vui lòng nhập mã" },
                                        { pattern: /^[A-Z0-9_-]+$/, message: "Chỉ dùng A–Z, 0–9, gạch dưới/giữa" },
                                    ]
                            }
                        >
                            <Input placeholder="VD: SUMMER5" disabled={isEdit} />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            name="P_Name"
                            label="Tiêu đề"
                            rules={[{ required: true, message: "Vui lòng nhập tiêu đề" }]}
                        >
                            <Input placeholder="Giảm 5% cho mùa hè" />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item name="P_Type" label="Loại giảm" rules={[{ required: true }]}>
                            <Radio.Group>
                                <Radio value="percent">Phần trăm (%)</Radio>
                                <Radio value="fixed">Cố định (VND)</Radio>
                            </Radio.Group>
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item
                            name="Discount"
                            label="Giá trị giảm"
                            rules={[
                                { required: true, message: "Vui lòng nhập giá trị" },
                                ({ getFieldValue }) => ({
                                    validator(_, value) {
                                        const t = getFieldValue("P_Type");
                                        const n = Number(value);
                                        if (t === "percent") {
                                            if (Number.isNaN(n)) return Promise.reject("Nhập số hợp lệ (0–100)");
                                            if (n < 0 || n > 100) return Promise.reject("Phần trăm phải trong 0–100");
                                        } else {
                                            if (Number.isNaN(n)) return Promise.reject("Nhập số tiền hợp lệ");
                                            if (n < 0) return Promise.reject("Số tiền phải ≥ 0");
                                        }
                                        return Promise.resolve();
                                    },
                                }),
                            ]}
                        >
                            <InputNumber
                                min={0}
                                max={isPercent ? 100 : undefined}
                                style={{ width: "100%" }}
                                placeholder={isPercent ? "VD: 5 (tức 5%)" : "VD: 100000"}
                                addonAfter={isPercent ? "%" : "₫"}
                            />
                        </Form.Item>
                    </Col>

                    {isPercent && (
                        <Col span={12}>
                            <Form.Item name="Max_discount" label="Giảm tối đa (VND)">
                                <InputNumber min={0} style={{ width: "100%" }} placeholder="VD: 100000" />
                            </Form.Item>
                        </Col>
                    )}

                    <Col span={12}>
                        <Form.Item
                            name="dateRange"
                            label="Hiệu lực"
                            rules={[{ required: true, message: "Chọn thời gian hiệu lực" }]}
                        >
                            <RangePicker style={{ width: "100%" }} />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item name="Min_order_amount" label="Đơn tối thiểu (VND)">
                            <InputNumber min={0} style={{ width: "100%" }} placeholder="VD: 800000" />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item name="Usage_limit_total" label="Giới hạn tổng (lượt)">
                            <InputNumber min={0} style={{ width: "100%" }} placeholder="VD: 100" />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item name="Usage_limit_per_user" label="Giới hạn mỗi khách (lượt)">
                            <InputNumber min={0} style={{ width: "100%" }} placeholder="VD: 1" />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item name="P_Status" label="Trạng thái" rules={[{ required: true }]}>
                            <Select
                                options={[
                                    { value: "active", label: "Hoạt động" },
                                    { value: "inactive", label: "Ngưng hoạt động" },
                                    { value: "draft", label: "Nháp" },
                                ]}
                            />
                        </Form.Item>
                    </Col>

                    <Col span={12}>
                        <Form.Item name="Is_stackable" label="Cho phép cộng dồn" valuePropName="checked">
                            <Switch />
                        </Form.Item>
                    </Col>

                    <Col span={24}>
                        <Form.Item name="Promotion_Description" label="Mô tả">
                            <Input.TextArea rows={3} placeholder="Ghi chú nội bộ / Mô tả ngắn cho mã" />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
}
