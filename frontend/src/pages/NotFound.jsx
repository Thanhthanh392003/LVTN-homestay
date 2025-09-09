import { Result, Button } from "antd";
import { useNavigate } from "react-router-dom";

export default function NotFound() {
    const navigate = useNavigate();
    return (
        <div className="center-page">
            <Result
                status="404"
                title="404"
                subTitle="Trang bạn tìm không tồn tại."
                extra={<Button type="primary" onClick={() => navigate("/")}>Về trang chủ</Button>}
            />
        </div>
    );
}
