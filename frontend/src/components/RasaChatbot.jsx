import React, { useState, useRef, useEffect } from "react";
import { Button, Input, Avatar } from "antd";
import {
    MessageOutlined,
    CloseOutlined,
    SendOutlined,
    RobotOutlined,
    UserOutlined,
} from "@ant-design/icons";
import "./RasaChatbotLuxury.css";

const { TextArea } = Input;

export default function RasaChatbotLuxury({
    userId = "guest",
    endpoint = "http://localhost:5005/webhooks/rest/webhook",
}) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            from: "bot",
            text: "Xin chào 🌿 Tôi là GreenStay Assistant. Tôi có thể hỗ trợ điều gì cho bạn hôm nay?",
        },
    ]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const listRef = useRef(null);

    // Auto scroll mỗi khi có tin nhắn mới hoặc mở khung chat
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTo({
                top: listRef.current.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages, open]);

    const toggleOpen = () => setOpen((o) => !o);

    const appendMessage = (msg) => {
        setMessages((prev) => [...prev, msg]);
    };

    const handleSend = async () => {
        const text = input.trim();
        if (!text || loading) return; // tránh gửi khi đang loading

        // Thêm tin nhắn user
        appendMessage({ from: "user", text });
        setInput("");
        setLoading(true);

        try {
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sender: String(userId || "guest"),
                    message: text,
                }),
            });

            if (!res.ok) {
                appendMessage({
                    from: "bot",
                    text: "Máy chủ trả về lỗi, bạn thử lại sau nhé ⚠️",
                });
                setLoading(false);
                return;
            }

            const data = await res.json();

            // REST webhook của Rasa trả về mảng [{ text, ... }]
            if (Array.isArray(data) && data.length > 0) {
                let hasReply = false;
                data.forEach((item) => {
                    if (item.text) {
                        hasReply = true;
                        appendMessage({ from: "bot", text: item.text });
                    }
                });

                if (!hasReply) {
                    appendMessage({
                        from: "bot",
                        text: "Mình chưa hiểu ý bạn lắm, bạn thử diễn đạt lại nhé 💚",
                    });
                }
            } else {
                appendMessage({
                    from: "bot",
                    text: "Mình chưa hiểu ý bạn lắm, bạn thử diễn đạt lại nhé 💚",
                });
            }
        } catch (e) {
            console.error("Chatbot error:", e);
            appendMessage({
                from: "bot",
                text: "Lỗi kết nối tới máy chủ Rasa. Bạn kiểm tra lại server hoặc thử lại sau nhé ⚠️",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Luxury Button */}
            <div className="lux-launcher" onClick={toggleOpen}>
                <div className="lux-circle">
                    <MessageOutlined style={{ fontSize: 26 }} />
                </div>
            </div>

            {/* Luxury Chatbox */}
            {open && (
                <div className="lux-chatbox">
                    {/* Header */}
                    <div className="lux-header">
                        <div className="lux-header-left">
                            <Avatar
                                size={36}
                                icon={<RobotOutlined />}
                                className="lux-avatar"
                            />
                            <div>
                                <div className="lux-title">GreenStay Assistant</div>
                                <div className="lux-sub">AI Concierge</div>
                            </div>
                        </div>

                        <CloseOutlined className="lux-close" onClick={toggleOpen} />
                    </div>

                    {/* Messages */}
                    <div className="lux-messages" ref={listRef}>
                        {messages.map((m, i) => (
                            <div key={i} className={`lux-msg ${m.from}`}>
                                {m.from === "bot" && (
                                    <Avatar
                                        size={32}
                                        icon={<RobotOutlined />}
                                        className="lux-msg-avatar"
                                    />
                                )}

                                <div className={`lux-bubble ${m.from}`}>{m.text}</div>

                                {m.from === "user" && (
                                    <Avatar
                                        size={32}
                                        icon={<UserOutlined />}
                                        className="lux-msg-avatar user"
                                    />
                                )}
                            </div>
                        ))}

                        {loading && (
                            <div className="lux-typing">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="lux-input">
                        <TextArea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKey}
                            placeholder="Nhập tin nhắn…"
                            autoSize={{ minRows: 1, maxRows: 3 }}
                        />
                        <Button
                            type="primary"
                            className="lux-send"
                            icon={<SendOutlined />}
                            onClick={handleSend}
                            disabled={loading || !input.trim()}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
