import React, { useState, useEffect, useMemo, useRef } from 'react';
import { initializeApp, getApps } from 'firebase/app';

import { 
  getFirestore, 
  doc, 
  setDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';

let firebaseConfig = null;
try {
  if (typeof __firebase_config !== 'undefined') {
    firebaseConfig = typeof __firebase_config === 'string' ? JSON.parse(__firebase_config) : __firebase_config;
  }
} catch (error) {
  console.warn('Configuración de Firebase no disponible:', error);
}

let app = null;
let auth = null;
let db = null;

if (firebaseConfig && firebaseConfig.apiKey) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
  } catch (error) {
    console.warn('Firebase en modo local sin conexión remota:', error);
  }
}

const appId = typeof __app_id !== 'undefined' ? __app_id : 'argentina-trip-expenses-v1';

// IndexedDB Helper for bulletproof tablet persistence
const saveToIndexedDB = async (data) => {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open('ArgTripExpensesDB', 1);
      request.onupgradeneeded = (e) => {
        const idb = e.target.result;
        if (!idb.objectStoreNames.contains('expensesStore')) {
          idb.createObjectStore('expensesStore', { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => {
        const idb = e.target.result;
        const tx = idb.transaction('expensesStore', 'readwrite');
        const store = tx.objectStore('expensesStore');
        store.put({ id: 'latest_expenses', data: data, updatedAt: new Date().toISOString() });
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      };
      request.onerror = () => resolve(false);
    } catch (err) {
      resolve(false);
    }
  });
};

const PARTICIPANTS = [
  { id: 'joseluis', name: 'José Luis León', shortName: 'José Luis', isOrganizer: true },
  { id: 'david', name: 'David Solano', shortName: 'David' },
  { id: 'carl', name: 'Carl Jensen', shortName: 'Carl' },
  { id: 'anjuri', name: 'Anjuri Mora', shortName: 'Anjuri' },
  { id: 'marie', name: 'Marie Guesquiere', shortName: 'Marie' },
  { id: 'katerin', name: 'Katerin Herrera', shortName: 'Katerin' },
  { id: 'joan', name: 'Joan Herrera', shortName: 'Joan' }
];

const INITIAL_EXPENSES = [
  {
    "participants": [
      "joseluis",
      "david",
      "carl",
      "anjuri",
      "marie",
      "katerin",
      "joan"
    ],
    "date": "2026-09-10",
    "id": "exp-1789071151263",
    "paidStatus": {},
    "paymentMethod": "credit_card",
    "amount": 2700,
    "expenseType": "pending",
    "title": "Hospedaje Buenos Aires",
    "paidBy": "joseluis"
  },
  {
    "title": "Buque a Colonia",
    "date": "2026-09-10",
    "expenseType": "pending",
    "paymentMethod": "credit_card",
    "participants": [
      "joseluis",
      "david",
      "carl",
      "anjuri",
      "marie",
      "katerin",
      "joan"
    ],
    "paidBy": "joseluis",
    "paidStatus": {},
    "id": "exp-1789008286910",
    "amount": 720
  },
  {
    "paidBy": "joseluis",
    "participants": [
      "joseluis",
      "david",
      "carl",
      "anjuri",
      "marie",
      "katerin",
      "joan"
    ],
    "title": "Vuelos Mendoza EZE",
    "amount": 2100,
    "expenseType": "pending",
    "paidStatus": {},
    "id": "exp-1789008270211",
    "date": "2026-09-10",
    "paymentMethod": "credit_card"
  },
  {
    "title": "Transporte Viñedos",
    "date": "2026-09-10",
    "paymentMethod": "cash_usd",
    "id": "exp-1789008230976",
    "paidStatus": {},
    "paidBy": "joseluis",
    "participants": [
      "joseluis",
      "david",
      "carl",
      "anjuri",
      "marie",
      "katerin",
      "joan"
    ],
    "expenseType": "cash",
    "amount": 300
  },
  {
    "participants": [
      "joseluis",
      "david",
      "carl",
      "anjuri",
      "marie",
      "katerin",
      "joan"
    ],
    "title": "Excursión Alta Montaña Mendoza",
    "paidStatus": {},
    "id": "exp-1789008199911",
    "date": "2026-09-10",
    "paymentMethod": "credit_card",
    "paidBy": "joseluis",
    "expenseType": "paid",
    "amount": 469
  },
  {
    "paidStatus": {},
    "participants": [
      "joseluis",
      "david",
      "carl",
      "anjuri",
      "marie",
      "katerin",
      "joan"
    ],
    "title": "Hotel Huentala Mendoza",
    "id": "exp-1789008145898",
    "date": "2026-09-10",
    "paidBy": "carl",
    "paymentMethod": "credit_card",
    "expenseType": "paid",
    "amount": 2419.5
  },
  {
    "participants": [
      "joseluis",
      "david",
      "carl",
      "anjuri",
      "marie"
    ],
    "paidStatus": {
      "david": false,
      "joseluis": true,
      "anjuri": false,
      "carl": false,
      "marie": false
    },
    "date": "2026-09-01",
    "id": "exp-1",
    "expenseType": "paid",
    "amount": 7419,
    "paymentMethod": "credit_card",
    "title": "Boletos de Avión San José - Mendoza - San José",
    "paidBy": "joseluis"
  },
  {
    "id": "exp-2",
    "date": "2026-09-02",
    "expenseType": "paid",
    "paidStatus": {
      "joan": false,
      "katerin": false,
      "david": false,
      "joseluis": true,
      "anjuri": false,
      "carl": false,
      "marie": false
    },
    "paymentMethod": "credit_card",
    "amount": 980,
    "title": "Almuerzo Bodega Zuccardi",
    "paidBy": "joseluis",
    "participants": [
      "joseluis",
      "david",
      "carl",
      "anjuri",
      "marie",
      "katerin",
      "joan"
    ]
  },
  {
    "paidStatus": {
      "katerin": false,
      "joan": false,
      "anjuri": false,
      "marie": false,
      "carl": false,
      "david": false,
      "joseluis": true
    },
    "paymentMethod": "credit_card",
    "id": "exp-3",
    "date": "2026-09-03",
    "expenseType": "paid",
    "amount": 700,
    "title": "Visita Bodega Salentein",
    "paidBy": "joseluis",
    "participants": [
      "joseluis",
      "david",
      "carl",
      "anjuri",
      "marie",
      "katerin",
      "joan"
    ]
  },
  {
    "date": "2026-09-04",
    "paidStatus": {
      "anjuri": false,
      "david": false,
      "joan": false,
      "joseluis": true,
      "katerin": false,
      "carl": false,
      "marie": false
    },
    "participants": [
      "joseluis",
      "david",
      "carl",
      "anjuri",
      "marie",
      "katerin",
      "joan"
    ],
    "amount": 224,
    "title": "Almuerzo El Enemigo (Casa Vigil)",
    "paymentMethod": "credit_card",
    "id": "exp-4",
    "paidBy": "joseluis",
    "expenseType": "paid"
  }
];

const PRIMARY_STORAGE_KEY = 'argtrip_active_state_v4';
const PRIMARY_PAYMENTS_KEY = 'argtrip_payments_list_v1';

const loadLatestStoredExpenses = () => {
  try {
    const raw = localStorage.getItem(PRIMARY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      if (parsed && Array.isArray(parsed.expenses) && parsed.expenses.length > 0) return parsed.expenses;
    }
  } catch (e) {}
  return INITIAL_EXPENSES;
};

const loadLatestStoredPayments = () => {
  try {
    const raw = localStorage.getItem(PRIMARY_PAYMENTS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [];
};

const scanAllAvailableStorage = () => {
  const discoveredVersions = [];
  const knownKeys = [
    PRIMARY_STORAGE_KEY,
    'argtrip_gastos_data_v2',
    'argtrip_gastos_data',
    'argtrip_backup'
  ];

  knownKeys.forEach(key => {
    try {
      const item = localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item);
        const dataArr = Array.isArray(parsed) ? parsed : parsed?.expenses;
        if (Array.isArray(dataArr) && dataArr.length > 0) {
          discoveredVersions.push({ key, count: dataArr.length, data: dataArr });
        }
      }
    } catch (e) {}
  });

  return discoveredVersions;
};

const IconPlus = () => (
  <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
  </svg>
);

const IconCheck = () => (
  <svg className="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
  </svg>
);

const IconEdit = () => (
  <svg className="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
  </svg>
);

const IconTrash = () => (
  <svg className="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const IconSave = () => (
  <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
  </svg>
);

const IconTable = () => (
  <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const IconCloud = () => (
  <svg className="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 00-9.78 2.096A4.001 4.001 0 003 15z" />
  </svg>
);

const IconX = () => (
  <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <line x1="18" y1="6" x2="6" y2="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="6" y1="6" x2="18" y2="18" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function App() {
  const [expenses, setExpenses] = useState(() => loadLatestStoredExpenses());

  const [availableBackups, setAvailableBackups] = useState(() => scanAllAvailableStorage());
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pagados');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  const [user, setUser] = useState(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudConnected, setCloudConnected] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  const fileInputRef = useRef(null);

  const [formTitle, setFormTitle] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formPaidBy, setFormPaidBy] = useState('joseluis');
  const [formType, setFormType] = useState('paid');
  const [formPaymentMethod, setFormPaymentMethod] = useState('credit_card');
  const [formParticipants, setFormParticipants] = useState(PARTICIPANTS.map(p => p.id));
  const [formPaidStatus, setFormPaidStatus] = useState({});

  const [convertingExpense, setConvertingExpense] = useState(null);
  const [convertPayer, setConvertPayer] = useState('joseluis');
  const [convertAmount, setConvertAmount] = useState('');
  const [convertMethod, setConvertMethod] = useState('credit_card');
  const [convertPaidStatus, setConvertPaidStatus] = useState({});

  const [showTableModal, setShowTableModal] = useState(false);
  const [copySuccessNotice, setCopySuccessNotice] = useState('');
  const [selectedUserForMessage, setSelectedUserForMessage] = useState('david');
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle');
  const [showQuickBackupModal, setShowQuickBackupModal] = useState(false);
  const [rawBackupText, setRawBackupText] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  const [payments, setPayments] = useState(() => loadLatestStoredPayments());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentFrom, setPaymentFrom] = useState('mary');
  const [paymentTo, setPaymentTo] = useState('joseluis');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash_usd');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paymentExpenseId, setPaymentExpenseId] = useState('');

  const persistPayments = (listToSave) => {
    const list = listToSave || payments;
    try {
      localStorage.setItem(PRIMARY_PAYMENTS_KEY, JSON.stringify(list));
    } catch (e) {}
    if (db && user) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'argentina_expenses', 'active_payments');
        setDoc(docRef, {
          payments: list,
          updatedAt: new Date().toISOString()
        });
      } catch (err) {}
    }
  };

  const handleAddPayment = (e) => {
    e.preventDefault();
    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      alert('Por favor ingresa un monto válido para el abono.');
      return;
    }
    if (paymentFrom === paymentTo) {
      alert('El deudor y el acreedor no pueden ser la misma persona.');
      return;
    }

    const payerObj = PARTICIPANTS.find(p => p.id === paymentFrom);
    const receiverObj = PARTICIPANTS.find(p => p.id === paymentTo);

    const newPayment = {
      id: 'pay-' + Date.now(),
      from: paymentFrom,
      to: paymentTo,
      amount: amt,
      method: paymentMethod,
      note: paymentNote.trim() || 'Abono directo entre participantes',
      date: paymentDate || new Date().toISOString().split('T')[0],
      expenseId: paymentExpenseId || null
    };

    const updated = [newPayment, ...payments];
    setPayments(updated);
    persistPayments(updated);

    setShowPaymentModal(false);
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentExpenseId('');
    setCopySuccessNotice(`✅ Abono registrado: $${amt.toFixed(2)} USD de ${payerObj?.shortName || paymentFrom} a ${receiverObj?.shortName || paymentTo}`);
    setTimeout(() => setCopySuccessNotice(''), 4500);
  };

  const handleDeletePayment = (paymentId) => {
    if (window.confirm('¿Deseas eliminar este registro de abono?')) {
      const updated = payments.filter(p => p.id !== paymentId);
      setPayments(updated);
      persistPayments(updated);
      setCopySuccessNotice('Abono eliminado con éxito.');
      setTimeout(() => setCopySuccessNotice(''), 3000);
    }
  };

  const openPaymentForPerson = (fromId, toId = 'joseluis', expenseId = '') => {
    setPaymentFrom(fromId);
    setPaymentTo(toId);
    setPaymentExpenseId(expenseId || '');
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setShowPaymentModal(true);
  };

  useEffect(() => {
    if (!auth) return;
    let isMounted = true;

    const authenticate = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        try {
          await signInAnonymously(auth);
        } catch (anonErr) {
          console.warn('Modo local activado sin credenciales remotas.');
        }
      }
    };
    authenticate();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!isMounted) return;
      setUser(currentUser);
      if (currentUser) setCloudConnected(true);
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!db || !user) return;
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'argentina_expenses', 'active_sheet');

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data && Array.isArray(data.expenses)) {
          // Authoritative sync: accept exact list without merging deleted entries
          setExpenses(data.expenses);
          try {
            localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(data.expenses));
          } catch (e) {}
          if (data.updatedAt) {
            setLastSavedTime(new Date(data.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          }
        }
      }
    }, (error) => {
      console.warn('Aviso de sincronización remota:', error);
    });

    return () => unsubscribe();
  }, [user]);

  const persistExpenses = async (expensesToSave) => {
    const list = expensesToSave || expenses;
    setIsCloudSyncing(true);

    // 1. Save strictly to the authoritative primary local storage key
    try {
      localStorage.setItem(PRIMARY_STORAGE_KEY, JSON.stringify(list));
      // Overwrite secondary keys so old deleted data cannot resurrect
      localStorage.setItem('argtrip_gastos_data_v2', JSON.stringify(list));
    } catch (e) {}

    // 2. IndexedDB permanent browser storage
    await saveToIndexedDB(list);
    setAvailableBackups(scanAllAvailableStorage());

    // 3. Cloud Firestore persistence: overwrite directly without merge-combining deleted items
    let savedInCloud = false;
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    if (db && user) {
      try {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'argentina_expenses', 'active_sheet');
        await setDoc(docRef, {
          expenses: list,
          updatedAt: new Date().toISOString()
        });
        savedInCloud = true;
        setCloudConnected(true);
        setLastSavedTime(nowTimeStr);
      } catch (err) {
        console.warn('Error al guardar en Firestore:', err);
      }
    }

    setSaveStatus('saved');
    const msg = savedInCloud
      ? `✅ Guardado exitoso en la Nube y Tablet (${list.length} rubros a las ${nowTimeStr})`
      : `✅ Guardado en la memoria de tu Tablet (${list.length} rubros a las ${nowTimeStr})`;
    
    setSaveMessage(msg);
    setIsCloudSyncing(false);
    setTimeout(() => {
      setSaveStatus('idle');
      setSaveMessage('');
    }, 4500);
  };

  const handleManualImportText = () => {
    try {
      const parsed = JSON.parse(rawBackupText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        setExpenses(parsed);
        persistExpenses(parsed);
        setShowQuickBackupModal(false);
        setCopySuccessNotice(`¡Se restauraron ${parsed.length} rubros con éxito!`);
        setTimeout(() => setCopySuccessNotice(''), 4000);
      } else {
        setCopySuccessNotice('El texto no contiene una lista válida de gastos.');
      }
    } catch (e) {
      setCopySuccessNotice('Formato JSON inválido. Revisa el texto pegado.');
    }
  };

  const handleRestoreSpecificBackup = (data) => {
    if (Array.isArray(data) && data.length > 0) {
      setExpenses(data);
      persistExpenses(data);
      setShowRecoveryModal(false);
      setCopySuccessNotice(`¡Se restauraron ${data.length} rubros con éxito!`);
      setTimeout(() => setCopySuccessNotice(''), 4000);
    }
  };

  const calculations = useMemo(() => {
    const userBreakdowns = {};
    PARTICIPANTS.forEach(p => {
      userBreakdowns[p.id] = {
        participant: p,
        paidExpensesList: [],
        pendingExpensesList: [],
        cashExpensesList: [],
        totalCostAllActivities: 0,
        totalAlreadySettledToOrganizer: 0,
        debtToOrganizerRemaining: 0,
        grossDebtToOrganizer: 0,
        totalPaymentsMade: 0,
        totalPaymentsReceived: 0,
        pendingProjectedShare: 0,
        cashRequiredForTrip: 0,
        totalOutOfPocketRequired: 0
      };
    });

    let grandTotalTrip = 0;
    let totalPaidCategory = 0;
    let totalPendingCategory = 0;
    let totalCashCategory = 0;

    // Rastrear abonos registrados específicos por gasto y participante
    const abonosByExpenseAndUser = {};
    payments.forEach(pay => {
      if (pay.expenseId && pay.from) {
        const key = `${pay.expenseId}_${pay.from}`;
        abonosByExpenseAndUser[key] = (abonosByExpenseAndUser[key] || 0) + (Number(pay.amount) || 0);
      }
    });

    expenses.forEach(exp => {
      const amt = Number(exp.amount) || 0;
      const participantsCount = (exp.participants && exp.participants.length > 0) ? exp.participants.length : 1;
      const share = amt / participantsCount;

      grandTotalTrip += amt;
      if (exp.expenseType === 'paid') totalPaidCategory += amt;
      else if (exp.expenseType === 'pending') totalPendingCategory += amt;
      else if (exp.expenseType === 'cash') totalCashCategory += amt;

      (exp.participants || []).forEach(userId => {
        if (!userBreakdowns[userId]) return;
        userBreakdowns[userId].totalCostAllActivities += share;

        const payerObj = PARTICIPANTS.find(p => p.id === exp.paidBy);
        const payerShort = payerObj?.shortName || 'José Luis';
        const payerFull = payerObj?.name || 'José Luis León';

        if (exp.expenseType === 'paid') {
          const isPayer = (exp.paidBy === userId);
          const abonoSpecificAmt = abonosByExpenseAndUser[`${exp.id}_${userId}`] || 0;
          const hasSettled = isPayer || Boolean(exp.paidStatus && exp.paidStatus[userId]) || (abonoSpecificAmt >= share && share > 0);

          // Calcular cuánto le deben los demás a quien pagó este rubro específico
          let remainingOwedOnItem = 0;
          let totalOthersShare = 0;
          const unsettledParticipants = [];
          const settledParticipants = [];

          (exp.participants || []).forEach(otherId => {
            if (otherId !== exp.paidBy) {
              totalOthersShare += share;
              const otherPass = PARTICIPANTS.find(p => p.id === otherId);
              const otherName = otherPass ? otherPass.shortName : otherId;
              const otherAbono = abonosByExpenseAndUser[`${exp.id}_${otherId}`] || 0;
              if ((exp.paidStatus && exp.paidStatus[otherId]) || otherAbono >= share) {
                settledParticipants.push(otherName);
              } else {
                remainingOwedOnItem += Math.max(0, share - otherAbono);
                unsettledParticipants.push(otherName);
              }
            }
          });

          userBreakdowns[userId].paidExpensesList.push({
            expenseId: exp.id,
            title: exp.title,
            fullAmount: amt,
            participantsCount,
            share,
            paidBy: exp.paidBy,
            payerShort,
            payerFull,
            isPayer,
            hasSettled,
            abonoSpecificAmt,
            remainingShareAfterAbono: Math.max(0, share - abonoSpecificAmt),
            remainingOwedOnItem,
            totalOthersShare,
            unsettledParticipants,
            settledParticipants
          });

          if (!isPayer) {
            if (hasSettled) {
              userBreakdowns[userId].totalAlreadySettledToOrganizer += share;
            } else {
              userBreakdowns[userId].grossDebtToOrganizer += share;
            }
          }
        } else if (exp.expenseType === 'pending') {
          userBreakdowns[userId].pendingExpensesList.push({
            expenseId: exp.id,
            title: exp.title,
            fullAmount: amt,
            participantsCount,
            share,
            paymentMethod: exp.paymentMethod,
            payerShort,
            payerFull
          });
          userBreakdowns[userId].pendingProjectedShare += share;
        } else if (exp.expenseType === 'cash') {
          userBreakdowns[userId].cashExpensesList.push({
            expenseId: exp.id,
            title: exp.title,
            fullAmount: amt,
            participantsCount,
            share,
            paymentMethod: exp.paymentMethod,
            payerShort,
            payerFull
          });
          userBreakdowns[userId].cashRequiredForTrip += share;
        }
      });
    });

    let totalAbonosTrip = 0;
    payments.forEach(pay => {
      const amt = Number(pay.amount) || 0;
      totalAbonosTrip += amt;
      if (userBreakdowns[pay.from]) {
        userBreakdowns[pay.from].totalPaymentsMade += amt;
      }
      if (userBreakdowns[pay.to]) {
        userBreakdowns[pay.to].totalPaymentsReceived += amt;
      }
    });

    PARTICIPANTS.forEach(p => {
      const b = userBreakdowns[p.id];
      b.debtToOrganizerRemaining = Math.max(0, b.grossDebtToOrganizer - b.totalPaymentsMade);
      b.totalAlreadySettledToOrganizer += b.totalPaymentsMade;
      b.totalOutOfPocketRequired = b.debtToOrganizerRemaining + b.pendingProjectedShare + b.cashRequiredForTrip;
    });

    let organizerTotalOwedByOthers = 0;
    PARTICIPANTS.filter(p => !p.isOrganizer).forEach(p => {
      organizerTotalOwedByOthers += userBreakdowns[p.id].debtToOrganizerRemaining;
    });

    return {
      userBreakdowns,
      grandTotalTrip,
      totalPaidCategory,
      totalPendingCategory,
      totalCashCategory,
      totalAbonosTrip,
      organizerTotalOwedByOthers
    };
  }, [expenses, payments]);

  const handleTogglePaymentStatus = (expenseId, userId) => {
    const updated = expenses.map(exp => {
      if (exp.id === expenseId) {
        const currentStatus = exp.paidStatus ? { ...exp.paidStatus } : {};
        currentStatus[userId] = !currentStatus[userId];
        return { ...exp, paidStatus: currentStatus };
      }
      return exp;
    });
    setExpenses(updated);
    persistExpenses(updated);
  };

  const openAddModal = (presetType = 'paid') => {
    setEditingExpenseId(null);
    setFormTitle('');
    setFormAmount('');
    setFormPaidBy('joseluis');
    setFormType(presetType);
    setFormPaymentMethod(presetType === 'cash' ? 'cash_usd' : 'credit_card');
    setFormParticipants(PARTICIPANTS.map(p => p.id));
    setFormPaidStatus({});
    setShowAddModal(true);
  };

  const openEditModal = (exp) => {
    setEditingExpenseId(exp.id);
    setFormTitle(exp.title);
    setFormAmount(exp.amount.toString());
    setFormPaidBy(exp.paidBy || 'joseluis');
    setFormType(exp.expenseType || 'paid');
    setFormPaymentMethod(exp.paymentMethod || 'credit_card');
    setFormParticipants(exp.participants || PARTICIPANTS.map(p => p.id));
    setFormPaidStatus(exp.paidStatus || {});
    setShowAddModal(true);
  };

  const handleSaveExpenseForm = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(formAmount);
    if (!formTitle.trim() || isNaN(numAmount) || numAmount <= 0) return;
    if (formParticipants.length === 0) return;

    let updatedList;
    if (editingExpenseId) {
      updatedList = expenses.map(exp => {
        if (exp.id === editingExpenseId) {
          return {
            ...exp,
            title: formTitle.trim(),
            amount: numAmount,
            paidBy: formPaidBy,
            expenseType: formType,
            paymentMethod: formPaymentMethod,
            participants: formParticipants,
            paidStatus: formType === 'paid' ? formPaidStatus : {}
          };
        }
        return exp;
      });
    } else {
      const newExp = {
        id: 'exp-' + Date.now(),
        title: formTitle.trim(),
        amount: numAmount,
        paidBy: formPaidBy,
        expenseType: formType,
        paymentMethod: formPaymentMethod,
        participants: formParticipants,
        paidStatus: formType === 'paid' ? formPaidStatus : {},
        date: new Date().toISOString().split('T')[0]
      };
      updatedList = [newExp, ...expenses];
    }

    setExpenses(updatedList);
    persistExpenses(updatedList);
    setShowAddModal(false);
  };

  const confirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    const updated = expenses.filter(e => e.id !== expenseToDelete.id);
    setExpenses(updated);
    persistExpenses(updated);
    setExpenseToDelete(null);
  };

  const openConvertModal = (exp) => {
    setConvertingExpense(exp);
    setConvertPayer('joseluis');
    setConvertAmount(exp.amount.toString());
    setConvertMethod(exp.paymentMethod === 'cash_usd' ? 'cash_usd' : 'credit_card');
    const initialStatus = {};
    (exp.participants || []).forEach(uid => {
      initialStatus[uid] = (uid === 'joseluis');
    });
    setConvertPaidStatus(initialStatus);
  };

  const handleConfirmConversion = () => {
    if (!convertingExpense) return;
    const finalAmt = parseFloat(convertAmount) || convertingExpense.amount;

    const updated = expenses.map(exp => {
      if (exp.id === convertingExpense.id) {
        return {
          ...exp,
          amount: finalAmt,
          expenseType: 'paid',
          paidBy: convertPayer,
          paymentMethod: convertMethod,
          paidStatus: convertPaidStatus
        };
      }
      return exp;
    });

    setExpenses(updated);
    persistExpenses(updated);
    setConvertingExpense(null);
    setActiveTab('pagados');
  };

  const generateWhatsAppFullSummary = () => {
    const dateStr = new Date().toLocaleDateString();
    let text = `🇦🇷 *RESUMEN DE CUENTAS - VIAJE ARGENTINA* (${dateStr})\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `💰 *Costo Total del Viaje:* $${calculations.grandTotalTrip.toFixed(2)} USD\n`;
    text += `💳 *Ya Pagado (Tarjeta/Transf):* $${calculations.totalPaidCategory.toFixed(2)} USD\n`;
    text += `⏳ *Pendiente de Pago:* $${calculations.totalPendingCategory.toFixed(2)} USD\n`;
    text += `💵 *Efectivo p/ Viaje:* $${calculations.totalCashCategory.toFixed(2)} USD\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
    text += `📋 *ESTADO INDIVIDUAL POR PASAJERO:*\n\n`;

    PARTICIPANTS.forEach(p => {
      const b = calculations.userBreakdowns[p.id];
      text += `👤 *${p.name.toUpperCase()}*\n`;
      text += `• Costo Real Total: $${b.totalCostAllActivities.toFixed(2)} USD\n`;
      if (!p.isOrganizer) {
        text += `• Debe a José Luis León: $${b.debtToOrganizerRemaining.toFixed(2)} USD\n`;
      } else {
        text += `• Por Cobrar al Grupo: $${calculations.organizerTotalOwedByOthers.toFixed(2)} USD\n`;
      }
      if (b.pendingProjectedShare > 0) {
        text += `• Cuota Pendiente de Pago: $${b.pendingProjectedShare.toFixed(2)} USD\n`;
      }
      text += `• Efectivo a llevar: $${b.cashRequiredForTrip.toFixed(2)} USD\n`;
      text += `👉 *TOTAL A DESEMBOLSAR:* $${b.totalOutOfPocketRequired.toFixed(2)} USD\n\n`;
    });

    text += `📲 *Actualizado en vivo en la App del Viaje.*`;
    return text;
  };

  const generateWhatsAppIndividualSummary = (userId) => {
    const targetUser = PARTICIPANTS.find(p => p.id === userId);
    if (!targetUser) return '';
    const b = calculations.userBreakdowns[userId];

    let text = `🇦🇷 *HOLA ${targetUser.shortName.toUpperCase()}, RESUMEN DE TU VIAJE A ARGENTINA*\n\n`;
    text += `📌 *Costo Total de tus Actividades:* $${b.totalCostAllActivities.toFixed(2)} USD\n\n`;
    text += `🔍 *DESGLOSE DE TUS PAGOS:*\n`;

    if (!targetUser.isOrganizer) {
      text += `1️⃣ *Reembolso a José Luis León:*\n`;
      if (b.debtToOrganizerRemaining > 0) {
        text += `   ⚠️ Pendiente: *$${b.debtToOrganizerRemaining.toFixed(2)} USD*\n`;
        b.paidExpensesList.filter(e => !e.hasSettled).forEach(e => {
          text += `   • ${e.title}: $${e.share.toFixed(2)}\n`;
        });
      } else {
        text += `   ✅ ¡Estás al día con José Luis! ($0.00 pendiente)\n`;
      }
    }

    if (b.pendingProjectedShare > 0) {
      text += `\n2️⃣ *Gastos Pendientes de Pago (Proyección):*\n`;
      text += `   ⏳ Monto estimado: *$${b.pendingProjectedShare.toFixed(2)} USD*\n`;
      b.pendingExpensesList.forEach(e => {
        text += `   • ${e.title}: $${e.share.toFixed(2)}\n`;
      });
    }

    text += `\n3️⃣ *Efectivo a llevar al viaje:* *$${b.cashRequiredForTrip.toFixed(2)} USD*\n`;
    b.cashExpensesList.forEach(e => {
      text += `   • ${e.title}: $${e.share.toFixed(2)}\n`;
    });

    text += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🎯 *TOTAL ESTIMADO A DESEMBOLSAR:* *$${b.totalOutOfPocketRequired.toFixed(2)} USD*\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `¡Vamos con todo para disfrutar Argentina! 🍷🥩`;
    return text;
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopySuccessNotice('¡Copiado con éxito para WhatsApp!');
    } catch (err) {
      setCopySuccessNotice('Texto listo para copiar');
    }
    document.body.removeChild(textArea);
    setTimeout(() => setCopySuccessNotice(''), 3500);
  };

  const handleDownloadBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(expenses, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `argtrip_gastos_respaldo_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleUploadBackup = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setExpenses(parsed);
            persistExpenses(parsed);
            setShowTableModal(false);
            setCopySuccessNotice('¡Respaldo importado y sincronizado con éxito!');
            setTimeout(() => setCopySuccessNotice(''), 4000);
          }
        } catch (err) {
          console.error("Error leyendo archivo de respaldo:", err);
        }
      };
    }
  };

  const filteredExpenses = useMemo(() => {
    if (activeTab === 'pagados') return expenses.filter(e => e.expenseType === 'paid');
    if (activeTab === 'pendientes') return expenses.filter(e => e.expenseType === 'pending');
    if (activeTab === 'efectivo') return expenses.filter(e => e.expenseType === 'cash');
    return expenses;
  }, [expenses, activeTab]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col font-sans">
      <header className="bg-slate-900 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-300 font-black text-lg shadow-inner">
              🇦🇷
            </div>
            <div>
              <h1 className="font-extrabold text-base md:text-lg tracking-tight flex items-center gap-2">
                ArgTrip • Control de Gastos
                <span className="text-[10px] bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2 py-0.5 rounded-full font-semibold">
                  7 Pasajeros
                </span>
              </h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className={`flex items-center gap-1 font-bold ${cloudConnected ? 'text-emerald-400' : 'text-teal-400'}`}>
                  <IconCloud />
                  {isCloudSyncing 
                    ? 'Guardando en la Nube...' 
                    : lastSavedTime 
                    ? `Guardado: ${lastSavedTime}` 
                    : '10 Rubros Guardados'}
                </span>
                <span>•</span>
                <span>Moneda Base: USD ($)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {availableBackups.length > 0 && (
              <button
                onClick={() => setShowRecoveryModal(true)}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition"
                title="Ver respaldos de seguridad disponibles"
              >
                <span>🔍 Respaldos ({availableBackups.length})</span>
              </button>
            )}

            <button
              onClick={() => {
                setRawBackupText(JSON.stringify(expenses, null, 2));
                setShowQuickBackupModal(true);
              }}
              className="bg-slate-800 hover:bg-slate-700 text-teal-300 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm border border-teal-500/30 transition"
              title="Copiar texto de respaldo o pegar para restaurar"
            >
              <span>📋 Respaldo Tablet</span>
            </button>

            <button
              onClick={() => setShowTableModal(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition"
              title="Ver tabla matriz, compartir y respaldar"
            >
              <IconTable />
              <span className="hidden sm:inline">Tabla y Compartir</span>
            </button>

            <button
              onClick={() => persistExpenses(expenses)}
              className={`text-xs font-black px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition ${
                saveStatus === 'saved' 
                  ? 'bg-emerald-500 text-white ring-2 ring-emerald-300' 
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
              title="Guardar información en la nube y en la memoria del dispositivo"
            >
              <IconSave />
              <span>{saveStatus === 'saved' ? '¡Guardado!' : 'Guardar Info'}</span>
            </button>

            <button
              onClick={() => openPaymentForPerson('mary', 'joseluis')}
              className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition"
              title="Registrar un abono o pago parcial entre participantes"
            >
              <span>💸 + Registrar Abono</span>
            </button>

            <button
              onClick={() => openAddModal(activeTab === 'pendientes' ? 'pending' : activeTab === 'efectivo' ? 'cash' : 'paid')}
              className="bg-teal-500 hover:bg-teal-600 text-slate-950 text-xs font-extrabold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition"
            >
              <IconPlus />
              <span className="hidden sm:inline">Nuevo Gasto</span>
            </button>
          </div>
        </div>

        {/* Tab navigation buttons */}
        <div className="max-w-6xl mx-auto px-4 border-t border-slate-800 flex overflow-x-auto gap-1 py-1">
          <button
            onClick={() => setActiveTab('pagados')}
            className={`px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'pagados' ? 'bg-slate-800 text-teal-300 border border-teal-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>💳 Ya Pagados</span>
            <span className="bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0.2 rounded-full">
              {expenses.filter(e => e.expenseType === 'paid').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('pendientes')}
            className={`px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'pendientes' ? 'bg-slate-800 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>⏳ Pendientes de Pago</span>
            <span className="bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0.2 rounded-full">
              {expenses.filter(e => e.expenseType === 'pending').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('efectivo')}
            className={`px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'efectivo' ? 'bg-slate-800 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>💵 Efectivo en Destino</span>
            <span className="bg-slate-700 text-slate-300 text-[10px] px-1.5 py-0.2 rounded-full">
              {expenses.filter(e => e.expenseType === 'cash').length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('balances')}
            className={`px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'balances' ? 'bg-slate-800 text-indigo-300 border border-indigo-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>📊 Balances y Cierre de Cuentas</span>
          </button>
        </div>
      </header>

      {/* Temporary toast notification */}
      {saveMessage && (
        <div className="bg-emerald-600 text-white text-xs font-bold py-2.5 px-4 text-center sticky top-24 z-30 shadow-md flex items-center justify-center gap-2">
          <span>{saveMessage}</span>
        </div>
      )}

      {copySuccessNotice && (
        <div className="bg-teal-700 text-white text-xs font-bold py-2 px-4 text-center sticky top-24 z-30 shadow-md">
          {copySuccessNotice}
        </div>
      )}

      {}
      <main className="max-w-6xl mx-auto w-full p-4 flex-1 space-y-5">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Costo Total Viaje</div>
            <div className="text-xl font-extrabold text-slate-900 mt-1">
              ${calculations.grandTotalTrip.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Suma de las 7 personas</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-teal-500">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ya Pagado (Tarjeta)</div>
            <div className="text-xl font-extrabold text-teal-700 mt-1">
              ${calculations.totalPaidCategory.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">7 rubros registrados</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-amber-500">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pendiente de Pago</div>
            <div className="text-xl font-extrabold text-amber-700 mt-1">
              ${calculations.totalPendingCategory.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">2 actividades estimadas</div>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs border-l-4 border-l-emerald-500">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Efectivo en Destino</div>
            <div className="text-xl font-extrabold text-emerald-700 mt-1">
              ${calculations.totalCashCategory.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Llevar en mano al viaje</div>
          </div>
        </section>

        {}
        {activeTab !== 'balances' ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-extrabold text-slate-700 uppercase tracking-wider">
                {activeTab === 'pagados' && 'Listado de Gastos Ya Pagados (Con Tarjeta o Transferencia)'}
                {activeTab === 'pendientes' && 'Gastos Pendientes de Pago (Cotizaciones o Reservas a Futuro)'}
                {activeTab === 'efectivo' && 'Gastos a Pagar en Destino (Efectivo USD o Pesos)'}
              </h2>
              <span className="text-xs text-slate-500 font-semibold">
                {filteredExpenses.length} rubro(s)
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {filteredExpenses.map(exp => {
                const amt = Number(exp.amount) || 0;
                const count = (exp.participants && exp.participants.length > 0) ? exp.participants.length : 1;
                const perPerson = amt / count;
                const payerObj = PARTICIPANTS.find(p => p.id === exp.paidBy);

                // Calculations for the payer and what remains to be collected
                const payerIsParticipant = (exp.participants || []).includes(exp.paidBy);
                const payerOwnShare = payerIsParticipant ? perPerson : 0;
                const othersTotalShare = amt - payerOwnShare;
                
                let alreadyReimbursed = 0;
                (exp.participants || []).forEach(uid => {
                  if (uid !== exp.paidBy && exp.paidStatus && exp.paidStatus[uid]) {
                    alreadyReimbursed += perPerson;
                  }
                });
                const remainingOwedToPayer = Math.max(0, othersTotalShare - alreadyReimbursed);

                return (
                  <div key={exp.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-[260px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-extrabold text-base text-slate-900">{exp.title}</h3>
                          <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                            exp.expenseType === 'paid' ? 'bg-teal-100 text-teal-800' :
                            exp.expenseType === 'pending' ? 'bg-amber-100 text-amber-800' :
                            'bg-emerald-100 text-emerald-800'
                          }`}>
                            {exp.expenseType === 'paid' ? '💳 Ya Pagado' : exp.expenseType === 'pending' ? '⏳ Pendiente' : '💵 Efectivo'}
                          </span>
                        </div>

                        {/* Explicit payer and collection status breakdown */}
                        {exp.expenseType === 'paid' && (
                          <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-2.5 text-xs space-y-1.5">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <span className="text-blue-900">
                                👤 Pagó la cuenta completa: <strong className="font-extrabold text-blue-950">{payerObj?.name || 'José Luis León'}</strong>
                              </span>
                              <span className="font-black text-blue-950 bg-blue-100/80 px-2 py-0.5 rounded-md">
                                Adelantó: ${amt.toFixed(2)} USD
                              </span>
                            </div>

                            <div className="flex items-center gap-3 flex-wrap text-[11px] pt-0.5 border-t border-blue-200/60 text-slate-600">
                              <span>Su cuota propia: <strong className="text-slate-800">${payerOwnShare.toFixed(2)}</strong></span>
                              <span>•</span>
                              <span className="text-emerald-700">
                                Ya le reembolsaron: <strong className="font-bold">${alreadyReimbursed.toFixed(2)} USD</strong>
                              </span>
                              <span>•</span>
                              <span className={`font-bold ${remainingOwedToPayer > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                {remainingOwedToPayer > 0 
                                  ? `Restante pendiente por cobrar: $${remainingOwedToPayer.toFixed(2)} USD`
                                  : '✅ Cuenta 100% saldada'}
                              </span>
                            </div>
                          </div>
                        )}

                        <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2 pt-0.5">
                          {exp.expenseType !== 'paid' && (
                            <span>Método previsto: <strong className="text-slate-800">{exp.paymentMethod === 'cash_usd' ? 'Efectivo USD' : exp.paymentMethod === 'cash_ars' ? 'Efectivo Pesos' : 'Tarjeta / Transferencia'}</strong> • </span>
                          )}
                          <span>Participan: <strong className="text-slate-800">{count} de 7 personas</strong></span>
                          <span>•</span>
                          <span>Valor Total Pagado: <strong className="text-slate-900 font-black">${amt.toFixed(2)} USD</strong></span>
                        </div>
                      </div>

                      {}
                      <div className="text-right bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 min-w-[140px]">
                        <div className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider">
                          {exp.expenseType === 'paid' ? 'Valor Total Pagado' : 'Total de la Cuenta'}
                        </div>
                        <div className="text-base font-black text-slate-900">
                          ${amt.toFixed(2)} USD
                        </div>
                        <div className="text-[11px] font-bold text-teal-700 pt-1 mt-0.5 border-t border-slate-200/80 flex items-center justify-end gap-1">
                          <span className="text-slate-500 font-medium">Cuota c/u:</span>
                          <span className="font-extrabold">${perPerson.toFixed(2)} USD</span>
                        </div>
                      </div>
                    </div>

                    {/* Settlement tags for paid items: Who owes whom */}
                    {exp.expenseType === 'paid' && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center justify-between mb-2">
                          <div className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider">
                            ¿Quién debe este rubro y a quién?
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            Reembolsos dirigidos a <strong>{payerObj?.shortName || 'José Luis'}</strong>
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {(exp.participants || []).map(uid => {
                            const passenger = PARTICIPANTS.find(p => p.id === uid);
                            const isPayer = (exp.paidBy === uid);
                            const hasSettled = isPayer || Boolean(exp.paidStatus && exp.paidStatus[uid]);

                            return (
                              <div key={uid} className="flex items-center gap-1">
                                <button
                                  onClick={() => {
                                    if (!isPayer) handleTogglePaymentStatus(exp.id, uid);
                                  }}
                                  disabled={isPayer}
                                  className={`text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition ${
                                    isPayer 
                                      ? 'bg-slate-100 text-slate-700 border border-slate-300 cursor-default'
                                      : hasSettled 
                                      ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
                                      : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
                                  }`}
                                  title={isPayer ? 'Adelantó el pago completo de este rubro' : hasSettled ? 'Ya le pagó su cuota. Haz clic para cambiar a pendiente.' : 'Aún le debe su cuota. Haz clic para marcar como saldado.'}
                                >
                                  <span>{passenger?.shortName}:</span>
                                  {isPayer ? (
                                    <span className="text-[11px] text-slate-700 font-extrabold">
                                      Adelantó total (${amt.toFixed(2)})
                                    </span>
                                  ) : hasSettled ? (
                                    <span className="text-emerald-700 flex items-center gap-1 font-bold">
                                      <IconCheck /> Pagó ${perPerson.toFixed(2)} a {payerObj?.shortName}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-rose-700 font-black">
                                      Debe ${perPerson.toFixed(2)} a {payerObj?.shortName}
                                    </span>
                                  )}
                                </button>
                                {!isPayer && !hasSettled && (
                                  <button
                                    onClick={() => openPaymentForPerson(uid, exp.paidBy || 'joseluis', exp.id)}
                                    className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-2 py-1.5 rounded-xl transition shadow-xs flex items-center gap-1"
                                    title={`Registrar un abono para ${passenger?.shortName} en este gasto`}
                                  >
                                    <span>💸 Abonar</span>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Card action controls */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {exp.expenseType === 'pending' && (
                          <button
                            onClick={() => openConvertModal(exp)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-xs transition"
                          >
                            <IconCheck />
                            <span>Pasar a Pagado</span>
                          </button>
                        )}
                        <span className="text-[11px] text-slate-400">ID: {exp.id}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => openEditModal(exp)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                          title="Editar gasto"
                        >
                          <IconEdit />
                        </button>
                        <button
                          onClick={() => setExpenseToDelete(exp)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                          title="Eliminar gasto"
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="bg-indigo-900 text-white rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-black text-lg">Conciliación y Cierre de Cuentas por Pasajero</h2>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Desglose exacto rubro por rubro de lo que corresponde a cada persona, con sumatorias finales transparentes.
                </p>
              </div>
              <button
                onClick={() => setShowTableModal(true)}
                className="bg-white text-indigo-950 hover:bg-indigo-50 font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <IconTable />
                <span>Ver Matriz Comparativa Completa</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {PARTICIPANTS.map(passenger => {
                const b = calculations.userBreakdowns[passenger.id];

                return (
                  <div key={passenger.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
                    <div className="p-4 space-y-4">
                      {/* Passenger Header */}
                      <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white font-black text-base flex items-center justify-center">
                            {passenger.shortName.charAt(0)}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                              {passenger.name}
                              {passenger.isOrganizer && (
                                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md">
                                  Organizador
                                </span>
                              )}
                            </h3>
                            <div className="text-xs font-semibold text-slate-500">
                              Costo Real de sus Actividades: <strong className="text-slate-800">${b.totalCostAllActivities.toFixed(2)} USD</strong>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => openPaymentForPerson(passenger.id, 'joseluis')}
                            className="text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg transition shadow-xs flex items-center gap-1"
                            title="Registrar un abono realizado por esta persona"
                          >
                            <span>💸 + Abonar</span>
                          </button>
                          <button
                            onClick={() => {
                              setSelectedUserForMessage(passenger.id);
                              setShowTableModal(true);
                            }}
                            className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-2.5 py-1.5 rounded-lg transition"
                          >
                            Copiar WhatsApp
                          </button>
                        </div>
                      </div>

                      {/* Section 1: Paid rubros */}
                      <div className="space-y-2">
                        <div className="text-xs font-black text-slate-700 flex items-center justify-between">
                          <span>1. Gastos Ya Pagados (Tarjeta / Transf)</span>
                          <span className="text-[11px] text-slate-500">{b.paidExpensesList.length} rubro(s)</span>
                        </div>

                        {}
                        <div className="space-y-2">
                          {b.paidExpensesList.map((item, idx) => (
                            <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                              <div className="space-y-0.5 flex-1 min-w-[200px]">
                                <div className="font-extrabold text-slate-900">{item.title}</div>
                                <div className="text-[11px] text-blue-900">
                                  Pagado en su totalidad por: <strong>{item.payerFull}</strong>
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  Total: ${item.fullAmount.toFixed(2)} ÷ {item.participantsCount} personas = ${item.share.toFixed(2)} c/u
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {item.isPayer ? (
                                  <div className="text-right bg-blue-50/90 border border-blue-200 px-3 py-1.5 rounded-xl text-xs space-y-0.5">
                                    <div className="font-extrabold text-blue-950">
                                      Pagó: <span className="text-blue-700 font-black">${item.fullAmount.toFixed(2)} USD</span>
                                    </div>
                                    <div className="text-[11px] font-bold">
                                      {item.remainingOwedOnItem > 0 ? (
                                        <span className="text-rose-600">
                                          Le deben: ${item.remainingOwedOnItem.toFixed(2)} USD
                                          {item.unsettledParticipants.length > 0 && (
                                            <span className="text-[10px] text-slate-500 font-normal block">
                                              (Pendiente: {item.unsettledParticipants.join(', ')})
                                            </span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-emerald-700 font-bold">
                                          ✅ Ya le saldaron todo ($0.00 pendiente)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                    {item.abonoSpecificAmt > 0 && !item.hasSettled && (
                                      <span className="text-[10px] bg-amber-50 text-amber-900 border border-amber-200 px-2 py-1 rounded-lg font-bold">
                                        Abonado: ${item.abonoSpecificAmt.toFixed(2)} USD (Resta: ${item.remainingShareAfterAbono.toFixed(2)})
                                      </span>
                                    )}
                                    <button
                                      onClick={() => handleTogglePaymentStatus(item.expenseId, passenger.id)}
                                      className={`text-[11px] font-bold px-3 py-1 rounded-lg transition border ${
                                        item.hasSettled
                                          ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border-emerald-300'
                                          : 'bg-rose-100 hover:bg-rose-200 text-rose-900 border-rose-300'
                                      }`}
                                    >
                                      {item.hasSettled 
                                        ? `✓ Saldó a ${item.payerShort} ($${item.share.toFixed(2)})` 
                                        : `⚠️ Debe $${item.share.toFixed(2)} a ${item.payerShort}`}
                                    </button>
                                    {!item.hasSettled && (
                                      <button
                                        onClick={() => openPaymentForPerson(passenger.id, item.paidBy, item.expenseId)}
                                        className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-2.5 py-1 rounded-lg transition"
                                        title="Registrar abono para este gasto"
                                      >
                                        💸 + Abonar
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section 2: Pending rubros */}
                      {b.pendingExpensesList.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-black text-slate-700 flex items-center justify-between">
                            <span>2. Gastos Pendientes de Pago (Presupuesto)</span>
                            <span className="text-[11px] text-amber-700 font-bold">${b.pendingProjectedShare.toFixed(2)}</span>
                          </div>
                          <div className="space-y-1.5">
                            {b.pendingExpensesList.map((item, idx) => (
                              <div key={idx} className="bg-amber-50/60 p-2 rounded-xl border border-amber-200/70 flex items-center justify-between text-xs">
                                <div>
                                  <div className="font-bold text-slate-800">{item.title}</div>
                                  <div className="text-[10px] text-slate-500">Dividido entre {item.participantsCount} personas</div>
                                </div>
                                <span className="font-bold text-amber-900">${item.share.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Section 3: Cash rubros */}
                      {b.cashExpensesList.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-black text-slate-700 flex items-center justify-between">
                            <span>3. Efectivo en Destino (A Llevar al Viaje)</span>
                            <span className="text-[11px] text-emerald-700 font-bold">${b.cashRequiredForTrip.toFixed(2)}</span>
                          </div>
                          <div className="space-y-1.5">
                            {b.cashExpensesList.map((item, idx) => (
                              <div key={idx} className="bg-emerald-50/60 p-2 rounded-xl border border-emerald-200/70 flex items-center justify-between text-xs">
                                <div>
                                  <div className="font-bold text-slate-800">{item.title}</div>
                                  <div className="text-[10px] text-slate-500">Dividido entre {item.participantsCount} personas</div>
                                </div>
                                <span className="font-bold text-emerald-900">${item.share.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Final Passenger Settlement Box */}
                    <div className="bg-slate-50 border-t border-slate-200 p-4 space-y-3">
                      <div className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                        <span>Liquidación y Totales a Pagar:</span>
                        {b.totalPaymentsMade > 0 && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-md">
                            Abonó: ${b.totalPaymentsMade.toFixed(2)} USD
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {!passenger.isOrganizer ? (
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                            <div className="text-slate-500 text-[10px] font-bold">Total a pagarle a José Luis:</div>
                            <div className={`text-sm font-black ${b.debtToOrganizerRemaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                              ${b.debtToOrganizerRemaining.toFixed(2)} USD
                              {b.debtToOrganizerRemaining === 0 && <span className="text-[10px] ml-1 font-bold">✓ Al día</span>}
                            </div>
                            {b.totalPaymentsMade > 0 && (
                              <div className="text-[10px] text-slate-500 pt-0.5 border-t border-slate-100 flex justify-between">
                                <span>Deuda inicial: ${b.grossDebtToOrganizer.toFixed(2)}</span>
                                <span className="text-emerald-700 font-bold">Abonó: -${b.totalPaymentsMade.toFixed(2)}</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                            <div className="text-slate-500 text-[10px] font-bold">Total a cobrar por José Luis:</div>
                            <div className="text-sm font-black text-teal-600 mt-0.5">
                              ${calculations.organizerTotalOwedByOthers.toFixed(2)} USD
                            </div>
                            {b.totalPaymentsReceived > 0 && (
                              <div className="text-[10px] text-emerald-700 font-bold mt-1">
                                Ya cobró en abonos: ${b.totalPaymentsReceived.toFixed(2)} USD
                              </div>
                            )}
                          </div>
                        )}

                        <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                          <div className="text-slate-500 text-[10px] font-bold">Total pendiente en efectivo (Viaje):</div>
                          <div className="text-sm font-black text-emerald-700 mt-0.5">
                            ${b.cashRequiredForTrip.toFixed(2)} USD
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-900 text-white p-3 rounded-xl flex items-center justify-between">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-teal-400 font-extrabold">
                            Gran Total Estimado a Pagar
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {passenger.isOrganizer 
                              ? 'Tu costo propio + efectivo propio' 
                              : 'Reembolso pendiente + Efectivo'}
                          </div>
                        </div>
                        <div className="text-lg font-black text-teal-300">
                          ${b.totalOutOfPocketRequired.toFixed(2)} USD
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Historial de Abonos y Pagos Registrados */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
                    <span>📜 Historial de Abonos y Pagos Registrados</span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                      {payments.length} registro(s)
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Registro de abonos parciales o totales realizados en efectivo, transferencia o tarjeta entre personas.
                  </p>
                </div>
                <button
                  onClick={() => openPaymentForPerson('mary', 'joseluis')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <span>💸 + Registrar Nuevo Abono</span>
                </button>
              </div>

              {payments.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-semibold bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Aún no hay abonos o pagos registrados. Haz clic en <strong>"+ Registrar Nuevo Abono"</strong> para agregar el primero.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {payments.map(pay => {
                    const payerObj = PARTICIPANTS.find(p => p.id === pay.from);
                    const receiverObj = PARTICIPANTS.find(p => p.id === pay.to);
                    const linkedExp = pay.expenseId ? expenses.find(e => e.id === pay.expenseId) : null;

                    return (
                      <div key={pay.id} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 font-black text-sm flex items-center justify-center">
                            💸
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-900 text-sm flex items-center gap-2 flex-wrap">
                              <span>{payerObj?.name || pay.from}</span>
                              <span className="text-slate-400">➔</span>
                              <span className="text-teal-700 font-black">{receiverObj?.name || pay.to}</span>
                              {linkedExp ? (
                                <span className="bg-blue-100 text-blue-900 border border-blue-200 px-2 py-0.5 rounded-md font-extrabold text-[10px] flex items-center gap-1">
                                  📌 Gasto: {linkedExp.title}
                                </span>
                              ) : (
                                <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[10px]">
                                  🌐 Abono General
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                              <span>Fecha: <strong>{pay.date}</strong></span>
                              <span>•</span>
                              <span>Método: <strong className="text-slate-700">{pay.method === 'cash_usd' ? 'Efectivo USD' : pay.method === 'transfer' ? 'Transferencia' : 'Tarjeta'}</strong></span>
                              <span>•</span>
                              <span>Nota: <em className="text-slate-700 font-semibold">{pay.note}</em></span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-black text-base text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                            +${Number(pay.amount).toFixed(2)} USD
                          </span>
                          <button
                            onClick={() => handleDeletePayment(pay.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                            title="Eliminar abono"
                          >
                            <IconTrash />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal para Registrar Abono entre Personas */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
              <h3 className="font-extrabold text-sm flex items-center gap-2">
                <span>💸 Registrar Abono / Pago entre Personas</span>
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <IconX />
              </button>
            </div>

            <form onSubmit={handleAddPayment} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  📌 Movimiento / Gasto al que aplica el Abono:
                </label>
                <select
                  value={paymentExpenseId}
                  onChange={(e) => {
                    const selectedExpId = e.target.value;
                    setPaymentExpenseId(selectedExpId);
                    if (selectedExpId) {
                      const found = expenses.find(exp => exp.id === selectedExpId);
                      if (found && found.paidBy) {
                        setPaymentTo(found.paidBy);
                      }
                      if (!paymentNote || paymentNote === 'Abono directo entre participantes') {
                        setPaymentNote(found ? `Abono a: ${found.title}` : '');
                      }
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Abono General (Sin movimiento específico) --</option>
                  {expenses.map(exp => (
                    <option key={exp.id} value={exp.id}>
                      [{exp.expenseType === 'paid' ? '💳 Pagado' : exp.expenseType === 'pending' ? '⏳ Pendiente' : '💵 Efectivo'}] {exp.title} - ${Number(exp.amount).toFixed(2)} USD
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ¿Quién realiza el abono? (Deudor):
                </label>
                <select
                  value={paymentFrom}
                  onChange={(e) => setPaymentFrom(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  {PARTICIPANTS.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.shortName})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  ¿Quién recibe el dinero? (Acreedor):
                </label>
                <select
                  value={paymentTo}
                  onChange={(e) => setPaymentTo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  {PARTICIPANTS.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.shortName})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Monto ($ USD):
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="Ej: 1000.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-extrabold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Fecha:
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Método de Pago:
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="cash_usd">💵 Efectivo USD</option>
                  <option value="transfer">🏦 Transferencia / Sinpe / Depósito</option>
                  <option value="credit_card">💳 Tarjeta de Crédito</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nota o Detalle del Pago:
                </label>
                <input
                  type="text"
                  placeholder="Ej: Comprobante o detalle adicional"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-medium text-slate-900 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition"
                >
                  Guardar Abono
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
              <h3 className="font-extrabold text-sm">
                {editingExpenseId ? 'Editar Gasto o Actividad' : 'Registrar Nuevo Gasto'}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <IconX />
              </button>
            </div>

            <form onSubmit={handleSaveExpenseForm} className="p-5 overflow-y-auto space-y-4 flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Tipo de Gasto</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('paid');
                      if (formPaymentMethod.startsWith('cash')) setFormPaymentMethod('credit_card');
                    }}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      formType === 'paid' ? 'bg-teal-600 text-white border-teal-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    💳 Ya se pagó
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('pending')}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      formType === 'pending' ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    ⏳ Pendiente
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFormType('cash');
                      setFormPaymentMethod('cash_usd');
                    }}
                    className={`py-2 text-xs font-bold rounded-xl border transition ${
                      formType === 'cash' ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs' : 'bg-slate-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    💵 Efectivo
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre de la Actividad o Rubro</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Almuerzo Bodega Zuccardi, Vuelos..."
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Monto Total en USD ($)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="0.00"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                {formType === 'paid' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">¿Quién adelantó el dinero?</label>
                    <select
                      value={formPaidBy}
                      onChange={(e) => setFormPaidBy(e.target.value)}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      {PARTICIPANTS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Método Previsto</label>
                    <select
                      value={formPaymentMethod}
                      onChange={(e) => setFormPaymentMethod(e.target.value)}
                      className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                    >
                      <option value="credit_card">Tarjeta de Crédito</option>
                      <option value="cash_usd">Efectivo en Dólares (USD)</option>
                      <option value="cash_ars">Efectivo en Pesos (ARS)</option>
                      <option value="bank_transfer">Transferencia Bancaria</option>
                    </select>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    ¿Quiénes participan? ({formParticipants.length} de 7)
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFormParticipants(PARTICIPANTS.map(p => p.id))}
                      className="text-[11px] text-teal-600 font-bold hover:underline"
                    >
                      Todos
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      type="button"
                      onClick={() => setFormParticipants(['joseluis', 'david', 'carl', 'anjuri', 'marie'])}
                      className="text-[11px] text-indigo-600 font-bold hover:underline"
                    >
                      Solo 5 (Sin tías)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {PARTICIPANTS.map(p => {
                    const isSelected = formParticipants.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormParticipants(formParticipants.filter(id => id !== p.id));
                          } else {
                            setFormParticipants([...formParticipants, p.id]);
                          }
                        }}
                        className={`text-xs py-2 px-3 rounded-xl font-bold text-left flex items-center justify-between border transition ${
                          isSelected ? 'bg-slate-900 text-white border-slate-900 shadow-xs' : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        <span className="truncate">{p.shortName}</span>
                        {isSelected && <IconCheck />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                >
                  {editingExpenseId ? 'Actualizar Gasto' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {}
      {convertingExpense && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 overflow-hidden">
            <div className="bg-emerald-700 text-white px-5 py-4 flex justify-between items-center">
              <h3 className="font-extrabold text-sm">Pasar Actividad a "Ya Pagado"</h3>
              <button
                onClick={() => setConvertingExpense(null)}
                className="text-emerald-200 hover:text-white"
              >
                <IconX />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                <div className="font-bold text-emerald-950 text-sm">{convertingExpense.title}</div>
                <div className="text-emerald-700 text-[11px] mt-0.5">
                  Participan: {convertingExpense.participants?.length} persona(s)
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Monto Final Confirmado en USD ($)</label>
                <input
                  type="number"
                  step="any"
                  value={convertAmount}
                  onChange={(e) => setConvertAmount(e.target.value)}
                  className="w-full text-xs font-bold px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">¿Quién adelantó el dinero?</label>
                <select
                  value={convertPayer}
                  onChange={(e) => setConvertPayer(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  {PARTICIPANTS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Método de Pago</label>
                <select
                  value={convertMethod}
                  onChange={(e) => setConvertMethod(e.target.value)}
                  className="w-full text-xs font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                >
                  <option value="credit_card">Tarjeta de Crédito</option>
                  <option value="bank_transfer">Transferencia Bancaria</option>
                  <option value="cash_usd">Efectivo en Dólares (USD)</option>
                  <option value="cash_ars">Efectivo en Pesos (ARS)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Estado de Reembolsos Inmediatos</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {(convertingExpense.participants || []).map(uid => {
                    const pass = PARTICIPANTS.find(p => p.id === uid);
                    const isPayer = (uid === convertPayer);
                    const isPaid = isPayer || Boolean(convertPaidStatus[uid]);
                    return (
                      <button
                        key={uid}
                        type="button"
                        onClick={() => {
                          if (!isPayer) {
                            setConvertPaidStatus(prev => ({ ...prev, [uid]: !prev[uid] }));
                          }
                        }}
                        className={`p-2 rounded-xl border text-xs font-bold flex items-center justify-between transition ${
                          isPayer ? 'bg-slate-100 border-slate-300 text-slate-700 cursor-default' :
                          isPaid ? 'bg-emerald-100 border-emerald-300 text-emerald-900' :
                          'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="truncate">{pass?.shortName}</span>
                        {isPaid && <IconCheck />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setConvertingExpense(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmConversion}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md transition"
                >
                  Confirmar y Pasar a Pagado
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Tablet Backup / Restore Modal */}
      {showQuickBackupModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center font-black text-sm">
              <div className="flex items-center gap-2">
                <span>📋</span>
                <span>Respaldo y Restauración Rápida (Tablet)</span>
              </div>
              <button
                onClick={() => setShowQuickBackupModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <IconX />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Este cuadro contiene todos tus gastos en formato texto. Puedes copiarlo para guardarlo en tus notas de la tablet o pegar un respaldo anterior para recuperarlo:
              </p>

              <textarea
                value={rawBackupText}
                onChange={(e) => setRawBackupText(e.target.value)}
                rows={7}
                className="w-full font-mono text-[11px] p-3 rounded-xl border border-slate-300 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Pega aquí el código JSON de respaldo..."
              />

              <div className="flex flex-wrap gap-2 justify-between items-center pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => copyToClipboard(rawBackupText)}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl shadow-xs transition"
                >
                  Copiar al Portapapeles
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQuickBackupModal(false)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleManualImportText}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition"
                  >
                    Restaurar desde Texto
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {expenseToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 p-5 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-3">
              <IconTrash />
            </div>
            <h3 className="font-bold text-lg text-slate-900">¿Eliminar este rubro?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Esta acción recalculará automáticamente los balances de todos los participantes.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteExpense}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs shadow-md transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 overflow-hidden">
            <div className="bg-amber-500 text-slate-950 px-5 py-3.5 flex justify-between items-center font-black">
              <div className="flex items-center gap-2">
                <span>🔍</span>
                <span>Respaldos de Seguridad Encontrados</span>
              </div>
              <button
                onClick={() => setShowRecoveryModal(false)}
                className="text-slate-900 hover:text-black bg-black/10 rounded-full p-1"
              >
                <IconX />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <p className="text-xs text-slate-600 font-medium">
                Selecciona cualquier versión registrada en tu dispositivo para cargarla al instante:
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                <div className="p-3 rounded-xl border border-teal-300 bg-teal-50 flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-sm text-teal-950">
                      Versión Base Inicial (5 rubros)
                    </div>
                    <div className="text-[11px] text-teal-700">
                      Vuelos, Zuccardi, Salentein, El Enemigo y Transporte.
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreSpecificBackup(INITIAL_EXPENSES)}
                    className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
                  >
                    Restaurar
                  </button>
                </div>

                {availableBackups.map((b, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 hover:bg-slate-100 transition"
                  >
                    <div>
                      <div className="font-bold text-sm text-slate-900">
                        {b.count} gasto(s) guardados
                      </div>
                      <div className="text-[11px] text-slate-500 truncate max-w-[240px]">
                        Clave: {b.key}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRestoreSpecificBackup(b.data)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition"
                    >
                      Cargar
                    </button>
                  </div>
                ))}
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setShowRecoveryModal(false)}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold px-4 py-2 rounded-xl"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {}
      {showTableModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="bg-slate-900 text-white px-5 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2 font-black text-sm">
                <IconTable />
                <span>Matriz Comparativa y Exportación</span>
              </div>
              <button
                onClick={() => setShowTableModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <IconX />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* Matrix Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-black text-slate-800 uppercase tracking-wider text-xs">
                    Matriz de Gastos por Pasajero
                  </h4>
                  <span className="text-[11px] text-slate-500">Muestra cuota y estado por cada rubro</span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left border-collapse min-w-[750px]">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[11px]">
                        <th className="p-3 font-bold sticky left-0 bg-slate-900 z-10">Pasajero</th>
                        {expenses.map(exp => (
                          <th key={exp.id} className="p-3 font-bold text-center border-l border-slate-800">
                            <div className="truncate max-w-[120px]" title={exp.title}>{exp.title}</div>
                            <div className="text-[10px] text-teal-300 font-normal">${exp.amount.toFixed(2)}</div>
                          </th>
                        ))}
                        <th className="p-3 font-black text-center bg-indigo-950 border-l border-slate-800">Costo Real</th>
                        <th className="p-3 font-black text-center bg-rose-950 border-l border-slate-800">Debe José L.</th>
                        <th className="p-3 font-black text-center bg-emerald-950 border-l border-slate-800">Efectivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {PARTICIPANTS.map(p => {
                        const b = calculations.userBreakdowns[p.id];

                        return (
                          <tr key={p.id} className="hover:bg-slate-50 transition">
                            <td className="p-3 font-bold text-slate-900 sticky left-0 bg-white shadow-xs">
                              {p.name}
                            </td>
                            {expenses.map(exp => {
                              const participates = (exp.participants || []).includes(p.id);
                              if (!participates) {
                                return (
                                  <td key={exp.id} className="p-3 text-center text-slate-300 border-l border-slate-100">
                                    -
                                  </td>
                                );
                              }
                              const share = exp.amount / (exp.participants.length || 1);
                              const isPayer = (exp.paidBy === p.id);
                              const hasSettled = isPayer || Boolean(exp.paidStatus && exp.paidStatus[p.id]);

                              return (
                                <td key={exp.id} className="p-3 text-center border-l border-slate-100">
                                  <div className="font-bold text-slate-800">${share.toFixed(2)}</div>
                                  {exp.expenseType === 'paid' && (
                                    <div className={`text-[10px] font-bold ${isPayer ? 'text-slate-500' : hasSettled ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {isPayer ? 'Pagó' : hasSettled ? '✓ Saldó' : '⚠️ Debe'}
                                    </div>
                                  )}
                                  {exp.expenseType === 'cash' && (
                                    <div className="text-[10px] font-semibold text-emerald-600">Efectivo</div>
                                  )}
                                  {exp.expenseType === 'pending' && (
                                    <div className="text-[10px] font-semibold text-amber-600">Pendiente</div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="p-3 text-center font-black text-indigo-900 bg-indigo-50/50 border-l border-slate-200">
                              ${b.totalCostAllActivities.toFixed(2)}
                            </td>
                            <td className="p-3 text-center font-black text-rose-600 bg-rose-50/40 border-l border-slate-200">
                              ${p.isOrganizer ? '0.00' : b.debtToOrganizerRemaining.toFixed(2)}
                            </td>
                            <td className="p-3 text-center font-black text-emerald-700 bg-emerald-50/40 border-l border-slate-200">
                              ${b.cashRequiredForTrip.toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* WhatsApp reports generator */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <span>📱 Mensaje para Grupo de WhatsApp</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Copia el reporte completo con sumatorias de los 10 rubros y estados individuales.
                  </p>
                  <button
                    onClick={() => copyToClipboard(generateWhatsAppFullSummary())}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-xs transition"
                  >
                    Copiar Resumen Grupal Completo
                  </button>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <span>👤 Mensaje Individual Personalizado</span>
                  </h4>
                  <div className="flex gap-2">
                    <select
                      value={selectedUserForMessage}
                      onChange={(e) => setSelectedUserForMessage(e.target.value)}
                      className="flex-1 text-xs font-bold px-3 py-2 rounded-xl border border-slate-300 bg-white"
                    >
                      {PARTICIPANTS.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => copyToClipboard(generateWhatsAppIndividualSummary(selectedUserForMessage))}
                      className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white font-extrabold rounded-xl shadow-xs transition"
                    >
                      Copiar
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Genera el mensaje individual con el saldo exacto adeudado.
                  </p>
                </div>
              </div>

              {/* Tablet text-copy and file backup section */}
              <div className="pt-3 border-t border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-800 text-xs">Copia de Seguridad y Respaldo para Tablet</div>
                    <div className="text-[11px] text-slate-500">Si tu tablet no descarga archivos, copia el texto directo:</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(expenses, null, 2))}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition"
                    >
                      Copiar Texto de Respaldo
                    </button>
                    <button
                      onClick={handleDownloadBackup}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs transition"
                    >
                      Descargar Archivo (.json)
                    </button>
                    <input
                      type="file"
                      accept=".json"
                      ref={fileInputRef}
                      onChange={handleUploadBackup}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current && fileInputRef.current.click()}
                      className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
                    >
                      Restaurar Archivo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer info */}
      <footer className="bg-slate-900 text-slate-500 text-[11px] py-4 px-4 text-center border-t border-slate-800">
        Gestor de Gastos Argentina • José Luis León • Control y Balances Sincronizados
      </footer>
    </div>
  );
}