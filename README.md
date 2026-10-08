# 🛒 Super U — Gestionnaire de Tickets de Caisse & Suivi des Prix

Application Web complète pour centraliser, archiver et analyser vos tickets de caisse **Super U / Courses U** directement depuis vos emails **Gmail**.

---

## ✨ Fonctionnalités Principales

- 📬 **Récupération Automatique Gmail** :
  - Connexion sécurisée en IMAP via un *Mot de passe d'application Google* (16 caractères).
  - Détection automatique des e-mails Super U / Courses U / Système U et téléchargement des e-tickets PDF ou HTML.
  - Déduplication intelligente pour éviter tout doublon lors des synchronisations répétées.
- 🧾 **Analyse & Découpage Précis des Tickets** :
  - Extraction du nom du magasin, de la ville, de la date, de l'heure et du numéro de ticket.
  - Extraction ligne par ligne de chaque article : libellé, prix unitaire, quantité, poids (kg), remises immédiates.
  - Catégorisation automatique des produits par rayon (*Frais & Produits Laitiers*, *Fruits & Légumes*, *Boucherie & Poissonnerie*, *Épicerie Salée*, *Boissons*, etc.).
  - Prise en compte des **Avantages Carte U** cagnottés et du solde fidélité.
- 📊 **Tableau de Bord & Statistiques par Période** :
  - Filtrage temporel (*Ce mois*, *3 derniers mois*, *Cette année*, *Tout l'historique*).
  - Dépenses totales, nombre de tickets, panier moyen, total des remises obtenues.
  - Graphique d'évolution mensuelle des dépenses vs économies.
  - Graphique circulaire (Donut) de répartition par rayon d'achat.
  - Classement des magasins les plus visités et des produits les plus achetés.
- 📈 **Observatoire des Prix & Inflation** :
  - Moteur de recherche d'articles (ex: *Lait*, *Beurre*, *Saumon*, *Baguette*, *Nutella*...).
  - Courbe interactive de l'historique de prix dans le temps pour chaque produit.
  - Détection automatique des plus fortes hausses de prix (+%) et des plus fortes baisses / promos.
- 📄 **Visionneuse de Ticket Thermique** :
  - Visualisation réaliste du ticket de caisse imprimé façon papier thermique avec code-barres.
  - Option d'impression et de suppression individuelle.
- 📂 **Import Fichiers & Export CSV** :
  - Glisser-déposer de tickets PDF, fichiers EML ou HTML.
  - Export en un clic de tous vos tickets ou de tous vos articles au format CSV (compatible Excel).
- 🧪 **Données de Démonstration Intégrées** :
  - Génération en 1 clic de 6 mois d'achats réalistes Super U avec variations de prix pour tester immédiatement l'interface.

---

## 🚀 Démarrage Rapide

### 1. Prérequis
- **Python 3.9+**
- **Node.js 18+**

### 2. Lancement en une seule commande

Depuis la racine du projet :

```bash
./start.sh
```

Ou avec Python directement :

```bash
python3 run.py
```

L'application sera accessible sur **[http://localhost:8000](http://localhost:8000)**.

---

## 📧 Configuration de la Synchronisation Gmail

Pour récupérer automatiquement vos tickets sans manipulation manuelle :

1. Rendez-vous sur votre compte Google : [Mots de passe d'application Google](https://myaccount.google.com/apppasswords).
   *(Note : la validation en deux étapes doit être active sur votre compte Google).*
2. Saisissez un nom (ex: `Super U`) et cliquez sur **Créer**.
3. Copiez le mot de passe d'application de 16 caractères généré (ex: `abcd efgh ijkl mnop`).
4. Dans l'application web Super U, cliquez sur le bouton **Synchroniser Gmail** en haut à droite.
5. Saisissez votre adresse Gmail et le mot de passe de 16 caractères, puis cliquez sur **Tester la connexion** puis **Synchroniser maintenant**.
6. Vos tickets et articles sont automatiquement téléchargés, analysés et classés !

---

## 🛠️ Architecture Technique

```
SuperU/
├── backend/
│   ├── main.py          # Serveur FastAPI (Endpoints REST, stats, exports, statics)
│   ├── db.py            # SQLite ORM & schéma relationnel (tickets, ticket_items, sync_config)
│   ├── parser.py        # Moteur d'extraction regex & NLP (PDF, HTML, categorisation française)
│   ├── gmail_sync.py    # Synchroniseur IMAP Gmail asynchrone avec suivi en temps réel
│   └── demo_data.py     # Générateur de données de démo réalistes (avec inflation)
├── frontend/
│   ├── src/
│   │   ├── App.jsx                     # Shell React, navigation & gestionnaire de modales
│   │   ├── components/
│   │   │   ├── Dashboard.jsx           # KPIs, graphiques Recharts (barres, donut), top produits
│   │   │   ├── TicketsList.jsx         # Tableau filtrable et recherche des tickets
│   │   │   ├── TicketDetailModal.jsx   # Rendu visuel ticket thermique Super U
│   │   │   ├── PriceTracker.jsx        # Observatoire de prix & tableau des variations
│   │   │   ├── ProductHistoryModal.jsx # Graphique de l'évolution du prix d'un produit
│   │   │   ├── GmailSyncModal.jsx      # Modal de paramétrage & suivi synchronisation Gmail
│   │   │   └── UploadModal.jsx         # Import direct glisser-déposer de PDF/EML
│   │   └── services/api.js             # Client API REST
│   └── package.json
├── data/                               # Base de données SQLite (superu.db)
├── uploads/                            # Fichiers PDF et tickets stockés localement
├── run.py                              # Lanceur unique Python
├── start.sh                            # Script de lancement automatique
└── requirements.txt                    # Dépendances Python
```

---

## 🔒 Confidentialité & Sécurité

- Vos identifiants Gmail et vos tickets de caisse restent **100% locaux** sur votre machine dans la base SQLite locale.
- Le fichier `.gitignore` est configuré pour exclure toute donnée personnelle (`data/`, `uploads/`, `*.db`, `.env`, `credentials.json`).
