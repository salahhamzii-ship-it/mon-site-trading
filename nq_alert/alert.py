"""
NQ Alert — Méthode Salah — Session OVN 30 Min
Surveille le CSV Sierra Chart et alerte quand close > SD+1 ou < SD-1
"""

import json
import os
import sys
import time
import logging
import platform
from datetime import datetime, date

import pandas as pd
import pytz

# ── Config ───────────────────────────────────────────────────────────────────

CONFIG_FILE = os.path.join(os.path.dirname(__file__), "config.json")

def load_config():
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

# ── Logging ──────────────────────────────────────────────────────────────────

LOG_FILE = os.path.join(os.path.dirname(__file__), "alerts_log.txt")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(message)s",
    datefmt="%Y-%m-%d %H:%M",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("nq_alert")

# ── Fenêtre OVN ──────────────────────────────────────────────────────────────

NY_TZ = pytz.timezone("America/New_York")

def is_ovn_window(dt_ny: datetime, cfg: dict) -> bool:
    h, m = dt_ny.hour, dt_ny.minute
    end_h = cfg.get("session_end_hour", 5)
    end_m = cfg.get("session_end_minute", 30)
    start_h = cfg.get("session_start_hour", 18)
    if h >= start_h:
        return True
    if h < end_h:
        return True
    if h == end_h and m <= end_m:
        return True
    return False

def get_window_label(h: int) -> tuple[str, str]:
    if 18 <= h < 20:
        return "18H-20H", "HAUTE  (SHORT 79.3% / LONG 76.9%)"
    if 20 <= h or h < 2:
        return "20H-02H", "MOYENNE (SHORT 59.1% / LONG 52.2%)"
    return "02H-06H", "BASSE  ⚠️"

# ── Lecture CSV Sierra Chart ──────────────────────────────────────────────────

def read_last_complete_candle(csv_path: str, cfg: dict) -> pd.Series | None:
    """
    Lit le CSV Sierra Chart et retourne l'avant-dernière ligne
    (la dernière bougie COMPLÈTE — la dernière est en cours).
    """
    try:
        df = pd.read_csv(csv_path, header=0, dtype=str, low_memory=False)
    except FileNotFoundError:
        log.error(f"CSV introuvable : {csv_path}")
        return None
    except Exception as e:
        log.error(f"Erreur lecture CSV : {e}")
        return None

    if len(df) < 2:
        log.warning("CSV trop court (< 2 lignes)")
        return None

    # Avant-dernière ligne = dernière bougie complète
    return df.iloc[-2]

def parse_row(row: pd.Series, cfg: dict) -> dict | None:
    """Extrait et valide les valeurs de la ligne."""
    try:
        cols = row.index.tolist()

        def gcol(idx):
            if idx < len(cols):
                try:
                    v = float(str(row.iloc[idx]).replace(",", ".").strip())
                    return v if v != 0.0 else None
                except Exception:
                    return None
            return None

        last  = gcol(cfg["last_col"])
        sd1   = gcol(cfg["sd1_col"])
        sdm1  = gcol(cfg["sd_minus1_col"])
        sd2   = gcol(cfg["sd2_col"])
        sdm2  = gcol(cfg["sd_minus2_col"])
        vwap  = gcol(cfg["vwap_col"])

        date_str = str(row.iloc[0]).strip()
        time_str = str(row.iloc[1]).strip()

        # Parse datetime → NY
        dt_raw = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
        dt_ny  = NY_TZ.localize(dt_raw)

        return {
            "dt_ny": dt_ny,
            "candle_key": f"{date_str} {time_str}",
            "last": last,
            "sd1":  sd1,
            "sdm1": sdm1,
            "sd2":  sd2,
            "sdm2": sdm2,
            "vwap": vwap,
        }
    except Exception as e:
        log.warning(f"Erreur parsing ligne : {e}")
        return None

# ── Alertes ──────────────────────────────────────────────────────────────────

def send_sound():
    """Sirène infinie — s'arrête UNIQUEMENT quand l'utilisateur appuie sur une touche."""
    try:
        if platform.system() == "Windows":
            import winsound
            import msvcrt  # module Windows intégré, aucune installation requise

            wav = os.path.join(os.path.dirname(__file__), "siren.wav")

            print("\n" + "!"*60)
            print("  *** ALARME NQ ACTIVE ***")
            print("  Appuyez sur n'importe quelle touche pour arrêter")
            print("!"*60 + "\n", flush=True)

            while not msvcrt.kbhit():
                if os.path.isfile(wav):
                    winsound.PlaySound(wav, winsound.SND_FILENAME)
                else:
                    winsound.Beep(1200, 600)
                    winsound.Beep(800,  400)

            msvcrt.getch()  # consomme la touche
            winsound.PlaySound(None, winsound.SND_PURGE)  # coupe le son
            print("Alarme arrêtée.\n", flush=True)
        else:
            print("\a", end="", flush=True)
    except Exception as e:
        log.warning(f"Son : {e}")

def send_desktop(title: str, message: str):
    try:
        from plyer import notification
        notification.notify(
            title=title,
            message=message,
            app_name="NQ Alert",
            timeout=15,
        )
    except Exception as e:
        log.warning(f"Notification desktop : {e}")

def send_telegram(token: str, chat_id: str, text: str):
    try:
        import urllib.request
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        data = json.dumps({"chat_id": chat_id, "text": text}).encode()
        req = urllib.request.Request(url, data=data,
                                     headers={"Content-Type": "application/json"})
        urllib.request.urlopen(req, timeout=10)
        log.info("Telegram envoyé")
    except Exception as e:
        log.warning(f"Telegram : {e}")

def send_sms_twilio(cfg: dict, text: str):
    try:
        from twilio.rest import Client
        client = Client(cfg["twilio_sid"], cfg["twilio_token"])
        client.messages.create(body=text, from_=cfg["twilio_from"], to=cfg["twilio_to"])
        log.info("SMS Twilio envoyé")
    except Exception as e:
        log.warning(f"Twilio : {e}")

def send_email(cfg: dict, subject: str, body: str):
    try:
        import smtplib
        from email.mime.text import MIMEText
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"]    = cfg["smtp_user"]
        msg["To"]      = cfg["smtp_to"]
        with smtplib.SMTP(cfg["smtp_host"], cfg["smtp_port"]) as s:
            s.starttls()
            s.login(cfg["smtp_user"], cfg["smtp_pass"])
            s.sendmail(cfg["smtp_user"], [cfg["smtp_to"]], msg.as_string())
        log.info("Email envoyé")
    except Exception as e:
        log.warning(f"Email : {e}")

def dispatch_alert(title: str, body: str, cfg: dict):
    methods = cfg.get("alert_methods", ["sound", "desktop"])
    if "sound" in methods:
        send_sound()
    if "desktop" in methods:
        send_desktop(title, body)
    if "telegram" in methods and cfg.get("telegram_token"):
        send_telegram(cfg["telegram_token"], cfg["telegram_chat_id"],
                      f"{title}\n{body}")
    if "twilio" in methods and cfg.get("twilio_sid"):
        send_sms_twilio(cfg, f"{title}\n{body}")
    if "email" in methods and cfg.get("smtp_host"):
        send_email(cfg, title, body)

# ── Détection signal ─────────────────────────────────────────────────────────

def check_signal(data: dict) -> str | None:
    """Retourne 'SHORT', 'LONG' ou None."""
    last, sd1, sdm1 = data["last"], data["sd1"], data["sdm1"]
    if last is None:
        return None
    if sd1 is not None and last > sd1:
        return "SHORT"
    if sdm1 is not None and last < sdm1:
        return "LONG"
    return None

def format_alert(signal: str, data: dict) -> tuple[str, str]:
    dt    = data["dt_ny"]
    last  = data["last"]
    sd1   = data["sd1"]
    sdm1  = data["sdm1"]
    sd2   = data["sd2"]
    sdm2  = data["sdm2"]
    vwap  = data["vwap"]
    win_lbl, win_wr = get_window_label(dt.hour)

    if signal == "SHORT":
        title = f"⚠️ SHORT ALERT NQ — {dt.strftime('%H:%M')}"
        body  = (
            f"Close ({last:.2f}) > SD+1 ({sd1:.2f})\n"
            f"SD+2 cible : {sd2:.2f if sd2 else 'N/A'}\n"
            f"VWAP       : {vwap:.2f if vwap else 'N/A'}\n"
            f"Fenêtre    : {win_lbl} | Priorité : {win_wr}"
        )
    else:
        title = f"⚠️ LONG ALERT NQ — {dt.strftime('%H:%M')}"
        body  = (
            f"Close ({last:.2f}) < SD-1 ({sdm1:.2f})\n"
            f"SD-2 cible : {sdm2:.2f if sdm2 else 'N/A'}\n"
            f"VWAP       : {vwap:.2f if vwap else 'N/A'}\n"
            f"Fenêtre    : {win_lbl} | Priorité : {win_wr}"
        )
    return title, body

# ── Boucle principale ─────────────────────────────────────────────────────────

def main():
    cfg = load_config()
    csv_path      = cfg["csv_path"]
    poll_interval = cfg.get("poll_interval_seconds", 30)

    last_alerted_candle = None
    cycle = 0

    print(f"\n{'='*60}")
    print(f"  NQ ALERT — Méthode Salah — Session OVN 30 Min")
    print(f"  CSV : {csv_path}")
    print(f"  Poll : {poll_interval}s | TZ : America/New_York")
    print(f"{'='*60}\n")

    while True:
        cycle += 1
        now_ny = datetime.now(NY_TZ)

        row = read_last_complete_candle(csv_path, cfg)
        if row is None:
            time.sleep(poll_interval)
            continue

        data = parse_row(row, cfg)
        if data is None:
            time.sleep(poll_interval)
            continue

        candle_key = data["candle_key"]
        last       = data["last"]
        sd1        = data["sd1"]
        sdm1       = data["sdm1"]

        # Affichage console cycle
        print(f"[{now_ny.strftime('%Y-%m-%d %H:%M')}] Cycle #{cycle} | "
              f"Bougie : {candle_key} | Last={last:.2f if last else '?'}")
        if sd1 and sdm1:
            print(f"  → SD-1={sdm1:.2f} | SD+1={sd1:.2f} | "
                  f"SD-2={data['sdm2']:.2f if data['sdm2'] else '?'} | "
                  f"SD+2={data['sd2']:.2f if data['sd2'] else '?'}")

        if not is_ovn_window(data["dt_ny"], cfg):
            print(f"  → Hors fenêtre OVN — pas d'alerte\n")
            time.sleep(poll_interval)
            continue

        if candle_key == last_alerted_candle:
            print(f"  → Même bougie que dernière alerte — pas de re-alerte\n")
            time.sleep(poll_interval)
            continue

        signal = check_signal(data)

        if signal:
            title, body = format_alert(signal, data)
            print(f"\n{'!'*50}")
            print(f"  {title}")
            print(f"  {body.replace(chr(10), chr(10) + '  ')}")
            print(f"{'!'*50}\n")
            log.info(f"ALERTE {signal} | {candle_key} | Last={last:.2f}")
            log.info(body)
            dispatch_alert(title, body, cfg)
            last_alerted_candle = candle_key
        else:
            win_lbl, _ = get_window_label(data["dt_ny"].hour)
            print(f"  → Fenêtre : {win_lbl} | Pas de signal\n")

        time.sleep(poll_interval)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n[STOP] NQ Alert arrêté.")
