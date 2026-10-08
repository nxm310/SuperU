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
    "Boucherie & Poissonnerie": [
        "boeuf", "porc", "veau", "agneau", "steak", "hach", "roti", "poulet", "dind", "canard",
        "lardon", "jambon", "sauciss", "saucisson", "merguez", "chipolat", "filet mignon", "nugget",
        "saumon", "thon", "cabillaud", "colin", "crevett", "truit", "merlu", "moule", "poisson",
        "surimi", "boudin", "cotes", "escalop", "viande", "boucherie"
    ],
    "Frais & Produits Laitiers": [
        "lait", "beurr", "crem", "yaourt", "fromag", "emmental", "comt", "camembert", "brie",
        "mozzarella", "chevr", "raclett", "gouda", "cantal", "roquefort", "parmesan", "gruyer",
        "reblochon", "skyr", "faissell", "petit suiss", "oeuf", "creme fraich", "dessert lact",
        "maroilles", "bleu", "mascarpon", "ricotta", "cremerie"
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
        "bouillon", "farin", "chapelur", "thon natur", "bolognais"
    ],
    "Épicerie Sucrée": [
        "chocolat", "choc", "biscuit", "cooki", "gateau", "petit beurr", "confitur", "nutella",
        "pat a tartin", "miel", "sucr", "cereal", "muesli", "flocon", "caf", "the ", "infusion",
        "cacao", "compot", "bonbon", "haribo", "speculoos"
    ],
    "Boissons": [
        "eau ", "cristallin", "evian", "volvic", "hepar", "perrier", "badoit", "pellegrino",
        "jus", "soda", "cola", "pepsi", "schweppes", "fanta", "sprite", "ice tea", "oasis",
        "sirop", "bier", "cidre", "vin ", "bordeaux", "champagn", "limonad", "boisson"
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
    # Remove leading/trailing markers and codes
    s = re.sub(r'^[0-9\*\#\-\.]+\s*', '', raw)
    s = re.sub(r'\s+[0-9]{1,2}$', '', s)  # trailing tax code like ' 1' or ' 2'
    s = re.sub(r'\s{2,}', ' ', s).strip()
    
    # Capitalize cleanly
    words = s.split()
    cleaned_words = []
    for w in words:
        if w.upper() in ["U", "BIO", "AOP", "IGP", "TVA", "TTC", "KG", "G", "ML", "CL", "L"]:
            cleaned_words.append(w.upper())
        elif re.match(r'^\d+[GgKkLlLmM]+$', w):
            cleaned_words.append(w.upper())
        else:
            cleaned_words.append(w.capitalize())
    
    return " ".join(cleaned_words) if cleaned_words else raw.strip().title()

def categorize_item(name: str) -> str:
    """Determines item category based on product title."""
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
    """Parse various French date string formats into standard YYYY-MM-DD HH:MM:SS."""
    if not date_str:
        return None
    date_str = date_str.strip()
    
    # Format: DD/MM/YYYY HH:MM:SS or DD/MM/YYYY HH:MM or DD/MM/YY HH:MM
    patterns = [
        (r'(\d{2})/(\d{2})/(\d{4})\s+(?:à\s+)?(\d{2})[h:](\d{2})(?::(\d{2}))?', '%d/%m/%Y %H:%M:%S'),
        (r'(\d{2})/(\d{2})/(\d{2})\s+(?:à\s+)?(\d{2})[h:](\d{2})', '%d/%m/%y %H:%M'),
        (r'(\d{2})/(\d{2})/(\d{4})', '%d/%m/%Y'),
        (r'(\d{2})-(\d{2})-(\d{4})', '%d-%m-%Y'),
        (r'(\d{4})-(\d{2})-(\d{2})', '%Y-%m-%d'),
    ]
    
    for pat, fmt in patterns:
        m = re.search(pat, date_str, re.IGNORECASE)
        if m:
            matched_str = m.group(0).replace('à', '').replace('h', ':').strip()
            # If no time was matched, add default midday
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

def parse_superu_ticket(raw_text: str, source_type: str = "manual", source_filename: str = "") -> Dict[str, Any]:
    """
    Parses Super U receipt text (from PDF, EML or plain text).
    Extracts: store, date, items, totals, discounts, loyalty benefits.
    """
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    
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

    # 1. Detect Store Name
    store_patterns = [
        r'(SUPER\s+U\s+[\w\s\-\'\.]+)',
        r'(HYPER\s+U\s+[\w\s\-\'\.]+)',
        r'(U\s+EXPRESS\s+[\w\s\-\'\.]+)',
        r'(COURSES\s+U\s+[\w\s\-\'\.]+)',
        r'(SYSTEME\s+U\s+[\w\s\-\'\.]+)',
    ]
    for line in lines[:25]:
        for pat in store_patterns:
            m = re.search(pat, line, re.IGNORECASE)
            if m:
                found_name = m.group(1).strip()
                # Stop if it matches generic slogan
                if not any(skip in found_name.upper() for skip in ["SERVICES", "MERCI", "CARTE"]):
                    store_name = found_name.upper()
                    # extract city if present
                    parts = store_name.split()
                    if len(parts) >= 3:
                        store_city = " ".join(parts[2:]).title()
                    break
        if store_name != "SUPER U":
            break

    # 2. Detect Date, Ticket Number, Caisse
    full_text = "\n".join(lines)
    
    # Date search
    date_matches = re.findall(r'(\d{2}/\d{2}/\d{2,4}(?:\s+(?:à\s+)?\d{2}[h:]\d{2}(?::\d{2})?)?)', full_text)
    for dm in date_matches:
        parsed_d = parse_date(dm)
        if parsed_d:
            ticket_date = parsed_d
            break
            
    # Fallback date if none found: current date
    if not ticket_date:
        ticket_date = datetime.now().strftime('%Y-%m-%d 12:00:00')

    # Caisse & Ticket number
    caisse_m = re.search(r'(?:caisse|cais\.)\s*[:\s#]?\s*([0-9A-Z]+)', full_text, re.IGNORECASE)
    if caisse_m:
        caisse_number = caisse_m.group(1)
        
    ticket_num_m = re.search(r'(?:ticket|reçu|facture|cmde)\s*[:\s#n°]?\s*([0-9A-Z\-]+)', full_text, re.IGNORECASE)
    if ticket_num_m:
        ticket_number = ticket_num_m.group(1)
        
    # Payment method
    if re.search(r'(CARTE\s+BANCAIRE|CB|SANS\s+CONTACT|MASTERCARD|VISA)', full_text, re.IGNORECASE):
        payment_method = "CARTE BANCAIRE"
    elif re.search(r'(ESPECES|LIQUIDE)', full_text, re.IGNORECASE):
        payment_method = "ESPÈCES"
    elif re.search(r'(CARTE\s+U|AVANTAGE\s+U)', full_text, re.IGNORECASE):
        payment_method = "CARTE U"

    # 3. Detect Totals & Loyalty
    total_m = re.search(r'(?:TOTAL\s+(?:TTC|EUROS|A\s+PAYER|PAYE)?)\s*[:]?\s*([0-9]+[,\.][0-9]{2})\s*€?', full_text, re.IGNORECASE)
    if total_m:
        total_amount = parse_price(total_m.group(1))

    remises_m = re.search(r'(?:DONT\s+REMISES?|TOTAL\s+REMISES?|REMISES?\s+DEDUITE)\s*[:]?\s*([0-9]+[,\.][0-9]{2})\s*€?', full_text, re.IGNORECASE)
    if remises_m:
        discounts_total = parse_price(remises_m.group(1)) or 0.0

    loyalty_earned_m = re.search(r'(?:AVANTAGES?\s+CARTE\s+U\s+CREDITES?|EUROS?\s+CARTE\s+U\s+GAGNES?)\s*[:]?\s*([0-9]+[,\.][0-9]{2})\s*€?', full_text, re.IGNORECASE)
    if loyalty_earned_m:
        loyalty_earned = parse_price(loyalty_earned_m.group(1)) or 0.0

    loyalty_bal_m = re.search(r'(?:NOUVEAU\s+SOLDE\s+CARTE\s+U|SOLDE\s+CARTE\s+U)\s*[:]?\s*([0-9]+[,\.][0-9]{2})\s*€?', full_text, re.IGNORECASE)
    if loyalty_bal_m:
        loyalty_balance = parse_price(loyalty_bal_m.group(1))

    # 4. Parse Items
    # Look for item patterns in Super U receipts:
    # Standard line: `NAME_OF_PRODUCT    12,45 1` or `NAME    12,45 €`
    # Quantity line below or above: `2 X 1,50   3,00` or `0,850 kg x 2,90 €/kg`
    line_item_regex = re.compile(r'^([A-Z0-9\s\.\-\'\&]{3,45}?)\s+([0-9]+[,\.][0-9]{2})\s*(?:€|\s+[1234])?$', re.IGNORECASE)
    qty_price_regex = re.compile(r'([0-9]+(?:\.[0-9]+)?)\s*[Xx*]\s*([0-9]+[,\.][0-9]{2})')
    weight_regex = re.compile(r'([0-9]+[,\.][0-9]+)\s*kg\s*[xX*]\s*([0-9]+[,\.][0-9]{2})\s*€?/kg', re.IGNORECASE)
    discount_line_regex = re.compile(r'(?:REMISE|PROMO|AVANTAGE)\s+([A-Z0-9\s]+)?\s*(-?[0-9]+[,\.][0-9]{2})', re.IGNORECASE)

    current_idx = 0
    in_items_section = False
    
    stop_words = ["TOTAL", "SOUS-TOTAL", "REGL.", "REGLEMENT", "CARTE BANCAIRE", "RENDU", "DONT TVA", "ARTICLES", "MERCI DE VOTRE VISITE"]

    for i, line in enumerate(lines):
        line_clean = line.strip()
        
        # Check if we hit end of items
        if any(line_clean.upper().startswith(sw) for sw in stop_words):
            in_items_section = False
            continue

        # Look for discount line
        disc_m = discount_line_regex.search(line_clean)
        if disc_m:
            disc_val = abs(parse_price(disc_m.group(2)) or 0.0)
            if items:
                items[-1]["discount"] += disc_val
            discounts_total = max(discounts_total, disc_val)
            continue

        # Look for weight line modifier for previous item
        w_m = weight_regex.search(line_clean)
        if w_m and items:
            kg_val = parse_price(w_m.group(1))
            price_kg = parse_price(w_m.group(2))
            if kg_val and price_kg:
                items[-1]["quantity"] = kg_val
                items[-1]["unit_price"] = price_kg
                items[-1]["unit_measure"] = "kg"
            continue

        # Look for quantity multiplier line
        qty_m = qty_price_regex.search(line_clean)
        if qty_m and items:
            q = float(qty_m.group(1))
            up = parse_price(qty_m.group(2))
            if up:
                items[-1]["quantity"] = q
                items[-1]["unit_price"] = up
            continue

        # Standard item row
        m = line_item_regex.match(line_clean)
        if m:
            item_raw_name = m.group(1).strip()
            total_p = parse_price(m.group(2))
            
            # Filter out headers, totals or meta lines
            if any(skip in item_raw_name.upper() for skip in ["TOTAL", "SOUS TOTAL", "TVA", "CARTE", "POINTS", "REMISE", "RENDU", "EUROS", "ESPECES"]):
                continue
                
            if total_p is not None and total_p > 0 and len(item_raw_name) >= 3:
                current_idx += 1
                clean_name = clean_product_name(item_raw_name)
                category = categorize_item(clean_name)
                
                items.append({
                    "line_number": current_idx,
                    "raw_name": item_raw_name,
                    "clean_name": clean_name,
                    "category": category,
                    "quantity": 1.0,
                    "unit_price": total_p,
                    "total_price": total_p,
                    "discount": 0.0,
                    "unit_measure": "pièce",
                    "date": ticket_date
                })

    # If total_amount was not found in header/footer, sum the items
    if total_amount is None:
        if items:
            total_amount = round(sum(it["total_price"] - it["discount"] for it in items), 2)
        else:
            total_amount = 0.0

    return {
        "store_name": store_name,
        "store_city": store_city,
        "ticket_number": ticket_number or f"T-{abs(hash(full_text)) % 1000000:06d}",
        "caisse_number": caisse_number,
        "date": ticket_date,
        "total_amount": total_amount,
        "discounts_total": round(discounts_total, 2),
        "loyalty_earned": round(loyalty_earned, 2),
        "loyalty_balance": loyalty_balance,
        "items_count": len(items),
        "payment_method": payment_method,
        "raw_text": full_text[:4000], # store excerpt
        "source_type": source_type,
        "source_filename": source_filename,
        "items": items
    }

def parse_html_email(html_content: str, source_filename: str = "") -> Dict[str, Any]:
    """Parse HTML email from Courses U or Super U."""
    soup = BeautifulSoup(html_content, "html.parser")
    # Extract visible plain text
    text = soup.get_text(separator="\n")
    return parse_superu_ticket(text, source_type="email_html", source_filename=source_filename)
