import imaplib
import email
from email.header import decode_header
import os
import re
import threading
from datetime import datetime
from typing import Dict, Any, List, Optional
from .db import get_db
from .parser import parse_superu_ticket, parse_html_email, extract_text_from_pdf

SYNC_STATE = {
    "is_running": False,
    "progress_percent": 0,
    "current_step": "idle",
    "emails_found": 0,
    "tickets_imported": 0,
    "duplicates_skipped": 0,
    "error": None,
    "last_sync_time": None
}

def decode_mime_words(s: str) -> str:
    """Safely decode email header."""
    if not s:
        return ""
    decoded_fragments = decode_header(s)
    result = []
    for frag, enc in decoded_fragments:
        if isinstance(frag, bytes):
            result.append(frag.decode(enc or "utf-8", errors="replace"))
        else:
            result.append(str(frag))
    return "".join(result)

def test_imap_connection(user: str, password: str, server: str = "imap.gmail.com", port: int = 993) -> Dict[str, Any]:
    """Test connection and authentication to IMAP server."""
    clean_pass = password.replace(" ", "").strip()
    try:
        mail = imaplib.IMAP4_SSL(server, port)
        mail.login(user.strip(), clean_pass)
        status, _ = mail.select("INBOX", readonly=True)
        mail.logout()
        return {"success": True, "message": "Connexion IMAP Gmail réussie !"}
    except imaplib.IMAP4.error as e:
        return {"success": False, "message": f"Erreur d'authentification IMAP : {str(e)}. Vérifiez votre mot de passe d'application Google."}
    except Exception as e:
        return {"success": False, "message": f"Erreur de connexion : {str(e)}"}

def run_imap_sync(user: str, password: str, server: str = "imap.gmail.com", port: int = 993, search_query: str = ""):
    """
    Executes sync against Gmail IMAP.
    Specifically searches for emails with subject: 'Votre ticket de caisse pour votre achat'
    and extracts ONLY the 'Ticket de caisse' attachment, completely ignoring CB receipts.
    """
    global SYNC_STATE
    clean_pass = password.replace(" ", "").strip()
    user = user.strip()

    SYNC_STATE["is_running"] = True
    SYNC_STATE["progress_percent"] = 5
    SYNC_STATE["current_step"] = "Connexion à Gmail..."
    SYNC_STATE["emails_found"] = 0
    SYNC_STATE["tickets_imported"] = 0
    SYNC_STATE["duplicates_skipped"] = 0
    SYNC_STATE["error"] = None

    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    conn = get_db()
    cursor = conn.cursor()

    # Record log entry
    cursor.execute("INSERT INTO sync_logs (status) VALUES ('running')")
    log_id = cursor.lastrowid
    conn.commit()

    try:
        mail = imaplib.IMAP4_SSL(server, port)
        mail.login(user, clean_pass)
        
        status, _ = mail.select("INBOX", readonly=True)
        
        SYNC_STATE["progress_percent"] = 10
        SYNC_STATE["current_step"] = "Recherche des e-mails 'Votre ticket de caisse pour votre achat'..."

        # IMAP search: Search for subject containing "ticket de caisse"
        # We will then strictly filter in Python for "votre ticket de caisse pour votre achat"
        ret, data = mail.search(None, 'SUBJECT', '"ticket de caisse"')
        
        candidate_uids = []
        if ret == "OK" and data and data[0]:
            candidate_uids = data[0].split()

        total_candidates = len(candidate_uids)
        if total_candidates == 0:
            SYNC_STATE["progress_percent"] = 100
            SYNC_STATE["current_step"] = "Aucun email de ticket de caisse trouvé."
            SYNC_STATE["is_running"] = False
            mail.logout()
            return

        SYNC_STATE["progress_percent"] = 15
        SYNC_STATE["current_step"] = f"Filtrage des emails ({total_candidates} trouvés)..."

        # The user's exact subject requirement
        required_phrase = "votre ticket de caisse pour votre achat"

        matching_uids = []
        for uid in candidate_uids:
            try:
                r, d = mail.fetch(uid, '(BODY[HEADER.FIELDS (SUBJECT)])')
                if r == "OK" and d and d[0] and len(d[0]) > 1:
                    raw_subj = email.message_from_bytes(d[0][1]).get("Subject", "")
                    subj_str = decode_mime_words(raw_subj).lower()
                    if required_phrase in subj_str:
                        matching_uids.append(uid)
            except Exception:
                pass

        total_matching = len(matching_uids)
        SYNC_STATE["emails_found"] = total_matching
        SYNC_STATE["current_step"] = f"{total_matching} tickets de caisse Super U identifiés. Analyse en cours..."

        if total_matching == 0:
            SYNC_STATE["progress_percent"] = 100
            SYNC_STATE["current_step"] = f"Aucun e-mail avec l'intitulé exact '{required_phrase}'."
            SYNC_STATE["is_running"] = False
            mail.logout()
            return

        for idx, num in enumerate(matching_uids):
            SYNC_STATE["progress_percent"] = int(20 + (idx / total_matching) * 75)
            SYNC_STATE["current_step"] = f"Traitement du ticket {idx + 1}/{total_matching}..."

            try:
                res, msg_data = mail.fetch(num, '(RFC822)')
                if res != "OK":
                    continue

                raw_email = msg_data[0][1]
                msg = email.message_from_bytes(raw_email)

                # Look for attachments:
                # IMPORTANT: User specifies: "Les mails contiennent le ticket de caisse et le reçu de carte bleue. On ne s'intéressera qu'au ticket de caisse."
                caisse_pdf_path = None
                caisse_filename = None

                fallback_pdf_path = None
                fallback_filename = None

                if msg.is_multipart():
                    for part in msg.walk():
                        fn = part.get_filename()
                        if not fn:
                            continue
                        decoded_fn = decode_mime_words(fn)
                        fn_lower = decoded_fn.lower()

                        # 1. EXCLUDE CB RECEIPT (Reçu de carte bleue / CB)
                        if any(cb_tag in fn_lower for cb_tag in ["ticket de cb", "_cb_", "recu_cb", "carte bleue", "carte bancaire"]):
                            continue

                        # 2. MATCH TICKET DE CAISSE
                        if fn_lower.endswith(".pdf"):
                            pdf_bytes = part.get_payload(decode=True)
                            if pdf_bytes:
                                safe_fn = f"ticket_{num.decode()}_{decoded_fn.replace('/', '_').replace(' ', '_')}"
                                pdf_path = os.path.join(uploads_dir, safe_fn)
                                with open(pdf_path, "wb") as f:
                                    f.write(pdf_bytes)

                                if "caisse" in fn_lower:
                                    caisse_pdf_path = pdf_path
                                    caisse_filename = safe_fn
                                    break
                                else:
                                    fallback_pdf_path = pdf_path
                                    fallback_filename = safe_fn

                target_pdf = caisse_pdf_path or fallback_pdf_path
                target_fn = caisse_filename or fallback_filename

                if not target_pdf:
                    continue

                # Extract text and parse
                pdf_text = extract_text_from_pdf(target_pdf)
                parsed_ticket = parse_superu_ticket(pdf_text, source_type="gmail_imap", source_filename=target_fn)

                if not parsed_ticket or parsed_ticket["total_amount"] <= 0 or not parsed_ticket["items"]:
                    continue

                # Check for duplicate in DB
                cursor.execute("""
                    SELECT id FROM tickets 
                    WHERE (store_name = ? AND date = ? AND total_amount = ?)
                       OR (ticket_number = ? AND ticket_number NOT LIKE 'T-%' AND date = ?)
                """, (
                    parsed_ticket["store_name"],
                    parsed_ticket["date"],
                    parsed_ticket["total_amount"],
                    parsed_ticket["ticket_number"],
                    parsed_ticket["date"]
                ))
                existing = cursor.fetchone()

                if existing:
                    SYNC_STATE["duplicates_skipped"] += 1
                    continue

                # Insert ticket
                cursor.execute("""
                INSERT INTO tickets (
                    store_name, store_city, ticket_number, caisse_number, date,
                    total_amount, discounts_total, loyalty_earned, loyalty_balance,
                    items_count, payment_method, raw_text, source_type, source_filename
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    parsed_ticket["store_name"],
                    parsed_ticket["store_city"],
                    parsed_ticket["ticket_number"],
                    parsed_ticket["caisse_number"],
                    parsed_ticket["date"],
                    parsed_ticket["total_amount"],
                    parsed_ticket["discounts_total"],
                    parsed_ticket["loyalty_earned"],
                    parsed_ticket["loyalty_balance"],
                    parsed_ticket["items_count"],
                    parsed_ticket["payment_method"],
                    parsed_ticket["raw_text"],
                    parsed_ticket["source_type"],
                    parsed_ticket["source_filename"]
                ))
                t_id = cursor.lastrowid

                # Insert items
                for it in parsed_ticket["items"]:
                    cursor.execute("""
                    INSERT INTO ticket_items (
                        ticket_id, line_number, raw_name, clean_name, category,
                        quantity, unit_price, total_price, discount, unit_measure, date
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    """, (
                        t_id,
                        it["line_number"],
                        it["raw_name"],
                        it["clean_name"],
                        it["category"],
                        it["quantity"],
                        it["unit_price"],
                        it["total_price"],
                        it["discount"],
                        it["unit_measure"],
                        it["date"]
                    ))

                conn.commit()
                SYNC_STATE["tickets_imported"] += 1

            except Exception as e:
                print(f"Erreur traitement email {num}: {e}")

        mail.logout()
        
        # Complete
        finish_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        SYNC_STATE["progress_percent"] = 100
        SYNC_STATE["current_step"] = f"Synchronisation terminée : {SYNC_STATE['tickets_imported']} tickets de caisse importés avec succès ({SYNC_STATE['duplicates_skipped']} déjà présents)."
        SYNC_STATE["last_sync_time"] = finish_time
        SYNC_STATE["is_running"] = False

        # Update logs
        cursor.execute("""
        UPDATE sync_logs 
        SET finished_at = ?, status = 'success', emails_found = ?, tickets_imported = ?, duplicates_skipped = ?
        WHERE id = ?
        """, (finish_time, SYNC_STATE["emails_found"], SYNC_STATE["tickets_imported"], SYNC_STATE["duplicates_skipped"], log_id))
        
        cursor.execute("""
        UPDATE sync_config
        SET last_sync_time = ?, last_sync_status = 'success', last_sync_message = ?
        WHERE id = 1
        """, (finish_time, SYNC_STATE["current_step"]))
        conn.commit()

    except Exception as e:
        err_msg = str(e)
        SYNC_STATE["is_running"] = False
        SYNC_STATE["error"] = err_msg
        SYNC_STATE["current_step"] = f"Échec de la synchronisation : {err_msg}"
        cursor.execute("UPDATE sync_logs SET finished_at = CURRENT_TIMESTAMP, status = 'error', error_message = ? WHERE id = ?", (err_msg, log_id))
        cursor.execute("UPDATE sync_config SET last_sync_status = 'error', last_sync_message = ? WHERE id = 1", (err_msg,))
        conn.commit()
    finally:
        conn.close()

def start_background_sync(user: str, password: str, server: str = "imap.gmail.com", port: int = 993, search_query: str = ""):
    """Launches sync thread if not already running."""
    global SYNC_STATE
    if SYNC_STATE["is_running"]:
        return False
    t = threading.Thread(target=run_imap_sync, args=(user, password, server, port, search_query), daemon=True)
    t.start()
    return True
