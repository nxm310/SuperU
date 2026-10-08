import os
import io
import csv
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from fastapi import FastAPI, UploadFile, File, Form, Query, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from .db import get_db, init_db
from .parser import parse_superu_ticket, parse_html_email, extract_text_from_pdf
from .demo_data import generate_demo_tickets, clear_demo_tickets, clear_all_tickets
from .gmail_sync import (
    SYNC_STATE,
    test_imap_connection,
    start_background_sync
)

app = FastAPI(title="Super U Ticket Manager", version="1.0.0")

# Enable CORS for Vite dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    init_db()

# Models
class IMAPCredentials(BaseModel):
    user: str
    password: str
    server: Optional[str] = "imap.gmail.com"
    port: Optional[int] = 993
    search_query: Optional[str] = 'coursesu OR "Super U" OR "ticket de caisse"'

# --- DASHBOARD STATS ---
@app.get("/api/dashboard/stats")
def get_dashboard_stats(period: str = "all", start_date: Optional[str] = None, end_date: Optional[str] = None):
    conn = get_db()
    cursor = conn.cursor()

    # Determine date range
    now = datetime.now()
    if period == "month":
        # Current month
        start = now.replace(day=1, hour=0, minute=0, second=0).strftime("%Y-%m-%d %H:%M:%S")
        end = now.strftime("%Y-%m-%d %H:%M:%S")
    elif period == "3months":
        start = (now - timedelta(days=90)).strftime("%Y-%m-%d 00:00:00")
        end = now.strftime("%Y-%m-%d %H:%M:%S")
    elif period == "year":
        start = now.replace(month=1, day=1, hour=0, minute=0, second=0).strftime("%Y-%m-%d %H:%M:%S")
        end = now.strftime("%Y-%m-%d %H:%M:%S")
    elif start_date and end_date:
        start = f"{start_date} 00:00:00"
        end = f"{end_date} 23:59:59"
    else:
        start = "1970-01-01 00:00:00"
        end = "2099-12-31 23:59:59"

    # Summary metrics
    cursor.execute("""
        SELECT 
            COUNT(*) as total_tickets,
            COALESCE(SUM(total_amount), 0.0) as total_spent,
            COALESCE(AVG(total_amount), 0.0) as avg_ticket,
            COALESCE(SUM(discounts_total), 0.0) as total_discounts,
            COALESCE(SUM(loyalty_earned), 0.0) as total_loyalty_earned,
            COALESCE(SUM(items_count), 0) as total_items_count
        FROM tickets
        WHERE date >= ? AND date <= ?
    """, (start, end))
    summary_row = cursor.fetchone()

    total_spent = round(summary_row["total_spent"], 2)
    total_tickets = summary_row["total_tickets"]
    avg_ticket = round(summary_row["avg_ticket"], 2)
    total_discounts = round(summary_row["total_discounts"], 2)
    total_loyalty = round(summary_row["total_loyalty_earned"], 2)
    total_items = summary_row["total_items_count"]

    # Monthly spending trend
    cursor.execute("""
        SELECT 
            strftime('%Y-%m', date) as month_key,
            SUM(total_amount) as amount,
            COUNT(*) as tickets_count,
            SUM(discounts_total) as discounts
        FROM tickets
        WHERE date >= ? AND date <= ?
        GROUP BY month_key
        ORDER BY month_key ASC
    """, (start, end))
    monthly_rows = cursor.fetchall()
    monthly_trend = [
        {
            "month": r["month_key"],
            "amount": round(r["amount"], 2),
            "tickets_count": r["tickets_count"],
            "discounts": round(r["discounts"], 2)
        }
        for r in monthly_rows
    ]

    # Category breakdown
    cursor.execute("""
        SELECT 
            category,
            SUM(total_price) as amount,
            COUNT(*) as count
        FROM ticket_items
        WHERE date >= ? AND date <= ?
        GROUP BY category
        ORDER BY amount DESC
    """, (start, end))
    cat_rows = cursor.fetchall()
    categories_breakdown = [
        {
            "category": r["category"],
            "amount": round(r["amount"], 2),
            "count": r["count"],
            "percentage": round((r["amount"] / total_spent * 100), 1) if total_spent > 0 else 0
        }
        for r in cat_rows
    ]

    # Store breakdown
    cursor.execute("""
        SELECT 
            store_name,
            COUNT(*) as visits,
            SUM(total_amount) as total_spent
        FROM tickets
        WHERE date >= ? AND date <= ?
        GROUP BY store_name
        ORDER BY visits DESC
        LIMIT 5
    """, (start, end))
    store_rows = cursor.fetchall()
    stores_summary = [
        {"store_name": r["store_name"], "visits": r["visits"], "spent": round(r["total_spent"], 2)}
        for r in store_rows
    ]

    # Top 5 most spent products
    cursor.execute("""
        SELECT 
            clean_name,
            category,
            SUM(total_price) as total_spent,
            SUM(quantity) as total_quantity,
            AVG(unit_price) as avg_unit_price
        FROM ticket_items
        WHERE date >= ? AND date <= ?
        GROUP BY clean_name
        ORDER BY total_spent DESC
        LIMIT 5
    """, (start, end))
    top_prod_rows = cursor.fetchall()
    top_products = [
        {
            "name": r["clean_name"],
            "category": r["category"],
            "total_spent": round(r["total_spent"], 2),
            "total_quantity": round(r["total_quantity"], 1),
            "avg_unit_price": round(r["avg_unit_price"], 2)
        }
        for r in top_prod_rows
    ]

    conn.close()

    return {
        "period": period,
        "total_spent": total_spent,
        "total_tickets": total_tickets,
        "avg_ticket": avg_ticket,
        "total_discounts": total_discounts,
        "total_loyalty": total_loyalty,
        "total_items": total_items,
        "monthly_trend": monthly_trend,
        "categories_breakdown": categories_breakdown,
        "stores_summary": stores_summary,
        "top_products": top_products
    }

# --- TICKETS ENDPOINTS ---
@app.get("/api/tickets")
def get_tickets(
    search: Optional[str] = None,
    store: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 50,
    offset: int = 0
):
    conn = get_db()
    cursor = conn.cursor()

    query = "SELECT * FROM tickets WHERE 1=1"
    params = []

    if search:
        query += " AND (store_name LIKE ? OR ticket_number LIKE ? OR id IN (SELECT ticket_id FROM ticket_items WHERE raw_name LIKE ? OR clean_name LIKE ?))"
        pattern = f"%{search}%"
        params.extend([pattern, pattern, pattern, pattern])

    if store:
        query += " AND store_name = ?"
        params.append(store)

    if start_date:
        query += " AND date >= ?"
        params.append(f"{start_date} 00:00:00")

    if end_date:
        query += " AND date <= ?"
        params.append(f"{end_date} 23:59:59")

    # Count total
    count_query = query.replace("SELECT *", "SELECT COUNT(*)", 1)
    cursor.execute(count_query, params)
    total_count = cursor.fetchone()[0]

    # Order and paginate
    query += " ORDER BY date DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])

    cursor.execute(query, params)
    tickets = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return {"total": total_count, "tickets": tickets}

@app.get("/api/tickets/{ticket_id}")
def get_ticket_detail(ticket_id: int):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM tickets WHERE id = ?", (ticket_id,))
    ticket = cursor.fetchone()
    if not ticket:
        conn.close()
        raise HTTPException(status_code=404, detail="Ticket not found")

    cursor.execute("SELECT * FROM ticket_items WHERE ticket_id = ? ORDER BY line_number ASC", (ticket_id,))
    items = [dict(row) for row in cursor.fetchall()]

    conn.close()
    ticket_dict = dict(ticket)
    ticket_dict["items"] = items
    return ticket_dict

@app.delete("/api/tickets/{ticket_id}")
def delete_ticket(ticket_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM ticket_items WHERE ticket_id = ?", (ticket_id,))
    cursor.execute("DELETE FROM tickets WHERE id = ?", (ticket_id,))
    conn.commit()
    conn.close()
    return {"status": "deleted", "ticket_id": ticket_id}

@app.post("/api/tickets/upload")
async def upload_ticket_file(files: List[UploadFile] = File(...)):
    """Upload one or more receipt files (.pdf, .eml, .txt, .html)."""
    conn = get_db()
    cursor = conn.cursor()
    imported_count = 0
    errors = []

    uploads_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "uploads")
    os.makedirs(uploads_dir, exist_ok=True)

    for file in files:
        try:
            content = await file.read()
            filename = file.filename
            file_path = os.path.join(uploads_dir, filename)
            with open(file_path, "wb") as f:
                f.write(content)

            parsed_ticket = None
            if filename.lower().endswith(".pdf"):
                text = extract_text_from_pdf(file_path)
                parsed_ticket = parse_superu_ticket(text, source_type="manual_upload", source_filename=filename)
            elif filename.lower().endswith(".html") or filename.lower().endswith(".htm"):
                html_text = content.decode("utf-8", errors="replace")
                parsed_ticket = parse_html_email(html_text, source_filename=filename)
            else:
                raw_text = content.decode("utf-8", errors="replace")
                parsed_ticket = parse_superu_ticket(raw_text, source_type="manual_upload", source_filename=filename)

            if parsed_ticket and parsed_ticket["total_amount"] > 0:
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
                imported_count += 1
            else:
                errors.append(f"{filename}: Aucun montant ou article Super U détecté")
        except Exception as e:
            errors.append(f"{file.filename}: {str(e)}")

    conn.commit()
    conn.close()
    return {"imported": imported_count, "errors": errors}

# --- PRODUCTS & PRICE EVOLUTION ---
@app.get("/api/products")
def get_products(
    search: Optional[str] = None,
    category: Optional[str] = None,
    sort_by: str = "count",
    direction: str = "desc"
):
    conn = get_db()
    cursor = conn.cursor()

    query = """
        SELECT 
            clean_name,
            category,
            COUNT(*) as purchase_count,
            MIN(unit_price) as min_price,
            MAX(unit_price) as max_price,
            AVG(unit_price) as avg_price,
            MAX(date) as last_date,
            MIN(date) as first_date
        FROM ticket_items
        WHERE 1=1
    """
    params = []

    if search:
        query += " AND clean_name LIKE ?"
        params.append(f"%{search}%")

    if category:
        query += " AND category = ?"
        params.append(category)

    query += " GROUP BY clean_name"

    # Sorting
    sort_cols = {
        "count": "purchase_count",
        "name": "clean_name",
        "avg_price": "avg_price",
        "last_date": "last_date"
    }
    col = sort_cols.get(sort_by, "purchase_count")
    dir_str = "ASC" if direction.lower() == "asc" else "DESC"
    query += f" ORDER BY {col} {dir_str}"

    cursor.execute(query, params)
    rows = cursor.fetchall()

    products = []
    for r in rows:
        name = r["clean_name"]
        
        # Get first recorded price and most recent price
        cursor.execute("SELECT unit_price FROM ticket_items WHERE clean_name = ? ORDER BY date ASC LIMIT 1", (name,))
        first_p_row = cursor.fetchone()
        first_price = first_p_row[0] if first_p_row else r["avg_price"]

        cursor.execute("SELECT unit_price FROM ticket_items WHERE clean_name = ? ORDER BY date DESC LIMIT 1", (name,))
        last_p_row = cursor.fetchone()
        last_price = last_p_row[0] if last_p_row else r["avg_price"]

        change_pct = round(((last_price - first_price) / first_price * 100), 1) if first_price > 0 else 0.0

        products.append({
            "name": name,
            "category": r["category"],
            "purchase_count": r["purchase_count"],
            "min_price": round(r["min_price"], 2),
            "max_price": round(r["max_price"], 2),
            "avg_price": round(r["avg_price"], 2),
            "current_price": round(last_price, 2),
            "first_price": round(first_price, 2),
            "price_change_pct": change_pct,
            "last_date": r["last_date"],
            "first_date": r["first_date"]
        })

    conn.close()
    return {"products": products}

@app.get("/api/products/{name}/history")
def get_product_history(name: str):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT 
            ti.id,
            ti.date,
            ti.unit_price,
            ti.quantity,
            ti.total_price,
            ti.discount,
            ti.unit_measure,
            t.store_name,
            t.id as ticket_id
        FROM ticket_items ti
        JOIN tickets t ON ti.ticket_id = t.id
        WHERE ti.clean_name = ?
        ORDER BY ti.date ASC
    """, (name,))
    rows = cursor.fetchall()
    conn.close()

    if not rows:
        raise HTTPException(status_code=404, detail="Product history not found")

    history = [
        {
            "id": r["id"],
            "date": r["date"],
            "price": round(r["unit_price"], 2),
            "quantity": r["quantity"],
            "total_price": round(r["total_price"], 2),
            "discount": round(r["discount"], 2),
            "unit_measure": r["unit_measure"],
            "store_name": r["store_name"],
            "ticket_id": r["ticket_id"]
        }
        for r in rows
    ]

    return {
        "product_name": name,
        "history": history
    }

@app.get("/api/inflation")
def get_inflation_ranking():
    """Identifies products with the highest price increases and decreases."""
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT clean_name, category, COUNT(*) as count
        FROM ticket_items
        GROUP BY clean_name
        HAVING count >= 2
    """)
    eligible = cursor.fetchall()

    items_with_changes = []
    for row in eligible:
        pname = row["clean_name"]
        cat = row["category"]
        cursor.execute("SELECT unit_price, date FROM ticket_items WHERE clean_name = ? ORDER BY date ASC LIMIT 1", (pname,))
        first_row = cursor.fetchone()
        cursor.execute("SELECT unit_price, date FROM ticket_items WHERE clean_name = ? ORDER BY date DESC LIMIT 1", (pname,))
        last_row = cursor.fetchone()

        if first_row and last_row and first_row[0] > 0:
            fp = first_row[0]
            lp = last_row[0]
            pct = round(((lp - fp) / fp * 100), 1)
            diff = round(lp - fp, 2)
            items_with_changes.append({
                "name": pname,
                "category": cat,
                "first_price": round(fp, 2),
                "current_price": round(lp, 2),
                "first_date": first_row[1],
                "last_date": last_row[1],
                "diff": diff,
                "pct": pct,
                "count": row["count"]
            })

    conn.close()

    increases = sorted([i for i in items_with_changes if i["pct"] > 0], key=lambda x: x["pct"], reverse=True)
    decreases = sorted([i for i in items_with_changes if i["pct"] < 0], key=lambda x: x["pct"])

    return {
        "highest_increases": increases[:10],
        "highest_decreases": decreases[:10]
    }

# --- GMAIL SYNC & CONFIG ---
@app.get("/api/sync/status")
def get_sync_status():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM sync_config WHERE id = 1")
    cfg = cursor.fetchone()
    
    cursor.execute("SELECT * FROM sync_logs ORDER BY id DESC LIMIT 5")
    logs = [dict(r) for r in cursor.fetchall()]
    conn.close()

    return {
        "state": SYNC_STATE,
        "config": dict(cfg) if cfg else None,
        "recent_logs": logs
    }

@app.post("/api/sync/test")
def test_sync(creds: IMAPCredentials):
    res = test_imap_connection(creds.user, creds.password, creds.server, creds.port)
    return res

@app.post("/api/sync/start")
def start_sync(creds: IMAPCredentials):
    conn = get_db()
    cursor = conn.cursor()
    # Save config
    cursor.execute("""
        INSERT INTO sync_config (id, imap_user, imap_password, imap_server, imap_port, search_query)
        VALUES (1, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            imap_user = excluded.imap_user,
            imap_password = excluded.imap_password,
            imap_server = excluded.imap_server,
            imap_port = excluded.imap_port,
            search_query = excluded.search_query
    """, (creds.user, creds.password, creds.server, creds.port, creds.search_query))
    conn.commit()
    conn.close()

    started = start_background_sync(creds.user, creds.password, creds.server, creds.port, creds.search_query)
    if not started:
        raise HTTPException(status_code=400, detail="Une synchronisation est déjà en cours.")
    return {"status": "started", "message": "Synchronisation lancée en arrière-plan"}

# --- DEMO DATA ---
@app.post("/api/demo/load")
def load_demo():
    res = generate_demo_tickets(months_back=6)
    return res

@app.post("/api/demo/clear")
def clear_demo():
    res = clear_demo_tickets()
    return res

@app.post("/api/demo/clear-all")
def clear_all():
    res = clear_all_tickets()
    return res

# --- EXPORT ---
@app.get("/api/export/csv")
def export_csv(type: str = "items"):
    conn = get_db()
    cursor = conn.cursor()
    output = io.StringIO()
    writer = csv.writer(output, delimiter=";")

    if type == "tickets":
        cursor.execute("SELECT id, store_name, ticket_number, caisse_number, date, total_amount, discounts_total, loyalty_earned, items_count, payment_method FROM tickets ORDER BY date DESC")
        writer.writerow(["ID", "Magasin", "N° Ticket", "Caisse", "Date", "Montant Total (€)", "Remises (€)", "Gains Carte U (€)", "Nb Articles", "Moyen de paiement"])
        for r in cursor.fetchall():
            writer.writerow(list(r))
    else:
        cursor.execute("""
            SELECT ti.id, t.date, t.store_name, ti.clean_name, ti.category, ti.quantity, ti.unit_price, ti.total_price, ti.discount, ti.unit_measure
            FROM ticket_items ti
            JOIN tickets t ON ti.ticket_id = t.id
            ORDER BY t.date DESC, ti.line_number ASC
        """)
        writer.writerow(["ID Ligne", "Date", "Magasin", "Article", "Rayon", "Quantité", "Prix Unitaire (€)", "Prix Total (€)", "Remise (€)", "Unité"])
        for r in cursor.fetchall():
            writer.writerow(list(r))

    conn.close()
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=superu_{type}_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

# Static Frontend mounting (if built)
dist_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "frontend", "dist")
if os.path.exists(dist_dir):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_dir, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if full_path.startswith("api"):
            raise HTTPException(status_code=404, detail="API endpoint not found")
        file_path = os.path.join(dist_dir, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_dir, "index.html"))
