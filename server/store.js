import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;
const requireSupabase = () => {
  if (!supabase) throw new Error(`La API está bloqueada: faltan ${!supabaseUrl ? 'SUPABASE_URL' : ''}${!supabaseUrl && !supabaseKey ? ' y ' : ''}${!supabaseKey ? 'SUPABASE_SERVICE_ROLE_KEY' : ''} en el entorno del backend`);
  return supabase;
};
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
  logistics: { order: [], hidden: [], added: [] },
  statistics: { employees: 1, proportionalPercent: 100 },
  monthlyGoal: { final: 0, achieved: 0 },
  expenses: [{ name: 'Caja chica', inverted: false }, { name: 'Servicios', inverted: false }, { name: 'Traslado', inverted: false }],
  platforms: plataformas,
  platformColors: Object.fromEntries(plataformas.map((platform, index) => [platform, colors[index % colors.length]])),
});
const blankCaja = (id, previous = null, config = defaultConfig()) => ({
  id, status: 'ABIERTA', shift: nextShift[previous?.shift] || ['Noche', 'Mañana', 'Tarde'][id % 3], date: new Date().toISOString(),
  cashInitial: previous?.cashFinal ?? 0, nextNotes: previous?.nextNotes ?? '', notes: '',
  accountSections: structuredClone(previous?.accountSections || { deposits: false, shared: false }),
  accounts: config.accounts.holders.map((holder) => { const previousAccount = previous?.accounts?.find((account) => account.holder === holder); return { holder, holderId: config.accounts.holderEntities?.find((entity) => entity.name === holder)?.id, values: Object.fromEntries(config.accounts.wallets.map((wallet) => [wallet, previousAccount?.values?.[wallet] ?? 0])), walletIds: Object.fromEntries(config.accounts.wallets.map((wallet) => [wallet, config.accounts.walletEntities?.find((entity) => entity.name === wallet)?.id])), walletBoxes: { ...(previousAccount?.walletBoxes ?? {}) }, walletBoxUpdatedAt: { ...(previousAccount?.walletBoxUpdatedAt ?? {}) }, walletRestartAt: { ...(previousAccount?.walletRestartAt ?? {}) }, verified: structuredClone(previousAccount?.verified ?? {}), notes: { ...(previousAccount?.notes ?? {}) } }; }),
  bonuses: [], ta: [], tips: [], expenses: [], transfers: [], found: 0, foundMoney: [],
  advertising: previous?.shift === 'Tarde' ? blankAdvertising() : structuredClone(previous?.advertising || blankAdvertising()),
  chips: config.platforms.map((platform) => { const previousChip = previous?.chips?.find((item) => item.platform === platform); const value = previousChip?.final ?? 0; return { platform, platformId: config.platformEntities?.find((entity) => entity.name === platform)?.id, initial: value, final: value }; }),
  chipLoads: [],
});
async function writeSpaces(spaces, { allowSpaceDeletion = false } = {}) {
  const database = requireSupabase();
  if (!Array.isArray(spaces) || spaces.length === 0 || spaces.some((space) => !space?.id || !space?.config || !Array.isArray(space.cajas) || space.cajas.length === 0)) {
    throw new Error('No se guardó el cambio: la BDD debe conservar al menos una caja, su configuración y un registro diario.');
  }
  if (!spaces.updatedAt) throw new Error('No se pudo guardar: falta la versión de la BDD');
  const { data: currentState, error: readError } = await database.from('app_state').select('spaces, updated_at').eq('id', 'main').maybeSingle();
  if (readError) throw new Error(`No se pudo verificar la BDD antes de guardar: ${readError.message}`);
  if (!currentState?.spaces) throw new Error('No se guardó el cambio: la BDD no contiene un estado válido.');
  const currentIds = new Set(currentState.spaces.map((space) => space.id));
  const nextIds = new Set(spaces.map((space) => space.id));
  if (!allowSpaceDeletion && [...currentIds].some((id) => !nextIds.has(id))) {
    throw new Error('No se guardó el cambio: detectamos que desaparecería una caja. Recargá la página e intentá nuevamente.');
  }
  if (!allowSpaceDeletion) {
    currentState.spaces.forEach((currentSpace) => {
      const nextSpace = spaces.find((space) => space.id === currentSpace.id);
      const nextCajaIds = new Set((nextSpace?.cajas || []).map((caja) => String(caja.id)));
      if (currentSpace.cajas.some((caja) => !nextCajaIds.has(String(caja.id)))) {
        throw new Error('No se guardó el cambio: detectamos que desaparecería un registro diario. Recargá la página e intentá nuevamente.');
      }
    });
  }
  if (currentState.updated_at !== spaces.updatedAt) throw new Error('No se guardó el cambio porque la BDD cambió desde la última lectura. Recargá la página e intentá nuevamente.');
  const updatedAt = new Date().toISOString();
  const { data, error } = await database.from('app_state').update({ spaces, updated_at: updatedAt }).eq('id', 'main').eq('updated_at', spaces.updatedAt).select('id').maybeSingle();
  if (error) throw new Error(`No se pudo guardar en Supabase: ${error.message}`);
  if (!data) throw new Error('No se guardó el cambio porque la BDD cambió desde la última lectura. Recargá la página e intentá nuevamente.');
  spaces.updatedAt = updatedAt;
}
async function readSpaces() {
  const database = requireSupabase();
  const { data, error } = await database.from('app_state').select('spaces, updated_at').eq('id', 'main').maybeSingle();
  if (error) throw new Error(`No se pudo leer Supabase: ${error.message}`);
  if (data?.spaces) {
    const spaces = data.spaces;
    spaces.updatedAt = data.updated_at;
    return spaces;
  }
  throw new Error('La BDD no contiene el estado de la aplicación. No se crearán datos iniciales automáticamente.');
}
async function getSpace(boxId) { const spaces = await readSpaces(); return spaces.find((space) => space.id === boxId) || spaces[0]; }
function normalizeConfig(config) {
  const defaults = defaultConfig(); const accounts = config?.accounts || {};
  const holders = Array.isArray(accounts.holders) && accounts.holders.length ? accounts.holders : defaults.accounts.holders;
  const wallets = Array.isArray(accounts.wallets) && accounts.wallets.length ? accounts.wallets : defaults.accounts.wallets;
  const sourceAvailability = accounts.availability || {};
  const availability = Object.fromEntries(holders.map((holder) => [holder, Object.fromEntries(wallets.map((wallet) => [wallet, sourceAvailability[holder]?.[wallet] !== false]))]));
  const sourceWalletSettings = accounts.walletSettings || {};
  const walletSettings = Object.fromEntries(holders.map((holder) => [holder, Object.fromEntries(wallets.map((wallet) => { const legacySetting = sourceWalletSettings[wallet]; const setting = sourceWalletSettings[holder]?.[wallet] || (legacySetting && !legacySetting.category ? legacySetting : {}); return [wallet, { category: walletCategories.includes(setting.category) ? setting.category : 'Normal', boxId: setting.boxId || null, alias: String(setting.alias || ''), cuil: String(setting.cuil || ''), password: String(setting.password || ''), note: String(setting.note || '') }]; }))]));
  const sourceWalletModes = accounts.walletModes || {};
  const walletModes = Object.fromEntries(wallets.map((wallet) => [wallet, ['Cobros + Retiros', 'Solo Cobros', 'Solo Depósito'].includes(sourceWalletModes[wallet]) ? sourceWalletModes[wallet] : 'Cobros + Retiros']));
  const sourceLogistics = config?.logistics || {};
  const logistics = { order: Array.isArray(sourceLogistics.order) ? sourceLogistics.order : [], hidden: Array.isArray(sourceLogistics.hidden) ? sourceLogistics.hidden : [], added: Array.isArray(sourceLogistics.added) ? sourceLogistics.added : [] };
  const sourceStatistics = config?.statistics || {};
  const statistics = { employees: Math.max(1, Number(sourceStatistics.employees) || 1), proportionalPercent: sourceStatistics.proportionalPercent === undefined ? 100 : Math.min(100, Math.max(0, Number(sourceStatistics.proportionalPercent) || 0)) };
  const sourceMonthlyGoal = config?.monthlyGoal || {};
  const monthlyGoal = { final: Math.max(0, Number(sourceMonthlyGoal.final) || 0), achieved: Math.max(0, Number(sourceMonthlyGoal.achieved) || 0) };
  const platforms = Array.isArray(config?.platforms) && config.platforms.length ? config.platforms : defaults.platforms;
  const platformColors = Object.fromEntries(platforms.map((platform, index) => [platform, colors.includes(config?.platformColors?.[platform]) ? config.platformColors[platform] : defaults.platformColors[platform] || colors[index % colors.length]]));
  const entitiesFor = (names, source = [], prefix) => names.map((name, index) => ({ id: source.find((entity) => entity.name === name)?.id || source[index]?.id || `${prefix}-${index}`, name }));
  return { ...defaults, ...config, logistics, statistics, monthlyGoal, platformColors, platforms, platformEntities: entitiesFor(platforms, config?.platformEntities, 'platform'), expenses: Array.isArray(config?.expenses) && config.expenses.length ? config.expenses : defaults.expenses, accounts: { holders, wallets, availability, walletSettings, walletModes, holderEntities: entitiesFor(holders, accounts.holderEntities, 'holder'), walletEntities: entitiesFor(wallets, accounts.walletEntities, 'wallet') } };
}
function globalMonthlyGoalFor(spaces) {
  const source = spaces.map((space) => normalizeConfig(space.config).monthlyGoal).find((goal) => goal.final > 0 || goal.achieved > 0);
  return source || { final: 0, achieved: 0 };
}
export async function getBoxes() { return (await readSpaces()).map(({ id, title, color }) => ({ id, title, color })); }
export async function createBox({ title = 'Nueva caja', color = 'blue' } = {}) { const spaces = await readSpaces(); const config = normalizeConfig({ ...defaultConfig(), monthlyGoal: globalMonthlyGoalFor(spaces) }); const id = `caja-${crypto.randomUUID()}`; const space = { id, title, color: colors.includes(color) ? color : 'blue', config, cajas: [blankCaja(0, null, config)] }; spaces.push(space); await writeSpaces(spaces); return { id, title, color: space.color }; }
export async function updateBox(id, patch) { const spaces = await readSpaces(); const space = spaces.find((item) => item.id === id); if (!space) throw new Error('Caja no encontrada'); if (patch.title !== undefined) space.title = String(patch.title).trim() || space.title; if (patch.color !== undefined && colors.includes(patch.color)) space.color = patch.color; await writeSpaces(spaces); return { id: space.id, title: space.title, color: space.color }; }
export async function deleteBox(id) { const spaces = await readSpaces(); if (spaces.length <= 1) throw new Error('Debe existir al menos una caja'); const next = spaces.filter((space) => space.id !== id); if (next.length === spaces.length) throw new Error('Caja no encontrada'); await writeSpaces(next, { allowSpaceDeletion: true }); return next.map(({ id: spaceId, title, color }) => ({ id: spaceId, title, color })); }
export async function createPreviousCaja(boxId) { const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; space.config = normalizeConfig(space.config); const oldest = space.cajas[0]; if (!oldest) throw new Error('No existe un turno base para crear el anterior'); const previousShift = { Tarde: 'Mañana', Mañana: 'Noche', Noche: 'Tarde' }[oldest.shift] || 'Tarde'; const previousDate = new Date(new Date(oldest.date).getTime() - 8 * 60 * 60 * 1000).toISOString(); const previousId = typeof oldest.id === 'number' ? oldest.id - 1 : `${oldest.id}-anterior`; const caja = blankCaja(previousId, null, space.config); caja.shift = previousShift; caja.date = previousDate; caja.accounts = caja.accounts.map((account) => { const source = oldest.accounts.find((item) => item.holder === account.holder || item.holderId === account.holderId); return { ...account, walletBoxes: { ...(source?.walletBoxes || {}) } }; }); space.cajas.unshift(caja); await writeSpaces(spaces); return caja; }
export async function getCurrent(boxId) { return (await getSpace(boxId)).cajas.at(-1); }
export async function getHistory(boxId) { return (await getSpace(boxId)).cajas.slice().reverse(); }
export async function getConfig(boxId) { const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; return { ...normalizeConfig(space.config), monthlyGoal: globalMonthlyGoalFor(spaces) }; }
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
export async function setWalletAssignment({ holder, wallet, boxId }) { const spaces = await readSpaces(); if (boxId && !spaces.some((space) => space.id === boxId)) throw new Error('Caja no encontrada'); const updatedAt = new Date().toISOString(); spaces.forEach((space) => { const account = space.cajas.at(-1).accounts.find((item) => item.holder === holder); if (account) { account.walletBoxes = { ...(account.walletBoxes || {}), [wallet]: boxId || '' }; account.walletBoxUpdatedAt = { ...(account.walletBoxUpdatedAt || {}), [wallet]: updatedAt }; } }); await writeSpaces(spaces); return { currents: Object.fromEntries(spaces.map((space) => [space.id, space.cajas.at(-1)])) }; }
export async function resetNightShiftRecovery(boxId) {
  const spaces = await readSpaces();
  const space = spaces.find((item) => item.id === boxId) || spaces[0];
  const kept = space.cajas.filter((caja) => {
    const date = new Date(caja.date);
    const isTargetNight = caja.shift === 'Noche' && date.getFullYear() === 2026 && date.getMonth() === 7 && date.getDate() === 26;
    return !isTargetNight;
  });
  if (!kept.length) throw new Error('No se encontró el punto de corte para restaurar el historial.');
  const previous = kept.at(-1);
  const next = blankCaja(previous.id + 1, previous, space.config);
  next.shift = 'Noche';
  next.date = new Date('2026-08-30T00:00:00.000Z').toISOString();
  next.status = 'ABIERTA';
  delete next.closedAt;
  space.cajas = [...kept, next];
  await writeSpaces(spaces);
  return next;
}
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
function renameKeys(source, renames) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return source;
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [renames[key] || key, value]));
}
function namesByIndex(previous, next) {
  const renames = {};
  (previous || []).forEach((name, index) => {
    const nextName = next?.[index];
    if (name && nextName && name !== nextName) renames[name] = nextName;
  });
  return renames;
}
function namesByEntity(previousEntities, nextEntities, previousNames, nextNames) {
  if (!Array.isArray(previousEntities) || !previousEntities.length || !Array.isArray(nextEntities) || !nextEntities.length) return namesByIndex(previousNames, nextNames);
  const nextById = new Map(nextEntities.filter((entity) => entity?.id).map((entity) => [entity.id, entity.name]));
  return Object.fromEntries(previousEntities.map((entity) => [entity.name, nextById.get(entity.id)]).filter(([, name]) => name));
}
function assertRenameSafety(renames, previousNames, label) {
  const targets = Object.values(renames).filter((name) => name);
  if (new Set(targets).size !== targets.length) throw new Error(`No se guardó: el renombrado de ${label} genera nombres duplicados.`);
  const previous = new Set(previousNames);
  Object.entries(renames).forEach(([source, target]) => {
    if (source !== target && previous.has(target) && !renames[target]) throw new Error(`No se guardó: no se puede renombrar ${label} "${source}" sobre "${target}" porque ese nombre ya tiene datos. Renombralo primero a otro nombre.`);
  });
}
function assertUniqueNames(names, label) {
  const meaningful = names.filter((name) => String(name || '').trim());
  if (new Set(meaningful).size !== meaningful.length) throw new Error(`No se guardó: hay nombres repetidos en ${label}. Cada elemento debe conservar una identidad única.`);
}
function assertUniqueEntityIds(entities, label) {
  const ids = entities.map((entity) => entity?.id).filter(Boolean);
  if (new Set(ids).size !== ids.length) throw new Error(`No se guardó: hay IDs repetidos en ${label}. No se modificaron los datos.`);
}
function migrateConfigMaps(config, holderRenames, walletRenames, platformRenames) {
  const next = structuredClone(config || {});
  const accounts = next.accounts || {};
  accounts.availability = Object.fromEntries(Object.entries(accounts.availability || {}).map(([holder, values]) => [holderRenames[holder] || holder, renameKeys(values, walletRenames)]));
  accounts.walletSettings = Object.fromEntries(Object.entries(accounts.walletSettings || {}).map(([holder, values]) => [holderRenames[holder] || holder, renameKeys(values, walletRenames)]));
  accounts.walletModes = renameKeys(accounts.walletModes, walletRenames);
  next.platformColors = renameKeys(next.platformColors, platformRenames);
  next.accounts = accounts;
  if (next.logistics) {
    const keyRename = (key) => {
      const [holder, wallet] = String(key).split('::');
      return `${holderRenames[holder] || holder}::${walletRenames[wallet] || wallet}`;
    };
    next.logistics = Object.fromEntries(Object.entries(next.logistics).map(([name, values]) => [name, Array.isArray(values) ? values.map(keyRename) : values]));
  }
  return next;
}
function migrateHistoricalReferences(spaces, holderRenames, walletRenames, platformRenames, config) {
  const resolvedPlatformRenames = { ...platformRenames };
  spaces.forEach((space) => space.cajas.forEach((caja) => {
    (caja.chips || []).forEach((chip, index) => {
      if (!config.platformEntities.some((entity) => entity.name === chip.platform) && config.platforms[index]) resolvedPlatformRenames[chip.platform] = config.platforms[index];
    });
  }));
  spaces.forEach((space) => space.cajas.forEach((caja) => {
    (caja.accounts || []).forEach((account) => {
      const previousHolder = account.holder;
      account.holder = holderRenames[previousHolder] || previousHolder;
      account.holderId = config.accounts.holderEntities.find((entity) => entity.name === account.holder)?.id || account.holderId;
      account.values = renameKeys(account.values, walletRenames);
      account.walletBoxes = renameKeys(account.walletBoxes, walletRenames);
      account.walletBoxUpdatedAt = renameKeys(account.walletBoxUpdatedAt, walletRenames);
      account.walletRestartAt = renameKeys(account.walletRestartAt, walletRenames);
      account.verified = renameKeys(account.verified, walletRenames);
      account.notes = renameKeys(account.notes, walletRenames);
      account.walletIds = { ...renameKeys(account.walletIds, walletRenames), ...Object.fromEntries(config.accounts.walletEntities.map((entity) => [entity.name, entity.id])) };
    });
    (caja.foundMoney || []).forEach((record) => {
      record.holder = holderRenames[record.holder] || record.holder;
      record.wallet = walletRenames[record.wallet] || record.wallet;
      record.holderId = config.accounts.holderEntities.find((entity) => entity.name === record.holder)?.id || record.holderId;
      record.walletId = config.accounts.walletEntities.find((entity) => entity.name === record.wallet)?.id || record.walletId;
    });
    (caja.chips || []).forEach((chip) => { chip.platform = resolvedPlatformRenames[chip.platform] || chip.platform; chip.platformId = config.platformEntities.find((entity) => entity.name === chip.platform)?.id || chip.platformId; });
    (caja.chipLoads || []).forEach((load) => { load.platform = resolvedPlatformRenames[load.platform] || load.platform; load.platformId = config.platformEntities.find((entity) => entity.name === load.platform)?.id || load.platformId; });
  }));
}
export async function updateConfig(config, boxId) {
  const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; const previousConfig = normalizeConfig(space.config); const nextAccounts = config?.accounts || {}; const nextPlatforms = Array.isArray(config?.platforms) ? config.platforms : previousConfig.platforms;
  assertUniqueNames(nextAccounts.holders || previousConfig.accounts.holders, 'titulares'); assertUniqueNames(nextAccounts.wallets || previousConfig.accounts.wallets, 'billeteras'); assertUniqueNames(nextPlatforms, 'plataformas');
  assertUniqueEntityIds(nextAccounts.holderEntities || previousConfig.accounts.holderEntities, 'titulares'); assertUniqueEntityIds(nextAccounts.walletEntities || previousConfig.accounts.walletEntities, 'billeteras'); assertUniqueEntityIds(config?.platformEntities || previousConfig.platformEntities, 'plataformas');
  const holderRenames = namesByEntity(previousConfig.accounts.holderEntities, nextAccounts.holderEntities, previousConfig.accounts.holders, nextAccounts.holders); const walletRenames = namesByEntity(previousConfig.accounts.walletEntities, nextAccounts.walletEntities, previousConfig.accounts.wallets, nextAccounts.wallets); const platformRenames = namesByEntity(previousConfig.platformEntities, config?.platformEntities, previousConfig.platforms, nextPlatforms);
  assertRenameSafety(holderRenames, previousConfig.accounts.holders, 'titulares'); assertRenameSafety(walletRenames, previousConfig.accounts.wallets, 'billeteras'); assertRenameSafety(platformRenames, previousConfig.platforms, 'plataformas');
  const normalized = normalizeConfig(migrateConfigMaps(config, holderRenames, walletRenames, platformRenames));
  migrateHistoricalReferences([space], holderRenames, walletRenames, platformRenames, normalized);
  spaces.forEach((targetSpace) => { targetSpace.config = { ...normalizeConfig(targetSpace.config), monthlyGoal: normalized.monthlyGoal }; }); space.config = normalized;
  const current = space.cajas.at(-1); const existing = new Map(current.accounts.map((account) => [account.holder, account]));
  const configuredHolderIds = new Set(normalized.accounts.holderEntities.map((entity) => entity.id));
  const configuredPlatformIds = new Set(normalized.platformEntities.map((entity) => entity.id));
  current.accounts = [...normalized.accounts.holders.map((holder) => { const account = existing.get(holder); return { holder, holderId: normalized.accounts.holderEntities.find((entity) => entity.name === holder)?.id, values: { ...(account?.values || {}), ...Object.fromEntries(normalized.accounts.wallets.map((wallet) => [wallet, account?.values?.[wallet] ?? 0])) }, walletIds: { ...(account?.walletIds || {}), ...Object.fromEntries(normalized.accounts.walletEntities.map((entity) => [entity.name, entity.id])) }, walletBoxes: account?.walletBoxes || {}, walletBoxUpdatedAt: account?.walletBoxUpdatedAt || {}, walletRestartAt: account?.walletRestartAt || {}, verified: account?.verified || {}, notes: account?.notes || {} }; }), ...current.accounts.filter((account) => !configuredHolderIds.has(account.holderId) && !normalized.accounts.holders.includes(account.holder))];
  current.chips = [...normalized.platforms.map((platform) => { const chip = current.chips.find((item) => item.platform === platform); return { platform, platformId: normalized.platformEntities.find((entity) => entity.name === platform)?.id, initial: chip?.initial ?? 0, final: chip?.final ?? 0 }; }), ...current.chips.filter((chip) => !configuredPlatformIds.has(chip.platformId) && !normalized.platforms.includes(chip.platform))];
  current.expenses = current.expenses.map((expense) => ({ ...expense, category: normalized.expenses.some((item) => item.name === expense.category) ? expense.category : normalized.expenses[0]?.name || 'Gasto' }));
  space.cajas[space.cajas.length - 1] = current; await writeSpaces(spaces); return { config: normalized, current };
}
function walletBelongsToBox(row, wallet, config, boxId) {
  const setting = config.accounts.walletSettings?.[row.holder]?.[wallet];
  return config.accounts.availability?.[row.holder]?.[wallet] !== false && (!setting?.category || setting.category === 'Normal' || row.walletBoxes?.[wallet] === boxId);
}
export async function closeCurrent(patch = {}, boxId) { const spaces = await readSpaces(); const space = spaces.find((item) => item.id === boxId) || spaces[0]; const config = normalizeConfig(space.config); const source = patch.accounts || space.cajas.at(-1).accounts; const accountsTotal = source.flatMap((row) => Object.entries(row.values || {}).filter(([wallet]) => walletBelongsToBox(row, wallet, config, space.id)).map(([, value]) => value)).reduce((sum, value) => sum + (Number(value) || 0), 0); const current = { ...space.cajas.at(-1), ...patch, cashFinal: accountsTotal }; if (current.status === 'CERRADA') throw new Error('La caja ya está cerrada'); current.status = 'CERRADA'; current.closedAt = new Date().toISOString(); space.cajas[space.cajas.length - 1] = current; space.cajas.push(blankCaja(current.id + 1, current, space.config)); await writeSpaces(spaces); return space.cajas.at(-1); }
export { billeteras, titulares, plataformas };
