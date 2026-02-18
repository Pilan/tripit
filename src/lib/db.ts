import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'trip.db');

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initTables(db);
  }
  return db;
}

function initTables(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS trip_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      goal_city TEXT NOT NULL,
      total_cost REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      start_cities TEXT NOT NULL DEFAULT '["Umeå","Sundsvall"]'
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      cost REAL NOT NULL,
      order_index INTEGER NOT NULL,
      description TEXT DEFAULT ''
    );
  `);
}

export interface TripConfig {
  goal_city: string;
  total_cost: number;
  current_amount: number;
  start_cities: string[];
}

export interface Milestone {
  id: number;
  name: string;
  cost: number;
  order_index: number;
  description: string;
}

export function getTripConfig(): TripConfig | null {
  const row = getDb().prepare('SELECT * FROM trip_config WHERE id = 1').get() as any;
  if (!row) return null;
  return {
    goal_city: row.goal_city,
    total_cost: row.total_cost,
    current_amount: row.current_amount,
    start_cities: JSON.parse(row.start_cities),
  };
}

export function upsertTripConfig(config: Omit<TripConfig, 'current_amount'> & { current_amount?: number }) {
  const existing = getTripConfig();
  const currentAmount = config.current_amount ?? existing?.current_amount ?? 0;

  getDb().prepare(`
    INSERT INTO trip_config (id, goal_city, total_cost, current_amount, start_cities)
    VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      goal_city = excluded.goal_city,
      total_cost = excluded.total_cost,
      current_amount = excluded.current_amount,
      start_cities = excluded.start_cities
  `).run(config.goal_city, config.total_cost, currentAmount, JSON.stringify(config.start_cities));
}

export function updateProgress(amount: number) {
  getDb().prepare('UPDATE trip_config SET current_amount = ? WHERE id = 1').run(amount);
}

export function getMilestones(): Milestone[] {
  return getDb().prepare('SELECT * FROM milestones ORDER BY order_index ASC').all() as Milestone[];
}

export function setMilestones(milestones: Omit<Milestone, 'id'>[]) {
  const db = getDb();
  const deleteAll = db.prepare('DELETE FROM milestones');
  const insert = db.prepare('INSERT INTO milestones (name, cost, order_index, description) VALUES (?, ?, ?, ?)');

  const transaction = db.transaction((items: Omit<Milestone, 'id'>[]) => {
    deleteAll.run();
    for (const m of items) {
      insert.run(m.name, m.cost, m.order_index, m.description || '');
    }
  });

  transaction(milestones);
}

export function seedFromConfig(configData: {
  goal_city: string;
  total_cost: number;
  current_amount: number;
  start_cities: string[];
  milestones: Omit<Milestone, 'id'>[];
}) {
  upsertTripConfig({
    goal_city: configData.goal_city,
    total_cost: configData.total_cost,
    current_amount: configData.current_amount,
    start_cities: configData.start_cities,
  });
  setMilestones(configData.milestones);
}

export function getFullData() {
  return {
    config: getTripConfig(),
    milestones: getMilestones(),
  };
}
