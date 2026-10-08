import random
from datetime import datetime, timedelta
from typing import List, Dict, Any
from .db import get_db

STORES = [
    {"name": "SUPER U CHÂTEAUROUX", "city": "Châteauroux"},
    {"name": "SUPER U NANTES ERDRE", "city": "Nantes"},
    {"name": "HYPER U LA ROCHE SUR YON", "city": "La Roche-sur-Yon"},
    {"name": "COURSES U DRIVE", "city": "Drive"},
]

# Products with baseline prices and categories
BASE_PRODUCTS = [
    {"name": "Lait Demi-Écrémé U 1L", "category": "Frais & Produits Laitiers", "base_price": 1.05, "measure": "pièce", "freq": 0.85, "trend": 0.08},
    {"name": "Beurre Doux U 250g", "category": "Frais & Produits Laitiers", "base_price": 2.25, "measure": "pièce", "freq": 0.65, "trend": 0.12},
    {"name": "Oeufs Frais Plein Air U X10", "category": "Frais & Produits Laitiers", "base_price": 2.89, "measure": "pièce", "freq": 0.60, "trend": 0.05},
    {"name": "Emmental Râpé U 200g", "category": "Frais & Produits Laitiers", "base_price": 1.95, "measure": "pièce", "freq": 0.50, "trend": 0.10},
    {"name": "Yaourts Nature U X8", "category": "Frais & Produits Laitiers", "base_price": 1.69, "measure": "pièce", "freq": 0.55, "trend": 0.03},
    {"name": "Baguette De Tradition U", "category": "Boulangerie & Pâtisserie", "base_price": 1.15, "measure": "pièce", "freq": 0.90, "trend": 0.00},
    {"name": "Pain De Mie Complet U 500g", "category": "Boulangerie & Pâtisserie", "base_price": 1.45, "measure": "pièce", "freq": 0.40, "trend": 0.06},
    {"name": "Pommes Gala Bio U 1kg", "category": "Fruits & Légumes", "base_price": 2.69, "measure": "kg", "freq": 0.70, "trend": -0.05},
    {"name": "Bananes Cavendish U", "category": "Fruits & Légumes", "base_price": 1.85, "measure": "kg", "freq": 0.75, "trend": 0.04},
    {"name": "Tomates Grappes Françaises", "category": "Fruits & Légumes", "base_price": 3.19, "measure": "kg", "freq": 0.60, "trend": 0.15},
    {"name": "Avocats Mûrs À Point X2", "category": "Fruits & Légumes", "base_price": 2.49, "measure": "pièce", "freq": 0.45, "trend": 0.02},
    {"name": "Courgettes Françaises 1kg", "category": "Fruits & Légumes", "base_price": 2.10, "measure": "kg", "freq": 0.40, "trend": -0.02},
    {"name": "Filet De Poulet Fermier Label Rouge", "category": "Boucherie & Poissonnerie", "base_price": 7.80, "measure": "pièce", "freq": 0.50, "trend": 0.09},
    {"name": "Pavé De Saumon Atlantique X2", "category": "Boucherie & Poissonnerie", "base_price": 6.95, "measure": "pièce", "freq": 0.35, "trend": 0.14},
    {"name": "Jambon Supérieur Découenné U X4", "category": "Boucherie & Poissonnerie", "base_price": 2.99, "measure": "pièce", "freq": 0.55, "trend": 0.05},
    {"name": "Steaks Hachés Pur Boeuf 15% U X4", "category": "Boucherie & Poissonnerie", "base_price": 5.49, "measure": "pièce", "freq": 0.45, "trend": 0.07},
    {"name": "Pâtes Coquillettes U 500g", "category": "Épicerie Salée", "base_price": 0.99, "measure": "pièce", "freq": 0.70, "trend": 0.04},
    {"name": "Riz Basmati U 1kg", "category": "Épicerie Salée", "base_price": 2.15, "measure": "pièce", "freq": 0.40, "trend": 0.02},
    {"name": "Huile D'Olive Vierge Extra U 1L", "category": "Épicerie Salée", "base_price": 8.90, "measure": "pièce", "freq": 0.25, "trend": 0.22},
    {"name": "Coulis De Tomates Bio U 500g", "category": "Épicerie Salée", "base_price": 1.25, "measure": "pièce", "freq": 0.40, "trend": 0.05},
    {"name": "Thon Entier Au Naturel U 160g", "category": "Épicerie Salée", "base_price": 2.20, "measure": "pièce", "freq": 0.35, "trend": 0.08},
    {"name": "Café Moulu Pur Arabica U 250g", "category": "Épicerie Sucrée", "base_price": 2.75, "measure": "pièce", "freq": 0.50, "trend": 0.11},
    {"name": "Chocolat Noir 70% U Dégustation", "category": "Épicerie Sucrée", "base_price": 1.49, "measure": "pièce", "freq": 0.55, "trend": 0.06},
    {"name": "Confiture De Fraises U 370g", "category": "Épicerie Sucrée", "base_price": 1.89, "measure": "pièce", "freq": 0.30, "trend": 0.03},
    {"name": "Biscuits Petit Beurre U", "category": "Épicerie Sucrée", "base_price": 1.29, "measure": "pièce", "freq": 0.45, "trend": 0.04},
    {"name": "Eau Minérale Cristalline 6X1.5L", "category": "Boissons", "base_price": 1.62, "measure": "pack", "freq": 0.70, "trend": 0.05},
    {"name": "Pur Jus D'Orange Sans Pulpe U 1L", "category": "Boissons", "base_price": 2.19, "measure": "pièce", "freq": 0.50, "trend": 0.10},
    {"name": "Bière Blonde Grimbergen 6X25cl", "category": "Boissons", "base_price": 5.40, "measure": "pack", "freq": 0.20, "trend": 0.04},
    {"name": "Lessive Liquide Éco U 1.5L", "category": "Entretien & Maison", "base_price": 6.85, "measure": "pièce", "freq": 0.20, "trend": 0.06},
    {"name": "Essuie-Tout U Ultra Résistant X4", "category": "Entretien & Maison", "base_price": 2.79, "measure": "pack", "freq": 0.35, "trend": 0.08},
    {"name": "Gel Douche Extra Doux U 250ml", "category": "Hygiène & Beauté", "base_price": 1.55, "measure": "pièce", "freq": 0.25, "trend": 0.03},
]

def generate_demo_tickets(months_back: int = 6) -> List[Dict[str, Any]]:
    """Generates realistic tickets over the past N months."""
    conn = get_db()
    cursor = conn.cursor()

    now = datetime.now()
    # Clear existing demo data first
    cursor.execute("DELETE FROM ticket_items WHERE ticket_id IN (SELECT id FROM tickets WHERE source_type = 'demo')")
    cursor.execute("DELETE FROM tickets WHERE source_type = 'demo'")

    ticket_id_counter = 1000
    total_tickets_created = 0

    # For each week across the months
    days_span = months_back * 30
    current_day = now - timedelta(days=days_span)

    while current_day <= now:
        # 1 to 2 trips per week
        trips = random.choice([1, 1, 2])
        for _ in range(trips):
            store = random.choice(STORES)
            trip_time = current_day + timedelta(hours=random.randint(9, 19), minutes=random.randint(0, 59))
            date_str = trip_time.strftime("%Y-%m-%d %H:%M:%S")

            # Progress factor 0.0 (past) to 1.0 (now) for price inflation trends
            progress = (trip_time - (now - timedelta(days=days_span))).total_seconds() / (days_span * 86400)
            progress = max(0.0, min(1.0, progress))

            # Pick 6 to 18 items for the basket
            ticket_items = []
            ticket_total = 0.0
            ticket_discounts = 0.0

            line_no = 1
            for prod in BASE_PRODUCTS:
                if random.random() < prod["freq"] * 0.75:
                    # Apply trend + slight noise
                    price_factor = 1.0 + (prod["trend"] * progress) + random.uniform(-0.03, 0.03)
                    unit_price = round(prod["base_price"] * price_factor, 2)

                    qty = 1.0
                    if prod["measure"] == "kg":
                        qty = round(random.uniform(0.4, 1.8), 2)
                    elif prod["category"] in ["Boissons", "Boulangerie & Pâtisserie", "Frais & Produits Laitiers"] and random.random() < 0.35:
                        qty = float(random.choice([2, 3]))

                    item_total = round(qty * unit_price, 2)
                    discount = 0.0
                    # Occasional loyalty discount / promo
                    if random.random() < 0.15:
                        discount = round(item_total * random.choice([0.15, 0.20, 0.30]), 2)
                        ticket_discounts += discount

                    ticket_items.append({
                        "line_number": line_no,
                        "raw_name": prod["name"].upper(),
                        "clean_name": prod["name"],
                        "category": prod["category"],
                        "quantity": qty,
                        "unit_price": unit_price,
                        "total_price": item_total,
                        "discount": discount,
                        "unit_measure": prod["measure"],
                        "date": date_str
                    })
                    ticket_total += (item_total - discount)
                    line_no += 1

            if not ticket_items:
                continue

            ticket_total = round(ticket_total, 2)
            ticket_discounts = round(ticket_discounts, 2)
            loyalty_earned = round(ticket_total * random.uniform(0.01, 0.03), 2) if random.random() < 0.8 else 0.0
            loyalty_balance = round(random.uniform(5.0, 35.0), 2)
            ticket_id_counter += 1

            # Insert ticket
            cursor.execute("""
            INSERT INTO tickets (
                store_name, store_city, ticket_number, caisse_number, date,
                total_amount, discounts_total, loyalty_earned, loyalty_balance,
                items_count, payment_method, raw_text, source_type, source_filename
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                store["name"],
                store["city"],
                f"U-{ticket_id_counter:06d}",
                f"{random.randint(1, 12):02d}",
                date_str,
                ticket_total,
                ticket_discounts,
                loyalty_earned,
                loyalty_balance,
                len(ticket_items),
                random.choice(["CARTE BANCAIRE", "CARTE BANCAIRE", "CB SANS CONTACT"]),
                f"Super U e-ticket de caisse {store['name']} {date_str}",
                "demo",
                f"ticket_demo_{ticket_id_counter}.pdf"
            ))
            t_id = cursor.lastrowid

            # Insert items
            for it in ticket_items:
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
            total_tickets_created += 1

        current_day += timedelta(days=random.randint(4, 7))

    conn.commit()
    conn.close()
    return {"status": "success", "tickets_created": total_tickets_created}

def clear_demo_tickets():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM ticket_items WHERE ticket_id IN (SELECT id FROM tickets WHERE source_type = 'demo')")
    cursor.execute("DELETE FROM tickets WHERE source_type = 'demo'")
    conn.commit()
    conn.close()
    return {"status": "cleared"}

def clear_all_tickets():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM ticket_items")
    cursor.execute("DELETE FROM tickets")
    conn.commit()
    conn.close()
    return {"status": "all_cleared"}
