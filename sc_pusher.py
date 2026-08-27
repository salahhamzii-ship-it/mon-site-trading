"""
sc_pusher.py — Sierra Chart → VPS Bridge
Lit les CSV locaux NQ/ES/CL/GC et les envoie via SFTP au VPS toutes les 10s.
Démarre automatiquement via Task Scheduler (voir install_pusher.bat).

CONFIG : modifier les 4 variables en haut du fichier.
"""

import time
import os
import logging
import sys

# ════════════════════════════════════════════════
#  CONFIGURATION — adapter à votre installation
# ════════════════════════════════════════════════

VPS_HOST = "2.29.3.199"
VPS_USER = "root"
VPS_PASS = "VOTRE_MOT_DE_PASSE_ICI"   # ← à remplir
VPS_DIR  = "/root/sierra-bridge/data"

# Chemin local Sierra Chart + nom des fichiers CSV exportés
SC_DATA_DIR = r"C:\SierraChart\Data"

# Mapping : nom VPS → fichier local Sierra Chart
# Adapter les noms de fichiers à votre export Sierra Chart
CSV_MAP = {
    "NQ.csv": "NQU26_FUT_CME.csv",   # ou NQ #F.csv, etc.
    "ES.csv": "ESU26_FUT_CME.csv",
    "CL.csv": "CLV26_FUT_NYMEX.csv",
    "GC.csv": "GCZ26_FUT_COMEX.csv",
}

INTERVAL = 10  # secondes entre chaque envoi

# ════════════════════════════════════════════════
#  CORE
# ════════════════════════════════════════════════

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
    handlers=[
        logging.FileHandler(os.path.join(os.path.dirname(__file__), "pusher.log"), encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ]
)
log = logging.getLogger("pusher")


def connect_sftp():
    import paramiko
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=10)
    sftp = ssh.open_sftp()
    return ssh, sftp


def push_once():
    sent = 0
    missing = []
    for remote_name, local_name in CSV_MAP.items():
        local_path = os.path.join(SC_DATA_DIR, local_name)
        if not os.path.exists(local_path):
            missing.append(local_name)
            continue
        remote_path = f"{VPS_DIR}/{remote_name}"
        try:
            ssh, sftp = connect_sftp()
            sftp.put(local_path, remote_path)
            sftp.close()
            ssh.close()
            sent += 1
        except Exception as e:
            log.warning(f"Erreur envoi {local_name} : {e}")
    if missing:
        log.debug(f"Fichiers non trouvés (normal si marché fermé) : {missing}")
    if sent:
        log.info(f"✓ {sent}/{len(CSV_MAP)} fichiers envoyés → {VPS_HOST}")


def main():
    log.info(f"sc_pusher démarré — envoi vers {VPS_HOST} toutes les {INTERVAL}s")
    log.info(f"Répertoire SC : {SC_DATA_DIR}")

    # Vérification paramiko
    try:
        import paramiko  # noqa
    except ImportError:
        log.error("paramiko manquant — lancez : pip install paramiko")
        sys.exit(1)

    # Vérification dossier SC
    if not os.path.isdir(SC_DATA_DIR):
        log.warning(f"Dossier Sierra Chart introuvable : {SC_DATA_DIR}")
        log.warning("Vérifiez SC_DATA_DIR dans la configuration du script.")

    while True:
        try:
            push_once()
        except Exception as e:
            log.error(f"Erreur inattendue : {e}")
        time.sleep(INTERVAL)


if __name__ == "__main__":
    main()
