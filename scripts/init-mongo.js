// MongoDB initialization script for CanardSino microservices
// This script creates separate databases for each microservice

db = db.getSiblingDB('admin');

// Authenticate as admin
db.auth('admin', process.env.MONGO_PASSWORD);

// Create databases for each microservice
const databases = [
  'auth_db',
  'wallet_db',
  'game_engine_db',
  'chat_db',
  'stats_db',
  'notifier_db',
  'coinmarketcap_db',
  'random_org_db'
];

databases.forEach(dbName => {
  const serviceDb = db.getSiblingDB(dbName);

  // Create a dummy collection to ensure the database is created
  serviceDb.createCollection('_init');

  print(`Database ${dbName} created successfully`);
});

print('MongoDB initialization completed for all microservices');
