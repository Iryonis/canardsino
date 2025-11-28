# 🎰 CoinCoin Casino - Projet Universitaire

Plateforme de casino en ligne avec architecture microservices et support crypto (Polygon).

## 📁 Structure du Projet

```
coincoincasino/
├── docker-compose.yml          # Orchestration de tous les services
├── nginx.conf                  # Configuration du reverse proxy
├── .env.template               # Template des variables d'environnement
├── .env                        # Variables d'environnement (à créer)
├── start.sh                    # Script de démarrage rapide
│
├── frontend/                   # Application Next.js (à créer)
│   ├── src/
│   ├── public/
│   └── package.json
│
└── services/                   # Microservices (à créer)
    ├── auth/                   # Service d'authentification (8001)
    ├── wallet/                 # Service de portefeuille (8002)
    ├── game-engine/            # Moteur de jeu (8003)
    ├── chat/                   # Service de chat SSE (8004)
    ├── stats/                  # Service de statistiques (8005)
    ├── notifier/               # Service de notifications (8006)
    └── coinmarketcap/          # Service API CMC (8007)
```

## 🏗️ Architecture

```
Internet (Port 80)
    ↓
NGINX (Reverse Proxy)
    ↓
┌───────────────────────────────────────────────────────┐
│                                                       │
│  /           → Next.js Frontend (3000)                │
│  /api/auth   → Auth Service (8001)                    │
│  /api/wallet → Wallet Service (8002)                  │
│  /api/games  → Game Engine (8003)                     │
│  /api/chat   → Chat Service SSE (8004)                │
│  /api/stats  → Stats Service SSE (8005)               │
│                                                       │
└───────────────────────────────────────────────────────┘
    ↓
RabbitMQ (Message Bus)
    ↓
PostgreSQL + Redis
```

## 🚀 Quick Start

### 1. Configuration

```bash
# Copier le template
cp .env.template .env

# Éditer .env et remplir les variables
nano .env
```

Variables minimales requises :
```env
JWT_SECRET=changeme
JWT_REFRESH_SECRET=changeme
POSTGRES_PASSWORD=changeme
REDIS_PASSWORD=changeme
RABBITMQ_PASSWORD=changeme

# Pour la blockchain (optionnel pour le début)
POLYGON_RPC_URL=https://polygon-rpc.com
CCC_TOKEN_ADDRESS=0x...
HOT_WALLET_PRIVATE_KEY=0x...

# APIs externes (optionnel pour le début)
CMC_API_KEY=your-key
RANDOM_ORG_API_KEY=your-key
```

### 2. Démarrer l'application

```bash
# Avec le script (recommandé)
chmod +x start.sh
./start.sh

# Ou manuellement
docker-compose up -d

# Voir les logs
docker-compose logs -f
```

### 3. Accéder à l'application

- **Frontend** : http://localhost
- **RabbitMQ Management** : http://localhost:15672 (user: casino_rabbit)
- **PostgreSQL** : localhost:5432
- **Redis** : localhost:6379

### 4. Arrêter l'application

```bash
docker-compose down

# Supprimer aussi les données
docker-compose down -v
```

## 🔧 Développement

### Créer le Frontend (Next.js)

```bash
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend
npm install ethers wagmi viem
```

Structure recommandée :
```
frontend/src/
├── app/
│   ├── layout.tsx              # Layout global
│   ├── page.tsx                # Page d'accueil
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── profile/page.tsx
│   ├── dashboard/page.tsx
│   └── games/
│       └── roulette/page.tsx
├── components/
│   ├── Navbar.tsx
│   ├── RouletteWheel.tsx
│   └── BettingBoard.tsx
└── lib/
    ├── api.ts                  # Client API
    └── web3.ts                 # Web3 wallet
```

### Créer un Microservice (exemple : Auth)

```bash
mkdir -p services/auth/src
cd services/auth
npm init -y
npm install express typescript @types/express @types/node
npm install jsonwebtoken bcrypt pg dotenv cors
npm install --save-dev ts-node nodemon
```

Structure recommandée :
```
services/auth/src/
├── server.ts                   # Point d'entrée
├── controllers/
│   └── authController.ts
├── models/
│   └── userModel.ts
├── routes/
│   └── authRoutes.ts
└── middleware/
    └── authMiddleware.ts
```

Dockerfile basique :
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 8001
CMD ["npm", "start"]
```

## 📊 Services Disponibles

| Service | Port | Description |
|---------|------|-------------|
| NGINX | 80 | Reverse proxy |
| Frontend | 3000 | Application Next.js |
| Auth | 8001 | Authentification JWT |
| Wallet | 8002 | Gestion crypto/CCC |
| Game Engine | 8003 | Logique jeux (Roulette) |
| Chat | 8004 | Feed temps réel (SSE) |
| Stats | 8005 | Statistiques (SSE) |
| Notifier | 8006 | Notifications |
| CoinMarketCap | 8007 | Prix crypto |
| PostgreSQL | 5432 | Base de données |
| Redis | 6379 | Cache |
| RabbitMQ | 5672 | Message bus |

## 🎮 API Endpoints

Documentation complète OpenAPI disponible dans `casino-api-openapi.yaml`.

### Endpoints principaux :

**Auth**
- `POST /api/auth/register` - Créer un compte
- `POST /api/auth/login` - Se connecter
- `POST /api/auth/refresh` - Rafraîchir le token
- `GET /api/profile` - Profil utilisateur

**Wallet**
- `GET /api/wallet/balance` - Solde CCC
- `GET /api/wallet/deposit/address` - Adresse de dépôt
- `POST /api/wallet/withdraw/request` - Retrait

**Games**
- `GET /api/games/roulette/config` - Config du jeu
- `POST /api/games/roulette/bet` - Placer un pari
- `POST /api/games/roulette/validate` - Valider et lancer
- `GET /api/games/roulette/result/{id}` - Résultat

**Chat (SSE)**
- `GET /api/chat/stream` - Stream des événements

**Stats (SSE)**
- `GET /api/stats/stream` - Stream des stats
- `GET /api/stats/dashboard` - Dashboard

## 🪙 Token CCC

- **Taux fixe** : 1000 CCC = 1 USD
- **Dépôts** : ETH, USDC sur Polygon
- **Conversion automatique** vers CCC
- **Mise minimum** : 2000 CCC (2$)

## 🎲 Roulette

- **Type** : Roulette européenne (37 numéros: 0-36)
- **Paris disponibles** :
  - Numéro plein (35:1)
  - Rouge/Noir (1:1)
  - Pair/Impair (1:1)
  - Douzaines (2:1)
  - Colonnes (2:1)
  - Et tous les autres types classiques
- **Random.org** pour génération aléatoire

## 🔧 Commandes Utiles

```bash
# Voir tous les services
docker-compose ps

# Logs d'un service spécifique
docker-compose logs -f auth

# Redémarrer un service
docker-compose restart auth

# Rebuild un service
docker-compose up -d --build auth

# Accéder à un container
docker exec -it coincoincasino-auth sh

# Voir les logs NGINX
docker logs coincoincasino-nginx

# Accéder à PostgreSQL
docker exec -it coincoincasino-postgres psql -U casino_user -d casino_auth
```

## 📝 TODO pour le projet

### Phase 1 : Setup de base
- [ ] Configurer .env
- [ ] Créer frontend Next.js
- [ ] Créer service Auth basique
- [ ] Tester connexion NGINX → Frontend → Auth

### Phase 2 : Authentification
- [ ] Register/Login avec JWT
- [ ] Middleware d'authentification
- [ ] Gestion du profil utilisateur

### Phase 3 : Wallet
- [ ] Génération adresse de dépôt
- [ ] Affichage du solde CCC
- [ ] Historique des transactions

### Phase 4 : Game Engine
- [ ] Configuration roulette
- [ ] Système de paris
- [ ] Intégration Random.org
- [ ] Calcul des gains

### Phase 5 : Temps réel
- [ ] Chat SSE (feed des résultats)
- [ ] Stats SSE (mise à jour balance)
- [ ] RabbitMQ pour événements

### Phase 6 : Finitions
- [ ] Dashboard avec statistiques
- [ ] Tests unitaires
- [ ] Documentation
- [ ] Présentation

## 🐛 Troubleshooting

**Services ne démarrent pas**
```bash
docker-compose down -v
docker-compose up -d
docker-compose logs
```

**Erreur "port already in use"**
```bash
# Trouver le process sur le port
sudo lsof -i :80
sudo kill -9 <PID>
```

**NGINX ne route pas**
```bash
# Vérifier la config
docker exec coincoincasino-nginx nginx -t

# Recharger NGINX
docker exec coincoincasino-nginx nginx -s reload
```

## 📖 Documentation

- **OpenAPI Spec** : `casino-api-openapi.yaml`
- **Import dans Swagger** : https://editor.swagger.io/
- **Architecture** : Voir diagrammes ci-dessus

## 📞 Support

Pour questions ou problèmes :
1. Vérifier les logs : `docker-compose logs -f`
2. Consulter la doc OpenAPI
3. Vérifier que .env est bien configuré

## 🎓 Notes pour le rendu universitaire

Ce projet démontre :
- ✅ Architecture microservices
- ✅ Reverse proxy avec NGINX
- ✅ Containerisation Docker
- ✅ Communication inter-services (RabbitMQ)
- ✅ SSE pour temps réel
- ✅ API REST bien documentée (OpenAPI)
- ✅ Frontend moderne (Next.js/React)
- ✅ Intégration blockchain (Web3)

Bon courage pour ton projet ! 🚀