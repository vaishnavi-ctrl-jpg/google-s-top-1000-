'use client';

import React, { useState, useEffect, useRef } from 'react';

interface InventoryItem {
  id: string;
  name: string;
  stock: number;
  lowStockLimit: number;
  price: number;
  costPrice: number;
  supplierName: string;
  supplierPhone: string;
}

interface Sale {
  id: string;
  timestamp: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalAmount: number;
  profit: number;
}

interface AgentLog {
  id: string;
  timestamp: string;
  agent: string;
  action: string;
  details: string;
}

interface ProcurementAlert {
  id: string;
  timestamp: string;
  itemName: string;
  supplierName: string;
  supplierPhone: string;
  draftMessage: string;
  status: 'pending' | 'sent';
}

export default function DashboardPage() {
  // Application State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [alerts, setAlerts] = useState<ProcurementAlert[]>([]);
  const [metrics, setMetrics] = useState({ totalSales: 0, totalProfit: 0, totalBills: 0 });
  
  // Interactive UI Inputs
  const [billInput, setBillInput] = useState('');
  const [isProcessingBill, setIsProcessingBill] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'mitra'; text: string }>>([
    { role: 'mitra', text: 'Namaste Ji! Main aapka Dukaan Mitra AI hu. Aaj aapka business kaisa chal raha hai? Main aapki inventory aur sales me madad kar sakta hu. Mujhse koi bhi sawal poochiye!' }
  ]);
  const [isChatSending, setIsChatSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'sales'>('inventory');

  const logEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Quick Preset Receipts for easy demo
  const PRESETS = {
    preset1: `
==================================
    KIRANA SUPER MART - PUNE
==================================
DATE: 01-06-2026 15:42
----------------------------------
ITEMS SOLD:
----------------------------------
* Amul Milk 500ml      2 QTY   x 30.00
* Parle-G small        5 QTY   x  5.00
----------------------------------
TOTAL PAID: ₹85.00
==================================
`,
    preset2: `
==================================
    KIRANA SUPER MART - PUNE
==================================
DATE: 01-06-2026 19:10
----------------------------------
* Maggi 2-Min         10 QTY   x 14.00
* Tata Salt 1kg       1 QTY   x 28.00
----------------------------------
TOTAL PAID: ₹168.00
==================================
`
  };

  // Fetch Dashboard State
  const refreshData = async () => {
    try {
      // 1. Fetch sales & metrics & logs
      const salesRes = await fetch('/api/sales');
      const salesData = await salesRes.json();
      if (salesData.success) {
        setSales(salesData.sales);
        setLogs(salesData.logs);
        setMetrics(salesData.metrics);
      }

      // 2. Fetch inventory
      const invRes = await fetch('/api/inventory');
      const invData = await invRes.json();
      if (invData.success) {
        setInventory(invData.inventory);
      }

      // 3. Fetch alerts
      const alertsRes = await fetch('/api/procurement');
      const alertsData = await alertsRes.json();
      if (alertsData.success) {
        setAlerts(alertsData.alerts);
      }
    } catch (error) {
      console.error('Error fetching dashboard state:', error);
    }
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 4000); // Poll every 4 seconds
    return () => clearInterval(interval);
  }, []);

  // Scroll logs and chats to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  // Process receipt via API (Supervisor Agent 0 pipeline)
  const handleProcessBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billInput.trim()) return;

    setIsProcessingBill(true);
    try {
      const response = await fetch('/api/supervisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptText: billInput })
      });
      const data = await response.json();
      if (data.success) {
        setBillInput('');
        refreshData();
      }
    } catch (err) {
      console.error('Failed to submit receipt:', err);
    } finally {
      setIsProcessingBill(false);
    }
  };

  // Restock an item manually in 1-Click
  const handleRestock = async (itemId: string, amount: number) => {
    try {
      const response = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'restock', itemId, amount })
      });
      const data = await response.json();
      if (data.success) {
        refreshData();
      }
    } catch (err) {
      console.error('Restock request failed:', err);
    }
  };

  // Mark Procurement WhatsApp reorder alert as SENT
  const handleConfirmReorder = async (alertId: string, whatsappUrl: string) => {
    try {
      // 1. Open WhatsApp Web or Mobile in new tab
      window.open(whatsappUrl, '_blank');

      // 2. Mark as sent in DB
      const response = await fetch('/api/procurement', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId })
      });
      const data = await response.json();
      if (data.success) {
        refreshData();
      }
    } catch (err) {
      console.error('Failed to confirm reorder alert:', err);
    }
  };

  // Conversational Assistant (Dukaan Mitra Agent 4)
  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userText = chatInput;
    setChatInput('');
    setChatHistory(prev => [...prev, { role: 'user', text: userText }]);
    setIsChatSending(true);

    try {
      const response = await fetch('/api/helper', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      });
      const data = await response.json();
      if (data.success) {
        setChatHistory(prev => [...prev, { role: 'mitra', text: data.response }]);
      }
    } catch (err) {
      console.error('Chat request failed:', err);
    } finally {
      setIsChatSending(false);
    }
  };

  return (
    <div className="app-container">
      {/* BRAND HEADER */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo-glow"></div>
          <h1 className="brand-title">VYAPAR-AGENT</h1>
          <span className="brand-tag">Autonomous Kirana ERP</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            🟢 Local Bridge Script Connected
          </div>
        </div>
      </header>

      {/* METRIC SUMMARIES */}
      <div className="metrics-row">
        <div className="glass-card metric-card">
          <span className="metric-title">Today&apos;s Net Profit</span>
          <span className="metric-value value-profit">₹{metrics.totalProfit}</span>
        </div>
        <div className="glass-card metric-card">
          <span className="metric-title">Total Sales Revenue</span>
          <span className="metric-value value-sales">₹{metrics.totalSales}</span>
        </div>
        <div className="glass-card metric-card">
          <span className="metric-title">Bills Processed</span>
          <span className="metric-value value-bills">{metrics.totalBills}</span>
        </div>
      </div>

      {/* MAIN CONTENT ROWS */}
      <div className="dashboard-grid">
        
        {/* LEFT COLUMN: ACTIVE INVENTORY & SALES */}
        <div className="glass-card grid-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', gap: '16px' }}>
              <button 
                onClick={() => setActiveTab('inventory')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeTab === 'inventory' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  paddingBottom: '4px',
                  borderBottom: activeTab === 'inventory' ? '2px solid var(--primary)' : 'none'
                }}
              >
                📦 Real-Time Inventory Status
              </button>
              <button 
                onClick={() => setActiveTab('sales')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: activeTab === 'sales' ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  paddingBottom: '4px',
                  borderBottom: activeTab === 'sales' ? '2px solid var(--primary)' : 'none'
                }}
              >
                🧾 Sales Transaction Feed
              </button>
            </div>
            <button className="premium-btn" style={{ padding: '6px 12px', fontSize: '12px' }} onClick={refreshData}>
              🔄 Refresh
            </button>
          </div>

          {activeTab === 'inventory' ? (
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Current Stock</th>
                    <th>Safety Limit</th>
                    <th>Status</th>
                    <th>Retail Price</th>
                    <th>Distributor Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory.map((item) => {
                    const isLow = item.stock <= item.lowStockLimit;
                    return (
                      <tr key={item.id}>
                        <td style={{ fontWeight: '600' }}>{item.name}</td>
                        <td style={{ fontWeight: '700', color: isLow ? 'var(--danger)' : '#fff' }}>
                          {item.stock} units
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{item.lowStockLimit}</td>
                        <td>
                          {isLow ? (
                            <span className="badge badge-danger">Low Stock</span>
                          ) : (
                            <span className="badge badge-success">Stocked</span>
                          )}
                        </td>
                        <td>₹{item.price}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              className="premium-btn" 
                              style={{ padding: '4px 8px', fontSize: '11px', background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                              onClick={() => handleRestock(item.id, 20)}
                            >
                              Restock (+20)
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="custom-table-container">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Bill ID</th>
                    <th>Timestamp</th>
                    <th>Items Sold</th>
                    <th>Total Bill</th>
                    <th>Earned Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td style={{ fontFamily: 'monospace' }}>{sale.id.slice(-8)}</td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {new Date(sale.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        {sale.items.map((it, idx) => (
                          <span key={idx} style={{ background: 'rgba(255,255,255,0.04)', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', marginRight: '6px' }}>
                            {it.name} x{it.quantity}
                          </span>
                        ))}
                      </td>
                      <td style={{ fontWeight: '700' }}>₹{sale.totalAmount}</td>
                      <td style={{ color: 'var(--secondary)', fontWeight: '700' }}>₹{sale.profit}</td>
                    </tr>
                  ))}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                        No bills processed today. Copy-paste a thermal receipt in the panel below to process one!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: DUKAAN MITRA CONVERSATIONAL ASSISTANT */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', color: 'var(--primary)' }}>
            💬 Dukaan Mitra Helper (Agent 4)
          </h2>
          <div className="mitra-chat-container">
            <div className="chat-history">
              {chatHistory.map((chat, idx) => (
                <div key={idx} className={`chat-message ${chat.role === 'user' ? 'message-user' : 'message-mitra'}`}>
                  {chat.text}
                </div>
              ))}
              {isChatSending && (
                <div className="chat-message message-mitra" style={{ opacity: 0.7 }}>
                  Mitra is typing response in Hindi...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            
            <form onSubmit={handleSendChat} className="chat-input-row">
              <input 
                type="text" 
                className="chat-input"
                placeholder="Ask Mitra in Hindi/English..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                disabled={isChatSending}
              />
              <button type="submit" className="premium-btn" disabled={isChatSending}>
                Send
              </button>
            </form>
          </div>
        </div>

        {/* BOTTOM LEFT: THERMAL BILL SCANNER EMULATOR */}
        <div className="glass-card grid-span-2">
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px', color: '#fff' }}>
            🖨️ POS Billing Machine Emulator
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Simulate a bill printing job from a shop register. The supervisor agent intercepts, coordinates workers, deducts stock, and streams logs in 2 seconds.
          </p>

          <form onSubmit={handleProcessBill}>
            <textarea 
              className="bill-input-area"
              placeholder="Paste raw cash register invoice text here..."
              value={billInput}
              onChange={(e) => setBillInput(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button 
                  type="button" 
                  className="premium-btn" 
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  onClick={() => setBillInput(PRESETS.preset1)}
                >
                  Preset 1 (Amul & ParleG)
                </button>
                <button 
                  type="button" 
                  className="premium-btn" 
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
                  onClick={() => setBillInput(PRESETS.preset2)}
                >
                  Preset 2 (Maggi low-stock)
                </button>
              </div>
              <button type="submit" className="premium-btn" disabled={isProcessingBill}>
                {isProcessingBill ? 'Supervisor Processing Pipeline...' : 'Process Bill & Auto-Bookkeep'}
              </button>
            </div>
          </form>
        </div>

        {/* BOTTOM RIGHT: LIVE AGENT LOGS AND AUDIT TRAIL */}
        <div className="glass-card">
          <h2 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', color: 'var(--warning)' }}>
            🤖 Live Multi-Agent Log Stream
          </h2>
          <div className="terminal-log-container">
            {logs.map((log) => (
              <div key={log.id} className="terminal-line">
                <span className="log-time">{new Date(log.timestamp).toLocaleTimeString()}</span>
                <span className="log-agent">[{log.agent}]</span>
                <span className="log-action">{log.action}:</span>
                <span className="log-details">{log.details}</span>
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* PROCUREMENT AUTO-NOTIFIER SECTION */}
        <div className="glass-card grid-span-3">
          <h2 style={{ fontSize: '16px', fontWeight: '700', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '16px', color: 'var(--secondary)' }}>
            📢 Active Reorder Requests & Procurement Drafts (Agent 3)
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {alerts.filter(a => a.status === 'pending').map((alert) => {
              const encodedMessage = encodeURIComponent(alert.draftMessage);
              const whatsappUrl = `https://wa.me/${alert.supplierPhone.replace('+', '')}?text=${encodedMessage}`;
              return (
                <div key={alert.id} className="alert-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '12px', background: 'rgba(245, 158, 11, 0.03)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: '700', color: 'var(--warning)', fontSize: '14px' }}>🚨 Restock Draft: {alert.itemName}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pending Confirmation</span>
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.3)', padding: '10px', borderRadius: '6px', fontSize: '12.5px', fontFamily: 'sans-serif', border: '1px solid rgba(255,255,255,0.04)', color: 'var(--text-secondary)' }}>
                    &quot;{alert.draftMessage}&quot;
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>📞 {alert.supplierName}</span>
                    <button 
                      className="premium-btn" 
                      style={{ background: 'var(--secondary)', padding: '6px 12px', fontSize: '12px' }}
                      onClick={() => handleConfirmReorder(alert.id, whatsappUrl)}
                    >
                      🟢 Send via WhatsApp
                    </button>
                  </div>
                </div>
              );
            })}
            {alerts.filter(a => a.status === 'pending').length === 0 && (
              <div style={{ gridColumn: 'span 3', textAlign: 'center', padding: '16px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                All items are stocked. Reorder alerts will pop up here autonomously the moment a bill pushes an item below its safety threshold!
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
