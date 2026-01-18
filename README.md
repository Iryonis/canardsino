# CoinCoin Casino - Projet Universitaire

Plateforme de casino en ligne avec architecture microservices et support crypto (Polygon).

## Structure du Projet

```
coincoincasino/
├── docker-compose.yml          # Orchestration des services
├── nginx.conf                  # Configuration du reverse proxy
├── .env.template               # Template des variables d'environnement
├── .env                        # Variables d'environnement
├── docs/
│   └── openapi.yaml            # Documentation OpenAPI centralisee
│
├── frontend/                   # Application Next.js 16 (React 19)
│   ├── src/
│   │   ├── app/                # App Router
│   │   ├── components/         # Composants React
│   │   └── lib/                # Utilitaires et API client
│   └── package.json
│
├── services/
│   ├── auth/                   # Service d'authentification (8001)
│   ├── wallet/                 # Service de portefeuille (8002)
│   ├── game-engine/            # Moteur de jeu - Roulette & Duck Race (8003)
│   ├── chat/                   # Service de chat WebSocket (8004)
│   ├── stats/                  # Service de statistiques SSE (8005)
│   ├── notifier/               # Service de notifications (8006)
│   ├── coinmarketcap/          # Service prix crypto (8007)
│   └── random-org/             # Service Random.org (8008)
│
└── scripts/
    └── init-mongo.js           # Initialisation MongoDB
```

## Architecture

```
Internet (Port 80)
    ↓
NGINX (Reverse Proxy)
    ↓
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│  /                    → Next.js Frontend (3000)             │
│  /api/auth            → Auth Service (8001)                 │
│  /api/wallet          → Wallet Service (8002)               │
│  /api/games           → Game Engine (8003)                  │
│  /api/chat            → Chat Service WebSocket (8004)       │
│  /api/stats           → Stats Service SSE (8005)            │
│  /api/prices          → CoinMarketCap Service (8007)        │
│                                                             │
│  /api/*/docs/         → Documentation Swagger UI            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
    ↓
RabbitMQ (Message Bus) + MongoDB + Redis
```

## Quick Start

### 1. Configuration

```bash
# Copier le template
cp .env.template .env

# Editer .env et remplir les variables
nano .env
```

Variables requises :
```env
# Base de donnees
MONGO_PASSWORD=your_mongo_password

# JWT
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret

# Services
REDIS_PASSWORD=your_redis_password
RABBITMQ_PASSWORD=your_rabbitmq_password

# Blockchain (Polygon)
POLYGON_RPC_URL=https://polygon-rpc.com
HOT_WALLET_PRIVATE_KEY=0x...

# APIs externes
CMC_API_KEY=your_coinmarketcap_key
RANDOM_ORG_API_KEY=your_random_org_key
```

### 2. Demarrer l'application

```bash
# Demarrer tous les services
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

### 3. Acceder a l'application

- **Frontend** : http://localhost
- **RabbitMQ Management** : http://localhost:15672 (user: casino_rabbit)
- **MongoDB** : localhost:27017
- **Redis** : localhost:6379

### 4. Arreter l'application

```bash
docker-compose down

# Supprimer aussi les donnees
docker-compose down -v
```

## Documentation API (Swagger)

Chaque microservice expose sa documentation OpenAPI via Swagger UI :

| Service | URL Documentation |
|---------|-------------------|
| Auth | http://localhost/api/auth/docs/ |
| Wallet | http://localhost/api/wallet/docs/ |
| Game Engine | http://localhost/api/games/docs/ |
| Chat | http://localhost/api/chat/docs/ |
| Stats | http://localhost/api/stats/docs/ |
| Prices (CMC) | http://localhost/api/prices/docs/ |

**Note** : Le trailing slash `/` est requis.

**Fichier OpenAPI statique** : `docs/openapi.yaml`

## Services

| Service | Port | Description |
|---------|------|-------------|
| NGINX | 80 | Reverse proxy |
| Frontend | 3000 | Application Next.js 16 (React 19) |
| Auth | 8001 | Authentification JWT |
| Wallet | 8002 | Gestion crypto/CCC avec Polygon |
| Game Engine | 8003 | Roulette + Duck Race (WebSocket) |
| Chat | 8004 | Feed temps reel (WebSocket) |
| Stats | 8005 | Statistiques (SSE) |
| Notifier | 8006 | Notifications (RabbitMQ consumer) |
| CoinMarketCap | 8007 | Prix crypto avec cache Redis |
| Random.org | 8008 | Generation aleatoire certifiee |
| MongoDB | 27017 | Base de donnees |
| Redis | 6379 | Cache |
| RabbitMQ | 5672 | Message bus |

## API Endpoints

### Auth Service (`/api/auth`)
| Methode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/register` | Creer un compte |
| POST | `/login` | Se connecter |
| POST | `/refresh` | Rafraichir le token |
| GET | `/profile` | Profil utilisateur (auth requise) |

### Wallet Service (`/api/wallet`)
| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/balance` | Solde CCC |
| GET | `/deposit-info` | Infos de depot (adresse, tokens supportes) |
| POST | `/deposit` | Traiter un depot crypto |
| GET | `/transactions` | Historique des transactions |
| POST | `/give` | Crediter des tokens (test) |

### Game Engine (`/api/games`)

#### Roulette (`/api/games/roulette`)
| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/config` | Configuration du jeu |
| POST | `/simple-bets` | Placer des paris |
| POST | `/spin` | Lancer la roue |
| GET | `/history` | Historique des parties |
| GET | `/big-wins` | Gros gains recents |
| WebSocket | `/ws` | Roulette multijoueur |

#### Duck Race (`/api/games/duck-race`)
| Methode | Endpoint | Description |
|---------|----------|-------------|
| WebSocket | `/ws` | Course de canards multijoueur |

### Stats Service (`/api/stats`)
| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/stream` | Stream SSE des statistiques |

### Chat Service (`/api/chat`)
| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/health` | Status du service |
| POST | `/system-message` | Broadcast message systeme |
| WebSocket | `/` | Chat en temps reel |

### Prices Service (`/api/prices`)
| Methode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/quotes` | Tous les prix crypto |
| GET | `/:symbol` | Prix d'une crypto |
| GET | `/supported` | Cryptos supportees |
| GET | `/deposit-tokens` | Tokens acceptes pour depot |
| GET | `/convert/:symbol/:amount` | Conversion crypto -> CCC |

## Jeux

### Roulette Europeenne
- **Type** : Roulette europeenne (37 numeros: 0-36)
- **Mise minimum** : 2000 CCC (2$)
- **Paris disponibles** :
  - Numero plein (35:1)
  - Rouge/Noir (1:1)
  - Pair/Impair (1:1)
  - Haut/Bas (1:1)
  - Douzaines (2:1)
  - Colonnes (2:1)
  - Split, Street, Corner, Line
- **Random.org** pour generation aleatoire certifiee

### Duck Race
- **Type** : Course de canards multijoueur
- **Joueurs** : 1-5 par course
- **Mise** : Definie par le createur de la salle
- **Paiement** : Winner takes all
- **Communication** : WebSocket temps reel

## Token CCC

- **Taux fixe** : 1000 CCC = 1 USD
- **Depots acceptes** : ETH, USDC, WETH sur Polygon
- **Conversion automatique** vers CCC
- **Mise minimum** : 2000 CCC (2$)

## Commandes Utiles

```bash
# Voir tous les services
docker-compose ps

# Logs d'un service specifique
docker-compose logs -f auth

# Redemarrer un service
docker-compose restart auth

# Rebuild un service
docker-compose up -d --build auth

# Acceder a un container
docker exec -it coincoincasino-auth sh

# Verifier la config NGINX
docker exec coincoincasino-nginx nginx -t

# Recharger NGINX
docker exec coincoincasino-nginx nginx -s reload

# Acceder a MongoDB
docker exec -it coincoincasino-mongodb mongosh -u casino_admin -p $MONGO_PASSWORD
```

## Troubleshooting

**Services ne demarrent pas**
```bash
docker-compose down -v
docker-compose up -d
docker-compose logs
```

**Erreur "port already in use"**
```bash
sudo lsof -i :80
sudo kill -9 <PID>
```

**NGINX ne route pas**
```bash
docker exec coincoincasino-nginx nginx -t
docker exec coincoincasino-nginx nginx -s reload
```

**Swagger UI redirige vers /docs**
- Utiliser les URLs avec trailing slash : `/api/auth/docs/`

## Stack Technique

### Frontend
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS 4
- Reown AppKit (Web3)

### Backend
- Node.js + Express
- TypeScript
- MongoDB + Mongoose
- Redis (cache)
- RabbitMQ (messaging)

### Infrastructure
- Docker + Docker Compose
- NGINX (reverse proxy)
- Polygon (blockchain)

## Notes pour le rendu universitaire

Ce projet demontre :
- Architecture microservices (8 services independants)
- Reverse proxy avec NGINX
- Containerisation Docker
- Communication inter-services (RabbitMQ)
- WebSocket pour temps reel (Roulette, Duck Race, Chat)
- SSE pour statistiques
- API REST documentee (OpenAPI/Swagger)
- Frontend moderne (Next.js 16 / React 19)
- Integration blockchain (Polygon via Reown AppKit)
- Cache distribue (Redis)
- Base de donnees NoSQL (MongoDB)
