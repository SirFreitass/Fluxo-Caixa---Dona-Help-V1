import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = new Database('database.sqlite');

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    paymentMethod TEXT,
    simplesNacionalRate REAL,
    cardTaxRate REAL,
    providerPayoutType TEXT,
    providerPayoutValue REAL,
    netAmount REAL
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    category TEXT NOT NULL,
    name TEXT NOT NULL,
    defaultPrice REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

// Insert default settings if empty
const countSettings = db.prepare('SELECT COUNT(*) as count FROM settings').get() as { count: number };
if (countSettings.count === 0) {
  db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('simplesNacionalRate', '6');
}

// Insert default services if empty
const countServices = db.prepare('SELECT COUNT(*) as count FROM services').get() as { count: number };
if (countServices.count === 0) {
  const insertService = db.prepare('INSERT INTO services (id, category, name, defaultPrice) VALUES (?, ?, ?, ?)');
  const defaultServices = [
    { id: 'res-8h', category: 'residencial', name: 'Serviço de 8h', defaultPrice: 200 },
    { id: 'res-6h', category: 'residencial', name: 'Serviço de 6h', defaultPrice: 160 },
    { id: 'res-4h', category: 'residencial', name: 'Serviço de 4h', defaultPrice: 120 },
    { id: 'men-8h', category: 'mensal', name: 'Mensal Serviço de 8h', defaultPrice: 180 },
    { id: 'men-6h', category: 'mensal', name: 'Mensal Serviço de 6h', defaultPrice: 140 },
    { id: 'men-4h', category: 'mensal', name: 'Mensal Serviço de 4h', defaultPrice: 100 },
    { id: 'pos-obra', category: 'pos-obra', name: 'Limpeza Pós-Obra', defaultPrice: 500 },
  ];
  const insertMany = db.transaction((services) => {
    for (const s of services) {
      insertService.run(s.id, s.category, s.name, s.defaultPrice);
    }
  });
  insertMany(defaultServices);
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
    }
  });

  app.use(express.json());

  // API Routes
  app.get('/api/transactions', (req, res) => {
    const transactions = db.prepare('SELECT * FROM transactions ORDER BY date DESC').all();
    res.json(transactions);
  });

  app.get('/api/services', (req, res) => {
    const services = db.prepare('SELECT * FROM services').all();
    res.json(services);
  });

  app.get('/api/settings', (req, res) => {
    const settings = db.prepare('SELECT * FROM settings').all() as { key: string, value: string }[];
    const settingsObj = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);
    res.json(settingsObj);
  });

  app.put('/api/settings/:key', (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
      io.emit('settingUpdated', { key, value });
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating setting:', error);
      res.status(500).json({ error: 'Failed to update setting' });
    }
  });

  app.post('/api/transactions', (req, res) => {
    try {
      const transaction = req.body;
      const stmt = db.prepare(`
        INSERT INTO transactions (
          id, description, amount, type, date, category, 
          paymentMethod, simplesNacionalRate, cardTaxRate, 
          providerPayoutType, providerPayoutValue, netAmount
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      stmt.run(
        transaction.id,
        transaction.description,
        transaction.amount,
        transaction.type,
        transaction.date,
        transaction.category,
        transaction.paymentMethod ?? null,
        transaction.simplesNacionalRate ?? null,
        transaction.cardTaxRate ?? null,
        transaction.providerPayoutType ?? null,
        transaction.providerPayoutValue ?? null,
        transaction.netAmount ?? null
      );

      io.emit('transactionAdded', transaction);
      res.json({ success: true });
    } catch (error) {
      console.error('Error adding transaction:', error);
      res.status(500).json({ error: 'Failed to add transaction' });
    }
  });

  app.delete('/api/transactions/:id', (req, res) => {
    try {
      const { id } = req.params;
      db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
      io.emit('transactionDeleted', id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      res.status(500).json({ error: 'Failed to delete transaction' });
    }
  });

  app.put('/api/services/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { price } = req.body;
      db.prepare('UPDATE services SET defaultPrice = ? WHERE id = ?').run(price, id);
      io.emit('servicePriceUpdated', { id, price });
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating service price:', error);
      res.status(500).json({ error: 'Failed to update service price' });
    }
  });

  // Socket.IO for real-time updates
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('addTransaction', (transaction) => {
      try {
        const stmt = db.prepare(`
          INSERT INTO transactions (
            id, description, amount, type, date, category, 
            paymentMethod, simplesNacionalRate, cardTaxRate, 
            providerPayoutType, providerPayoutValue, netAmount
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        stmt.run(
          transaction.id,
          transaction.description,
          transaction.amount,
          transaction.type,
          transaction.date,
          transaction.category,
          transaction.paymentMethod ?? null,
          transaction.simplesNacionalRate ?? null,
          transaction.cardTaxRate ?? null,
          transaction.providerPayoutType ?? null,
          transaction.providerPayoutValue ?? null,
          transaction.netAmount ?? null
        );

        // Broadcast to all clients including sender
        io.emit('transactionAdded', transaction);
      } catch (error) {
        console.error('Error adding transaction:', error);
      }
    });

    socket.on('deleteTransaction', (id) => {
      try {
        db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
        io.emit('transactionDeleted', id);
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    });

    socket.on('updateServicePrice', ({ id, price }) => {
      try {
        db.prepare('UPDATE services SET defaultPrice = ? WHERE id = ?').run(price, id);
        io.emit('servicePriceUpdated', { id, price });
      } catch (error) {
        console.error('Error updating service price:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
