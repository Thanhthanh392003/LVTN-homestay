import requests
from typing import Any, Text, Dict, List
from rasa_sdk import Action, Tracker
from rasa_sdk.executor import CollectingDispatcher
from rasa_sdk.events import SlotSet
from datetime import datetime

BASE_URL = "http://localhost:3000/api"

# ====================================================
#                    SAFE HTTP HELPERS
# ====================================================

def safe_get(url, params=None, headers=None):
    try:
        r = requests.get(url, params=params, headers=headers, timeout=10)
        return r.json() if r.status_code in [200, 201] else None
    except Exception as e:
        print("[safe_get ERROR]", e)
        return None

def safe_post(url, payload=None, headers=None):
    try:
        r = requests.post(url, json=payload, headers=headers, timeout=10)
        return r.json() if r.status_code in [200, 201] else None
    except Exception as e:
        print("[safe_post ERROR]", e)
        return None


# ====================================================
#           ACTION: CHECK BOOKING STATUS
# ====================================================

class ActionCheckBookingStatus(Action):
    def name(self):
        return "action_check_booking_status"

    def run(self, dispatcher, tracker, domain):
        booking_id = tracker.get_slot("booking_id")

        if not booking_id:
            dispatcher.utter_message("🌿 Bạn vui lòng gửi mã đơn giúp mình nhé.")
            return []

        url = f"{BASE_URL}/bookings/{booking_id}"
        headers = {"x-bot-secret": "greenstay-ai"}
        data = safe_get(url, headers=headers)

        if not data or data.get("status") != "success":
            dispatcher.utter_message(f"❌ Không tìm thấy đơn `{booking_id}` trên hệ thống.")
            return [SlotSet("booking_id", None)]

        booking = data["data"].get("header", data["data"])

        status_map = {
            "pending": "⏳ Chờ duyệt",
            "pending_payment": "💳 Chờ thanh toán",
            "confirmed": "✔️ Đã xác nhận",
            "paid": "💰 Đã thanh toán",
            "completed": "🏁 Hoàn thành",
            "cancelled": "❌ Đã hủy"
        }

        status_raw = booking.get("Booking_status", "").lower()
        status_vi = status_map.get(status_raw, status_raw)

        msg = (
            "📦 **Trạng thái đơn hàng**\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            f"🧾 Mã đơn: **{booking_id}**\n"
            f"📌 Trạng thái: **{status_vi}**\n"
            "━━━━━━━━━━━━━━━━━━━━"
        )

        dispatcher.utter_message(msg)
        return [SlotSet("booking_id", None)]


# ====================================================
#           ACTION: LIST ACTIVE PROMOTIONS
# ====================================================

class ActionListPromotions(Action):
    def name(self):
        return "action_list_promotions"

    def run(self, dispatcher, tracker, domain):

        data = safe_get(f"{BASE_URL}/promotions", params={"status": "active"})

        if not data or data.get("status") != "success":
            dispatcher.utter_message("Không lấy được danh sách khuyến mãi 😢")
            return []

        promotions = data["data"].get("promotions", [])

        if not promotions:
            dispatcher.utter_message("Hiện GreenStay chưa có khuyến mãi nào đang hoạt động 🌿")
            return []

        msg = "🎁 **Khuyến mãi đang áp dụng**\n\n"

        for p in promotions:
            code = p.get("P_Code")
            name = p.get("P_Name")
            discount = p.get("Discount")
            ptype = p.get("P_Type")
            end_date = p.get("End_date", "Không rõ")

            # Format giảm giá
            if ptype == "percent":
                discount_text = f"Giảm {discount}%"
            else:
                discount_text = f"Giảm {int(discount):,}đ".replace(",", ".")

            # STYLE D – SHopee Flash Deal
            msg += (
                f"🔥 **{code}**\n"
                f"{name}\n"
                f"💸 {discount_text}\n"
                f"⏳ Hạn: {end_date}\n"
                "━━━━━━━━━━━━━━\n\n"
            )

        dispatcher.utter_message(msg)
        return []
# ====================================================
#            ACTION: CHECK PROMO CODE
# ====================================================

class ActionCheckPromo(Action):
    def name(self):
        return "action_check_promo_code"

    def run(self, dispatcher, tracker, domain):
        code = tracker.get_slot("promo_code")

        if not code:
            dispatcher.utter_message("🌿 Bạn nhập mã giảm giá giúp mình nhé.")
            return []

        data = safe_get(f"{BASE_URL}/promotions/validate", params={"code": code})

        if not data or data.get("status") != "success":
            dispatcher.utter_message(
                f"❌ Mã **{code}** không hợp lệ hoặc đã hết hạn."
            )
            return []

        p = data["data"]

        msg = (
            f"🎟 **Mã hợp lệ:** {code}\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            f"🔖 Loại: **{p['P_Type']}**\n"
            f"💸 Giá trị: **{p['Discount']}**\n"
            "━━━━━━━━━━━━━━━━━━━━"
        )

        dispatcher.utter_message(msg)
        return []


# ====================================================
#            ACTION: SEARCH HOMESTAY BASIC
# ====================================================

class ActionSearchHomestay(Action):
    def name(self):
        return "action_search_homestay"

    def run(self, dispatcher, tracker, domain):
        location = tracker.get_slot("location")

        if not location:
            dispatcher.utter_message("Bạn muốn tìm homestay ở đâu ạ?")
            return []

        data = safe_get(f"{BASE_URL}/homestays/search", params={"city": location})

        if not data or data.get("status") != "success" or not data.get("data"):
            dispatcher.utter_message(f"Hiện chưa có homestay nào ở **{location}** 💚")
            return []

        msg = f"✨ **Các homestay tại {location}:**\n\n"

        for h in data["data"][:5]:
            name = h.get("H_Name")
            address = h.get("H_Address")
            city = h.get("H_City")
            price = h.get("Price_per_day") or 0

            # STYLE A — Luxury Card
            msg += (
                "╔══════════════════════════╗\n"
                f"  🏡 **{name}**\n"
                f"  📍 {address}, {city}\n"
                f"  💵 Giá từ: {price:,}đ/đêm\n"
                "╚══════════════════════════╝\n\n"
            )

        dispatcher.utter_message(msg)
        return []


# ====================================================
#          ACTION: SEARCH BY AMENITY
# ====================================================

class ActionSearchByAmenity(Action):
    def name(self):
        return "action_search_homestay_by_amenity"

    def run(self, dispatcher, tracker, domain):
        params = {
            "city": tracker.get_slot("location"),
            "amenity": tracker.get_slot("amenity")
        }

        data = safe_get(f"{BASE_URL}/homestays/search-by-amenity", params=params)

        if not data or not data.get("data"):
            dispatcher.utter_message("Không tìm thấy homestay có tiện ích phù hợp 🌿")
            return []

        msg = "✨ **Homestay có tiện ích bạn cần:**\n\n"

        for h in data["data"][:5]:
            name = h.get("H_Name")
            address = h.get("H_Address")
            city = h.get("H_City")
            price = h.get("Price_per_day") or 0

            # STYLE A — Luxury Card
            msg += (
                "╔══════════════════════════╗\n"
                f"  🏡 **{name}**\n"
                f"  📍 {address}, {city}\n"
                f"  💵 Giá: {price:,}đ/đêm\n"
                "╚══════════════════════════╝\n\n"
            )

        dispatcher.utter_message(msg)
        return []

# ====================================================
#        ACTION: ESTIMATE BOOKING PRICE
# ====================================================

class ActionEstimateBookingPrice(Action):
    def name(self):
        return "action_estimate_booking_price"

    def run(self, dispatcher, tracker, domain):
        payload = {
            "H_ID": tracker.get_slot("hid"),
            "guests": tracker.get_slot("guests"),
            "checkin": tracker.get_slot("checkin"),
            "checkout": tracker.get_slot("checkout"),
            "promo_code": tracker.get_slot("promo_code"),
        }

        data = safe_post(f"{BASE_URL}/bookings/estimate", payload)

        if not data or data.get("status") != "success":
            dispatcher.utter_message(
                "🌿 Không tính được giá, bạn kiểm tra lại giúp mình nhé."
            )
            return []

        p = data["data"]

        msg = (
            "💵 **Ước tính giá:**\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            f"🧾 Giá gốc: **{p['original']:,}đ**\n"
            f"💸 Giảm giá: **{p['discount']:,}đ**\n"
            f"💰 Tổng thanh toán: **{p['final']:,}đ**\n"
            "━━━━━━━━━━━━━━━━━━━━"
        )

        dispatcher.utter_message(msg)
        return []


# ====================================================
#          ACTION: CHECK BOOKING BY CONTACT
# ====================================================

class ActionCheckBookingByContact(Action):
    def name(self):
        return "action_check_booking_by_contact"

    def run(self, dispatcher, tracker, domain):
        params = {
            "phone": tracker.get_slot("phone"),
            "email": tracker.get_slot("email")
        }

        data = safe_get(f"{BASE_URL}/bookings/contact", params=params)

        if not data or not data.get("data"):
            dispatcher.utter_message(
                "🌿 Không tìm thấy đơn nào với thông tin bạn cung cấp."
            )
            return []

        msg = "📦 **Danh sách đơn của bạn:**\n\n"

        for b in data["data"]:
            msg += (
                "━━━━━━━━━━━━━━━━━━━━\n"
                f"🧾 **Mã đơn:** {b['Booking_ID']}\n"
                f"📌 Trạng thái: {b['Status']}\n"
                f"💰 Tổng tiền: {b['Total_price']:,}đ\n"
                "━━━━━━━━━━━━━━━━━━━━\n\n"
            )

        dispatcher.utter_message(msg)
        return []
# ====================================================
#     ACTION: GET FULL BOOKING INFORMATION
# ====================================================

class ActionGetBookingInfo(Action):
    def name(self):
        return "action_get_booking_info"

    def run(self, dispatcher, tracker, domain):
        booking_id = tracker.get_slot("booking_id")

        if not booking_id:
            dispatcher.utter_message("🌿 Bạn vui lòng gửi mã đơn để mình kiểm tra nhé.")
            return []

        url = f"{BASE_URL}/bookings/{booking_id}"
        headers = {"x-bot-secret": "greenstay-ai"}
        data = safe_get(url, headers=headers)

        if not data or data.get("status") != "success":
            dispatcher.utter_message(f"❌ Không tìm thấy đơn `{booking_id}` trên hệ thống.")
            return []

        header = data["data"].get("header")
        details = data["data"].get("details", [])

        if not header:
            dispatcher.utter_message(f"⚠️ Không đọc được thông tin đơn `{booking_id}`.")
            return []

        # ===== Map trạng thái =====
        status_map = {
            "pending": "⏳ Chờ duyệt",
            "pending_payment": "💳 Chờ thanh toán",
            "confirmed": "✔️ Đã xác nhận",
            "paid": "💰 Đã thanh toán",
            "completed": "🏁 Hoàn thành",
            "cancelled": "❌ Đã hủy"
        }

        status_raw = str(header.get("Booking_status", "")).lower().strip()
        status_vi = status_map.get(status_raw, status_raw)

        hs_name = details[0].get("H_Name") if details else "Không rõ"

        # ===== Format ngày =====
        def format_date(d):
            if not d:
                return "Không rõ"
            try:
                dt = datetime.fromisoformat(d.replace("Z", ""))
                return dt.strftime("%d/%m/%Y")
            except:
                return d

        checkin = format_date(details[0].get("Checkin_date") if details else None)
        checkout = format_date(details[0].get("Checkout_date") if details else None)

        total = header.get("Total_price", 0)
        payment = header.get("Payment_method", "Không rõ")

        msg = (
            f"📦 **Thông tin đơn {booking_id}:**\n"
            "━━━━━━━━━━━━━━━━━━━━\n"
            f"🏡 Homestay: **{hs_name}**\n"
            f"📌 Trạng thái: **{status_vi}**\n"
            f"🗓 Nhận phòng: **{checkin}**\n"
            f"🗓 Trả phòng: **{checkout}**\n"
            f"💰 Tổng tiền: **{total:,}đ**\n"
            f"💳 Thanh toán: **{payment}**\n"
            "━━━━━━━━━━━━━━━━━━━━"
        )

        dispatcher.utter_message(msg)
        return []


# ====================================================
#       ACTION: LIST HOMESTAYS USING A PROMO CODE
# ====================================================

class ActionListPromoHomestays(Action):
    def name(self):
        return "action_list_promo_homestays"

    def run(self, dispatcher, tracker, domain):
        promo_code = tracker.get_slot("promo_code")

        if not promo_code:
            dispatcher.utter_message("Bạn cho mình xin mã khuyến mãi nhé 🌿")
            return []

        url = f"{BASE_URL}/promotions/homestays"
        data = safe_get(url, params={"code": promo_code})

        print(">>> DEBUG PROMO API RETURN:", data)

        if (
            data is None
            or not isinstance(data, dict)
            or data.get("status") != "success"
            or "data" not in data
        ):
            dispatcher.utter_message(
                f"Mình không tìm thấy thông tin của mã **{promo_code}**. "
                f"Có thể mã không tồn tại hoặc đã hết hạn 💚"
            )
            return []

        homestays = data["data"].get("homestays", [])

        if not homestays:
            dispatcher.utter_message(
                f"Mã **{promo_code}** hiện chưa được áp dụng cho homestay nào 💚"
            )
            return []

        msg = f"🌿 **Mã {promo_code} được áp dụng tại:**\n\n"

        for h in homestays:
            name = h.get("H_Name")
            address = h.get("H_Address")
            city = h.get("H_City")
            price = h.get("Price_per_day") or 0

            # STYLE A — Luxury Card
            msg += (
                "╔══════════════════════════╗\n"
                f"  🏡 **{name}**\n"
                f"  📍 {address}, {city}\n"
                f"  💵 Giá từ: {price:,}đ/đêm\n"
                "╚══════════════════════════╝\n\n"
            )

        dispatcher.utter_message(msg)
        return []
# ====================================================
#      ACTION: SEARCH HOMESTAY BY PRICE  (NEW)
# ====================================================

class ActionSearchHomestayByPrice(Action):
    def name(self):
        return "action_search_homestay_by_price"

    def run(self, dispatcher, tracker, domain):

        price_min = tracker.get_slot("price_min")
        price_max = tracker.get_slot("price_max")

        # Convert text -> number
        def parse_price(v):
            if not v:
                return None
            v = str(v).lower().replace(".", "").replace(" ", "")
            if "k" in v:
                return int(v.replace("k", "")) * 1000
            if "tr" in v or "triệu" in v:
                return int(v.replace("tr", "").replace("triệu", "")) * 1_000_000
            return int(v)

        min_val = parse_price(price_min)
        max_val = parse_price(price_max)

        params = {
            "min": min_val,
            "max": max_val
        }

        data = safe_get(f"{BASE_URL}/homestays/search-by-price", params=params)

        if not data or data.get("status") != "success":
            dispatcher.utter_message("Mình không tìm được homestay theo mức giá bạn yêu cầu 🌿")
            return []

        homestays = data["data"].get("homestays", [])

        if not homestays:
            dispatcher.utter_message("Không có homestay nào phù hợp mức giá này 💚")
            return []

        # STYLE A — Luxury card
        msg = "✨ **Danh sách homestay phù hợp giá bạn muốn:**\n\n"

        for h in homestays:
            name = h.get("H_Name")
            address = h.get("H_Address")
            city = h.get("H_City")
            price = h.get("Price_per_day") or 0

            msg += (
                "╔══════════════════════════╗\n"
                f"  🏡 **{name}**\n"
                f"  📍 {address}, {city}\n"
                f"  💵 Giá: {price:,}đ/đêm\n"
                "╚══════════════════════════╝\n\n"
            )

        dispatcher.utter_message(msg)
        return []
