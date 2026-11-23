/**
 * SYNCRO — Diario Emocional Cifrado (AES-GCM 256-bit + IndexedDB)
 * La clave criptográfica es no extraíble (extractable: false) y vive
 * únicamente en el navegador del usuario. El análisis por IA es opt-in explícito.
 */

import { state, keyOf, esc } from '../core/state.js';
import { aiService } from '../services/aiService.js';
import { $ } from '../ui/modals.js';

const DB_NAME = 'syncro_journal_db';
const DB_VER = 1;
const STORE_KEYS = 'keys';
const STORE_NOTES = 'notes';

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_KEYS)) db.createObjectStore(STORE_KEYS);
      if (!db.objectStoreNames.contains(STORE_NOTES)) db.createObjectStore(STORE_NOTES, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

async function getCryptoKey() {
  const db = await openDB();
  const existing = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_KEYS, 'readonly');
    const req = tx.objectStore(STORE_KEYS).get('master');
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
  if (existing) return existing;

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_KEYS, 'readwrite');
    tx.objectStore(STORE_KEYS).put(key, 'master');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  return key;
}

export const Journal = {
  ok() {
    return typeof indexedDB !== 'undefined' && Boolean(crypto?.subtle);
  },

  async add({ text, energy, mood }) {
    if (!this.ok() || !text?.trim()) return null;
    const key = await getCryptoKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text.trim()));
    const record = {
      id: 'j_' + Date.now().toString(36),
      ts: Date.now(),
      date: keyOf(),
      energy: Number(energy || 5),
      mood: mood || 'tranquilo',
      iv: Array.from(iv),
      ct: Array.from(new Uint8Array(ct)),
    };
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NOTES, 'readwrite');
      tx.objectStore(STORE_NOTES).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return record;
  },

  async all() {
    if (!this.ok()) return [];
    const db = await openDB();
    const key = await getCryptoKey();
    const raw = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NOTES, 'readonly');
      const req = tx.objectStore(STORE_NOTES).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    const out = [];
    for (const r of raw.sort((a, b) => b.ts - a.ts)) {
      try {
        const pt = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: new Uint8Array(r.iv) },
          key,
          new Uint8Array(r.ct)
        );
        out.push({ ...r, text: new TextDecoder().decode(pt) });
      } catch {
        // clave distinta o registro corrupto
      }
    }
    return out;
  },

  async clear() {
    if (!this.ok()) return;
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NOTES, 'readwrite');
      tx.objectStore(STORE_NOTES).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },
};

export async function renderJournalTimeline() {
  const spark = $('#moodSpark');
  const insightsEl = $('#journalInsights');
  const listEl = $('#journalList');
  if (!spark || !listEl) return;

  const logs = (state.moodLogs || []).slice(-14);
  spark.innerHTML = logs.length
    ? logs
        .map(
          (l) =>
            `<span class="spark-bar" style="height:${Math.max(14, l.energy * 10)}%" title="${esc(l.date)} · Energía ${l.energy}/10 (${esc(l.mood || '')})"></span>`
        )
        .join('')
    : '<p class="muted small">Completa tu primer check-in para ver tu curva emocional aquí.</p>';

  let entries = [];
  if (Journal.ok()) {
    try {
      entries = await Journal.all();
    } catch {
      entries = [];
    }
  }

  if (insightsEl) {
    const analysis = aiService.analyzeJournalPatterns(entries, {
      optIn: Boolean(state.profile.journalAiOptIn),
    });
    insightsEl.innerHTML = `<p class="muted small" style="margin:8px 0;">${
      analysis.optInRequired ? '🔒 ' : '✨ '
    }${esc(analysis.summary)}</p>`;
  }

  listEl.innerHTML = entries.length
    ? entries
        .slice(0, 12)
        .map(
          (e) => `
          <li class="mood-item">
            <div class="mood-item-head">
              <strong>${esc(e.date)}</strong>
              <span class="pill">${esc(e.mood || 'check-in')} · ${e.energy}/10</span>
            </div>
            <p>${esc(e.text)}</p>
          </li>`
        )
        .join('')
    : '<li class="muted small">Aún no hay notas guardadas en tu diario cifrado.</li>';
}
