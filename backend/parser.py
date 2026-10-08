import re
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
from bs4 import BeautifulSoup
import pypdf

# French Supermarket product categorization
CATEGORIES_KEYWORDS = {
    "Fruits & Légumes": [
        "pomme", "poire", "banan", "clementin", "orange", "citron", "frais", "frambois", "raisin",
        "pech", "abricot", "kiwi", "melon", "pastequ", "avocat", "tomat", "salade", "batavia",
        "mach", "courgett", "carott", "poireau", "oignon", "echalot", "ail", "pomme de ter", "pdt",
        "champignon", "concombr", "poivron", "haricot vert", "brocoli", "chou", "epinard", "radis",
        "aubergin", "persil", "basilic", "menthe", "herbe", "ananas", "mangue"
    ],
    "Boucherie & Charcuterie": [
        "boeuf", "porc", "veau", "agneau", "steak", "hach", "roti", "poulet", "dind", "canard",
        "lardon", "jambon", "sauciss", "saucisson", "merguez", "chipolat", "filet mignon", "nugget",
        "boudin", "cotes", "escalop", "viande", "boucherie", "charct", "charcuterie", "salami"
    ],
    "Poissonnerie": [
        "saumon", "thon", "cabillaud", "colin", "crevett", "truit", "merlu", "moule", "poisson",
        "surimi"
    ],
    "Frais & Produits Laitiers": [
        "lait", "beurr", "crem", "yaourt", "fromag", "emmental", "comt", "camembert", "brie",
        "mozzarella", "chevr", "raclett", "gouda", "cantal", "roquefort", "parmesan", "gruyer",
        "reblochon", "skyr", "faissell", "petit suiss", "oeuf", "creme fraich", "dessert lact",
        "maroilles", "bleu", "mascarpon", "ricotta", "cremerie", "ultra frais", "yrt"
    ],
    "Boulangerie & Pâtisserie": [
        "baguett", "pain", "brioch", "croissant", "chocolatin", "pain choc", "viennoiseri",
        "muffin", "biscott", "cracott", "pain de mi", "ficell", "tourte", "beignet", "pancak",
        "crepe", "gaufre", "tarte", "boulangeri"
    ],
    "Épicerie Salée": [
        "pat", "pate", "coquillet", "spaghetti", "penn", "tagliatell", "riz", "couscous", "quinoa",
        "lentill", "pois chich", "haricot blanc", "conserv", "thon boit", "sardin", "mais",
        "sauc tomat", "coulis", "pesto", "huil", "vinaigr", "moutard", "mayonnais", "ketchup",
        "sel", "poivr", "epic", "chips", "aperitif", "cacahuet", "pistach", "noix", "soup",
        "bouillon", "farin", "chapelur", "thon natur", "bolognais", "traiteur", "fusilli"
    ],
    "Épicerie Sucrée": [
        "chocolat", "choc", "biscuit", "cooki", "gateau", "petit beurr", "confitur", "nutella",
        "pat a tartin", "miel", "sucr", "cereal", "muesli", "flocon", "caf", "the ", "infusion",
        "cacao", "compot", "bonbon", "haribo", "speculoos", "confiserie", "lutti", "acidulees"
    ],
    "Boissons": [
        "eau ", "cristallin", "evian", "volvic", "hepar", "perrier", "badoit", "pellegrino",
        "jus", "soda", "cola", "pepsi", "schweppes", "fanta", "sprite", "ice tea", "oasis",
        "sirop", "bier", "cidre", "vin ", "bordeaux", "champagn", "limonad", "boisson",
        "fuzetea", "suze", "whiskey", "alcool", "aperitif"
    ],
    "Animalerie": [
        "chien", "chat", "pedigree", "croquett", "patee", "litiere", "animal"
    ],
    "Surgelés": [
        "surgele", "glace", "sorbet", "frit", "pizza surgele", "legum surgele", "poelee"
    ],
    "Hygiène & Beauté": [
        "gel douch", "savon", "shamp", "dentifric", "bross", "coton", "deo", "rasoir",
        "crem main", "mouchoir", "hygien", "serviett hygi"
    ],
    "Entretien & Maison": [
        "lessiv", "adouciss", "liquid vaissell", "pastill", "epong", "sopalin", "essui tout",
        "papier toil", "javel", "nettoyant", "sac poubell", "tablett lav"
    ]
}

def clean_product_name(raw: str) -> str:
    """Cleans raw receipt line item name into readable title case."""
    s = re.sub(r'^[0-9\*\#\-\.]+\s*', '', raw)
    s = re.sub(r'\s+[0-9]{1,2}$', '', s)  # trailing tax code like ' 11' or ' 13'
    s = re.sub(r'\s{2,}', ' ', s).strip()
    
    words = s.split()
    cleaned_words = []
    for w in words:
        if w.upper() in ["U", "BIO", "AOP", "IGP", "TVA", "TTC", "KG", "G", "ML", "CL", "L", "BF", "PLT"]:
            cleaned_words.append(w.upper())
        elif re.match(r'^\d+[GgKkLlLmM]+$', w):
            cleaned_words.append(w.upper())
        else:
            cleaned_words.append(w.capitalize())
    
    return " ".join(cleaned_words) if cleaned_words else raw.strip().title()

def categorize_item(name: str, section_category: str = "") -> str:
    """Determines item category based on section header or keywords."""
    if section_category and section_category not in ["Autre", "Divers", ""]:
        sec_lower = section_category.lower()
        if any(w in sec_lower for w in ["chien", "chat", "animal"]):
            return "Animalerie"
        if any(w in sec_lower for w in ["fromage", "lait", "cremerie", "ultra frais", "creme"]):
            return "Frais & Produits Laitiers"
        if any(w in sec_lower for w in ["boucherie", "charcuterie", "charct", "viande"]):
            return "Boucherie & Charcuterie"
        if any(w in sec_lower for w in ["poisson", "mer"]):
            return "Poissonnerie"
        if any(w in sec_lower for w in ["alcool", "aperitif", "boisson", "vins"]):
            return "Boissons"
        if any(w in sec_lower for w in ["biscuit", "confiserie", "confiture", "sucre", "chocolat"]):
            return "Épicerie Sucrée"
        if any(w in sec_lower for w in ["traiteur", "sale", "salee", "conserve", "pate"]):
            return "Épicerie Salée"
        if any(w in sec_lower for w in ["boulangerie", "pain", "viennoiserie"]):
            return "Boulangerie & Pâtisserie"
        if any(w in sec_lower for w in ["fruit", "legume"]):
            return "Fruits & Légumes"

    name_lower = name.lower()
    for cat, keywords in CATEGORIES_KEYWORDS.items():
        for kw in keywords:
            if kw in name_lower:
                return cat
    return "Épicerie Divers"

def parse_price(val_str: str) -> Optional[float]:
    """Parse French price format '12,50' or '12.50' to float."""
    if not val_str:
        return None
    cleaned = val_str.replace("€", "").replace("EUR", "").strip().replace(",", ".")
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return None

def parse_date(date_str: str) -> Optional[str]:
    """Parse French date string into standard YYYY-MM-DD HH:MM:SS."""
    if not date_str:
        return None
    date_str = date_str.strip()
    
    patterns = [
        (r'(\d{2})/(\d{2})/(\d{4})\s+(?:à\s+)?(\d{2})[h:](\d{2})(?::(\d{2}))?', '%d/%m/%Y %H:%M:%S'),
        (r'(\d{2})/(\d{2})/(\d{2})\s+(?:à\s+)?(\d{2})[h:](\d{2})(?::(\d{2}))?', '%d/%m/%y %H:%M:%S'),
        (r'(\d{2})/(\d{2})/(\d{2})\s+(?:à\s+)?(\d{2})[h:](\d{2})', '%d/%m/%y %H:%M'),
        (r'(\d{2})/(\d{2})/(\d{4})', '%d/%m/%Y'),
        (r'(\d{2})-(\d{2})-(\d{4})', '%d-%m-%Y'),
        (r'(\d{4})-(\d{2})-(\d{2})', '%Y-%m-%d'),
    ]
    
    for pat, fmt in patterns:
        m = re.search(pat, date_str, re.IGNORECASE)
        if m:
            matched_str = m.group(0).replace('à', '').replace('h', ':').strip()
            if len(matched_str.split()) == 1:
                matched_str += " 12:00:00"
                fmt += " %H:%M:%S"
            elif len(matched_str.split(':')) == 2:
                matched_str += ":00"
                fmt += ":%S"
            try:
                dt = datetime.strptime(matched_str, fmt)
                return dt.strftime('%Y-%m-%d %H:%M:%S')
            except Exception:
                pass
    return None

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract plain text from PDF file using pypdf."""
    text_content = []
    try:
        reader = pypdf.PdfReader(pdf_path)
        for page in reader.pages:
            t = page.extract_text()
            if t:
                text_content.append(t)
    except Exception as e:
        print(f"Error reading PDF {pdf_path}: {e}")
    return "\n".join(text_content)

def parse_superu_ticket(raw_text: str, source_type: str = "manual", source_filename: str = "") -> Optional[Dict[str, Any]]:
    """
    Parses a Super U receipt text.
    Rejects CB slips (reçus de carte bleue).
    Extracts: store name, city, ticket number, date, items, prices, discounts, Carte U.
    """
    # 1. Check if this is a Credit Card slip (reçu de carte bleue)
    # The user specifically requested: "On ne s'intéressera qu'au ticket de caisse."
    fn_lower = source_filename.lower()
    if "ticket de cb" in fn_lower or "_cb_" in fn_lower or "recu_cb" in fn_lower:
        return None

    if "CARTE BANCAIRE" in raw_text.upper() and not any(kw in raw_text for kw in ["Article", "TOTAL [", "TOTAL   ", ">>>>", "BELLON", "Magasin", "CHARLY"]):
        return None

    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    if not lines:
        return None

    store_name = "SUPER U"
    store_city = ""
    ticket_number = None
    caisse_number = None
    ticket_date = None
    total_amount = None
    discounts_total = 0.0
    loyalty_earned = 0.0
    loyalty_balance = None
    payment_method = "CARTE BANCAIRE"
    items: List[Dict[str, Any]] = []

    # 2. Store & City Detection
    full_text = "\n".join(lines)

    if "CHARLY SUR MARNE" in full_text.upper() or "Route De Pavant" in full_text or "Route de Pavant" in full_text:
        store_city = "Charly-sur-Marne"
        store_name = "SUPER U CHARLY SUR MARNE"
    else:
        store_match = re.search(r'(SUPER\s+U\s+[\w\s\-\'\.]+)', full_text, re.IGNORECASE)
        if store_match:
            cand = store_match.group(1).strip().upper()
            if not any(skip in cand for skip in ["VOUS REMERCIE", "SERVICES", "CARTE"]):
                store_name = cand
                parts = store_name.split()
                if len(parts) >= 3:
                    store_city = " ".join(parts[2:]).title()

    # 3. Date, Heure, Ticket, Caisse/TPV
    # Older style: Opérateur Date Heure TPV Ticket: 113 DR 18/10/24 15:53 9 290854
    # Newer style: Date Heure Magasin Tpv Util Tick: 07/10/26 11:44:13 21929 106 906 2353
    meta_m = re.search(r'(\d{2}/\d{2}/\d{2,4})\s+(\d{2}:\d{2}(?::\d{2})?)\s+(?:\d+\s+)?(\d+)\s+(?:\d+\s+)?(\d+)', full_text)
    if meta_m:
        d_val, h_val, tpv_val, tick_val = meta_m.groups()
        caisse_number = tpv_val
        ticket_number = tick_val
        ticket_date = parse_date(f"{d_val} {h_val}")
    else:
        # Fallback date search
        dm = re.search(r'(\d{2}/\d{2}/\d{2,4}(?:\s+(?:à\s+)?\d{2}[h:]\d{2}(?::\d{2})?)?)', full_text)
        if dm:
            ticket_date = parse_date(dm.group(1))
        
        tick_m = re.search(r'(?:Ticket|Tick|N°\s*fiscal\s*du\s*ticket)\s*[:\s#]?\s*([0-9A-Z\-]+)', full_text, re.I)
        if tick_m:
            ticket_number = tick_m.group(1)

    if not ticket_date:
        ticket_date = datetime.now().strftime('%Y-%m-%d 12:00:00')

    # 4. Total Amount
    # TOTAL [5] Articles  13,57 €  OR  TOTAL  14 Article(s) 85,00 €
    tot_m = re.search(r'TOTAL\s+(?:\[\d+\]|\d+)?\s*Article\(?s?\)?\s+([0-9]+[,\.][0-9]{2})\s*€?', full_text, re.I)
    if tot_m:
        total_amount = parse_price(tot_m.group(1))

    if not total_amount:
        # Look for CB SANS CONTACT XX,XX €
        cb_tot_m = re.search(r'CB\s+SANS\s+CONTACT(?:\s+[A-Z]+)*\s+([0-9]+[,\.][0-9]{2})\s*€?', full_text, re.I)
        if cb_tot_m:
            total_amount = parse_price(cb_tot_m.group(1))

    # Discounts & Loyalty
    remises_m = re.search(r'(?:DONT\s+REMISES?|TOTAL\s+REMISES?|REMISES?\s+DEDUITE)\s*[:]?\s*([0-9]+[,\.][0-9]{2})\s*€?', full_text, re.I)
    if remises_m:
        discounts_total = parse_price(remises_m.group(1)) or 0.0

    loyalty_bal_m = re.search(r'(?:VOTRE\s+NOUVEAU\s+SOLDE\s+€\s+CARTE\s+U|NOUVEAU\s+SOLDE\s+CARTE\s+U)\s*[:]?\s*([0-9]+[,\.][0-9]{2})\s*€?', full_text, re.I)
    if loyalty_bal_m:
        loyalty_balance = parse_price(loyalty_bal_m.group(1))

    loyalty_prec_m = re.search(r'(?:VOTRE\s+SOLDE\s+€\s+CARTE\s+U\s+PRECEDENT)\s*[:]?\s*([0-9]+[,\.][0-9]{2})\s*€?', full_text, re.I)
    if loyalty_prec_m and loyalty_balance:
        prec = parse_price(loyalty_prec_m.group(1))
        if prec is not None and loyalty_balance > prec:
            loyalty_earned = round(loyalty_balance - prec, 2)

    # 5. Parse Item Rows
    # Item row pattern: Description followed by price and optional tax code (11, 12, 13)
    # e.g.: FILET DE POULET CAISSETTE                   9,40 €  11
    #       SA RECOMPENSE BF PEDIGREE 140G               1,89 €   13
    item_re = re.compile(r'^(.+?)\s+([0-9]+[,\.][0-9]{2})\s*€(?:\s+(\d{1,2}))?$', re.I)
    qty_re = re.compile(r'(\d+)\s*[xX]\s*([0-9]+[,\.][0-9]{2})\s*(?:EUR|€)?', re.I)
    weight_re = re.compile(r'([0-9]+[,\.][0-9]+)\s*kg\s*[xX]\s*([0-9]+[,\.][0-9]{2})\s*(?:€|EUR)/kg', re.I)
    discount_re = re.compile(r'(?:REMISE|PROMO|AVANTAGE)\s+([A-Z0-9\s]+)?\s*(-?[0-9]+[,\.][0-9]{2})', re.I)

    current_cat = "Épicerie Divers"
    current_idx = 0

    stop_words = ["TOTAL [", "TOTAL   ", "SOUS-TOTAL", "NOMBRE DE LIGNES", "VOS AVANTAGES", "TICKET A CONSERVER"]

    for line in lines:
        line_clean = line.strip()

        # Stop when hitting the summary/totals section
        if any(sw in line_clean.upper() for sw in stop_words):
            break

        # Check for section header
        if line_clean.startswith(">>>>"):
            current_cat = line_clean.replace(">>>>", "").strip().title()
            continue
        elif line_clean.isupper() and len(line_clean) < 30 and not any(c in line_clean for c in [':', '€', '/', '1', '2', '3', '4', '5', '6', '7', '8', '9']) and not any(sw in line_clean for sw in ['VENTE', 'BELLON', 'DISTRIBUTION', 'ROUTE', 'FRANCE', 'TELEPHONE', 'ARTICLE']):
            current_cat = line_clean.strip().title()
            continue

        # Check discount modifier line
        disc_m = discount_re.search(line_clean)
        if disc_m and items:
            disc_val = abs(parse_price(disc_m.group(2)) or 0.0)
            items[-1]["discount"] += disc_val
            discounts_total = max(discounts_total, items[-1]["discount"])
            continue

        # Check quantity multiplier line: e.g. "2 x 1,84 EUR"
        qm = qty_re.search(line_clean)
        if qm and items:
            items[-1]["quantity"] = float(qm.group(1))
            up = parse_price(qm.group(2))
            if up:
                items[-1]["unit_price"] = up
            continue

        # Check weight multiplier line: e.g. "0,850 kg x 2,90 €/kg"
        wm = weight_re.search(line_clean)
        if wm and items:
            items[-1]["quantity"] = parse_price(wm.group(1)) or 1.0
            up = parse_price(wm.group(2))
            if up:
                items[-1]["unit_price"] = up
                items[-1]["unit_measure"] = "kg"
            continue

        # Match product line
        m = item_re.match(line_clean)
        if m:
            raw_name = m.group(1).strip()
            price_val = parse_price(m.group(2))

            # Exclude header/totals/tax lines
            if any(skip in raw_name.upper() for skip in [
                "TOTAL", "SOUS-TOTAL", "VENTE", "ARTICLE", "SIRET", "TVA", "MAGASIN",
                "ROUTE DE PAVANT", "TELEPHONE", "CB SANS CONTACT", "CARTE BANCAIRE",
                "OPERATEUR", "OPÉRATEUR", "HASH", "POUR VOTRE ACHAT"
            ]):
                continue

            if price_val is not None and price_val > 0 and len(raw_name) >= 3:
                current_idx += 1
                clean_name = clean_product_name(raw_name)
                cat = categorize_item(clean_name, current_cat)

                items.append({
                    "line_number": current_idx,
                    "raw_name": raw_name,
                    "clean_name": clean_name,
                    "category": cat,
                    "quantity": 1.0,
                    "unit_price": price_val,
                    "total_price": price_val,
                    "discount": 0.0,
                    "unit_measure": "pièce",
                    "date": ticket_date
                })

    if total_amount is None:
        if items:
            total_amount = round(sum(it["total_price"] - it["discount"] for it in items), 2)
        else:
            total_amount = 0.0

    # If no items were found, this is not a valid ticket de caisse
    if not items:
        return None

    return {
        "store_name": store_name,
        "store_city": store_city,
        "ticket_number": ticket_number or f"T-{abs(hash(full_text)) % 1000000:06d}",
        "caisse_number": caisse_number or "01",
        "date": ticket_date,
        "total_amount": round(total_amount, 2),
        "discounts_total": round(discounts_total, 2),
        "loyalty_earned": round(loyalty_earned, 2),
        "loyalty_balance": loyalty_balance,
        "items_count": len(items),
        "payment_method": payment_method,
        "raw_text": full_text[:4000],
        "source_type": source_type,
        "source_filename": source_filename,
        "items": items
    }

def parse_html_email(html_content: str, source_filename: str = "") -> Optional[Dict[str, Any]]:
    """Parse HTML email from Courses U or Super U."""
    soup = BeautifulSoup(html_content, "html.parser")
    text = soup.get_text(separator="\n")
    return parse_superu_ticket(text, source_type="email_html", source_filename=source_filename)
