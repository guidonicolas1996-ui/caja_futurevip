import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const directory = path.dirname(fileURLToPath(import.meta.url));
const legacyFile = path.join(directory, 'data', 'cajas.json');
const legacyConfigFile = path.join(directory, 'data', 'configuracion.json');
const spacesFile = path.join(directory, 'data', 'espacios.json');
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const titulares = ['Fede Acuña', 'Pablo Totaro', 'Mateo Ferrer', 'Ever Lombardo'];
const billeteras = ['Ualá', 'Mercado Pago', 'Personal Pay', 'Naranja X', 'Brubank', 'Prex', 'Astro Pay', 'Belo', 'Lemon'];
const plataformas = ['Ganamos', 'Zeus', 'Apostamos'];
const colors = ['teal', 'blue', 'green', 'orange', 'pink', 'red', 'yellow', 'violet', 'slate'];
const walletCategories = ['Normal', 'Depósitos', 'Compartidas'];
const nextShift = { Noche: 'Mañana', Mañana: 'Tarde', Tarde: 'Noche' };

const blankAdvertising = () => ({ 'Publicidad A': { total: 0, new: 0, repeated: 0, derived: {} }, 'Publicidad B': { total: 0, new: 0, repeated: 0, derived: {} } });
function normalizeAdvertising(advertising) {
  const defaults = blankAdvertising();
  return Object.fromEntries(Object.keys(defaults).map((name) => {
    const item = advertising?.[name] || {};
    return [name, {
      total: Number(item.total) || 0,
      new: Number(item.new) || 0,
      repeated: Number(item.repeated) || 0,
      derived: { ...(item.derived || {}) },
    }];
  }));
}
function normalizeSpaces(spaces) {
  let changed = false;
  spaces.forEach((space) => space.cajas.forEach((caja) => {
    const advertising = normalizeAdvertising(caja.advertising);
    if (JSON.stringify(advertising) !== JSON.stringify(caja.advertising)) {
      caja.advertising = advertising;
      changed = true;
    }
  }));
  return changed;
}
const defaultConfig = () => ({
  accounts: { holders: titulares, wallets: billeteras, availability: Object.fromEntries(titulares.map((holder) => [holder, Object.fromEntries(billeteras.map((wallet) => [wallet, true]))])), walletSettings: Object.fromEntries(titulares.map((holder) => [holder, Object.fromEntries(billeteras.map((wallet) => [wallet, { category: 'Normal', boxId: null }]))])), walletModes: Object.fromEntries(billeteras.map((wallet) => [wallet, 'Cobros + Retiros'])) },
  expenses: [{ name: 'Caja chica', inverted: false }, { name: 'Servicios', inverted: false }, { name: 'Traslado', inverted: false }],
  platforms: plataformas,
});
const readLegacyConfig = () => fs.existsSync(legacyConfigFile) ? JSON.parse(fs.readFileSync(legacyConfigFile, 'utf8')) : defaultConfig();
const blankCaja = (id, previous = null, config = defaultConfig()) => ({
  id, status: 'ABIERTA', shift: nextShift[previous?.shift] || ['Noche', 'Mañana', 'Tarde'][id % 3], date: new Date().toISOString(),
  cashInitial: previous?.cashFinal ?? 0, nextNotes: previous?.nextNotes ?? '', notes: '',
  accounts: config.accounts.holders.map((holder) => { const previousAccount = previous?.accounts?.find((account) => account.holder === holder); return { holder, values: Object.fromEntries(config.accounts.wallets.map((wallet) => [wallet, previousAccount?.values?.[wallet] ?? 0])), walletBoxes: { ...(previousAccount?.walletBoxes ?? {}) }, verified: structuredClone(previousAccount?.verified ?? {}), notes: { ...(previousAccount?.notes ?? {}) } }; }),
  bonuses: [], ta: [], tips: [], expenses: [], transfers: [], found: 0, foundMoney: [],
  advertising: previous?.shift === 'Tarde' ? blankAdvertising() : structuredClone(previous?.advertising || blankAdvertising()),
  chips: config.platforms.map((platform) => { const previousChip = previous?.chips?.find((item) => item.platform === platform); const value = previousChip?.final ?? 0; return { platform, initial: value, final: value }; }),
  chipLoads: [],
});
function writeLocalSpaces(spaces) { fs.writeFileSync(spacesFile, JSON.stringify(spaces, null, 2)); }
async function writeSpaces(spaces) {
  if (supabase) {
    const { error } = await supabase.from('app_state').upsert({ id: 'main', spaces, updated_at: new Date().toISOString() });
    if (error) throw new Error(`No se pudo guardar en Supabase: ${error.message}`);
    return;
  }
  writeLocalSpaces(spaces);
}
function readLocalSpaces() {
  fs.mkdirSync(path.dirname(spacesFile), { recursive: true });
  if (fs.existsSync(spacesFile)) {
    const spaces = JSON.parse(fs.readFileSync(spacesFile, 'utf8'));
    const changed = normalizeSpaces(spaces);
    if (spaces.some((space) => space.shiftVersion !== 2)) {
      const legacyNames = { Mañana: 'Noche', Tarde: 'Mañana', Noche: 'Tarde' };
      spaces.forEach((space) => { space.cajas.forEach((caja) => { caja.shift = legacyNames[caja.shift] || caja.shift; }); space.shiftVersion = 2; });
      writeLocalSpaces(spaces);
    }
    if (changed) writeLocalSpaces(spaces);
    return spaces;
  }
  const legacy = fs.existsSync(legacyFile) ? JSON.parse(fs.readFileSync(legacyFile, 'utf8')) : [blankCaja(0, null, readLegacyConfig())];
  const spaces = [{ id: 'principal', title: 'Caja principal', color: 'teal', shiftVersion: 2, config: readLegacyConfig(), cajas: legacy }];
  writeLocalSpaces(spaces);
  return spaces;
}
async function readSpaces() {
  if (!supabase) return readLocalSpaces();
  const { data, error } = await supabase.from('app_state').select('spaces').eq('id', 'main').maybeSingle();
  if (error) throw new Error(`No se pudo leer Supabase: ${error.message}`);
  if (data?.spaces) {
    const spaces = data.spaces;
    if (normalizeSpaces(spaces)) await writeSpaces(spaces);
    return spaces;
  }
  const spaces = readLocalSpaces();
  await writeSpaces(spaces);
  return spaces;
}
async function getSpace(boxId) { const spaces = await readSpaces(); return spaces.find((space) => space.id === boxId) || spaces[0]; }
function normalizeConfig(config) {
  const defaults = defaultConfig(); const accounts = config?.accounts || {};
  const holders = Array.isArray(accounts.holders) && accounts.holders.length ? accounts.holders : defaults.accounts.holders;
  const wallets = Array.isArray(accounts.wallets) && accounts.wallets.length ? accounts.wallets : defaults.accounts.wallets;
  const sourceAvailability = accounts.availability || {};
  const availability = Object.fromEntries(holders.map((holder) => [holder, Object.fromEntries(wallets.map((wallet) => [wallet, sourceAvailability[holder]?.[wallet] !== false]))]));
  const sourceWalletSettings = accounts.walletSettings || {};
  const walletSettings = Object.fromEntries(holders.map((holder) => [holder, Object.fromEntries(wallets.map((wallet) => { const legacySetting = sourceWalletSettings[wallet]; const setting = sourceWalletSettings[holder]?.[wallet] || (legacySetting && !legacySetting.category ? legacySetting : {}); return [wallet, { category: walletCategories.includes(setting.category) ? setting.category : 'Normal', boxId: setting.boxId || null }]; }))]));
  const sourceWalletModes = accounts.walletModes || {};
  const walletModes = Object.fromEntries(wallets.map((wallet) => [wallet, ['Cobros + Retiros', 'Solo Cobros', 'Solo Depósito'].includes(sourceWalletModes[wallet]) ? sourceWalletModes[wallet] : 'Cobros + Retiros']));
  return { ...defaults, ...config, accounts: { holders, wallets, availability, walletSettings, walletModes }, expenses: Array.isArray(config?.expenses) && config.expenses.length ? config.expenses : defaults.expenses, platforms: Array.isArray(config?.platforms) && config.platforms.length ? config.platforms : defaults.platforms };
}
export async function getBoxes() { return (await readSpaces()).map(({ id, title, color }) => ({ id, title, color })); }
export async function createBox({ title = 'Nueva caja', color = 'blue' } = {}) { const spaces = await readSpaces(); const config = defaultConfig(); const id = `caja-${crypto.randomUUID()}`; const space = { id, title, color: colors.includes(color) ? color : 'blue', config, cajas: [blankCaja(0, null, config)] }; spaces.push(space); await writeSpaces(spaces); return { id, title, color: space.color }; }
export async function updateBox(id, patch) { const spaces = await readSpaces(); const space = spaces.find((item) => item.id === id); if (!space) throw new Error('Caja no encontrada'); if (patch.title !== undefined) space.title = String(patch.title).trim() || space.title; if (patch.color !== undefined && colors.includes(patch.color)) space.color = patch.color; await writeSpaces(spaces); return { id: space.id, title: space.title, color: space.color }; }
export async function deleteBox(id) { const spaces = await readSpaces(); if (spaces.length <= 1) throw new Error('Debe existir al menos una caja'); const next = spaces.filter((space) => space.id !== id); if (next.length === spaces.length) throw new Error('Caja no encontrada'); await writeSpaces(next); return next.map(({ id: spaceId, title, color }) => ({ id: spaceId, title, color })); }
export async function getCurrent(boxId) { return (await getSpace(boxId)).cajas.at(-1); }
export async function getHistory(boxId) { return (await getSpace(boxId)).cajas.slice().reverse(); }
export async function getConfig(boxId) { const space = await getSpace(boxId); const normalized = normalizeConfig(space.config); if (JSON.stringify(normalized) !== JSON.stringify(space.config)) { space.config = normalized; const spaces = await readSpaces(); const index = spaces.findIndex((item) => item.id === space.id); spaces[index] = space; await writeSpaces(spaces); } return normalized; }
export async function updateCurrent(patch, boxId) {
  const spaces = await readSpaces();
  const space = spaces.find((item) => item.id === boxId) || spaces[0];
  const current = { ...space.cajas.at(-1), ...patch };
  if (Array.isArray(patch.accounts)) {
    patch.accounts.forEach((account) => {
      Object.entries(account.values || {}).forEach(([wallet, value]) => {
        const setting = space.config?.accounts?.walletSettings?.[account.holder]?.[wallet];
        if (!['Depósitos', 'Compartidas'].includes(setting?.category)) return;
        spaces.forEach((targetSpace) => {
          const targetAccount = targetSpace.cajas.at(-1).accounts.find((item) => item.holder === account.holder);
          const targetSetting = targetSpace.config?.accounts?.walletSettings?.[account.holder]?.[wallet];
          if (targetAccount && ['Depósitos', 'Compartidas'].includes(targetSetting?.category)) {
            targetAccount.values[wallet] = value;
            targetAccount.verified = { ...(targetAccount.verified || {}), [wallet]: account.verified?.[wallet] };
            targetAccount.notes = { ...(targetAccount.notes || {}), [wallet]: account.notes?.[wallet] };
          }
        });
      });
    });
  }
  if (patch.advertising) {
    spaces.forEach((targetSpace) => {
      targetSpace.cajas.at(-1).advertising = structuredClone(patch.advertising);
    });
  }
  space.cajas[space.cajas.length - 1] = current;
  await writeSpaces(spaces);
  return current;
}
export async function updateCaja(id, patch, boxId) {
  const spaces = await readSpaces();
  const space = spaces.find((item) => item.id === boxId) || spaces[0];
  const index = space.cajas.findIndex((caja) => String(caja.id) === String(id));
  if (index === -1) throw new Error('Caja no encontrada');
  space.cajas[index] = { ...space.cajas[index], ...patch, id: space.cajas[index].id };
  await writeSpaces(spaces);
  return space.cajas[index];
}
export async function resetAllData() {
  const spaces = await readSpaces();
  const resetDate = '2026-08-23T19:00:00.000Z';
  spaces.forEach((space) => {
    const config = normalizeConfig(space.config);
    space.config = config;
    space.cajas = [{ ...blankCaja(0, null, config), shift: 'Tarde', date: resetDate }];
  });
  await writeSpaces(spaces);
  return spaces;
}
export async function setWalletAssignment({ holder, wallet, boxId }) { const spaces = await readSpaces(); if (boxId && !spaces.some((space) => space.id === boxId)) throw new Error('Caja no encontrada'); spaces.forEach((space) => { const account = space.cajas.at(-1).accounts.find((item) => item.holder === holder); if (account) account.walletBoxes = { ...(account.walletBoxes || {}), [wallet]: boxId || '' }; }); await writeSpaces(spaces); return { currents: Object.fromEntries(spaces.map((space) => [space.id, space.cajas.at(-1)])) }; }
export async function createTransfer({ fromBoxId, toBoxId, amount, note = '' }) {
  if (!fromBoxId || !toBoxId || fromBoxId === toBoxId) throw new Error('Seleccioná dos cajas diferentes');
  const value = Number(amount) || 0;
  if (value <= 0) throw new Error('El monto debe ser mayor a cero');
  const spaces = await readSpaces(); const from = spaces.find((space) => space.id === fromBoxId); const to = spaces.find((space) => space.id === toBoxId);
  if (!from || !to) throw new Error('Caja de origen o destino no encontrada');
  const transfer = { id: crypto.randomUUID(), fromBoxId, toBoxId, amount: value, note: String(note || ''), createdAt: new Date().toISOString() };
  from.cajas.at(-1).transfers = [...(from.cajas.at(-1).transfers || []), transfer];
  to.cajas.at(-1).transfers = [...(to.cajas.at(-1).transfers || []), transfer];
  await writeSpaces(spaces);
  return { transfer, from: from.cajas.at(-1), to: to.cajas.at(-1) };
}
export async function updateTransfer(id, patch) {
  const spaces = await readSpaces(); const allCurrent = spaces.map((space) => ({ space, current: space.cajas.at(-1) })); const original = allCurrent.find(({ current }) => current.transfers?.some((transfer) => transfer.id === id))?.current?.transfers?.find((transfer) => transfer.id === id);
  if (!original) throw new Error('Traspaso no encontrado');
  const fromBoxId = patch.fromBoxId || original.fromBoxId; const toBoxId = patch.toBoxId || original.toBoxId; const amount = Number(patch.amount ?? original.amount) || 0;
  if (!fromBoxId || !toBoxId || fromBoxId === toBoxId) throw new Error('Seleccioná dos cajas diferentes');
  if (amount <= 0) throw new Error('El monto debe ser mayor a cero');
  if (!spaces.some((space) => space.id === fromBoxId) || !spaces.some((space) => space.id === toBoxId)) throw new Error('Caja de origen o destino no encontrada');
  const updated = { ...original, fromBoxId, toBoxId, amount, note: patch.note ?? original.note, updatedAt: new Date().toISOString() };
  allCurrent.forEach(({ current }) => { current.transfers = (current.transfers || []).filter((transfer) => transfer.id !== id); });
  spaces.find((space) => space.id === fromBoxId).cajas.at(-1).transfers.push(updated);
  spaces.find((space) => space.id === toBoxId).cajas.at(-1).transfers.push(updated);
  await writeSpaces(spaces); return { transfer: updated, currents: Object.fromEntries(spaces.map((space) => [space.id, space.cajas.at(-1)])) };
}
export async function deleteTransfer(id) {
  const spaces = await readSpaces(); let found = false;
  spaces.forEach((space) => { const current = space.cajas.at(-1); const transfers = current.transfers || []; if (transfers.some((transfer) => transfer.id === id)) found = true; current.transfers = transfers.filter((transfer) => transfer.id !== id); });
  if (!found) throw new Error('Traspaso no encontrado'); await writeSpaces(spaces); return { currents: Object.fromEntries(spaces.map((space) => [space.id, space.cajas.at(-1)])) };
}
export async function updateConfig(config, boxId) {
  const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; const normalized = normalizeConfig(config); space.config = normalized;
  const current = space.cajas.at(-1); const existing = new Map(current.accounts.map((account) => [account.holder, account]));
  current.accounts = normalized.accounts.holders.map((holder) => { const account = existing.get(holder); return { holder, values: Object.fromEntries(normalized.accounts.wallets.map((wallet) => [wallet, account?.values?.[wallet] ?? 0])), walletBoxes: account?.walletBoxes || {}, verified: account?.verified || {}, notes: account?.notes || {} }; });
  current.chips = normalized.platforms.map((platform) => ({ platform, initial: current.chips.find((chip) => chip.platform === platform)?.initial ?? 0, final: current.chips.find((chip) => chip.platform === platform)?.final ?? 0 }));
  current.expenses = current.expenses.map((expense) => ({ ...expense, category: normalized.expenses.some((item) => item.name === expense.category) ? expense.category : normalized.expenses[0]?.name || 'Gasto' }));
  space.cajas[space.cajas.length - 1] = current; await writeSpaces(spaces); return { config: normalized, current };
}
function walletBelongsToBox(row, wallet, config, boxId) {
  const setting = config.accounts.walletSettings?.[row.holder]?.[wallet];
  return config.accounts.availability?.[row.holder]?.[wallet] !== false && (!setting?.category || setting.category === 'Normal' || row.walletBoxes?.[wallet] === boxId);
}
export async function closeCurrent(patch = {}, boxId) { const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; const config = normalizeConfig(space.config); const source = patch.accounts || space.cajas.at(-1).accounts; const accountsTotal = source.flatMap((row) => Object.entries(row.values || {}).filter(([wallet]) => walletBelongsToBox(row, wallet, config, space.id)).map(([, value]) => value)).reduce((sum, value) => sum + (Number(value) || 0), 0); const current = { ...space.cajas.at(-1), ...patch, cashFinal: accountsTotal }; if (current.status === 'CERRADA') throw new Error('La caja ya está cerrada'); current.status = 'CERRADA'; current.closedAt = new Date().toISOString(); space.cajas[space.cajas.length - 1] = current; space.cajas.push(blankCaja(current.id + 1, current, space.config)); await writeSpaces(spaces); return space.cajas.at(-1); }
export { billeteras, titulares, plataformas };
