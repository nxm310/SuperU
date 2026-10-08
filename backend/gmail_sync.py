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
        return {"success": False, "message": f"Erreur d'authentification IMAP : {str(e)}. Vérifiez que vous utilisez bien un 'Mot de passe d'application' Google généré sur https://myaccount.google.com/apppasswords"}
    except Exception as e:
        return {"success": False, "message": f"Erreur de connexion : {str(e)}"}

def run_imap_sync(user: str, password: str, server: str = "imap.gmail.com", port: int = 993, search_query: str = ""):
    """Executes full sync against Gmail IMAP in background."""
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
        
        # Try INBOX first, then [Gmail]/All Mail
        status, _ = mail.select("INBOX", readonly=True)
        
        SYNC_STATE["progress_percent"] = 15
        SYNC_STATE["current_step"] = "Recherche des emails Super U / Courses U..."

        # Search for Super U emails:
        # Common subjects and senders
        search_terms = [
            '(OR FROM "coursesu.com" FROM "systeme-u")',
            '(OR SUBJECT "ticket de caisse" SUBJECT "Courses U")',
            '(OR SUBJECT "e-ticket" SUBJECT "Super U")',
            '(FROM "carte-u.com")'
        ]

        found_uids = set()
        for term in search_terms:
            try:
                ret, data = mail.search(None, term)
                if ret == "OK" and data and data[0]:
                    for num in data[0].split():
                        found_uids.add(num)
            except Exception:
                pass

        uids_list = sorted(list(found_uids))
        total_found = len(uids_list)
        SYNC_STATE["emails_found"] = total_found
        SYNC_STATE["current_step"] = f"{total_found} emails potentiels identifiés. Analyse en cours..."

        if total_found == 0:
            SYNC_STATE["progress_percent"] = 100
            SYNC_STATE["current_step"] = "Aucun email Super U trouvé avec ces critères."
            SYNC_STATE["is_running"] = False
            mail.logout()
            return

        for idx, num in enumerate(uids_list):
            SYNC_STATE["progress_percent"] = int(20 + (idx / total_found) * 75)
            SYNC_STATE["current_step"] = f"Traitement de l'email {idx + 1}/{total_found}..."

            try:
                res, msg_data = mail.fetch(num, '(RFC822)')
                if res != "OK":
                    continue

                raw_email = msg_data[0][1]
                msg = email.message_from_bytes(raw_email)
                subject = decode_mime_words(msg.get("Subject", ""))
                from_header = decode_mime_words(msg.get("From", ""))
                email_date = msg.get("Date", "")

                pdf_attachments = []
                html_body = ""
                plain_body = ""

                # Extract parts
                if msg.is_multipart():
                    for part in msg.walk():
                        content_type = part.get_content_type()
                        content_disposition = str(part.get("Content-Disposition", ""))
                        filename = part.get_filename()
                        if filename:
                            filename = decode_mime_words(filename)

                        if filename and (filename.lower().endswith(".pdf") or "pdf" in content_type.lower()):
                            pdf_data = part.get_payload(decode=True)
                            if pdf_data:
                                safe_fn = f"ticket_{num.decode()}_{filename}"
                                pdf_path = os.path.join(uploads_dir, safe_fn)
                                with open(pdf_path, "wb") as f:
                                    f.write(pdf_data)
                                pdf_attachments.append((pdf_path, safe_fn))
                        elif content_type == "text/html":
                            payload = part.get_payload(decode=True)
                            if payload:
                                html_body = payload.decode(errors="replace")
                        elif content_type == "text/plain":
                            payload = part.get_payload(decode=True)
                            if payload:
                                plain_body = payload.decode(errors="replace")
                else:
                    content_type = msg.get_content_type()
                    payload = msg.get_payload(decode=True)
                    if payload:
                        if content_type == "text/html":
                            html_body = payload.decode(errors="replace")
                        else:
                            plain_body = payload.decode(errors="replace")

                parsed_ticket = None

                # Process PDF attachments if any
                if pdf_attachments:
                    for pdf_path, safe_fn in pdf_attachments:
                        pdf_text = extract_text_from_pdf(pdf_path)
                        if "SUPER U" in pdf_text.upper() or "HYPER U" in pdf_text.upper() or "COURSES U" in pdf_text.upper() or "TOTAL" in pdf_text.upper():
                            parsed_ticket = parse_superu_ticket(pdf_text, source_type="gmail_imap", source_filename=safe_fn)
                            break

                # Otherwise check HTML or plain body
                if not parsed_ticket and html_body:
                    if "COURSES U" in html_body.upper() or "SUPER U" in html_body.upper() or "TICKET" in html_body.upper():
                        parsed_ticket = parse_html_email(html_body, source_filename=f"email_{num.decode()}.html")

                if not parsed_ticket and plain_body:
                    if "COURSES U" in plain_body.upper() or "SUPER U" in plain_body.upper():
                        parsed_ticket = parse_superu_ticket(plain_body, source_type="gmail_imap", source_filename=f"email_{num.decode()}.txt")

                if parsed_ticket and parsed_ticket["total_amount"] > 0:
                    # Check for duplicates in DB
                    cursor.execute("""
                        SELECT id FROM tickets 
                        WHERE (store_name = ? AND date = ? AND total_amount = ?)
                           OR (ticket_number = ? AND ticket_number NOT LIKE 'T-%')
                    """, (parsed_ticket["store_name"], parsed_ticket["date"], parsed_ticket["total_amount"], parsed_ticket["ticket_number"]))
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

                    # Insert line items
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
                print(f"Error processing email {num}: {e}")

        mail.logout()
        
        # Complete
        finish_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        SYNC_STATE["progress_percent"] = 100
        SYNC_STATE["current_step"] = f"Synchronisation terminée : {SYNC_STATE['tickets_imported']} tickets importés, {SYNC_STATE['duplicates_skipped']} déjà présents."
        SYNC_STATE["last_sync_time"] = finish_time
        SYNC_STATE["is_running"] = False

        # Update logs
        cursor.execute("""
        UPDATE sync_logs 
        SET finished_at = ?, status = 'success', emails_found = ?, tickets_imported = ?, duplicates_skipped = ?
        WHERE id = ?
        """, (finish_time, SYNC_STATE["emails_found"], SYNC_STATE["tickets_imported"], SYNC_STATE["duplicates_skipped"], log_id))
        
        # Update sync_config status
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
