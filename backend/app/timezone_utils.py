from datetime import datetime, date, timezone, timedelta

# Vietnam timezone (ICT, UTC+7)
VN_TZ = timezone(timedelta(hours=7))

def get_vn_now():
    """Get current datetime in Vietnam timezone."""
    return datetime.now(VN_TZ)

def get_vn_today():
    """Get current date in Vietnam timezone."""
    return get_vn_now().date()

def get_vn_time():
    """Get current time in Vietnam timezone."""
    return get_vn_now().time()
