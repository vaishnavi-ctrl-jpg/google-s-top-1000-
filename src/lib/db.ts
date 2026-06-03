import fs from 'fs';
import path from 'path';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'db.json');

export interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  lowStockLimit: number;
  price: number;
  costPrice: number;
  supplierName: string;
  supplierPhone: string;
}

export interface SaleItem {
  name: string;
  quantity: number;
  price: number;
  costPrice: number;
}

export interface Sale {
  id: string;
  timestamp: string;
  items: SaleItem[];
  totalAmount: number;
  profit: number;
}

export interface AgentLog {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  details: string;
}

export interface ProcurementAlert {
  id: string;
  timestamp: string;
  itemName: string;
  supplierName: string;
  supplierPhone: string;
  draftMessage: string;
  status: 'pending' | 'sent';
}

export interface DailyReport {
  id: string;
  date: string;
  totalBills: number;
  totalSales: number;
  totalProfit: number;
  lowStockAlerts: string[];
  summary: string;
}

export interface DatabaseSchema {
  inventory: InventoryItem[];
  sales: Sale[];
  logs: AgentLog[];
  procurementAlerts: ProcurementAlert[];
  dailyReports: DailyReport[];
}

const DEFAULT_DB: DatabaseSchema = {
  inventory: [
    { id: '1', name: 'Amul Milk 500ml', stock: 25, lowStockLimit: 10, price: 30, costPrice: 26, supplierName: 'Ramesh Milk Distributor', supplierPhone: '+919876543210' },
    { id: '2', name: 'Parle-G Biscuit Small', stock: 45, lowStockLimit: 15, price: 5, costPrice: 4, supplierName: 'Gupta Kirana Wholesaler', supplierPhone: '+918765432109' },
    { id: '3', name: 'Maggi Noodles 2-Min', stock: 8, lowStockLimit: 12, price: 14, costPrice: 12, supplierName: 'Gupta Kirana Wholesaler', supplierPhone: '+918765432109' },
    { id: '4', name: 'Britannia Marie Gold', stock: 30, lowStockLimit: 10, price: 10, costPrice: 8, supplierName: 'Gupta Kirana Wholesaler', supplierPhone: '+918765432109' },
    { id: '5', name: 'Tata Salt 1kg', stock: 15, lowStockLimit: 5, price: 28, costPrice: 24, supplierName: 'Tata Retail Agency', supplierPhone: '+917654321098' }
  ],
  sales: [],
  logs: [
    { id: 'log_1', timestamp: new Date().toISOString(), agent: 'System', action: 'Initialize', details: 'Vyapar-Agent DB initialized with default catalog.' }
  ],
  procurementAlerts: [],
  dailyReports: []
};

// Initialize DB if not present
function initDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), 'utf-8');
  }
}

export function readDb(): DatabaseSchema {
  initDb();
  try {
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data) as DatabaseSchema;
  } catch (error) {
    console.error('Failed to read db file, returning default schema:', error);
    return DEFAULT_DB;
  }
}

export function writeDb(data: DatabaseSchema) {
  initDb();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

export function addAgentLog(agent: string, action: string, details: string) {
  const db = readDb();
  const newLog: AgentLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    timestamp: new Date().toISOString(),
    agent,
    action,
    details
  };
  db.logs.unshift(newLog); // Keep latest logs at the top
  if (db.logs.length > 500) {
    db.logs = db.logs.slice(0, 500); // Limit logs stored to 500
  }
  writeDb(db);
}
