import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  ArrowUpDown,
  ArrowDownToLine,
  BarChart3,
  Banknote,
  Camera,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Clock3,
  Coins,
  Eye,
  FileText,
  GripVertical,
  Gift,
  LockKeyhole,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Trash2,
  ReceiptText,
  Target,
  Ticket,
  WalletCards,
  X,
} from "lucide-react";
import "./styles.css";
import html2canvas from "html2canvas";
import CajaReportCardV2 from "./CajaReportCardV2";
import CajaReportCardV4 from "./CajaReportCardV4";
import CajaReportCardV5 from "./CajaReportCardV5";
import CajaReportCardV6 from "./CajaReportCardV6";
import CajaReportCardFinal from "./CajaReportCardFinal";
import faviconIco from "./img/favicon/favicon.ico";
import favicon16 from "./img/favicon/favicon-16x16.png";
import favicon32 from "./img/favicon/favicon-32x32.png";
import appleTouchIcon from "./img/favicon/apple-touch-icon.png";
import androidIcon from "./img/favicon/android-chrome-192x192.png";

const faviconLinks = [
  { rel: "icon", type: "image/x-icon", href: faviconIco },
  { rel: "icon", type: "image/png", sizes: "16x16", href: favicon16 },
  { rel: "icon", type: "image/png", sizes: "32x32", href: favicon32 },
  { rel: "apple-touch-icon", sizes: "180x180", href: appleTouchIcon },
  { rel: "icon", type: "image/png", sizes: "192x192", href: androidIcon },
];
faviconLinks.forEach(({ rel, type, sizes, href }) => {
  const link = document.createElement("link");
  link.rel = rel;
  if (type) link.type = type;
  if (sizes) link.sizes = sizes;
  link.href = href;
  document.head.appendChild(link);
});

const money = (value) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(Number(value) || 0);
const number = (value) => Number(value) || 0;
const parseNumberInput = (value) => {
  const text = String(value ?? "").trim().replace(/\s/g, "");
  if (!text) return 0;
  const sign = text.startsWith("-") ? -1 : 1;
  const unsigned = text.replace(/^[+-]/, "").replace(/[^\d.,]/g, "");
  if (!unsigned) return 0;
  const separators = [...unsigned.matchAll(/[.,]/g)].map((match) => match.index);
  if (!separators.length) return sign * (Number(unsigned) || 0);

  const lastSeparator = separators[separators.length - 1];
  const digitsAfterLast = unsigned.length - lastSeparator - 1;
  const hasBothSeparators = unsigned.includes(".") && unsigned.includes(",");
  const repeatedSeparator = separators.length > 1 && new Set([...unsigned].filter((character) => character === "." || character === ",")).size === 1;
  const decimalSeparator = hasBothSeparators || (!repeatedSeparator && digitsAfterLast <= 2)
    ? unsigned[lastSeparator]
    : null;
  const normalized = decimalSeparator
    ? `${unsigned.slice(0, lastSeparator).replace(/[.,]/g, "")}.${unsigned.slice(lastSeparator + 1)}`
    : unsigned.replace(/[.,]/g, "");
  return sign * (Number(normalized) || 0);
};
const formatNumberInput = (value) => {
  const parsed = parseNumberInput(value);
  return parsed
    ? new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(parsed)
    : "";
};
const realDifferenceFor = (caja, config, activeBoxId) => {
  const accounts = caja.accounts
    .flatMap((row) => Object.entries(row.values).filter(([wallet]) => walletBelongsToBox(row, wallet, config, activeBoxId)).map(([, value]) => value))
    .reduce((sum, value) => sum + number(value), 0);
  const bonuses = caja.bonuses.reduce((sum, bonus) => sum + number(bonus.granted) - number(bonus.recovered), 0);
  const ta = caja.ta.reduce((sum, row) => sum + number(row.amount), 0);
  const expenses = caja.expenses.reduce((sum, row) => {
    const category = config.expenses.find((item) => item.name === row.category);
    return sum + number(row.amount) * (category?.inverted ? -1 : 1);
  }, 0);
  const cashDifference = expenses + ta + accounts - number(caja.cashInitial);
  const transferAdjustment = (caja.transfers || []).reduce((sum, transfer) => sum + (transfer.fromBoxId === activeBoxId ? number(transfer.amount) : transfer.toBoxId === activeBoxId ? -number(transfer.amount) : 0), 0);
  return cashDifference - bonuses + transferAdjustment;
};
  const formatMovementTime = (value) => value ? new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "--:--";
const walletBelongsToBox = (row, wallet, config, boxId) => {
  const setting = config.accounts.walletSettings[row.holder]?.[wallet];
  return config.accounts.availability[row.holder]?.[wallet] !== false && (setting?.category === "Normal" || !setting?.category ? true : row.walletBoxes?.[wallet] === boxId);
};
const walletModeClass = (config, wallet) => ({
  "Cobros + Retiros": "wallet-mode-all",
  "Solo Cobros": "wallet-mode-collections",
  "Solo Depósito": "wallet-mode-deposit",
}[config.accounts.walletModes?.[wallet] || "Cobros + Retiros"]);
const statisticsFor = (caja, config, activeBoxId) => {
  const accounts = (caja.accounts || [])
    .flatMap((row) => Object.entries(row.values || {}).filter(([wallet]) => walletBelongsToBox(row, wallet, config, activeBoxId)).map(([, value]) => value))
    .reduce((sum, value) => sum + number(value), 0);
  const tips = (caja.tips || []).reduce((sum, row) => sum + number(row.amount), 0);
  const granted = (caja.bonuses || []).reduce((sum, row) => sum + number(row.granted), 0);
  const recovered = (caja.bonuses || []).reduce((sum, row) => sum + number(row.recovered), 0);
  const ta = (caja.ta || []).reduce((sum, row) => sum + number(row.amount), 0);
  const found = (caja.foundMoney || []).reduce((sum, row) => sum + number(row.amount), 0);
  const rounding = number(caja.found);
  const expensesByCategory = config.expenses.reduce((result, category) => {
    result[category.name] = (caja.expenses || []).filter((row) => row.category === category.name).reduce((sum, row) => sum + number(row.amount), 0);
    return result;
  }, {});
  (caja.expenses || []).forEach((row) => {
    if (!(row.category in expensesByCategory)) expensesByCategory[row.category] = 0;
  });
  const expenses = Object.values(expensesByCategory).reduce((sum, value) => sum + value, 0);
  const balance = (caja.chips || []).reduce((sum, row) => sum + number(row.initial) - number(row.final), 0);
  const cashInitial = number(caja.cashInitial);
  const cashFinal = accounts;
  const preDifference = expenses + ta + cashFinal + granted - recovered;
  const difference = preDifference - cashInitial;
  const cashDifference = cashFinal - cashInitial;
  const transfers = (caja.transfers || []).reduce((sum, transfer) => sum + (transfer.fromBoxId === activeBoxId ? number(transfer.amount) : transfer.toBoxId === activeBoxId ? -number(transfer.amount) : 0), 0);
  const realDifference = difference - (granted - recovered) + transfers;
  return { tips, found, rounding, granted, recovered, ta, expenses, expensesByCategory, balance, cashInitial, cashFinal, preDifference, difference, cashDifference, realDifference, transfers, bonusesNet: granted - recovered };
};
const api = (url, options) =>
  fetch(`${import.meta.env.VITE_API_URL || ""}${url}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  }).then(async (response) => {
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error("La API no está respondiendo: el servidor devolvió HTML en lugar de JSON. Verificá que VITE_API_URL apunte al backend y que esté actualizado.");
    }
    const result = await response.json();
    if (!response.ok || result?.error) throw new Error(result?.error || `Error de API (${response.status})`);
    return result;
  });

const boxColorStyle = (color) => {
  const palette = {
    teal: { accent: "#72d7ca", glow: "#244344", soft: "#1d302f", line: "#315552" },
    blue: { accent: "#82b8ff", glow: "#263b58", soft: "#202d40", line: "#3d5b7d" },
    green: { accent: "#83d5a2", glow: "#244635", soft: "#20372b", line: "#3c6850" },
    orange: { accent: "#f5ad69", glow: "#4c3423", soft: "#3b2b20", line: "#765336" },
    pink: { accent: "#ed9fc1", glow: "#4b2f3e", soft: "#382730", line: "#70465d" },
    red: { accent: "#ef8888", glow: "#4b292d", soft: "#382326", line: "#704246" },
    yellow: { accent: "#e8d477", glow: "#484224", soft: "#37331f", line: "#706833" },
    violet: { accent: "#c2a0ed", glow: "#3c2d50", soft: "#302640", line: "#604b7c" },
    slate: { accent: "#aebdca", glow: "#303c45", soft: "#29343b", line: "#536976" },
  }[color] || { accent: "#72d7ca", glow: "#244344", soft: "#1d302f", line: "#315552" };
  return { "--box-accent": palette.accent, "--box-glow": palette.glow, "--box-soft": palette.soft, "--box-line": palette.line };
};

function BoxSelector({ boxes, activeBoxId, onChange, label = "CAJA" }) {
  const [open, setOpen] = useState(false);
  const activeBox = boxes.find((box) => box.id === activeBoxId) || boxes[0];
  return <div className={`box-selector ${open ? "open" : ""}`} style={boxColorStyle(activeBox?.color)}>
    <span>{label}</span>
    <button className="box-selector-trigger" onClick={() => setOpen(!open)} aria-expanded={open}><b>{activeBox?.title}</b><i /></button>
    {open && <div className="box-options">{boxes.map((box) => <button className={box.id === activeBox?.id ? "selected" : ""} key={box.id} onClick={() => { onChange(box.id); setOpen(false); }}><i className={box.color} />{box.title}</button>)}</div>}
  </div>;
}

function WalletAssignmentSelector({ boxes, value, onChange, showLabel = true }) {
  const [open, setOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState(null);
  const selectorRef = React.useRef(null);
  const menuRef = React.useRef(null);
  const buttonRef = React.useRef(null);
  const selected = boxes.find((box) => box.id === value);
  const assignmentStyle = (box) => {
    if (!box) return undefined;
    const palette = boxColorStyle(box.color);
    return { "--assignment-accent": palette["--box-accent"], "--assignment-line": palette["--box-line"] };
  };
  const toggleMenu = () => {
    if (open) {
      setOpen(false);
      setMenuPosition(null);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setMenuPosition({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  };
  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutside = (event) => {
      if (!selectorRef.current?.contains(event.target) && !menuRef.current?.contains(event.target)) {
        setOpen(false);
        setMenuPosition(null);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);
  return (
    <div ref={selectorRef} className="wallet-assignment-control" style={assignmentStyle(selected)}>
      <button ref={buttonRef} type="button" tabIndex={-1} className={`wallet-assignment ${selected ? "" : "unassigned"} ${showLabel ? "with-label" : ""}`} aria-label="Caja a la que pertenece" title="Caja a la que pertenece" onClick={toggleMenu}>
        {selected ? <><i className="wallet-assignment-dot" />{showLabel && <b>{selected.title}</b>}</> : showLabel ? "Sin caja" : "-"}
      </button>
      {open && menuPosition && createPortal(
        <div ref={menuRef} className="wallet-assignment-options" style={{ top: menuPosition.top, left: menuPosition.left }}>
          {[null, ...boxes].map((box) => (
            <button type="button" className={!box ? "unassigned" : ""} key={box?.id || "none"} style={assignmentStyle(box)} onClick={() => { onChange(box?.id || ""); setOpen(false); setMenuPosition(null); }}>
              {box ? <><i className="wallet-assignment-dot" />{box.title}</> : "-"}
            </button>
          ))}
        </div>
        , document.body,
      )}
    </div>
  );
}

function TransferBoxPicker({ label, boxes, value, excludeId, onChange }) {
  const [open, setOpen] = useState(false);
  const selected = boxes.find((box) => box.id === value);
  const options = boxes.filter((box) => box.id !== excludeId);
  return <div className="transfer-picker">
    <span>{label}</span>
    <div className={`transfer-picker-control ${open ? "open" : ""}`} style={boxColorStyle(selected?.color)}>
      <button type="button" onClick={() => setOpen(!open)}><i className="transfer-box-dot" /><b>{selected?.title || "Seleccionar caja"}</b><em /></button>
      {open && <div className="transfer-picker-options">{options.map((box) => <button type="button" className={box.id === value ? "selected" : ""} key={box.id} onClick={() => { onChange(box.id); setOpen(false); }} style={boxColorStyle(box.color)}><i className="transfer-box-dot" />{box.title}</button>)}</div>}
    </div>
  </div>;
}

function ConfirmDialog({ message, onConfirm, onCancel, title = "¿Eliminar registro?", confirmLabel = "Eliminar", confirmIcon = <Trash2 size={15} />, dialogIcon = <Trash2 size={21} /> }) {
  return (
    <div className="modal-backdrop confirm-backdrop" onClick={onCancel}>
          <div className="modal confirm-dialog" onClick={(event) => event.stopPropagation()}>
              <div className="modal-icon">{dialogIcon}</div>
            <h2>{title}</h2>
        <p>{message}</p>
        <div className="modal-actions">
          <button className="ghost-button" onClick={onCancel}>Cancelar</button>
          <button className="danger-button" onClick={onConfirm}>{confirmLabel} {confirmIcon}</button>
        </div>
      </div>
    </div>
  );
}

function TransferSection({ boxes, activeBoxId, transfers, onCreate, onUpdateTransfer, onDeleteTransfer }) {
  const [fromBoxId, setFromBoxId] = useState(activeBoxId);
  const [toBoxId, setToBoxId] = useState(boxes.find((box) => box.id !== activeBoxId)?.id || "");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [deleteTransferId, setDeleteTransferId] = useState(null);
  useEffect(() => {
    setFromBoxId(activeBoxId);
    setToBoxId(boxes.find((box) => box.id !== activeBoxId)?.id || "");
  }, [activeBoxId, boxes]);
      const changeFromBox = (boxId) => {
    setFromBoxId(boxId);
    if (boxId && boxId === toBoxId) setToBoxId("");
  };
  const invertSelection = () => {
    setFromBoxId(toBoxId);
    setToBoxId(fromBoxId);
  };
  const submit = async () => {
    setError("");
    try { await onCreate({ fromBoxId, toBoxId, amount: parseNumberInput(amount), note }); setAmount(""); setNote(""); }
    catch (requestError) { setError(requestError.message); }
  };
  const saveTransfer = async () => {
    try { await onUpdateTransfer(editingTransfer); setEditingTransfer(null); }
    catch (requestError) { setError(requestError.message); }
  };
  return (
    <section className="transfer-panel">
      <div className="transfer-form">
        <div className="transfer-form-head"><div className="transfer-form-title"><ArrowLeftRight size={18} /><div><div className="transfer-form-title-line"><h3>Movimiento entre cajas</h3><span>{transfers.length} registros</span></div></div></div><button className="icon-button" title="Ver y editar traspasos" onClick={() => setEditorOpen(true)}><Eye size={16} /></button></div>
        <div className="transfer-fields">
          <TransferBoxPicker label="Desde" boxes={boxes} value={fromBoxId} onChange={changeFromBox} />
          <button type="button" className="transfer-invert" title="Invertir selección" aria-label="Invertir selección" onClick={invertSelection}><ArrowLeftRight size={16} /></button>
          <TransferBoxPicker label="Hasta" boxes={boxes} value={toBoxId} excludeId={fromBoxId} onChange={setToBoxId} />
          <label><span>Monto</span><AmountInput value={amount} onChange={(value) => setAmount(value)} /></label>
          <button type="button" className="send-button transfer-send" title="Enviar traspaso" aria-label="Enviar traspaso" onClick={submit} disabled={boxes.length < 2}><Send size={15} /></button>
        </div>
        {error && <small className="transfer-error">{error}</small>}
      </div>
      <div className="transfer-history"><div className="recent-movements"><span>Últimos traspasos</span>{transfers.slice().reverse().map((transfer) => { const outgoing = transfer.fromBoxId === activeBoxId; const otherBox = boxes.find((box) => box.id === (outgoing ? transfer.toBoxId : transfer.fromBoxId)); return <div className="recent-movement transfer-row" key={transfer.id}><span>{outgoing ? "Salida a" : "Entrada de"} {otherBox?.title || "otra caja"}{transfer.note ? ` · ${transfer.note}` : ""}</span><b className={outgoing ? "transfer-out" : "transfer-in"}>{outgoing ? "+" : "-"}{money(transfer.amount)}</b></div>; })}{transfers.length === 0 && <small>Sin traspasos todavía</small>}</div></div>
      {editorOpen && <div className="modal-backdrop" onClick={() => setEditorOpen(false)}><div className="modal transfer-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setEditorOpen(false)}><X size={18} /></button><div className="modal-icon"><ArrowLeftRight size={20} /></div><h2>Traspasos del turno</h2><p>Editá el origen, destino, monto o nota de cada movimiento.</p><div className="transfer-edit-list">{transfers.length === 0 && <div className="empty-state">Todavía no hay traspasos.</div>}{transfers.map((transfer) => <div className="transfer-edit-row" key={transfer.id}><time className="movement-time">{formatMovementTime(transfer.createdAt)}</time><div><b>{boxes.find((box) => box.id === transfer.fromBoxId)?.title}</b><span>hacia {boxes.find((box) => box.id === transfer.toBoxId)?.title}</span></div><strong>{money(transfer.amount)}</strong><button className="icon-button" title="Editar traspaso" onClick={() => setEditingTransfer({ ...transfer })}><Settings2 size={14} /></button><button className="delete-button" title="Eliminar traspaso" onClick={() => setDeleteTransferId(transfer.id)}><Trash2 size={14} /></button></div>)}</div><div className="modal-actions"><button className="close-button" onClick={() => setEditorOpen(false)}>Listo <Check size={16} /></button></div></div></div>}
      {editingTransfer && <div className="modal-backdrop" onClick={() => setEditingTransfer(null)}><div className="modal transfer-edit-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setEditingTransfer(null)}><X size={18} /></button><div className="modal-icon"><Settings2 size={20} /></div><h2>Editar traspaso</h2><div className="transfer-edit-fields"><TransferBoxPicker label="Desde" boxes={boxes} value={editingTransfer.fromBoxId} onChange={(value) => setEditingTransfer({ ...editingTransfer, fromBoxId: value })} /><TransferBoxPicker label="Hasta" boxes={boxes} value={editingTransfer.toBoxId} excludeId={editingTransfer.fromBoxId} onChange={(value) => setEditingTransfer({ ...editingTransfer, toBoxId: value })} /><label><span>Monto</span><AmountInput value={editingTransfer.amount} onChange={(value) => setEditingTransfer({ ...editingTransfer, amount: value })} /></label><label><span>Nota</span><input value={editingTransfer.note || ""} onChange={(event) => setEditingTransfer({ ...editingTransfer, note: event.target.value })} /></label></div><div className="modal-actions"><button className="ghost-button" onClick={() => setEditingTransfer(null)}>Cancelar</button><button className="close-button" onClick={saveTransfer}>Guardar <Check size={16} /></button></div></div></div>}
      {deleteTransferId && <ConfirmDialog message="¿Seguro que querés eliminar este traspaso de ambas cajas?" onCancel={() => setDeleteTransferId(null)} onConfirm={async () => { await onDeleteTransfer(deleteTransferId); setDeleteTransferId(null); }} />}
    </section>
  );
}

function ConfigList({ title, items, onChange, placeholder, sortable = false, onItemChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const reorder = (targetIndex) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    onChange(next);
    setDragIndex(null);
  };
  return (
    <div className="config-list">
      <div className="config-list-head"><h3>{title}</h3><span>{items.length} elementos</span></div>
      {items.map((item, index) => (
        <div className={`config-list-row ${sortable ? "sortable" : ""}`} key={index} draggable={sortable} onDragStart={() => setDragIndex(index)} onDragOver={(event) => { if (sortable) event.preventDefault(); }} onDrop={() => sortable && reorder(index)} onDragEnd={() => setDragIndex(null)}>
          {sortable && <span className="drag-handle" title="Arrastrar para reordenar"><GripVertical size={15} /></span>}
          <input value={item} placeholder={placeholder} onChange={(event) => { const next = [...items]; next[index] = event.target.value; onItemChange ? onItemChange(index, event.target.value) : onChange(next); }} />
          <button className="delete-button" title={`Eliminar ${title.toLowerCase()}`} onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button>
        </div>
      ))}
      <button className="config-add" onClick={() => onChange([...items, ""])}><Plus size={15} /> Agregar</button>
    </div>
  );
}

function PlatformConfigList({ platforms, platformColors, onPlatformsChange, onColorChange }) {
  const colorNames = { teal: "Turquesa", blue: "Azul", green: "Verde", orange: "Naranja", pink: "Rosa", red: "Rojo", yellow: "Amarillo", violet: "Violeta", slate: "Pizarra" };
  return <div className="config-list platform-config-list"><div className="config-list-head"><h3>Plataformas</h3><span>{platforms.length} elementos</span></div>{platforms.map((platform, index) => <div className="platform-config-row" key={index}><i className={`box-swatch ${platformColors[platform] || "teal"}`} /><input value={platform} placeholder="Nombre de plataforma" onChange={(event) => { const next = [...platforms]; const previous = next[index]; next[index] = event.target.value; onPlatformsChange(next); if (previous !== event.target.value) onColorChange(event.target.value, platformColors[previous] || "teal", previous); }} /><select value={platformColors[platform] || "teal"} aria-label={`Color de ${platform}`} onChange={(event) => onColorChange(platform, event.target.value)}>{Object.entries(colorNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><button className="delete-button" title="Eliminar plataforma" onClick={() => onPlatformsChange(platforms.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button></div>)}<button className="config-add" onClick={() => onPlatformsChange([...platforms, ""])}><Plus size={15} /> Agregar plataforma</button></div>;
}

function WalletConfigList({ wallets, modes, onChange, onModeChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const reorder = (targetIndex) => { if (dragIndex === null || dragIndex === targetIndex) return; const next = [...wallets]; const [moved] = next.splice(dragIndex, 1); next.splice(targetIndex, 0, moved); onChange(next); setDragIndex(null); };
  return <div className="config-list wallet-config-list"><div className="config-list-head"><h3>Billeteras</h3><span>{wallets.length} elementos</span></div>{wallets.map((wallet, index) => <div className="wallet-config-row" key={index} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorder(index)} onDragEnd={() => setDragIndex(null)}><span className="drag-handle" title="Arrastrar para reordenar"><GripVertical size={15} /></span><input value={wallet} placeholder="Nombre de billetera" onChange={(event) => { const next = [...wallets]; const previous = next[index]; next[index] = event.target.value; onChange(next); if (previous !== event.target.value) onModeChange(event.target.value, modes[previous] || "Cobros + Retiros"); }} /><select aria-label={`Tipo de ${wallet}`} value={modes[wallet] || "Cobros + Retiros"} onChange={(event) => onModeChange(wallet, event.target.value)}><option>Cobros + Retiros</option><option>Solo Cobros</option><option>Solo Depósito</option></select><button className="delete-button" title="Eliminar billetera" onClick={() => onChange(wallets.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={15} /></button></div>)}<button className="config-add" onClick={() => onChange([...wallets, ""])}><Plus size={15} /> Agregar billetera</button></div>;
}

function AccountsConfig({ draft, boxes, updateAccounts }) {
  const [settingsTarget, setSettingsTarget] = useState(null);
  const availability = draft.accounts.availability || {};
  const walletSettings = draft.accounts.walletSettings || {};
  const updateWallets = (wallets) => updateAccounts({ wallets });
  const walletModes = draft.accounts.walletModes || {};
  const updateWalletSetting = (holder, wallet, patch) => updateAccounts({ walletSettings: { ...walletSettings, [holder]: { ...(walletSettings[holder] || {}), [wallet]: { ...(walletSettings[holder]?.[wallet] || { category: "Normal", boxId: null }), ...patch } } } });
  const renameHolder = (index, value) => {
    const previousHolder = draft.accounts.holders[index];
    const holders = [...draft.accounts.holders];
    holders[index] = value;
    const availability = { ...draft.accounts.availability };
    const walletSettings = { ...(draft.accounts.walletSettings || {}) };
    if (previousHolder !== value) {
      availability[value] = availability[previousHolder] || {};
      delete availability[previousHolder];
      walletSettings[value] = walletSettings[previousHolder] || {};
      delete walletSettings[previousHolder];
    }
    updateAccounts({ holders, availability, walletSettings });
  };
  const targetSetting = settingsTarget ? walletSettings[settingsTarget.holder]?.[settingsTarget.wallet] || { category: "Normal" } : null;
  const updateTargetSetting = (patch) => updateWalletSetting(settingsTarget.holder, settingsTarget.wallet, patch);
  return <>
    <div className="config-two-columns">
      <ConfigList title="Titulares" items={draft.accounts.holders} placeholder="Nombre del titular" sortable onChange={(holders) => updateAccounts({ holders })} onItemChange={renameHolder} />
      <WalletConfigList wallets={draft.accounts.wallets} modes={walletModes} onChange={updateWallets} onModeChange={(wallet, mode) => updateAccounts({ walletModes: { ...walletModes, [wallet]: mode } })} />
    </div>
    <section className="config-card"><div className="config-list-head"><h3>Billeteras utilizables por titular</h3><span>Activá y configurá cada cuenta</span></div><div className="availability-table"><div className="availability-row availability-head" style={{ "--wallet-count": draft.accounts.wallets.length }}><b>Titular</b>{draft.accounts.wallets.map((wallet) => <span key={wallet}>{wallet}</span>)}</div>{draft.accounts.holders.map((holder, index) => <div className="availability-row" style={{ "--wallet-count": draft.accounts.wallets.length }} key={index}><b>{holder || "Sin nombre"}</b>{draft.accounts.wallets.map((wallet) => { const setting = walletSettings[holder]?.[wallet] || { category: "Normal", boxId: null }; const enabled = availability[holder]?.[wallet] !== false; return <div className="account-config-cell" key={wallet}><label className="toggle-cell"><input type="checkbox" checked={enabled} onChange={() => { const nextAvailability = structuredClone(availability); nextAvailability[holder] = { ...(nextAvailability[holder] || {}), [wallet]: !enabled }; updateAccounts({ availability: nextAvailability }); }} /><span /></label>{enabled && <button type="button" className="account-settings-button" title={`Configurar ${holder} · ${wallet}`} onClick={() => setSettingsTarget({ holder, wallet })}><Settings2 size={14} /></button>}</div>; })}</div>)}</div></section>
    {settingsTarget && <div className="modal-backdrop" onClick={() => setSettingsTarget(null)}><div className="modal account-settings-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSettingsTarget(null)} title="Cerrar"><X size={18} /></button><div className="modal-icon"><Settings2 size={21} /></div><h2>{settingsTarget.holder} · {settingsTarget.wallet}</h2><p>Datos disponibles para copiar desde la caja.</p><div className="account-settings-fields"><label><span>Alias</span><input value={targetSetting.alias || ""} onChange={(event) => updateTargetSetting({ alias: event.target.value })} /></label><label><span>CUIL</span><input value={targetSetting.cuil || ""} onChange={(event) => updateTargetSetting({ cuil: event.target.value })} /></label><label><span>Contraseña</span><input value={targetSetting.password || ""} onChange={(event) => updateTargetSetting({ password: event.target.value })} /></label><label><span>Tipo de billetera</span><select value={targetSetting.category || "Normal"} onChange={(event) => updateTargetSetting({ category: event.target.value })}><option>Normal</option><option>Depósitos</option><option>Compartidas</option></select></label><label className="account-settings-note"><span>Nota</span><textarea rows="4" value={targetSetting.note || ""} onChange={(event) => updateTargetSetting({ note: event.target.value })} /></label></div><div className="modal-actions"><button className="close-button" onClick={() => setSettingsTarget(null)}>Listo <Check size={16} /></button></div></div></div>}
  </>;
}

function MonthlyGoalConfig({ draft, update }) {
  const monthlyGoal = draft.monthlyGoal || { final: 0, achieved: 0 };
  const updateValue = (name, value) => update({ monthlyGoal: { ...monthlyGoal, [name]: number(value) } });
  return <section className="config-card monthly-goal-card">
    <div className="config-list-head"><h3>Valores del objetivo</h3><span>Se actualizan manualmente</span></div>
    <div className="monthly-goal-fields">
      <label><span>Objetivo final</span><AmountInput value={monthlyGoal.final} onChange={(value) => updateValue("final", value)} /></label>
      <label><span>Objetivo alcanzado</span><AmountInput value={monthlyGoal.achieved} onChange={(value) => updateValue("achieved", value)} /></label>
    </div>
  </section>;
}

function MonthlyGoalProgress({ config, boxColor }) {
  const goal = config.monthlyGoal || {};
  const finalGoal = Math.max(0, number(goal.final));
  const achieved = Math.max(0, number(goal.achieved));
  const percentage = finalGoal > 0 ? (achieved / finalGoal) * 100 : 0;
  const colors = boxColorStyle(boxColor);
  return <section className="monthly-goal-progress" aria-label="Progreso del objetivo mensual" style={{ "--goal-accent": colors["--box-accent"], "--goal-soft": colors["--box-soft"], "--goal-glow": colors["--box-glow"], "--goal-line": colors["--box-line"] }}>
    <div className="monthly-goal-track"><span style={{ width: `${Math.min(100, percentage)}%` }} /></div>
    <div className="monthly-goal-values"><strong>{Math.round(percentage)}%</strong><span className="monthly-goal-achieved">{money(achieved)}</span><i>/</i><span className="monthly-goal-final">{money(finalGoal)}</span></div>
  </section>;
}

function ConfigurationPage({ config, boxes, activeBoxId, onSave, onBack, onBoxesChanged, embedded = false }) {
  const [tab, setTab] = useState("accounts");
  const [configBoxId, setConfigBoxId] = useState(activeBoxId);
  const [draft, setDraft] = useState(structuredClone(config));
  const [saving, setSaving] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const skipAutoSave = React.useRef(true);
  const onSaveRef = React.useRef(onSave);
  onSaveRef.current = onSave;
  const updateAccounts = (patch) => setDraft((current) => ({ ...current, accounts: { ...current.accounts, ...patch } }));
  useEffect(() => {
    let cancelled = false;
    skipAutoSave.current = true;
    setLoadingConfig(true);
    setDraft(null);
    api(`/api/configuracion?boxId=${configBoxId}`).then((nextConfig) => {
      if (cancelled) return;
      setDraft(nextConfig);
      setLoadingConfig(false);
    });
    return () => { cancelled = true; };
  }, [configBoxId]);
  useEffect(() => {
    if (loadingConfig || !draft) return undefined;
    if (skipAutoSave.current) {
      skipAutoSave.current = false;
      return undefined;
    }
    setSaving(true);
    const timer = window.setTimeout(async () => {
      try {
        await onSaveRef.current(draft, configBoxId);
      } finally {
        setSaving(false);
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [draft, configBoxId, loadingConfig]);
  const configTarget = boxes.find((box) => box.id === configBoxId) || boxes[0];
  return (
    <div className={`configuration-page ${embedded ? "embedded" : ""}`}>
      {!embedded && <header className="configuration-header">
        <button className="icon-button" title="Volver a la caja" onClick={onBack}><ArrowLeft size={18} /></button>
        <div><span className="eyebrow">Configuración exclusiva</span><h1>Preferencias de la caja</h1></div>
        {tab !== "boxes" && <BoxSelector label="EDITAR" boxes={boxes} activeBoxId={configBoxId} onChange={setConfigBoxId} />}
      </header>}
      <div className="configuration-layout">
        <nav className="configuration-tabs">
          <button className={tab === "boxes" ? "active" : ""} onClick={() => setTab("boxes")}><Banknote size={17} /> Cajas</button>
          <button className={tab === "accounts" ? "active" : ""} onClick={() => setTab("accounts")}><WalletCards size={17} /> Matriz de cuentas</button>
          <button className={tab === "expenses" ? "active" : ""} onClick={() => setTab("expenses")}><ReceiptText size={17} /> Gastos</button>
          <button className={tab === "platforms" ? "active" : ""} onClick={() => setTab("platforms")}><Ticket size={17} /> Control de fichas</button>
          <button className={tab === "monthly-goal" ? "active" : ""} onClick={() => setTab("monthly-goal")}><Target size={17} /> Objetivo mensual</button>
        </nav>
        <main className="configuration-content">
          {loadingConfig && <div className="config-loading">Cargando configuración de {configTarget?.title}...</div>}
          {!loadingConfig && draft && <>
          {tab === "boxes" && <><div className="config-intro"><span className="eyebrow">Espacios de trabajo</span><h2>Edición de cajas</h2><p>Administrá el nombre, color y existencia de cada caja independiente.</p></div><section className="config-card box-management-list"><div className="config-list-head"><h3>Mis cajas</h3><span>{boxes.length} espacios</span></div>{boxes.map((box) => <div className="box-management-row" key={box.id}><i className={`box-swatch ${box.color}`} /><input value={box.title} onChange={(event) => onBoxesChanged({ type: "update", id: box.id, patch: { title: event.target.value } })} /><select value={box.color} onChange={(event) => onBoxesChanged({ type: "update", id: box.id, patch: { color: event.target.value } })}><option value="teal">Turquesa</option><option value="blue">Azul</option><option value="green">Verde</option><option value="orange">Naranja</option><option value="pink">Rosa</option><option value="red">Rojo</option><option value="yellow">Amarillo</option><option value="violet">Violeta</option><option value="slate">Pizarra</option></select><button className="delete-button" disabled={boxes.length === 1} title="Eliminar caja" onClick={() => onBoxesChanged({ type: "delete", id: box.id })}><Trash2 size={15} /></button></div>)}<button className="config-add" onClick={() => onBoxesChanged({ type: "create" })}><Plus size={15} /> Nueva caja</button></section></>}
          {tab === "accounts" && <>
            <div className="config-intro"><span className="eyebrow">Matriz de cuentas</span><h2>Titulares y billeteras</h2><p>Creá las listas y definí qué billeteras puede usar cada titular.</p></div>
            <AccountsConfig draft={draft} boxes={boxes} updateAccounts={updateAccounts} />
          </>}
          {tab === "expenses" && <><div className="config-intro"><span className="eyebrow">Gastos</span><h2>Categorías de gastos</h2><p>Definí las opciones del selector y si cada categoría suma o resta al resumen.</p></div><section className="config-card expense-config-list"><div className="config-list-head"><h3>Opciones del selector</h3><span>{draft.expenses.length} categorías</span></div>{draft.expenses.map((expense, index) => <div className="expense-config-row" key={index}><input value={expense.name} placeholder="Nombre del gasto" onChange={(event) => { const expenses = structuredClone(draft.expenses); expenses[index].name = event.target.value; setDraft({ ...draft, expenses }); }} /><label className="invert-toggle"><input type="checkbox" checked={expense.inverted} onChange={() => { const expenses = structuredClone(draft.expenses); expenses[index].inverted = !expenses[index].inverted; setDraft({ ...draft, expenses }); }} /><span /> Invierte el signo</label><button className="delete-button" title="Eliminar categoría" onClick={() => setDraft({ ...draft, expenses: draft.expenses.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={15} /></button></div>)}<button className="config-add" onClick={() => setDraft({ ...draft, expenses: [...draft.expenses, { name: "", inverted: false }] })}><Plus size={15} /> Agregar categoría</button></section></>}
          {tab === "platforms" && <><div className="config-intro"><span className="eyebrow">Control de fichas</span><h2>Plataformas</h2><p>Administrá las plataformas, los nombres y el color de cada una.</p></div><PlatformConfigList platforms={draft.platforms} platformColors={draft.platformColors || {}} onPlatformsChange={(platforms) => setDraft((current) => ({ ...current, platforms }))} onColorChange={(platform, color, previous) => setDraft((current) => { const platformColors = { ...(current.platformColors || {}), [platform]: color }; if (previous) { delete platformColors[previous]; return { ...current, platforms: current.platforms.map((item) => item === previous ? platform : item), platformColors }; } return { ...current, platformColors }; })} /></>}
          {tab === "monthly-goal" && <><div className="config-intro"><span className="eyebrow">Objetivo mensual</span><h2>Seguimiento del objetivo</h2><p>Ingresá manualmente el objetivo final y el importe alcanzado durante el mes.</p></div><MonthlyGoalConfig draft={draft} update={(patch) => setDraft({ ...draft, ...patch })} /></>}
          </>}
        </main>
      </div>

    </div>
  );
}

function SummaryHeader({
  caja,
  onClose,
  saving,
  onPrevious,
  onNext,
  readOnly,
  onSnapshot,
  capturing,
  onConfigure,
  boxes,
  activeBoxId,
  onBoxChange,
}) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <Banknote size={20} />
        </div>
        <div>
          <strong>
            CAJA<span>flow</span>
          </strong>
          <small>Control operativo</small>
        </div>
      </div>
      <div className="shift-nav">
        <button
          className="icon-button"
          title="Caja anterior"
          onClick={onPrevious}
        >
          <ArrowLeft size={17} />
        </button>
        <div className="shift-title">
          <span>
            <Clock3 size={15} /> Turno {caja.shift}{" "}
            {readOnly && "· Solo lectura"}
          </span>
          <b>
            {new Date(caja.date).toLocaleDateString("es-AR", {
              day: "2-digit",
              month: "2-digit",
            })}{" "}
            <em>/</em>{" "}
            {caja.shift === "Noche"
              ? "00:00 - 08:00"
              : caja.shift === "Mañana"
                ? "08:00 - 16:00"
                : "16:00 - 00:00"}
          </b>
        </div>
        <button className="icon-button" title="Caja siguiente" onClick={onNext}>
          <ArrowRight size={17} />
        </button>
      </div>
      <div className="top-actions">
        <BoxSelector boxes={boxes} activeBoxId={activeBoxId} onChange={onBoxChange} />
        <span className={`save-state ${saving ? "saving" : ""}`}>
          <span className="dot" />{" "}
          {readOnly ? "Consulta" : saving ? "Guardando..." : "Guardado"}
        </span>
        <button
          className="icon-button snapshot-button"
          title="Descargar caja como PNG"
          onClick={onSnapshot}
          disabled={capturing}
        >
          <Camera size={17} />
        </button>
        <button
          className="close-button"
          onClick={onClose}
          disabled={readOnly || caja.status === "CERRADA"}
        >
          <LockKeyhole size={16} /> Cerrar caja
        </button>
      </div>
    </header>
  );
}
function SectionHead({ icon, title, meta, action }) {
  return (
    <div className="section-head">
      <div className="section-title">
        {title === "Publicidad" ? <Megaphone size={16} /> : icon}
        <div className="section-title-copy">
          <div className="section-title-line">
            <h2>{title}</h2>
            {meta && <span>{meta}</span>}
          </div>
        </div>
      </div>
      {action}
    </div>
  );
}
function NumericInput({ value, onChange, placeholder = "", zeroPlaceholder = "", onKeyDown, inputProps = {}, numericOnly = false, selectAllOnFirstClick = false }) {
  const normalizedValue = numericOnly ? Math.max(0, Math.trunc(number(value))) : number(value);
  const [inputValue, setInputValue] = useState(
    normalizedValue ? (numericOnly ? String(normalizedValue) : formatNumberInput(value)) : "",
  );
  const focused = React.useRef(false);
  const inputRef = React.useRef(null);
  const selectAllPending = React.useRef(false);
  const selectAllHandled = React.useRef(false);
  const [isFocused, setIsFocused] = useState(false);
  const selectionRef = React.useRef(null);

  const digitCountBefore = (text, position) => (text.slice(0, position).match(/\d/g) || []).length;
  const positionAfterDigits = (text, digits) => {
    if (!digits) return 0;
    let seen = 0;
    for (let index = 0; index < text.length; index += 1) {
      if (/\d/.test(text[index])) seen += 1;
      if (seen === digits) return index + 1;
    }
    return text.length;
  };

  useEffect(() => {
    if (!focused.current) {
      setInputValue(normalizedValue ? (numericOnly ? (isFocused ? String(normalizedValue) : formatNumberInput(normalizedValue)) : formatNumberInput(value)) : "");
    }
  }, [value, numericOnly, normalizedValue, isFocused]);
  useEffect(() => {
    if (!isFocused || !selectionRef.current) return undefined;
    const selection = selectionRef.current;
    const frame = requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.setSelectionRange(
        positionAfterDigits(input.value, selection.start),
        positionAfterDigits(input.value, selection.end),
      );
      selectionRef.current = null;
    });
    return () => cancelAnimationFrame(frame);
  }, [isFocused, inputValue]);

  return (
    <input
      ref={inputRef}
      value={inputValue}
      {...inputProps}
      placeholder={placeholder || zeroPlaceholder}
      type={numericOnly ? "text" : undefined}
      min={numericOnly ? 0 : undefined}
      step={numericOnly ? 1 : undefined}
      inputMode={numericOnly ? "numeric" : "decimal"}
      onKeyDown={onKeyDown}
      onMouseDown={() => {
        selectionRef.current = null;
        if (selectAllOnFirstClick && !selectAllHandled.current) selectAllPending.current = true;
      }}
      onFocus={(event) => {
        focused.current = true;
        setIsFocused(true);
        const selectAll = (selectAllOnFirstClick && selectAllPending.current) || event.currentTarget.dataset.selectAllOnFocus === "true";
        delete event.currentTarget.dataset.selectAllOnFocus;
        if (selectAll) {
          selectAllPending.current = false;
          selectAllHandled.current = true;
          const formattedValue = normalizedValue ? String(normalizedValue) : "";
          selectionRef.current = { start: 0, end: formattedValue.length };
          setInputValue(formattedValue);
          return;
        }
        if (numericOnly) {
          const start = event.target.selectionStart ?? event.target.value.length;
          const end = event.target.selectionEnd ?? start;
          selectionRef.current = {
            start: digitCountBefore(event.target.value, start),
            end: digitCountBefore(event.target.value, end),
          };
          setInputValue(normalizedValue ? String(normalizedValue) : "");
        }
      }}
      onClick={(event) => {
        inputProps.onClick?.(event);
        if (selectAllOnFirstClick && selectAllPending.current) {
          selectAllPending.current = false;
          selectAllHandled.current = true;
          requestAnimationFrame(() => event.currentTarget.select());
        }
      }}
      onChange={(event) => {
        const nextValue = numericOnly ? event.target.value.replace(/\D/g, "") : event.target.value;
        setInputValue(nextValue);
        onChange(numericOnly ? Number(nextValue) || 0 : parseNumberInput(nextValue));
      }}
      onBlur={() => {
        const input = inputRef.current;
        if (input) {
          selectionRef.current = {
            start: digitCountBefore(input.value, input.selectionStart ?? input.value.length),
            end: digitCountBefore(input.value, input.selectionEnd ?? input.value.length),
          };
        }
        focused.current = false;
        selectAllPending.current = false;
        selectAllHandled.current = false;
        setIsFocused(false);
        setInputValue(numericOnly ? formatNumberInput(inputValue) : formatNumberInput(inputValue));
      }}
    />
  );
}
function AmountInput({ value, onChange, placeholder = "0,00", className = "" }) {
  return (
    <div className={`amount-input ${className}`}>
      <span>$</span>
      <NumericInput
        value={value || ""}
        placeholder={placeholder}
        onChange={onChange}
      />
    </div>
  );
}

function QuickBonusAccess({ caja, update, onViewBonuses, onAddManualBonus }) {
  const [quick, setQuick] = useState("");
  const [recoveredMode, setRecoveredMode] = useState(false);
  const granted = caja.bonuses.reduce((sum, bonus) => sum + number(bonus.granted), 0);
  const recovered = caja.bonuses.reduce((sum, bonus) => sum + number(bonus.recovered), 0);
  const recentBonuses = caja.bonuses.slice(-3).reverse();
  const editRecentBonus = (bonusId, value) => {
    const bonuses = caja.bonuses.map((bonus) => bonus.id === bonusId ? { ...bonus, granted: bonus.recovered > 0 ? 0 : value, recovered: bonus.recovered > 0 ? value : 0 } : bonus);
    update({ bonuses: value ? bonuses : bonuses.filter((bonus) => bonus.id !== bonusId) });
  };
  const addBonus = (event) => {
    if (!["Enter", "+"].includes(event.key) || !parseNumberInput(quick)) return;
    event.preventDefault();
    const amount = parseNumberInput(quick);
    const recovered = event.key === "+" || recoveredMode;
    update({ bonuses: [...caja.bonuses, { id: crypto.randomUUID(), label: "", granted: recovered ? 0 : amount, recovered: recovered ? amount : 0, verified: false, createdAt: new Date().toISOString() }] });
    setQuick("");
    setRecoveredMode(false);
  };
  return <div className="quick-bonus-access">
    <div className="quick-bonus-header flex items-center justify-between w-full gap-2">
      <div className={`quick-amount w-28 shrink-0 text-xs px-2 py-1 ${recoveredMode ? "recovered" : "granted"}`}>
        <span>$</span>
        <input value={quick} placeholder={`Bonos Netos: ${money(granted - recovered)}`} inputMode="decimal" aria-label="Insertar bono" onChange={(event) => setQuick(event.target.value)} onBlur={() => setQuick(formatNumberInput(quick))} onKeyDown={addBonus} />
      </div>
      <div className="quick-bonus-actions flex items-center gap-1.5 flex-shrink-0">
        <button className={`bonus-toggle shrink-0 ${recoveredMode ? "checked recovered" : "granted"}`} title="Cambiar entre otorgado y recuperado" onClick={() => setRecoveredMode(!recoveredMode)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addBonus(event); } }}><ArrowUpDown size={12} /></button>
        <button className="icon-button shrink-0" title="Agregar bono manual" onClick={onAddManualBonus}><Plus size={14} /></button>
        <button className="icon-button shrink-0" title="Ver y editar bonos" onClick={onViewBonuses}><Eye size={14} /></button>
      </div>
    </div>
    <div className="quick-recent-bonuses"><span className="quick-recent-title">Últimos 3 bonos</span>{recentBonuses.map((bonus) => { const isRecovered = number(bonus.recovered) > 0; return <div className={`quick-recent-bonus ${isRecovered ? "recovered" : "granted"}`} key={bonus.id}><span>{isRecovered ? "Recuperado" : "Otorgado"}</span><input defaultValue={money(isRecovered ? bonus.recovered : bonus.granted)} aria-label="Editar bono reciente" onFocus={(event) => { event.currentTarget.value = formatNumberInput(isRecovered ? bonus.recovered : bonus.granted); event.currentTarget.select(); }} onBlur={(event) => { const value = parseNumberInput(event.currentTarget.value); event.currentTarget.value = value ? money(value) : "-"; editRecentBonus(bonus.id, value); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></div>; })}</div>
  </div>;
}

function AdvertisingSection({ caja, update, boxes, config, onViewBonuses, onAddManualBonus, onNotify, notesEnabled, onNotesEnabledChange }) {
  const advertising = caja.advertising || { "Publicidad A": { total: 0, new: 0, repeated: 0, derived: {} }, "Publicidad B": { total: 0, new: 0, repeated: 0, derived: {} } };
  const updateAdvertising = (name, patch) => update({ advertising: { ...advertising, [name]: { ...advertising[name], ...patch } } });
  const updateValue = (name, field, value) => updateAdvertising(name, { [field]: Math.max(0, Number(String(value).replace(/\D/g, "").slice(0, 3)) || 0) });
    const copySummary = async () => {
    const text = ["*Conteo de Publi:*", "", ...["Publicidad A", "Publicidad B"].flatMap((name) => {
      const item = advertising[name] || {};
      const total = number(item.total);
      const newCount = number(item.new);
      const repeated = number(item.repeated);
      const response = newCount + repeated - total;
      const derivedTotal = boxes.reduce((sum, box) => sum + number(item.derived?.[box.id]), 0);
      return [`*${name}*`, `*Efectividad: ${total ? Math.round((derivedTotal / total) * 100) : 0}%*`, "", `Llegados: ${total}`, `- Nuevos: ${newCount}`, `- Repetidos: ${repeated}`, `- S/Respuesta: ${response}`, `Derivados: ${derivedTotal}`, ...boxes.map((box) => `- ${box.title}: ${number(item.derived?.[box.id])}`), ""];
    })].join("\n");
    await navigator.clipboard?.writeText(text);
    onNotify("Copiado al portapapeles");
  };
  return <section className="advertising-panel">
    <div className="advertising-card"><SectionHead icon={<ReceiptText size={16} />} title="Publicidad" action={<button className="icon-button advertising-copy" title="Copiar conteo de publicidad" onClick={copySummary}><Copy size={15} /></button>} /><div className="advertising-content">{["Publicidad A", "Publicidad B"].map((name) => { const item = advertising[name] || {}; const response = number(item.new) + number(item.repeated) - number(item.total); const derivedTotal = boxes.reduce((sum, box) => sum + number(item.derived?.[box.id]), 0); const effectiveness = item.total ? Math.round((derivedTotal / number(item.total)) * 100) : 0; return <div className="advertising-row" key={name}><strong><ReceiptText size={12} />{name}</strong><div className="advertising-subgroup"><div className="advertising-fields"><label><small>Lleg. Total</small><input maxLength={3} inputMode="numeric" value={item.total || ""} onChange={(event) => updateValue(name, "total", event.target.value)} /></label><label><small>Nuevos</small><input maxLength={3} inputMode="numeric" value={item.new || ""} onChange={(event) => updateValue(name, "new", event.target.value)} /></label><label><small>Repetidos</small><input maxLength={3} inputMode="numeric" value={item.repeated || ""} onChange={(event) => updateValue(name, "repeated", event.target.value)} /></label><label><small>S/Resp</small><b>{response}</b></label></div></div><div className="advertising-subgroup"><span>Derivados <b>{derivedTotal}</b></span><div className="advertising-derived">{boxes.map((box) => <label key={box.id}><small className="advertising-box-label">{box.title}</small><input maxLength={3} inputMode="numeric" value={item.derived?.[box.id] || ""} onChange={(event) => updateAdvertising(name, { derived: { ...(item.derived || {}), [box.id]: Math.max(0, Number(String(event.target.value).replace(/\D/g, "").slice(0, 3)) || 0) } })} /></label>)}</div></div><strong className="advertising-effectiveness"><ReceiptText size={11} />{effectiveness}%</strong></div>; })}</div></div>
    <div className="bonus-card"><QuickBonusAccess caja={caja} update={update} onViewBonuses={onViewBonuses} onAddManualBonus={onAddManualBonus} /></div>
    <div className="chips-card"><div className="section-head chips-section-head"><div className="section-title"><Ticket size={16} /><div><h2>Fichas Finales</h2></div></div><label className="notes-toggle" title="Mostrar u ocultar notas de cuentas"><span>Notas</span><input type="checkbox" checked={notesEnabled} onChange={(event) => onNotesEnabledChange(event.target.checked)} /><i /></label></div><div className="final-chip-fields">{caja.chips.map((chip, index) => { const balance = number(chip.initial) - number(chip.final); const platformColor = boxColorStyle(config.platformColors?.[chip.platform] || "teal")["--box-accent"]; return <label className={`final-chip-field ${number(chip.final) !== 0 ? "has-value" : ""}`} style={{ "--platform-accent": platformColor }} key={chip.platform}><span>Ficha Final ({chip.platform})</span><AmountInput value={chip.final} onChange={(value) => { const chips = structuredClone(caja.chips); chips[index].final = value; update({ chips }); }} /><small className={balance < 0 ? "negative" : balance > 0 ? "positive" : "neutral"}>Saldo {money(balance)}</small></label>; })}</div></div>
  </section>;
}

function AdvertisingSectionRebuilt({ caja, update, boxes, config, onViewBonuses, onAddManualBonus, onNotify }) {
  const advertising = caja.advertising || {};
  const updateAdvertising = (name, patch) => update({ advertising: { ...advertising, [name]: { ...(advertising[name] || {}), ...patch } } });
  const updateValue = (name, field, value) => updateAdvertising(name, { [field]: Math.max(0, Number(String(value).replace(/\D/g, "").slice(0, 3)) || 0) });
  const copySummary = async () => {
    const lines = ["*CONTEO DE PUBLICIDAD:*", ""];
    ["Publicidad A", "Publicidad B"].forEach((name, index) => {
      const item = advertising[name] || {};
      const total = number(item.total);
      const derived = boxes.reduce((sum, box) => sum + number(item.derived?.[box.id]), 0);
      lines.push(`*${name}*`, `*Efectividad: ${total ? Math.round((derived / total) * 100) : 0}%*`, "", `*Llegados: ${total}*`, `Nuevos: ${number(item.new)}`, `Repetidos: ${number(item.repeated)}`, `S/Resp: ${number(item.new) + number(item.repeated) - total}`, "", `*Derivados: ${derived}*`, ...boxes.map((box) => `${box.title}: ${number(item.derived?.[box.id])}`), "", ...(index === 0 ? ["---------------------", ""] : []));
    });
    const text = lines.join("\n");
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }
    onNotify("Copiado al portapapeles");
  };
  return <div className="publicity-layout" onClick={(event) => { if (event.target instanceof HTMLInputElement && event.target.closest(".publicity-panel")) event.target.select(); }}>
    <section className="panel publicity-panel"><SectionHead icon={<ReceiptText size={16} />} title="Publicidad" action={<button className="icon-button" title="Copiar conteo de publicidad" onClick={copySummary}><Copy size={15} /></button>} /><div className="publicity-list">{["Publicidad A", "Publicidad B"].map((name) => { const item = advertising[name] || {}; const total = number(item.total); const derived = boxes.reduce((sum, box) => sum + number(item.derived?.[box.id]), 0); const response = number(item.new) + number(item.repeated) - total; return <div className="publicity-item" key={name}><strong className="publicity-name"><ReceiptText size={13} />{name}</strong><div className="publicity-numbers"><label><span>Total</span><input maxLength={3} inputMode="numeric" value={item.total ?? 0} onChange={(event) => updateValue(name, "total", event.target.value)} /></label><label><span>Nuevos</span><input maxLength={3} inputMode="numeric" value={item.new ?? 0} onChange={(event) => updateValue(name, "new", event.target.value)} /></label><label><span>Repetidos</span><input maxLength={3} inputMode="numeric" value={item.repeated ?? 0} onChange={(event) => updateValue(name, "repeated", event.target.value)} /></label><label><span>S/Resp</span><b>{response}</b></label></div><div className="publicity-derived"><span>Derivados <b>{derived}</b></span><div>{boxes.map((box) => <label key={box.id}><small>{box.title}</small><input maxLength={3} inputMode="numeric" value={item.derived?.[box.id] ?? 0} onChange={(event) => updateAdvertising(name, { derived: { ...(item.derived || {}), [box.id]: Math.max(0, Number(String(event.target.value).replace(/\D/g, "").slice(0, 3)) || 0) } })} /></label>)}</div></div><strong className="publicity-rate"><ReceiptText size={11} />{total ? Math.round((derived / total) * 100) : 0}%</strong></div>; })}</div></section>
    <section className="panel publicity-bonus-panel"><QuickBonusAccess caja={caja} update={update} onViewBonuses={onViewBonuses} onAddManualBonus={onAddManualBonus} /></section>
    <section className="panel publicity-chips-panel"><SectionHead icon={<Ticket size={16} />} title="Fichas Finales" /><div className="publicity-chip-list">{caja.chips.map((chip, index) => { const balance = number(chip.initial) - number(chip.final); return <label key={chip.platform} style={{ "--platform-accent": boxColorStyle(config.platformColors?.[chip.platform] || "teal")["--box-accent"] }}><span>Ficha Final ({chip.platform})</span><AmountInput value={chip.final} onChange={(value) => { const chips = structuredClone(caja.chips); chips[index].final = value; update({ chips }); }} /><small className={balance < 0 ? "negative" : balance > 0 ? "positive" : "neutral"}>Saldo {money(balance)}</small></label>; })}</div></section>
  </div>;
}

function AccountsGrid({ caja, update, config, boxes, activeBoxId, onAssignWallet, onViewBonuses, notesEnabled }) {
  const [notePosition, setNotePosition] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [activeNoteKey, setActiveNoteKey] = useState(null);
  const [visibleNoteKey, setVisibleNoteKey] = useState(null);
  const noteVisibilityTimer = React.useRef(null);
  const wallets = config.accounts.wallets;
  const accountSections = caja.accountSections || {};
  const walletGroups = ["Normal", "Depósitos", "Compartidas"].map((category) => ({
    category,
    rows: caja.accounts.map((row, index) => ({ row, index })).filter(({ row }) => wallets.some((wallet) => (config.accounts.walletSettings[row.holder]?.[wallet]?.category || "Normal") === category && config.accounts.availability[row.holder]?.[wallet] !== false)),
  })).filter((group) => group.rows.length);
  const rowOffsets = walletGroups.map((group, groupIndex) => walletGroups.slice(0, groupIndex).reduce((total, previousGroup) => total + previousGroup.rows.length, 0));
  const focusAdjacentAmount = (event, rowPosition, walletIndex) => {
    if (event.key === "Enter") {
      event.preventDefault();
      event.currentTarget.blur();
      return;
    }
    const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    const direction = directions[event.key];
    if (!direction) return;
    const [columnStep, rowStep] = direction;
    const input = event.currentTarget;
    const selectionStart = input.selectionStart ?? 0;
    const selectionEnd = input.selectionEnd ?? 0;
    const hasSelection = selectionStart !== selectionEnd;
    const selectedAll = hasSelection && selectionStart === 0 && selectionEnd === input.value.length;
    if (columnStep && !selectedAll && hasSelection) return;
    if (columnStep && !selectedAll && (columnStep < 0 ? selectionStart > 0 : selectionEnd < input.value.length)) return;
    const candidates = [...document.querySelectorAll(".account-grid input[data-matrix-row]")].filter((input) => {
      const candidateRow = Number(input.dataset.matrixRow);
      const candidateColumn = Number(input.dataset.matrixColumn);
      return columnStep ? candidateRow === rowPosition && (candidateColumn - walletIndex) * columnStep > 0 : candidateColumn === walletIndex && (candidateRow - rowPosition) * rowStep > 0;
    });
    candidates.sort((first, second) => {
      const firstDistance = columnStep ? Math.abs(Number(first.dataset.matrixColumn) - walletIndex) : Math.abs(Number(first.dataset.matrixRow) - rowPosition);
      const secondDistance = columnStep ? Math.abs(Number(second.dataset.matrixColumn) - walletIndex) : Math.abs(Number(second.dataset.matrixRow) - rowPosition);
      return firstDistance - secondDistance;
    });
    if (!candidates[0]) return;
    event.preventDefault();
    const nextInput = candidates[0];
    nextInput.dataset.selectAllOnFocus = "true";
    nextInput.focus({ preventScroll: true });
  };
  const totals = useMemo(
    () => ({
      rows: walletGroups.map((group) => group.rows.map(({ row }) => wallets.reduce((sum, wallet) => sum + (config.accounts.walletSettings[row.holder]?.[wallet]?.category === group.category && walletBelongsToBox(row, wallet, config, activeBoxId) ? number(row.values[wallet]) : 0), 0))),
      columns: wallets.map((wallet) => walletGroups.reduce((sum, group) => sum + group.rows.reduce((groupSum, { row }) => groupSum + (config.accounts.walletSettings[row.holder]?.[wallet]?.category === group.category && walletBelongsToBox(row, wallet, config, activeBoxId) ? number(row.values[wallet]) : 0), 0), 0)),
    }),
    [caja.accounts, wallets, walletGroups, config.accounts.availability, config.accounts.walletSettings, activeBoxId],
  );
  const edit = (rowIndex, wallet, value) => {
    const accounts = structuredClone(caja.accounts);
    accounts[rowIndex].values[wallet] = value;
    update({ accounts });
  };
  const editNote = (rowIndex, wallet, value) => {
    const accounts = structuredClone(caja.accounts);
    accounts[rowIndex].notes = { ...(accounts[rowIndex].notes || {}), [wallet]: value };
    update({ accounts });
  };
  const toggle = (rowIndex, wallet, flag) => {
    const accounts = structuredClone(caja.accounts);
    const current = accounts[rowIndex].verified?.[wallet];
    const state =
      typeof current === "object"
        ? current
        : { collections: Boolean(current), withdrawals: false };
    state[flag] = !state[flag];
    const restartedAt = new Date().toISOString();
    if (!state[flag]) state[`last${flag === "collections" ? "Collections" : "Withdrawals"}At`] = restartedAt;
    accounts[rowIndex].walletRestartAt = { ...(accounts[rowIndex].walletRestartAt || {}), [wallet]: restartedAt };
    accounts[rowIndex].verified = { ...(accounts[rowIndex].verified || {}), [wallet]: state };
    update({ accounts }, true);
  };
  const cellState = (row, wallet) => {
    const state = row.verified?.[wallet];
    return typeof state === "object"
      ? state
      : { collections: Boolean(state), withdrawals: false };
  };
  const noteKey = (rowIndex, wallet) => `${rowIndex}-${wallet}`;
  const showNote = (event, currentNoteKey) => {
    const focusedNote = document.activeElement;
    if (focusedNote?.closest(".wallet-note-popover")) {
      focusedNote.blur();
      setEditingNote(null);
    }
    setActiveNoteKey(currentNoteKey);
    setVisibleNoteKey(null);
    window.clearTimeout(noteVisibilityTimer.current);
    noteVisibilityTimer.current = window.setTimeout(() => {
      setVisibleNoteKey((key) => key === null ? currentNoteKey : key);
    }, 650);
    const rect = event.currentTarget.getBoundingClientRect();
    const height = 110;
    setNotePosition({ left: Math.min(rect.left, window.innerWidth - 198), top: rect.bottom + height > window.innerHeight ? Math.max(8, rect.top - height) : rect.bottom });
  };
  const hideNote = (event, currentNoteKey) => {
    if (event.relatedTarget?.closest?.(".wallet-note-popover") && activeNoteKey === currentNoteKey) return;
    window.clearTimeout(noteVisibilityTimer.current);
    setActiveNoteKey(null);
    setVisibleNoteKey(null);
  };
  const sectionKey = (category) => category === "Depósitos" ? "deposits" : "shared";
  const isSectionCollapsed = (category) => category !== "Normal" && accountSections[sectionKey(category)] === true;
  const toggleSection = (category) => {
    const key = sectionKey(category);
    update({ accountSections: { ...accountSections, [key]: !isSectionCollapsed(category) } });
  };
  const renderCell = (row, index, wallet, category, rowPosition, walletIndex) => {
    const state = cellState(row, wallet);
    const stateClass = state.collections && state.withdrawals ? "both" : state.collections ? "collections" : state.withdrawals ? "withdrawals" : "";
    const walletCategory = config.accounts.walletSettings[row.holder]?.[wallet]?.category || "Normal";
    if (walletCategory !== category || config.accounts.availability[row.holder]?.[wallet] === false) return <td key={wallet}><div className="disabled-wallet" /></td>;
    const assignedBox = boxes.find((box) => box.id === row.walletBoxes?.[wallet]);
    const cellColorStyle = assignedBox ? boxColorStyle(assignedBox.color) : { "--box-accent": "#758689", "--box-line": "#536976", "--assignment-dot": "transparent" };
    const accountSetting = config.accounts.walletSettings[row.holder]?.[wallet] || {};
    const assignmentSelector = category !== "Normal" && <WalletAssignmentSelector showLabel={false} boxes={boxes} value={row.walletBoxes?.[wallet] || ""} onChange={(boxId) => onAssignWallet(row.holder, wallet, boxId)} />;
    const checks = <div className="cell-checks"><button tabIndex={-1} className={state.collections ? "checked" : ""} onClick={() => toggle(index, wallet, "collections")} title="Cobros e ingresos"><Check size={11} /></button><button tabIndex={-1} className={state.withdrawals ? "checked" : ""} onClick={() => toggle(index, wallet, "withdrawals")} title="Retiros y egresos"><Check size={11} /></button></div>;
    const currentNoteKey = noteKey(index, wallet);
    const isEditingNote = editingNote === currentNoteKey;
    const note = accountSetting.note || row.notes?.[wallet] || "";
    const accountInfo = [["Alias", accountSetting.alias], ["CUIL", accountSetting.cuil], ["Contraseña", accountSetting.password], ["Nota", note]].filter(([, value]) => String(value || "").trim());
    const hasAccountInfo = accountInfo.length > 0;
    return <td key={wallet}><div className={`wallet-cell ${notesEnabled ? "notes-enabled" : ""}`}><div className={`cell-control ${stateClass} ${number(row.values[wallet]) !== 0 ? "has-money" : ""} ${category === "Normal" ? "wallet-category-normal" : "wallet-category-assigned"}`} style={cellColorStyle}><div className="account-amount"><span>$</span><NumericInput value={row.values[wallet]} zeroPlaceholder="-" numericOnly selectAllOnFirstClick onChange={(value) => edit(index, wallet, value)} onKeyDown={(event) => focusAdjacentAmount(event, rowPosition, walletIndex)} inputProps={{ "data-matrix-row": rowPosition, "data-matrix-column": walletIndex, onMouseEnter: (event) => showNote(event, currentNoteKey), onMouseLeave: (event) => hideNote(event, currentNoteKey) }} /></div>{category === "Normal" && checks}{category === "Depósitos" && assignmentSelector}{category === "Compartidas" && <div className="shared-wallet-controls">{checks}{assignmentSelector}</div>}</div>{hasAccountInfo && <div className={`wallet-note-popover has-note ${activeNoteKey === currentNoteKey ? "active" : ""} ${visibleNoteKey === currentNoteKey ? "visible" : ""}`} style={notePosition ? { left: `${notePosition.left}px`, top: `${notePosition.top}px` } : undefined}><div className="wallet-account-info">{accountInfo.map(([label, value]) => <div key={label}><b>{label}</b><textarea tabIndex={-1} rows={Math.max(1, String(value).split(/\r?\n/).length)} readOnly value={value} /></div>)}</div></div>}</div></td>;
  };
  return (
    <section className="panel accounts-panel">
      <div className="table-scroll">
        <table className="account-grid">
          <thead>
            <tr>
              <th className="sticky-col"><span className="section-icon cyan"><WalletCards size={16} /></span><b>Caja</b></th>
              {wallets.map((wallet) => (
                <th className={walletModeClass(config, wallet)} key={wallet}>{wallet}</th>
              ))}
              <th className="total-column">Total</th>
            </tr>
          </thead>
          <tbody>
            {walletGroups.flatMap((group, groupIndex) => {
              const collapsed = isSectionCollapsed(group.category);
              return [
                group.category !== "Normal" && <tr className="wallet-section-row" key={`${group.category}-title`}><th colSpan={wallets.length + 2}><button type="button" className="wallet-section-toggle" onClick={() => toggleSection(group.category)} aria-expanded={!collapsed} aria-label={`${collapsed ? "Expandir" : "Minimizar"} billeteras ${group.category}`}><span>{`Billeteras ${group.category}`}</span>{collapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}</button></th></tr>,
                ...(!collapsed ? group.rows.map(({ row, index }, rowIndex) => <tr key={`${group.category}-${row.holder}-${index}`}><th className="sticky-col holder">{row.holder}</th>{wallets.map((wallet, walletIndex) => renderCell(row, index, wallet, group.category, rowOffsets[groupIndex] + rowIndex, walletIndex))}<td className="total-cell">{money(totals.rows[groupIndex][rowIndex])}</td></tr>) : []),
              ];
            })}
          </tbody>
          <tfoot>
            <tr>
              <th className="sticky-col">Total billetera</th>
              {totals.columns.map((total, index) => (
                <th key={wallets[index]}>{money(total)}</th>
              ))}
              <th className="grand-total">
                {money(totals.columns.reduce((a, b) => a + b, 0))}
              </th>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function BonusesSection({ caja, update, viewRequest, editorRequest }) {
  const [quick, setQuick] = useState("");
  const [recoveredMode, setRecoveredMode] = useState(false);
  const [open, setOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorAmount, setEditorAmount] = useState(0);
  const [editorPercent, setEditorPercent] = useState(0);
  const [noteId, setNoteId] = useState(null);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const grantedCount = caja.bonuses.filter((bonus) => number(bonus.granted) > 0).length;
  const recoveredCount = caja.bonuses.filter((bonus) => number(bonus.recovered) > 0).length;
  useEffect(() => {
    if (viewRequest) setOpen(true);
  }, [viewRequest]);
  useEffect(() => {
    if (editorRequest) openBonusEditor();
  }, [editorRequest]);
  const granted = caja.bonuses.reduce((s, x) => s + number(x.granted), 0);
  const recovered = caja.bonuses.reduce((s, x) => s + number(x.recovered), 0);
  const shiftStart = { Noche: 0, Mañana: 8, Tarde: 16 }[caja.shift] ?? 0;
  const bonusSlots = Array.from({ length: 4 }, (_, slot) => {
    const start = (shiftStart + slot * 2) % 24;
    const end = (start + 2) % 24;
    const label = `${String(start).padStart(2, "0")}:00 - ${String(end).padStart(2, "0")}:00`;
    const items = caja.bonuses.slice().reverse().map((bonus) => ({ bonus, index: caja.bonuses.indexOf(bonus) })).filter(({ bonus }) => {
      const hour = new Date(bonus.createdAt).getHours();
      const minutes = new Date(bonus.createdAt).getMinutes();
      const elapsed = (hour * 60 + minutes - shiftStart * 60 + 1440) % 1440;
      return Math.floor(elapsed / 120) === slot;
    });
    return { label, items };
  });
  const addBonus = (event) => {
    if (!["Enter", "+"].includes(event.key) || !parseNumberInput(quick)) return;
    event.preventDefault();
    const recovered = event.key === "+" || recoveredMode;
    update({
      bonuses: [
        ...caja.bonuses,
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          label: "",
          granted: recovered ? 0 : parseNumberInput(quick),
          recovered: recovered ? parseNumberInput(quick) : 0,
          verified: false,
        },
      ],
    });
    setQuick("");
    setRecoveredMode(false);
  };
  const editBonus = (index, patch) => {
    const bonuses = structuredClone(caja.bonuses);
    bonuses[index] = { ...bonuses[index], ...patch };
    update({ bonuses });
  };
  const removeBonus = (index) => {
    update({ bonuses: caja.bonuses.filter((_, itemIndex) => itemIndex !== index) });
    setNoteId(null);
    setDeleteIndex(null);
  };
  const openBonusEditor = () => {
    setEditorAmount(0);
    setEditorPercent(0);
    setRecoveredMode(false);
    setEditorOpen(true);
  };
  const addEditedBonus = () => {
    if (!editorAmount) return;
    const amount = Math.round(editorAmount * (editorPercent > 0 ? editorPercent / 100 : 1) * 100) / 100;
    if (!amount) return;
    update({
      bonuses: [
        ...caja.bonuses,
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          label: "",
          granted: recoveredMode ? 0 : amount,
          recovered: recoveredMode ? amount : 0,
          verified: false,
        },
      ],
    });
    setEditorOpen(false);
  };
  return (
    <section className="panel">
      <SectionHead
        icon={<Gift size={18} />}
        title="Bonos"
        meta={`${grantedCount} Bonos Otorgados | ${recoveredCount} Bonos Recuperados`}
        action={
          <div className="bonus-actions">
            <button className="icon-button" title="Agregar bono" onClick={openBonusEditor}>
              <Plus size={16} />
            </button>
            <button className="icon-button" title="Ver y editar bonos" onClick={() => setOpen(true)}>
              <Eye size={16} />
            </button>
          </div>
        }
      />
      <div className="bonus-quick">
        <div className={`quick-amount ${recoveredMode ? "recovered" : "granted"}`}>
          <span>$</span>
          <input
            value={quick}
            placeholder={`Insertar Bono ${recoveredMode ? "Recuperado" : "Otorgado"}`}
            inputMode="decimal"
            onChange={(e) => setQuick(e.target.value)}
            onBlur={() => setQuick(formatNumberInput(quick))}
            onKeyDown={addBonus}
          />
        </div>
        <button
          className={`bonus-toggle ${recoveredMode ? "checked" : ""}`}
          title="Cambiar entre otorgado y recuperado"
          onClick={() => setRecoveredMode(!recoveredMode)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addBonus(event); } }}
        >
          <ArrowUpDown size={13} />
        </button>
      </div>
      {editorOpen && (
        <div className="modal-backdrop" onClick={() => setEditorOpen(false)}>
          <div className="modal bonus-editor-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setEditorOpen(false)} title="Cancelar"><X size={18} /></button>
            <div className={`modal-icon ${recoveredMode ? "green" : "orange"}`}><Gift size={22} /></div>
            <h2>Agregar bono</h2>
            <p>Ingresá un valor, aplicá un porcentaje (opcional)

 y confirmá el bono.</p>
            <div className="bonus-editor-fields">
              <label>
                <span>Valor</span>
                <AmountInput value={editorAmount} onChange={setEditorAmount} />
              </label>
              <label>
                <span>Porcentaje (opcional)
</span>
                <div className="percent-input">
                  <NumericInput value={editorPercent} onChange={setEditorPercent} zeroPlaceholder="0" />
                  <b>%</b>
                </div>
              </label>
            </div>
            <div className={`bonus-editor-type ${recoveredMode ? "recovered" : "granted"}`}>
              <span>{recoveredMode ? "Bono recuperado" : "Bono otorgado"}</span>
              <button className={`bonus-toggle ${recoveredMode ? "checked" : ""}`} title="Cambiar tipo" onClick={() => setRecoveredMode(!recoveredMode)}>
                <ArrowUpDown size={13} />
              </button>
            </div>
            <span className="bonus-editor-label">Sumar al valor</span>
            <div className="bonus-shortcuts">
              {[100, 500, 1000, 2500, 5000, 10000].map((value) => (
                <button key={value} onClick={() => setEditorAmount((current) => current + value)}>{formatNumberInput(value)}</button>
              ))}
            </div>
            <div className="bonus-editor-preview">
              {Number(editorPercent) > 0 && Number(editorPercent) !== 100 && <div className="bonus-editor-complete"><span>Carga completa</span><b>{money(editorAmount + editorAmount * (editorPercent / 100))}</b></div>}
              <div className="bonus-editor-preview-row"><span>Bono a agregar</span><b>{money(editorAmount * (editorPercent > 0 ? editorPercent / 100 : 1))}</b></div>
            </div>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setEditorOpen(false)}>Cancelar</button>
              <button className="close-button" onClick={addEditedBonus}>Listo <Check size={16} /></button>
            </div>
          </div>
        </div>
      )}
      {open && (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal bonus-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setOpen(false)}><X size={18} /></button>
            <div className="modal-icon"><Gift size={22} /></div>
            <h2>Bonos del turno</h2>
            <p>Revisá el monto, cambiá su tipo con el check y agregá una nota si hace falta.</p>
        <div className="bonus-list">
          {caja.bonuses.length === 0 && <div className="empty-state">Todavía no hay bonos cargados.</div>}
          {bonusSlots.map((slot) => (
            <section className="bonus-time-column" key={slot.label}>
              <h3>{slot.label}</h3>
              <div className="bonus-time-bonuses">
                {slot.items.length === 0 && <span className="bonus-slot-empty">Sin bonos</span>}
                {slot.items.map(({ bonus, index }) => <div className={`bonus-row ${bonus.recovered > 0 ? "recovered" : "granted"}`} key={bonus.id}>
              <time className="movement-time">{formatMovementTime(bonus.createdAt)}</time>
              <AmountInput
                value={bonus.recovered || bonus.granted}
                onChange={(value) => editBonus(index, bonus.recovered > 0 ? { recovered: value, granted: 0 } : { granted: value, recovered: 0 })}
              />
              <button
                className={`bonus-toggle ${bonus.recovered > 0 ? "checked" : ""}`}
                title="Cambiar entre otorgado y recuperado"
                onClick={() => editBonus(index, bonus.recovered > 0 ? { recovered: 0, granted: bonus.recovered } : { granted: 0, recovered: bonus.granted })}
              >
                <ArrowUpDown size={13} />
              </button>
              <button className={`note-button ${bonus.note ? "has-note" : ""}`} title="Agregar nota" onClick={() => setNoteId(noteId === bonus.id ? null : bonus.id)}>
                <FileText size={14} />
              </button>
              <button className="delete-button" title="Eliminar bono" onClick={() => setDeleteIndex(index)}>
                <Trash2 size={14} />
              </button>
              {noteId === bonus.id && (
                <input
                  className="note-input"
                  placeholder="Nota del bono"
                  value={bonus.note}
                  onChange={(e) => editBonus(index, { note: e.target.value })}
                />
              )}
                </div>)}
              </div>
            </section>
          ))}
        </div>
            <div className="modal-actions"><button className="close-button" onClick={() => setOpen(false)}>Listo <Check size={16} /></button></div>
          </div>
        </div>
      )}
      <div className="recent-bonuses">
        <span className="recent-bonuses-title">Últimos bonos</span>
        {caja.bonuses.slice().reverse().map((bonus, reverseIndex) => {
          const isRecovered = number(bonus.recovered) > 0;
          const bonusIndex = caja.bonuses.length - 1 - reverseIndex;
          const amount = isRecovered ? bonus.recovered : bonus.granted;
          return (
            <div className={`recent-bonus ${isRecovered ? "recovered" : "granted"}`} key={bonus.id}>
              <span>{isRecovered ? "Recuperado" : "Otorgado"}</span>
              <input
                className="recent-bonus-amount"
                defaultValue={money(amount)}
                aria-label={`Valor del bono ${isRecovered ? "recuperado" : "otorgado"}`}
                inputMode="decimal"
                onFocus={(event) => { event.currentTarget.value = formatNumberInput(amount); event.currentTarget.select(); }}
                onBlur={(event) => { const value = parseNumberInput(event.currentTarget.value); if (!value) { removeBonus(bonusIndex); return; } event.currentTarget.value = money(value); editBonus(bonusIndex, isRecovered ? { recovered: value, granted: 0 } : { granted: value, recovered: 0 }); }}
                onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
              />
            </div>
          );
        })}
        {caja.bonuses.length === 0 && <span className="recent-empty">Sin movimientos todavía</span>}
      </div>
      <div className="totals-line bonus-total">
        <span>
          Otorgados <b>{money(granted)}</b>
        </span>
        <span>
          Recuperados <b>{money(recovered)}</b>
        </span>
        <strong>
          Neto <b>{money(granted - recovered)}</b>
        </strong>
      </div>
      {deleteIndex !== null && <ConfirmDialog message="¿Seguro que querés eliminar este bono?" onCancel={() => setDeleteIndex(null)} onConfirm={() => removeBonus(deleteIndex)} />}
    </section>
  );
}

function QuickMovementSection({ title, tone, rows, update, kind, config }) {
  const [quick, setQuick] = useState("");
  const [quickNotes, setQuickNotes] = useState("");
  const [quickUser, setQuickUser] = useState("");
  const [quickCategory, setQuickCategory] = useState(config.expenses[0]?.name || "Gasto");
  const [open, setOpen] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const isExpense = kind === "expenses";
  const expenseOptions = config.expenses.filter((expense) => expense.name.trim());
  const movementDetail = (row) => (isExpense ? [row.category, row.notes] : [row.user, row.notes]).filter(Boolean).join(" · ");
  const movementIcon = kind === "expenses" ? <ReceiptText size={20} /> : kind === "tips" ? <Coins size={20} /> : <ArrowDownToLine size={20} />;
  const total = rows.reduce((sum, row) => {
    const expense = isExpense && config.expenses.find((item) => item.name === row.category);
    return sum + number(row.amount) * (expense?.inverted ? -1 : 1);
  }, 0);
  const add = () => {
    if (!parseNumberInput(quick)) return;
    const row = isExpense
      ? { id: crypto.randomUUID(), category: quickCategory, amount: parseNumberInput(quick), notes: quickNotes, createdAt: new Date().toISOString() }
      : { id: crypto.randomUUID(), notes: quickNotes, amount: parseNumberInput(quick), user: quickUser || "Cajero", createdAt: new Date().toISOString() };
    update({ [kind]: [...rows, row] });
    setQuick("");
    setQuickNotes("");
    setQuickUser("");
  };
  const submitOnEnter = (event) => {
    if (event.key === "Enter" && parseNumberInput(quick)) {
      event.preventDefault();
      add();
    }
  };
  const editRow = (index, patch) => {
    const next = structuredClone(rows);
    next[index] = { ...next[index], ...patch };
    update({ [kind]: next });
  };
  const removeRow = (index) => {
    update({ [kind]: rows.filter((_, itemIndex) => itemIndex !== index) });
    setDeleteIndex(null);
  };
  return (
    <section className={`panel compact movement-section ${isExpense ? "expense-movement" : "income-movement"}`}>
      <SectionHead
        icon={
          kind === "expenses" ? <ReceiptText size={18} /> : kind === "tips" ? <Coins size={18} /> : <ArrowDownToLine size={18} />
        }
        title={title}
        meta={`${rows.length} registros`}
        action={
          <button
            className="icon-button"
            title="Ver y editar registros"
            onClick={() => setOpen(true)}
          >
            <Eye size={16} />
          </button>
        }
      />
      <div className="quick-movement-input">
        {isExpense ? <select value={quickCategory} onChange={(e) => setQuickCategory(e.target.value)} onKeyDown={submitOnEnter}>{expenseOptions.map((expense) => <option key={expense.name}>{expense.name}</option>)}</select> : null}
        {!isExpense ? <input className="quick-user" value={quickUser} placeholder="Usuario" onChange={(e) => setQuickUser(e.target.value)} onKeyDown={submitOnEnter} /> : null}
        <div className={`quick-amount ${tone}`}><span>$</span><input value={quick} placeholder="Monto" inputMode="decimal" onChange={(e) => setQuick(e.target.value)} onBlur={() => setQuick(formatNumberInput(quick))} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} /></div>
        <input className="quick-detail" value={quickNotes} placeholder="Notas" onChange={(e) => setQuickNotes(e.target.value)} onKeyDown={submitOnEnter} />
        <button className="send-button" title="Enviar" onClick={add}><Send size={15} /></button>
      </div>
      <div className="recent-movements"><span>Últimos {title.toLowerCase()}</span>{rows.slice().reverse().map((row) => <div className="recent-movement" key={row.id}><span>{movementDetail(row)}</span><b>{money(row.amount)}</b></div>)}{rows.length === 0 && <small>Sin movimientos todavía</small>}</div>
      <div className="movement-total">
        <span>Total</span>
        <b className={tone === "red" ? "negative" : ""}>{money(total)}</b>
      </div>
        {open && <div className="modal-backdrop" onClick={() => setOpen(false)}><div className="modal movement-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setOpen(false)}><X size={18} /></button><div className={`modal-icon ${tone}`}>{movementIcon}</div><h2>{title} del turno</h2><p>Editá los datos completos de cada movimiento.</p><div className="movement-edit-list">{rows.length === 0 && <div className="empty-state">Todavía no hay movimientos.</div>}{rows.map((row, index) => <div className="movement-edit-row" key={row.id}><time className="movement-time">{formatMovementTime(row.createdAt)}</time>{isExpense && <select value={row.category} onChange={(e) => editRow(index, { category: e.target.value })}>{expenseOptions.map((expense) => <option key={expense.name}>{expense.name}</option>)}</select>}{!isExpense && <input placeholder="Usuario" value={row.user} onChange={(e) => editRow(index, { user: e.target.value })}/>}<AmountInput value={row.amount} onChange={(value) => editRow(index, { amount: value })} /><input placeholder="Notas" value={row.notes} onChange={(e) => editRow(index, { notes: e.target.value })} /><button className="delete-button" title={`Eliminar ${title.toLowerCase()}`} onClick={() => setDeleteIndex(index)}><Trash2 size={14}/></button></div>)}</div><div className="modal-actions"><button className="close-button" onClick={() => setOpen(false)}>Listo <Check size={16} /></button></div></div></div>}
      {deleteIndex !== null && <ConfirmDialog message={`¿Seguro que querés eliminar este registro de ${title}?`} onCancel={() => setDeleteIndex(null)} onConfirm={() => removeRow(deleteIndex)} />}
    </section>
  );
}

function FoundMoneySection({ caja, update, config }) {
  const [amount, setAmount] = useState("");
  const [holder, setHolder] = useState("");
  const [wallet, setWallet] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const records = Array.isArray(caja.foundMoney) ? caja.foundMoney : (number(caja.found) ? [{ id: "legacy-found", amount: caja.found }] : []);
  const availableWallets = holder ? config.accounts.wallets.filter((item) => config.accounts.availability[holder]?.[item] !== false) : [];
  const add = () => {
    if (!parseNumberInput(amount) || (!holder && !wallet && !note.trim())) { setError("Completá el monto y al menos un dato."); return; }
    update({ foundMoney: [...records, { id: crypto.randomUUID(), amount: parseNumberInput(amount), holder, wallet, note: note.trim(), createdAt: new Date().toISOString() }] });
    setAmount(""); setHolder(""); setWallet(""); setNote(""); setError("");
  };
  const remove = (index) => update({ foundMoney: records.filter((_, itemIndex) => itemIndex !== index) });
  const editRecord = (index, patch) => { const next = structuredClone(records); next[index] = { ...next[index], ...patch }; update({ foundMoney: next }); };
  const detail = (record) => [record.holder, record.wallet, record.note].filter(Boolean).join(" · ") || "Sin detalle";
  return <section className="panel compact found-money-section">
    <SectionHead icon={<Banknote size={18} />} title="Dinero encontrado" meta={`${records.length} registros`} action={<button className="icon-button" title="Ver y editar dinero encontrado" onClick={() => setOpen(true)}><Eye size={16} /></button>} />
    <div className="found-money-input">
      <select value={holder} onChange={(event) => { const nextHolder = event.target.value; const nextWallets = nextHolder ? config.accounts.wallets.filter((item) => config.accounts.availability[nextHolder]?.[item] !== false) : []; setHolder(nextHolder); if (!nextWallets.includes(wallet)) setWallet(""); }}><option value="">Titular</option>{config.accounts.holders.map((item) => <option key={item}>{item}</option>)}</select>
      <select value={wallet} disabled={!holder} onChange={(event) => setWallet(event.target.value)}><option value="">Billetera</option>{availableWallets.map((item) => <option key={item}>{item}</option>)}</select>
      <AmountInput value={amount} onChange={setAmount} />
      <input value={note} placeholder="Nota" onChange={(event) => setNote(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") add(); }} />
      <button className="send-button" title="Agregar dinero encontrado" onClick={add}><Send size={15} /></button>
    </div>
    {error && <small className="transfer-error found-money-error">{error}</small>}
    <div className="recent-movements"><span>Últimos registros</span>{records.slice().reverse().map((record) => <div className="recent-movement" key={record.id}><span>{detail(record)}</span><b>{money(record.amount)}</b></div>)}{records.length === 0 && <small>Sin movimientos todavía</small>}</div>
    <div className="movement-total"><span>Total</span><b>{money(records.reduce((sum, record) => sum + number(record.amount), 0))}</b></div>
    {open && <div className="modal-backdrop" onClick={() => setOpen(false)}><div className="modal movement-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setOpen(false)}><X size={18} /></button><div className="modal-icon"><Banknote size={22} /></div><h2>Dinero encontrado del turno</h2><p>Revisá o editá los registros encontrados.</p><div className="movement-edit-list">{records.length === 0 && <div className="empty-state">Todavía no hay registros.</div>}{records.map((record, index) => { const recordWallets = record.holder ? config.accounts.wallets.filter((item) => config.accounts.availability[record.holder]?.[item] !== false) : []; return <div className="movement-edit-row found-money-edit-row" key={record.id}><time className="movement-time">{formatMovementTime(record.createdAt)}</time><select value={record.holder || ""} onChange={(event) => { const nextHolder = event.target.value; const nextWallets = nextHolder ? config.accounts.wallets.filter((item) => config.accounts.availability[nextHolder]?.[item] !== false) : []; editRecord(index, { holder: nextHolder, wallet: nextWallets.includes(record.wallet) ? record.wallet : "" }); }}><option value="">Titular</option>{config.accounts.holders.map((item) => <option key={item}>{item}</option>)}</select><select value={record.wallet || ""} disabled={!record.holder} onChange={(event) => editRecord(index, { wallet: event.target.value })}><option value="">Billetera</option>{recordWallets.map((item) => <option key={item}>{item}</option>)}</select><input value={record.note || ""} placeholder="Nota" onChange={(event) => editRecord(index, { note: event.target.value })} /><AmountInput value={record.amount} onChange={(value) => editRecord(index, { amount: value })} /><button className="delete-button" title="Eliminar dinero encontrado" onClick={() => remove(index)}><Trash2 size={14} /></button></div>; })}</div><div className="modal-actions"><button className="close-button" onClick={() => setOpen(false)}>Listo <Check size={16} /></button></div></div></div>}
  </section>;
}

function ChipsSection({ caja, update, config }) {
  const [loadOpen, setLoadOpen] = useState(false);
  const [loadsEditorOpen, setLoadsEditorOpen] = useState(false);
  const [loadAmount, setLoadAmount] = useState("");
  const [loadPlatform, setLoadPlatform] = useState(caja.chips[0]?.platform || "");
  const chipLoads = caja.chipLoads || [];
  const totalBalance = caja.chips.reduce(
    (sum, chip) => sum + number(chip.initial) - number(chip.final),
    0,
  );
  const addChipLoad = () => {
    const amount = parseNumberInput(loadAmount);
    if (!amount || !loadPlatform) return;
    const chips = structuredClone(caja.chips);
    const chip = chips.find((item) => item.platform === loadPlatform);
    if (!chip) return;
    chip.initial = number(chip.initial) + amount;
    update({ chips, chipLoads: [...chipLoads, { id: crypto.randomUUID(), platform: loadPlatform, amount, createdAt: new Date().toISOString() }] });
    setLoadAmount("");
    setLoadOpen(false);
  };
  const updateChipLoads = (nextLoads) => {
    const chips = structuredClone(caja.chips);
    chips.forEach((chip) => {
      const previousLoads = chipLoads.filter((load) => load.platform === chip.platform).reduce((sum, load) => sum + number(load.amount), 0);
      const nextPlatformLoads = nextLoads.filter((load) => load.platform === chip.platform).reduce((sum, load) => sum + number(load.amount), 0);
      chip.initial = number(chip.initial) - previousLoads + nextPlatformLoads;
    });
    update({ chips, chipLoads: nextLoads });
  };
  return (
    <section className="panel compact chips-panel">
      <SectionHead
        icon={<Ticket size={18} />}
        title="Control de fichas"
        meta={`${chipLoads.length} carga${chipLoads.length === 1 ? "" : "s"} de fichas`}
        action={<div className="chips-actions"><button className="icon-button" title="Agregar carga de fichas" onClick={() => setLoadOpen(true)}><Plus size={16} /></button><button className="icon-button" title="Ver y editar cargas de fichas" onClick={() => setLoadsEditorOpen(true)}><Eye size={16} /></button></div>}
      />
      <div className="chips-head">
        <span>Plataforma</span>
        <span>Inicial</span>
        <span>Final</span>
        <span>Saldo</span>
      </div>
      <div className="chips-list">
        {caja.chips.map((chip, index) => (
          <div className="chip-row" key={chip.platform} style={{ "--platform-accent": boxColorStyle(config.platformColors?.[chip.platform] || "teal")["--box-accent"] }}>
            <b>{chip.platform}</b>
            <span className="readonly-amount chip-initial-input">{money(chip.initial)}</span>
            <AmountInput
              value={chip.final}
              onChange={(value) => {
                const chips = structuredClone(caja.chips);
                chips[index].final = value;
                update({ chips });
              }}
            />
            <strong
              className={chip.initial - chip.final < 0 ? "negative" : "positive"}
            >
              {money(number(chip.initial) - number(chip.final))}
            </strong>
          </div>
        ))}
      </div>
      {chipLoads.length > 0 && <div className="chip-loads"><span className="chip-loads-title">Cargas de fichas</span>{chipLoads.slice().reverse().map((load) => <div className="chip-load-row" key={load.id}><span>{load.platform}</span><b>+{money(load.amount)}</b></div>)}</div>}
      <div className="movement-total chips-total">
        <span>Total saldo</span>
        <b className={totalBalance < 0 ? "negative" : "positive"}>{money(totalBalance)}</b>
      </div>
      {loadOpen && <div className="modal-backdrop" onClick={() => setLoadOpen(false)}><div className="modal chip-load-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" title="Cerrar" onClick={() => setLoadOpen(false)}><X size={18} /></button><div className="modal-icon"><Ticket size={22} /></div><h2>Carga de fichas</h2><p>Sumá fichas al inicio de este turno.</p><div className="chip-load-fields"><label><span>Monto</span><AmountInput value={loadAmount} onChange={setLoadAmount} /></label><label><span>Plataforma</span><select value={loadPlatform} onChange={(event) => setLoadPlatform(event.target.value)}>{caja.chips.map((chip) => <option key={chip.platform}>{chip.platform}</option>)}</select></label></div><div className="modal-actions"><button className="ghost-button" onClick={() => setLoadOpen(false)}>Cancelar</button><button className="close-button" onClick={addChipLoad}>Cargar <Check size={16} /></button></div></div></div>}
      {loadsEditorOpen && <div className="modal-backdrop" onClick={() => setLoadsEditorOpen(false)}><div className="modal chip-load-editor-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" title="Cerrar" onClick={() => setLoadsEditorOpen(false)}><X size={18} /></button><div className="modal-icon"><Ticket size={22} /></div><h2>Cargas de fichas</h2><p>Modificá o eliminá las cargas de este turno.</p><div className="chip-load-edit-list">{chipLoads.length === 0 && <div className="empty-state">Todavía no hay cargas.</div>}{chipLoads.map((load, index) => <div className="chip-load-edit-row" key={load.id}><time className="movement-time">{formatMovementTime(load.createdAt)}</time><b>{load.platform}</b><AmountInput value={load.amount} onChange={(value) => updateChipLoads(chipLoads.map((item, itemIndex) => itemIndex === index ? { ...item, amount: value } : item))} /><button className="delete-button" title="Eliminar carga" onClick={() => updateChipLoads(chipLoads.filter((_, itemIndex) => itemIndex !== index))}><Trash2 size={14} /></button></div>)}</div><div className="modal-actions"><button className="close-button" onClick={() => setLoadsEditorOpen(false)}>Listo <Check size={16} /></button></div></div></div>}
    </section>
  );
}

function WalletRoute({ caja, config, onUpdateAccounts }) {
  const [pendingWallet, setPendingWallet] = useState(null);
  const stateFor = (row, wallet) => {
    const state = row.verified?.[wallet];
    return typeof state === "object" ? state : { collections: Boolean(state), withdrawals: false };
  };
  const dateValue = (value) => value ? new Date(value).getTime() : 0;
  const logisticsOrder = config.logistics?.order || [];
  const isNormalWallet = (row, wallet) => config.accounts.availability[row.holder]?.[wallet] !== false && (config.accounts.walletSettings[row.holder]?.[wallet]?.category || "Normal") === "Normal" && config.accounts.walletModes?.[wallet] !== "Solo Depósito";
  const items = caja.accounts.flatMap((row) => config.accounts.wallets.filter((wallet) => isNormalWallet(row, wallet)).map((wallet) => ({
    key: `${row.holder}::${wallet}`,
    holder: row.holder,
    wallet,
    state: stateFor(row, wallet),
    restart: row.walletRestartAt?.[wallet] || [stateFor(row, wallet).lastCollectionsAt, stateFor(row, wallet).lastWithdrawalsAt, row.walletBoxUpdatedAt?.[wallet]].sort((first, second) => dateValue(second) - dateValue(first))[0],
  }))).sort((first, second) => {
    const firstIndex = logisticsOrder.indexOf(first.key);
    const secondIndex = logisticsOrder.indexOf(second.key);
    return (firstIndex < 0 ? Number.MAX_SAFE_INTEGER : firstIndex) - (secondIndex < 0 ? Number.MAX_SAFE_INTEGER : secondIndex);
  });
  if (!items.length) return null;
  const inUseIndexes = items.map((item, index) => item.state.collections ? index : -1).filter((index) => index >= 0);
  const currentIndex = inUseIndexes.length === 0 ? 0 : inUseIndexes.find((index) => {
    const previous = (index - 1 + items.length) % items.length;
    const next = (index + 1) % items.length;
    return inUseIndexes.includes(previous) && !inUseIndexes.includes(next);
  }) ?? inUseIndexes[0];
  const route = [0, 1, 2].map((offset) => items[(currentIndex + offset) % items.length]);
  const currentItem = items[currentIndex];
  const recommended = items.filter((item) => item.key !== currentItem.key).sort((first, second) => dateValue(first.restart) - dateValue(second.restart))[0] || currentItem;
  const formatRestart = (value) => value ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)) : "Sin reinicio";
  const markInUse = (target) => {
    const now = new Date().toISOString();
    const accounts = structuredClone(caja.accounts);
    accounts.forEach((row) => {
      const normalWallets = config.accounts.wallets.filter((wallet) => isNormalWallet(row, wallet));
      normalWallets.forEach((wallet) => {
        const item = items.find((candidate) => candidate.holder === row.holder && candidate.wallet === wallet);
        if (!item) return;
        const previous = stateFor(row, wallet);
        const nextState = { ...previous, collections: item.key === target.key };
        if (previous.collections && item.key !== target.key) nextState.lastCollectionsAt = now;
        row.verified = { ...(row.verified || {}), [wallet]: nextState };
      });
    });
    onUpdateAccounts(accounts);
  };
  const requestInUse = (target) => setPendingWallet(target);
  const moveRoute = (offset) => requestInUse(items[(currentIndex + offset + items.length) % items.length]);

  return <section className="panel wallet-route" aria-label="Seguimiento de billeteras">
    <div className="wallet-recommendation"><span><WalletCards size={15} /> Billetera recomendada</span><strong>{recommended.holder} · {recommended.wallet}</strong><small>Reinicio más antiguo · {formatRestart(recommended.restart)}</small></div>
    <div className="wallet-route-head"><h2><WalletCards size={16} /> Próximas Billeteras</h2><span>Ruta normal</span><div className="wallet-route-actions"><button type="button" title="Billetera anterior" onClick={() => moveRoute(-1)}><ArrowLeft size={13} /> Anterior</button><button type="button" title="Próxima billetera" onClick={() => moveRoute(1)}>Próxima <ArrowRight size={13} /></button><button type="button" title="Usar billetera recomendada" onClick={() => requestInUse(recommended)}><WalletCards size={13} /> Recomendada</button></div></div>
    <div className="wallet-route-list">{route.map((item, index) => <div className={`wallet-route-item ${index === 0 ? "current" : "clickable"}`} key={`${item.key}-${index}`} onClick={() => index > 0 && requestInUse(item)} role={index > 0 ? "button" : undefined} tabIndex={index > 0 ? 0 : undefined} onKeyDown={(event) => { if (index > 0 && (event.key === "Enter" || event.key === " ")) requestInUse(item); }}><span className="wallet-route-index">{index === 0 ? "En uso" : `+${index}`}</span><strong>{item.holder} · {item.wallet}</strong>{item.key === recommended.key && <small>Recomendada</small>}</div>)}</div>
    {pendingWallet && <ConfirmDialog title="Cambiar billetera en uso" message={`¿Desea colocar en uso la billetera ${pendingWallet.holder} · ${pendingWallet.wallet}?`} confirmLabel="Colocar en uso" confirmIcon={<Check size={15} />} dialogIcon={<WalletCards size={21} />} onCancel={() => setPendingWallet(null)} onConfirm={() => { markInUse(pendingWallet); setPendingWallet(null); }} />}
  </section>;
}

function StatisticsPage({ history, config, activeBoxId, boxes, boxHistories, onConfigChange }) {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const [startDate, setStartDate] = useState(dateKey(monthStart));
  const [endDate, setEndDate] = useState(dateKey(today));
  const [chartMetric, setChartMetric] = useState("tips");
  const [selectedBar, setSelectedBar] = useState(null);
  const [selectedBoxIds, setSelectedBoxIds] = useState([activeBoxId]);
  const [combinedView, setCombinedView] = useState(false);
  const setRange = (start, end) => { setStartDate(dateKey(start)); setEndDate(dateKey(end)); setSelectedBar(null); };
  const shortcut = (name) => {
    const current = new Date();
    if (name === "hoy") return setRange(current, current);
    if (name === "ayer") { const day = new Date(current); day.setDate(day.getDate() - 1); return setRange(day, day); }
    if (name === "semana") { const day = new Date(current); day.setDate(day.getDate() - ((day.getDay() + 6) % 7)); return setRange(day, current); }
    if (name === "mes") return setRange(new Date(current.getFullYear(), current.getMonth(), 1), current);
    setRange(new Date(current.getFullYear(), current.getMonth() - 1, 1), new Date(current.getFullYear(), current.getMonth(), 0));
  };
  const availableHistories = boxes.map((box) => ({ box, rows: Array.isArray(boxHistories?.[box.id]) ? boxHistories[box.id] : box.id === activeBoxId ? history : [] }));
  const selectedHistories = availableHistories.filter(({ box }) => selectedBoxIds.includes(box.id));
  const filterRows = (rows) => rows.filter((caja) => { const date = new Date(caja.date); return date >= new Date(`${startDate}T00:00:00`) && date <= new Date(`${endDate}T23:59:59`); });
  const combinedRows = selectedHistories.flatMap(({ rows }) => filterRows(rows));
  const filtered = combinedRows;
  const groupsFor = (rows) => ["Mañana", "Tarde", "Noche"].map((shift) => ({ shift, rows: rows.filter((caja) => caja.shift === shift) }));
  const totalGroup = { shift: "Total", rows: combinedRows };
  const summarize = (rows) => rows.reduce((total, caja) => {
    const values = statisticsFor(caja, config, activeBoxId);
    Object.keys(values).forEach((key) => { if (key !== "expensesByCategory") total[key] = (total[key] || 0) + (typeof values[key] === "number" ? values[key] : 0); });
    Object.entries(values.expensesByCategory).forEach(([key, value]) => { total.expensesByCategory[key] = (total.expensesByCategory[key] || 0) + value; });
    return total;
  }, { expensesByCategory: {} });
  const groups = groupsFor(combinedRows);
  const makeSummaries = (rows) => groupsFor(rows).map((group) => ({ ...group, values: summarize(group.rows) })).concat({ shift: "Total", rows, values: summarize(rows) });
  const summarySets = (combinedView ? [{ box: { id: "combined", title: "Suma seleccionadas" }, rows: combinedRows }] : selectedHistories.map(({ box, rows }) => ({ box, rows: filterRows(rows) }))).map(({ box, rows }) => ({ box, summaries: makeSummaries(rows) }));
  const summaries = summarySets[0]?.summaries || makeSummaries([]);
  const total = summarize(totalGroup.rows) || { expensesByCategory: {} };
  const statistics = config.statistics || { employees: 1, proportionalPercent: 100 };
  const employees = number(statistics.employees) || 1;
  const percent = number(statistics.proportionalPercent);
  const updateStatistics = (patch) => onConfigChange({ ...config, statistics: { ...statistics, ...patch } });
  const metricOptions = [{ key: "tips", label: "Propinas" }, { key: "found", label: "Encontrado" }, { key: "granted", label: "Bonos otorgados" }, { key: "expenses", label: "Salidas" }, { key: "ta", label: "Cargas T.A." }];
  const chartRows = summaries.map((group) => ({ label: group.shift, value: group.values?.[chartMetric] || 0 }));
  const maxChart = Math.max(...chartRows.map((row) => row.value), 1);
  const metrics = [{ label: "Propinas", key: "tips" }, { label: "Dinero encontrado", key: "found" }, { label: "Redondeo", key: "rounding" }, { label: "Bonos otorgados", key: "granted" }, { label: "Bonos recuperados", key: "recovered" }, { label: "Bonos netos", key: "bonusesNet" }, { label: "Traspasos", key: "transfers" }, { label: "Cargas T.A.", key: "ta" }, { label: "Caja inicial", key: "cashInitial" }, { label: "Caja final", key: "cashFinal" }, { label: "Saldo", key: "balance" }, { label: "Pre diferencia", key: "preDifference" }, { label: "Diferencia", key: "difference" }, { label: "Diferencia caja", key: "cashDifference" }, { label: "Diferencia real", key: "realDifference" }];
  return <main className="statistics-page">
    <section className="panel statistics-toolbar"><div><h2><BarChart3 size={18} /> Estadísticas</h2><span>{filtered.length} turnos dentro del período</span></div><div className="statistics-boxes"><strong>Cajas</strong>{boxes.map((box) => <label key={box.id}><input type="checkbox" checked={selectedBoxIds.includes(box.id)} onChange={() => setSelectedBoxIds((current) => current.includes(box.id) ? current.filter((id) => id !== box.id) : [...current, box.id])} />{box.title}</label>)}</div><label className="statistics-combined"><input type="checkbox" checked={combinedView} onChange={(event) => setCombinedView(event.target.checked)} /> Suma seleccionadas</label><div className="statistics-dates"><label>Desde<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Hasta<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div><div className="statistics-shortcuts">{[["hoy", "Hoy"], ["ayer", "Ayer"], ["semana", "Semana actual"], ["mes", "Mes actual"], ["anterior", "Mes anterior"]].map(([key, label]) => <button type="button" key={key} onClick={() => shortcut(key)}>{label}</button>)}</div></section>
    {summarySets.map(({ box, summaries: boxSummaries }) => <section className="statistics-box-section" key={box.id}><h2 className="statistics-box-title">{box.title}</h2><section className="statistics-grid">{boxSummaries.map((group) => <section className={`panel statistics-shift ${group.shift === "Total" ? "statistics-total" : ""}`} key={`${box.id}-${group.shift}`}><div className="statistics-shift-head"><h2>{group.shift}</h2><span>{group.rows.length} turnos</span></div><div className="statistics-metrics">{metrics.map((metric) => <div key={metric.key}><span>{metric.label}</span><b>{money(group.values[metric.key])}</b></div>)}</div><div className="statistics-expenses"><strong>Desglose de salidas</strong>{Object.entries(group.values.expensesByCategory).map(([category, value]) => <span key={category}>{category}<b>{money(value)}</b></span>)}{!Object.keys(group.values.expensesByCategory).length && <small>Sin salidas</small>}</div></section>)}</section></section>)}
    <section className="statistics-visuals"><section className="panel statistics-chart"><div className="statistics-chart-head"><div><h2>Comparativa por turno</h2><span>Seleccioná una métrica y una barra</span></div><select value={chartMetric} onChange={(event) => { setChartMetric(event.target.value); setSelectedBar(null); }}>{metricOptions.map((metric) => <option value={metric.key} key={metric.key}>{metric.label}</option>)}</select></div><div className="statistics-bars">{chartRows.map((row) => <button type="button" className={selectedBar === row.label ? "selected" : ""} key={row.label} onClick={() => setSelectedBar(row.label)}><span className="statistics-bar-value">{money(row.value)}</span><i style={{ height: `${Math.max(4, row.value / maxChart * 150)}px` }} /><small>{row.label}</small></button>)}</div>{selectedBar && <p className="statistics-chart-detail">{selectedBar}: <b>{money(chartRows.find((row) => row.label === selectedBar)?.value)}</b></p>}</section><section className="panel statistics-tips"><div className="statistics-chart-head"><div><h2>Totalizador de propinas</h2><span>Valores guardados en configuración</span></div><Coins size={18} /></div><div className="statistics-tip-total"><span>Total de propinas</span><strong>{money(total.tips)}</strong></div><div className="statistics-tip-fields"><label>Empleados<input type="number" min="1" step="1" value={statistics.employees ?? 1} onChange={(event) => updateStatistics({ employees: Math.max(1, number(event.target.value)) })} /></label><label>Propinas c/u<strong>{money(total.tips / employees)}</strong></label><label>% proporcional<input type="number" min="0" max="100" step="1" value={statistics.proportionalPercent ?? 100} onChange={(event) => updateStatistics({ proportionalPercent: Math.min(100, Math.max(0, number(event.target.value))) })} /></label><label>Proporcional c/u<strong>{money(total.tips / employees * percent / 100)}</strong></label></div></section></section>
  </main>;
}

function SummaryCard({ caja, calculations, update }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const metric = (label, value, className = "", valueClass = "") => (
    <div className={className}>
      <span>{label}</span>
      <b className={valueClass}>{money(value)}</b>
    </div>
  );
  return (
    <aside className="summary-card">
      <div className="summary-head">
        <div>
          <span className="eyebrow">Resumen</span>
        </div>
        <div className="summary-actions">
          <button className="icon-button" title="Ver resumen avanzado" onClick={() => setAdvancedOpen(true)}>
            <Eye size={16} />
          </button>
          <span className={`status-badge ${caja.status === "CERRADA" ? "closed" : "open"}`}>
            <span /> {caja.status}
          </span>
        </div>
      </div>
      <div className="main-result">
        <span>Sobrante / Faltante</span>
        <strong className={calculations.shortage < 0 ? "negative" : calculations.shortage > 0 ? "positive" : "neutral"}>
          {calculations.shortage >= 0 ? "+" : ""}{money(calculations.shortage)}
        </strong>
      </div>
      <div className="metric-list">
        <div className="editable-summary-metric">
          <span>Caja inicial</span>
          <span className="readonly-amount">{money(caja.cashInitial)}</span>
        </div>
        {metric("Caja final", calculations.cashFinal)}
        {metric("Diferencia caja", calculations.cashDifference, "", calculations.cashDifference >= 0 ? "positive" : "negative")}
        {metric("Diferencia real", calculations.realDifference, "", calculations.realDifference >= 0 ? "positive" : "negative")}
      </div>
      <div className="found-money">
        <label>Redondeo</label>
        <AmountInput
          value={caja.found}
          className={number(caja.found) !== 0 ? "has-value" : ""}
          onChange={(value) => update({ found: value })}
        />
      </div>
      {advancedOpen && (
        <div className="modal-backdrop" onClick={() => setAdvancedOpen(false)}>
          <div className="modal advanced-summary-modal" onClick={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setAdvancedOpen(false)} title="Cerrar resumen avanzado"><X size={18} /></button>
            <div className="modal-icon"><Banknote size={22} /></div>
            <h2>Resumen Avanzado</h2>
            <p>Detalle completo de los valores calculados para este turno.</p>
            <div className="advanced-summary-list">
              {metric("Sobrante / Faltante", calculations.shortage, "highlight")}
              <div className="editable-summary-metric">
                <span>Caja inicial</span>
                <span className="readonly-amount">{money(caja.cashInitial)}</span>
              </div>
              {metric("Caja final", calculations.cashFinal)}
              {metric("Pre diferencia", calculations.preDifference)}
              {metric("Diferencia", calculations.difference)}
              {metric("Saldo", calculations.balance)}
              {metric("Redondeo", caja.found)}
              {metric("Diferencia caja", calculations.cashDifference, "", calculations.cashDifference >= 0 ? "positive" : "negative")}
              {metric("Diferencia real", calculations.realDifference, "", calculations.realDifference >= 0 ? "positive" : "negative")}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function HistoryModal({ history, onClose, onSelect, config, activeBoxId }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal history-modal" onClick={(event) => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose} title="Cerrar historial"><X size={18} /></button>
        <div className="modal-icon"><Clock3 size={22} /></div>
        <h2>Cajas recientes</h2>
        <p>Consultá los últimos turnos y sus cierres.</p>
        <div className="history-modal-list">
          {history.map((item, index) => (
            <button type="button" className={`history-item ${index === 0 ? "current" : ""}`} key={item.id} onClick={() => onSelect(index)}>
              <div>
                <b>Turno {item.shift}</b>
                <span>{new Date(item.date).toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" })} · {item.status === "ABIERTA" ? "Actual" : "Cerrada"}</span>
              </div>
              <strong>{money(item.cashFinal ?? 0)} <em className={realDifferenceFor(item, config, activeBoxId) >= 0 ? "positive" : "negative"}>/ {realDifferenceFor(item, config, activeBoxId) >= 0 ? "+" : "-"}{money(Math.abs(realDifferenceFor(item, config, activeBoxId)))}</em></strong>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LegacyReportCard({ caja, calculations, snapshotRef, config, boxes, activeBox }) {
  const wallets = config.accounts.wallets;
  const totalRows = (rows, kind) => rows.reduce((sum, row) => {
    const expense = kind === "expenses" && config.expenses.find((item) => item.name === row.category);
    return sum + number(row.amount) * (expense?.inverted ? -1 : 1);
  }, 0);
  const accountGroups = ["Normal", "Depósitos", "Compartidas"].map((category) => {
    const categoryWallets = wallets.filter((wallet) => caja.accounts.some((row) => (config.accounts.walletSettings[row.holder]?.[wallet]?.category || "Normal") === category && config.accounts.availability[row.holder]?.[wallet] !== false && number(row.values[wallet]) !== 0));
    const rows = caja.accounts.filter((row) => categoryWallets.some((wallet) => number(row.values[wallet]) !== 0));
    return { category, wallets: categoryWallets, rows };
  });
  const movements = [
    ["Gastos", caja.expenses, "expenses"],
    ["Propinas", caja.tips, "tips"],
    ["Cargas T.A.", caja.ta, "ta"],
  ];
  const detailFor = (row, kind) => kind === "expenses" ? [row.category, row.user, row.notes] : [row.user, row.notes].filter(Boolean);
  const timeFor = (value) => value ? new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(value)) : "--:--:--";
  const shiftStart = { Noche: 0, Mañana: 8, Tarde: 16 }[caja.shift] ?? 0;
  const bonusSlots = Array.from({ length: 4 }, (_, slot) => {
    const start = (shiftStart + slot * 2) % 24;
    const end = (start + 2) % 24;
    const items = caja.bonuses.slice().reverse().filter((bonus) => {
      const date = new Date(bonus.createdAt);
      const elapsed = (date.getHours() * 60 + date.getMinutes() - shiftStart * 60 + 1440) % 1440;
      return Math.floor(elapsed / 120) === slot;
    });
    return { label: `${String(start).padStart(2, "0")}:00 - ${String(end).padStart(2, "0")}:00`, items };
  });
  const generatedAt = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());
  const signedMoney = (value) => `${value >= 0 ? "+" : "-"}${money(Math.abs(value))}`;
  const grantedTotal = caja.bonuses.reduce((sum, bonus) => sum + number(bonus.granted), 0);
  const recoveredTotal = caja.bonuses.reduce((sum, bonus) => sum + number(bonus.recovered), 0);
  const foundRecords = Array.isArray(caja.foundMoney) ? caja.foundMoney : number(caja.found) ? [{ id: "legacy-found", amount: caja.found }] : [];
  const metric = (label, value, highlight = false) => <div className={`report-metric ${highlight ? "highlight" : ""}`}><span>{label}</span><b className={value > 0 ? "positive" : value < 0 ? "negative" : "neutral"}>{label === "Sobrante / Faltante" && value >= 0 ? "+" : ""}{money(value)}</b></div>;
  return (
    <div ref={snapshotRef} className="snapshot-export report-card" style={boxColorStyle(activeBox?.color)}>
      <header className="report-header">
        <div className="report-brand"><span className="report-brand-mark"><Banknote size={22} /></span><div><strong>CAJA<span>flow</span></strong><small>Reporte de cierre de caja</small></div></div>
        <div className="report-period"><b>Turno {caja.shift}</b><span>{caja.shift === "Noche" ? "00:00 - 08:00" : caja.shift === "Mañana" ? "08:00 - 16:00" : "16:00 - 00:00"}</span><small>{new Date(caja.date).toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</small></div>
      </header>
      <section className="report-kpis">
        {metric("Caja inicial", calculations.cashInitial)}
        {metric("Caja final", calculations.cashFinal, true)}
        {metric("Pre-diferencia", calculations.preDifference)}
        {metric("Sobrante / Faltante", calculations.shortage, true)}
        {metric("Diferencia caja", calculations.cashDifference)}
        {metric("Diferencia real", calculations.realDifference, true)}
        {metric("Redondeo", caja.found)}
      </section>
      <main className="report-body">
        <div className="report-main-column">
          <section className="report-block report-accounts"><div className="report-block-head"><h2><WalletCards size={17} /> Matriz de cuentas</h2><span>{accountGroups.reduce((sum, group) => sum + group.rows.length, 0)} titulares con saldo</span></div>
            {accountGroups.map((group) => <div className="report-account-group" key={group.category}><h3>{group.category === "Normal" ? "Cuentas base" : `Billeteras ${group.category}`}</h3>{group.rows.length === 0 ? <p className="report-empty">Sin saldos en este grupo</p> : <table><thead><tr><th>Titular</th>{group.wallets.map((wallet) => <th key={wallet}>{wallet}</th>)}<th>Total</th></tr></thead><tbody>{group.rows.map((row) => <tr key={`${group.category}-${row.holder}`}><th>{row.holder}</th>{group.wallets.map((wallet) => { const value = number(row.values[wallet]); const state = row.verified?.[wallet]; const stateClass = typeof state === "object" ? (state.collections && state.withdrawals ? "both" : state.collections ? "collections" : state.withdrawals ? "withdrawals" : "") : state ? "collections" : ""; return <td className={stateClass} key={wallet}>{money(value)}</td>; })}<td>{money(group.wallets.reduce((sum, wallet) => sum + number(row.values[wallet]), 0))}</td></tr>)}</tbody></table>}</div>)}
          </section>
          <section className="report-block report-chips"><div className="report-block-head"><h2><Ticket size={17} /> Control de fichas</h2><span>{caja.chips.length} plataformas</span></div><div className="report-chip-grid"><div>Plataforma</div><div>Inicial</div><div>Final</div><div>Saldo</div>{caja.chips.map((chip) => { const balance = number(chip.initial) - number(chip.final); return <React.Fragment key={chip.platform}><b>{chip.platform}</b><span>{money(chip.initial)}</span><span>{money(chip.final)}</span><strong className={balance >= 0 ? "positive" : "negative"}>{signedMoney(balance)}</strong></React.Fragment>; })}</div></section>
        </div>
        <aside className="report-side-column">
          {movements.map(([title, rows, kind]) => <section className="report-block report-operation" key={title}><div className="report-block-head"><h2>{kind === "expenses" ? <ReceiptText size={16} /> : kind === "tips" ? <Coins size={16} /> : <ArrowDownToLine size={16} />} {title}</h2><span>{rows.length} registros</span></div><div className="report-list">{rows.length === 0 ? <p className="report-empty">Sin registros</p> : rows.map((row) => <div className="report-list-row" key={row.id}><span><small>[{timeFor(row.createdAt)}]</small> {detailFor(row, kind).filter(Boolean).join(" · ") || "Sin detalle"}</span><b>{money(row.amount)}</b></div>)}</div><strong className="report-total">Total <b>{money(totalRows(rows, kind))}</b></strong></section>)}
          <section className="report-block report-operation"><div className="report-block-head"><h2><Banknote size={16} /> Dinero encontrado</h2><span>{foundRecords.length} registros</span></div>{foundRecords.length === 0 ? <p className="report-empty">Sin registros</p> : <div className="report-list">{foundRecords.map((record) => <div className="report-list-row" key={record.id}><span><small>[{timeFor(record.createdAt)}]</small> {[record.holder, record.wallet, record.note].filter(Boolean).join(" · ") || "Sin detalle"}</span><b>{money(record.amount)}</b></div>)}</div>}</section>
          <section className="report-block report-operation"><div className="report-block-head"><h2><ArrowLeftRight size={16} /> Traspasos</h2><span>{(caja.transfers || []).length} registros</span></div>{(caja.transfers || []).length === 0 ? <p className="report-empty">Sin registros</p> : <div className="report-list">{caja.transfers.map((transfer) => <div className="report-list-row" key={transfer.id}><span><small>[{timeFor(transfer.createdAt)}]</small> {boxes.find((box) => box.id === transfer.fromBoxId)?.title || "Caja"} → {boxes.find((box) => box.id === transfer.toBoxId)?.title || "Caja"}{transfer.note ? ` · ${transfer.note}` : ""}</span><b>{money(transfer.amount)}</b></div>)}</div>}</section>
          <section className="report-block report-operation report-bonus-block"><div className="report-block-head"><h2><Gift size={16} /> Bonos</h2><span>{caja.bonuses.length} movimientos</span></div><div className="report-bonus-summary"><span>Otorgados <b>{money(grantedTotal)}</b></span><span>Recuperados <b>{money(recoveredTotal)}</b></span><strong>Neto <b>{money(calculations.bonuses)}</b></strong></div><div className="report-bonus-timeline">{bonusSlots.map((slot) => <div className="report-bonus-slot" key={slot.label}><h3>{slot.label}</h3><div>{slot.items.length === 0 ? <p className="report-empty">Sin movimientos</p> : slot.items.map((bonus) => <span className={number(bonus.recovered) > 0 ? "recovered" : "granted"} key={bonus.id}><small>{timeFor(bonus.createdAt).slice(0, 5)}</small>{number(bonus.recovered) > 0 ? "REC" : "OTO"} {money(number(bonus.recovered) || number(bonus.granted))}</span>)}</div><strong>{money(slot.items.reduce((sum, bonus) => sum + number(bonus.granted) - number(bonus.recovered), 0))}</strong></div>)}</div></section>
        </aside>
      </main>
      {(caja.notes?.trim() || caja.nextNotes?.trim()) && <footer className="report-footer"><div><h2><FileText size={16} /> Notas del turno</h2>{caja.notes?.trim() && <p><strong>Turno actual</strong>{caja.notes}</p>}{caja.nextNotes?.trim() && <p><strong>Turno siguiente</strong>{caja.nextNotes}</p>}</div><small>Generado el {generatedAt} hs</small></footer>}
      {!caja.notes?.trim() && !caja.nextNotes?.trim() && <footer className="report-footer report-footer-minimal"><small>Generado el {generatedAt} hs</small></footer>}
    </div>
  );
}

function SnapshotView({ caja, calculations, snapshotRef, config, boxes, activeBox }) {
  return <CajaReportCardFinal data={{ caja, calculations, config, boxes, activeBox }} snapshotRef={snapshotRef} />;
}

function LogisticsPage({ caja, config, boxes, activeBoxId, onUpdateAccounts, onAssignWallet, onConfigChange }) {
  const logistics = config.logistics || { order: [], hidden: [], added: [] };
  const accounts = caja.accounts || [];
  const keyFor = (holder, wallet) => `${holder}::${wallet}`;
  const candidates = accounts.flatMap((row) => config.accounts.wallets.filter((wallet) => config.accounts.availability[row.holder]?.[wallet] !== false).map((wallet) => {
    const setting = config.accounts.walletSettings[row.holder]?.[wallet] || { category: "Normal" };
    const mode = config.accounts.walletModes?.[wallet] || "Cobros + Retiros";
    return { key: keyFor(row.holder, wallet), holder: row.holder, wallet, category: setting.category === "Compartidas" ? "Compartidas" : mode === "Solo Depósito" ? "Depósitos" : setting.category || "Normal", mode, row };
  }));
  const included = candidates.filter((item) => ["Cobros + Retiros", "Solo Cobros"].includes(item.mode) || logistics.added.includes(item.key));
  const orderIndex = (key) => logistics.order.indexOf(key);
  const ordered = included.slice().sort((first, second) => {
    const firstOrder = orderIndex(first.key);
    const secondOrder = orderIndex(second.key);
    return (firstOrder < 0 ? Number.MAX_SAFE_INTEGER : firstOrder) - (secondOrder < 0 ? Number.MAX_SAFE_INTEGER : secondOrder);
  });
  const grouped = ["Normal", "Depósitos", "Compartidas"].map((category) => ({ category, rows: ordered.filter((item) => item.category === category && !logistics.hidden.includes(item.key)) })).filter((group) => group.rows.length);
  const hiddenItems = ordered.filter((item) => logistics.hidden.includes(item.key));
  const hidden = (key) => logistics.hidden.includes(key);
  const saveLogistics = (patch) => onConfigChange({ ...config, logistics: { ...logistics, ...patch } });
  const toggleHidden = (key) => saveLogistics({ hidden: hidden(key) ? logistics.hidden.filter((item) => item !== key) : [...logistics.hidden, key] });
  const reorder = (category, key, targetKey) => {
    const keys = ordered.filter((item) => item.category === category).map((item) => item.key);
    const from = keys.indexOf(key);
    const to = keys.indexOf(targetKey);
    if (from < 0 || to < 0 || from === to) return;
    keys.splice(from, 1); keys.splice(to, 0, key);
    const otherKeys = ordered.filter((item) => item.category !== category).map((item) => item.key);
    saveLogistics({ order: [...otherKeys, ...keys] });
  };
  const addable = candidates.filter((item) => !["Cobros + Retiros", "Solo Cobros"].includes(item.mode) && !logistics.added.includes(item.key));
  const addWallet = (event) => {
    const key = event.target.value;
    if (!key) return;
    saveLogistics({ added: [...logistics.added, key], hidden: logistics.hidden.filter((item) => item !== key) });
    event.target.value = "";
  };
  const stateFor = (row, wallet) => {
    const state = row.verified?.[wallet];
    return typeof state === "object" ? state : { collections: Boolean(state), withdrawals: false };
  };
  const dateValue = (value) => value ? new Date(value).getTime() : 0;
  const restartFor = (item) => {
    const state = stateFor(item.row, item.wallet);
    if (item.row.walletRestartAt?.[item.wallet]) return item.row.walletRestartAt[item.wallet];
    if (state.lastRestartAt) return state.lastRestartAt;
    return [state.lastCollectionsAt, state.lastWithdrawalsAt, item.row.walletBoxUpdatedAt?.[item.wallet]].sort((first, second) => dateValue(second) - dateValue(first))[0];
  };
  const restartTone = (value) => {
    if (!value) return "";
    const date = new Date(value); const today = new Date();
    const day = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return day === todayDay ? "today" : day === todayDay - 86400000 ? "yesterday" : "";
  };
  const formatRestart = (value) => value ? new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value)) : "1/1/2026 0:00:00";
  const restartInputValue = (value) => {
    if (!value) return "";
    const date = new Date(value);
    const pad = (part) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const updateRestart = (item, value) => {
    if (!value) return;
    const restart = new Date(value).toISOString();
    onUpdateAccounts(accounts.map((account) => account.holder !== item.holder ? account : { ...account, walletRestartAt: { ...(account.walletRestartAt || {}), [item.wallet]: restart } }));
  };
  const updateState = (item, flag) => {
    const state = stateFor(item.row, item.wallet);
    const nextState = { ...state, [flag]: !state[flag] };
    const restartedAt = new Date().toISOString();
    if (!nextState[flag]) nextState[`last${flag === "collections" ? "Collections" : "Withdrawals"}At`] = restartedAt;
    const nextAccounts = accounts.map((account) => account.holder !== item.holder ? account : { ...account, walletRestartAt: { ...(account.walletRestartAt || {}), [item.wallet]: restartedAt }, verified: { ...(account.verified || {}), [item.wallet]: nextState } });
    onUpdateAccounts(nextAccounts);
  };
  return <main className="logistics-page">
    <section className="panel logistics-panel">
      <SectionHead icon={<WalletCards size={18} />} title="Ruta de Cuentas" action={<select className="logistics-add" onChange={addWallet} value=""><option value="">Agregar billetera...</option>{addable.map((item) => <option key={item.key} value={item.key}>{item.holder} · {item.wallet}</option>)}</select>} />
      <div className="logistics-board">
      <div className="logistics-head"><span>En uso</span><span>Pagos</span><span>Cuenta</span><span>Billetera</span><span>Aclaración</span><span>Último R. Uso</span><span>Último R. Retiros</span><span>Último R. Caja</span><span>Último Reinicio</span><span /></div>
      {grouped.map((group) => <React.Fragment key={group.category}><div className="logistics-group">Billeteras {group.category}</div>{group.rows.map((item) => { const state = stateFor(item.row, item.wallet); const box = boxes.find((candidate) => candidate.id === item.row.walletBoxes?.[item.wallet]); const restart = restartFor(item); const tone = restartTone(restart); return <div className={`logistics-row ${state.collections && state.withdrawals ? "both" : state.collections ? "collections" : state.withdrawals ? "withdrawals" : ""} ${tone}`} key={item.key} draggable onDragStart={(event) => event.dataTransfer.setData("text/plain", item.key)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => reorder(group.category, event.dataTransfer.getData("text/plain"), item.key)}>{item.category === "Depósitos" ? <><span className="logistics-check-empty" /><span className="logistics-check-empty" /></> : <><label className="logistics-check"><input type="checkbox" checked={Boolean(state.collections)} onChange={() => updateState(item, "collections")} /><span /></label><label className="logistics-check"><input type="checkbox" checked={Boolean(state.withdrawals)} onChange={() => updateState(item, "withdrawals")} /><span /></label></>}<b>{item.holder}</b><strong>{item.wallet}</strong><span>{item.category === "Depósitos" ? "Únicamente enviar como depósito" : item.category === "Compartidas" ? "Máximo 500k · (Depósitos o Pagos Grandes)" : `Máximo 250k · ${item.mode === "Solo Cobros" ? "Cobros" : "Pagos"}`}</span><time>{formatRestart(state.lastCollectionsAt)}</time><time>{formatRestart(state.lastWithdrawalsAt)}</time><div className="logistics-box-selector">{item.category === "Depósitos" || item.category === "Compartidas" ? <WalletAssignmentSelector boxes={boxes} value={item.row.walletBoxes?.[item.wallet] || ""} onChange={(boxId) => onAssignWallet(item.holder, item.wallet, boxId)} /> : <span className="logistics-box-placeholder">-</span>}</div><input type="datetime-local" className="logistics-restart-input" value={restartInputValue(restart)} onChange={(event) => updateRestart(item, event.target.value)} aria-label={`Último reinicio de ${item.holder} ${item.wallet}`} /><button className="logistics-hide" title={hidden(item.key) ? "Mostrar billetera" : "Ocultar billetera"} onClick={() => toggleHidden(item.key)}><Eye size={14} /></button></div>; })}</React.Fragment>)}
      {hiddenItems.length > 0 && <div className="logistics-hidden"><span>Ocultas</span>{hiddenItems.map((item) => <button key={item.key} onClick={() => toggleHidden(item.key)}>{item.holder} · {item.wallet}</button>)}</div>}
    </div>
    </section>
  </main>;
}

function LegacySnapshotView({ caja, calculations, snapshotRef, config, boxes, activeBox }) {
  const wallets = config.accounts.wallets;
  const walletGroups = ["Normal", "Depósitos", "Compartidas"].map((category) => ({
    category,
    rows: caja.accounts.filter((row) => wallets.some((wallet) => (config.accounts.walletSettings[row.holder]?.[wallet]?.category || "Normal") === category && config.accounts.availability[row.holder]?.[wallet] !== false)),
  })).filter((group) => group.rows.length);
  const totalRows = (rows, kind) => rows.reduce((sum, row) => {
    const expense = kind === "expenses" && config.expenses.find((item) => item.name === row.category);
    return sum + number(row.amount) * (expense?.inverted ? -1 : 1);
  }, 0);
  const shortDate = new Date(caja.date).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const capitalizedDate = shortDate.charAt(0).toUpperCase() + shortDate.slice(1);
  const movementRows = [
    ["Gastos", "ReceiptText", caja.expenses, "expenses"],
    ["Propinas", "Coins", caja.tips, "tips"],
    ["Cargas T.A.", "ArrowDownToLine", caja.ta, "ta"],
  ];
  const stateFor = (row, wallet) => {
    const state = row.verified?.[wallet];
    return typeof state === "object"
      ? state
      : { collections: Boolean(state), withdrawals: false };
  };
  const isWalletAvailable = (row, wallet) => config.accounts.availability[row.holder]?.[wallet] !== false;
  const rowWalletTotal = (row, category) => wallets.reduce((sum, wallet) => sum + (config.accounts.walletSettings[row.holder]?.[wallet]?.category === category && walletBelongsToBox(row, wallet, config, activeBox?.id) ? number(row.values[wallet]) : 0), 0);
  const walletTotal = (wallet) => caja.accounts.reduce((sum, row) => sum + (walletBelongsToBox(row, wallet, config, activeBox?.id) ? number(row.values[wallet]) : 0), 0);
  return (
    <div ref={snapshotRef} className="snapshot-export" style={boxColorStyle(activeBox?.color)}>
      <div className="snapshot-title">
        <h1><strong>Turno {caja.shift} <em>/</em> {caja.shift === "Noche" ? "00:00 - 08:00" : caja.shift === "Mañana" ? "08:00 - 16:00" : "16:00 - 00:00"}</strong></h1>
        <p>{capitalizedDate}</p>
      </div>
      <div className="snapshot-summary">
        {[
          ["Sobrante / Faltante", calculations.shortage, "primary"],
          ["Caja inicial", calculations.cashInitial],
          ["Caja final", calculations.cashFinal],
          ["Pre diferencia", calculations.preDifference],
          ["Diferencia", calculations.difference],
          ["Saldo", calculations.balance],
          ["Redondeo", caja.found],
          ["Diferencia caja", calculations.cashDifference],
          ["Diferencia real", calculations.realDifference],
        ].map(([label, value, className = ""]) => (
          <div className={`${className} ${value < 0 ? "negative" : value > 0 ? "positive" : "neutral"}`} key={label}>
            <small>{label}</small>
            <b>{label === "Sobrante / Faltante" && value >= 0 ? "+" : ""}{money(value)}</b>
          </div>
        ))}
      </div>
      <section className="snapshot-panel">
        <h2><WalletCards size={16} /> Matriz de cuentas <small>{caja.accounts.length} titulares · {wallets.length} billeteras</small></h2>
        <table><thead><tr><th>Caja</th>{wallets.map((wallet) => <th className={walletModeClass(config, wallet)} key={wallet}>{wallet}</th>)}<th>Total</th></tr></thead><tbody>
          {walletGroups.flatMap((group) => [group.category !== "Normal" && <tr className="wallet-section-row" key={`${group.category}-title`}><th colSpan={wallets.length + 2}>{`Billeteras ${group.category}`}</th></tr>, ...group.rows.map((row) => <tr key={`${group.category}-${row.holder}`}><th>{row.holder}</th>{wallets.map((wallet) => { const state = stateFor(row, wallet); const stateClass = state.collections && state.withdrawals ? "both" : state.collections ? "collections" : state.withdrawals ? "withdrawals" : ""; const available = config.accounts.walletSettings[row.holder]?.[wallet]?.category === group.category && isWalletAvailable(row, wallet); const valueClass = !available ? "zero-value" : number(row.values[wallet]) !== 0 ? "has-money" : "zero-value"; return <td className={`${valueClass} ${stateClass}`} key={wallet}>{available && <><span>{money(row.values[wallet])}</span><i>{state.collections ? "✓" : ""}{state.withdrawals ? "✓" : ""}</i></>}</td>; })}<td>{money(rowWalletTotal(row, group.category))}</td></tr>)])}
          <tr className="snapshot-wallet-total"><th>Total billetera</th>{wallets.map((wallet) => <th key={wallet}>{money(walletTotal(wallet))}</th>)}<th>{money(wallets.reduce((sum, wallet) => sum + walletTotal(wallet), 0))}</th></tr>
        </tbody></table>
      </section>
      <div className="snapshot-grid">
        {movementRows.map(([title, icon, rows, kind]) => <section className="snapshot-panel" key={title}><h2>{icon === "ReceiptText" ? <ReceiptText size={16} /> : icon === "Coins" ? <Coins size={16} /> : <ArrowDownToLine size={16} />} {title} <small>{rows.length} registros</small></h2><div className="snapshot-list">{rows.map((row) => <div className="snapshot-line" key={row.id}><span>{(kind === "expenses" ? [row.category, row.notes] : [row.user, row.notes]).filter(Boolean).join(" · ")}</span><b>{money(row.amount)}</b></div>)}</div><div className="snapshot-total"><span>Total</span><b>{money(totalRows(rows, kind))}</b></div></section>)}
        <section className="snapshot-panel snapshot-bonuses"><h2><Gift size={16} /> Bonos <small>{caja.bonuses.length} movimientos</small></h2><div className="snapshot-subtitle">Últimos bonos</div><div className="snapshot-list">{caja.bonuses.map((bonus) => <div className={`snapshot-line ${bonus.recovered > 0 ? "recovered" : "granted"}`} key={bonus.id}><span>{bonus.recovered > 0 ? "Recuperado" : "Otorgado"}</span><b>{money(bonus.recovered || bonus.granted)}</b></div>)}</div><div className="snapshot-bonus-total"><span>Otorgados <b>{money(caja.bonuses.reduce((sum, bonus) => sum + number(bonus.granted), 0))}</b></span><span>Recuperados <b>{money(caja.bonuses.reduce((sum, bonus) => sum + number(bonus.recovered), 0))}</b></span><strong>Neto <b>{money(calculations.bonuses)}</b></strong></div></section>
        <section className="snapshot-panel"><h2><Ticket size={16} /> Control de fichas <small>Plataformas / casino</small></h2><div className="snapshot-chip-head"><span>Plataforma</span><span>Inicial</span><span>Final</span><span>Saldo</span></div><div className="snapshot-list">{caja.chips.map((chip) => <div className="snapshot-chip-row" key={chip.platform}><span>{chip.platform}</span><b>{money(chip.initial)}</b><b>{money(chip.final)}</b><b className={number(chip.initial) - number(chip.final) < 0 ? "negative" : "positive"}>{money(number(chip.initial) - number(chip.final))}</b></div>)}</div><div className="snapshot-total"><span>Total saldo</span><b className={calculations.balance < 0 ? "negative" : "positive"}>{money(calculations.balance)}</b></div></section>
      </div>
      <div className="snapshot-notes-transfer"><section className="snapshot-panel snapshot-notes"><h2>Notas del turno</h2><div className="snapshot-note-block"><strong>Turno actual</strong><p>{caja.notes || ""}</p></div><div className="snapshot-note-block"><strong>Turno siguiente</strong><p>{caja.nextNotes || ""}</p></div></section><section className="snapshot-panel snapshot-transfers"><h2><ArrowLeftRight size={16} /> Traspasos <small>{(caja.transfers || []).length} movimientos</small></h2><div className="snapshot-list">{(caja.transfers || []).map((transfer) => { const outgoing = transfer.fromBoxId === activeBox?.id; const otherBox = boxes.find((box) => box.id === (outgoing ? transfer.toBoxId : transfer.fromBoxId)); return <div className="snapshot-line" key={transfer.id}><span>{outgoing ? "Salida a" : "Entrada de"} {otherBox?.title || "otra caja"}{transfer.note ? ` · ${transfer.note}` : ""}</span><b>{money(transfer.amount)}</b></div>; })}{!(caja.transfers || []).length && <div className="snapshot-line"><span>Sin traspasos todavía</span></div>}</div></section></div>
    </div>
  );
}

function App() {
  const captureRef = React.useRef(null);
  const snapshotRef = React.useRef(null);
  const [caja, setCaja] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [closeWarning, setCloseWarning] = useState(false);
  const [createPreviousOpen, setCreatePreviousOpen] = useState(false);
  const [creatingPrevious, setCreatingPrevious] = useState(false);
  const [createPreviousError, setCreatePreviousError] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [logisticsOpen, setLogisticsOpen] = useState(false);
  const [statisticsOpen, setStatisticsOpen] = useState(false);
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [bonusViewRequest, setBonusViewRequest] = useState(0);
  const [bonusEditorRequest, setBonusEditorRequest] = useState(0);
  const [toast, setToast] = useState("");
  const [apiError, setApiError] = useState("");
  const [config, setConfig] = useState(null);
  const [boxes, setBoxes] = useState(null);
  const [boxHistories, setBoxHistories] = useState({});
  const [activeBoxId, setActiveBoxId] = useState(null);
  const pendingSaveRef = React.useRef(null);
  const saveTimerRef = React.useRef(null);
  const saveInFlightRef = React.useRef(false);
  const [notesEnabled, setNotesEnabled] = useState(true);
  const activeBox = boxes?.find((box) => box.id === activeBoxId) || boxes?.[0];
  const readOnly = caja?.status !== "ABIERTA";
  const isReadOnlyAction = (element) => Boolean(element.closest?.(".modal-close, .ghost-button, button[title^='Ver'], button[title^='Cerrar']"));
  useEffect(() => {
    const content = document.querySelector(".box-content");
    if (!content) return undefined;
    const applyReadOnly = () => {
      content.querySelectorAll("input, textarea, select, button").forEach((element) => {
        element.disabled = readOnly && !isReadOnlyAction(element);
      });
      content.querySelectorAll("[draggable]").forEach((element) => {
        element.draggable = !readOnly;
      });
    };
    applyReadOnly();
    if (!readOnly) return undefined;
    const observer = new MutationObserver(applyReadOnly);
    observer.observe(content, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [readOnly, configurationOpen, statisticsOpen, logisticsOpen, historyOpen, bonusViewRequest, bonusEditorRequest]);
  useEffect(() => {
    setNotesEnabled(true);
  }, [caja?.id]);
  useEffect(() => {
    const submitModalOnEnter = (event) => {
      if (event.key !== "Enter" || event.isComposing) return;
      const modal = event.target.closest?.(".modal") || document.querySelector(".modal:last-of-type");
      const action = modal?.querySelector(".modal-actions button:not(.ghost-button):not([disabled])");
      if (!action || event.target instanceof HTMLTextAreaElement) return;
      event.preventDefault();
      action.click();
    };
    document.addEventListener("keydown", submitModalOnEnter);
    return () => document.removeEventListener("keydown", submitModalOnEnter);
  }, []);
  const notify = (message) => {
    setToast(message);
    clearTimeout(window.toastTimer);
    window.toastTimer = setTimeout(() => setToast(""), 3000);
  };
  useEffect(() => {
    if (!activeBox) return undefined;
    const colors = boxColorStyle(activeBox.color);
    Object.entries(colors).forEach(([name, value]) => document.documentElement.style.setProperty(name, value));
    return undefined;
  }, [activeBox?.color]);
  useEffect(() => {
    api("/api/cajas").then((availableBoxes) => {
      const boxId = availableBoxes[0]?.id;
      setBoxes(availableBoxes);
      setActiveBoxId(boxId);
      return Promise.all([api(`/api/caja/actual?boxId=${boxId}`), api(`/api/caja/historial?boxId=${boxId}`), api(`/api/configuracion?boxId=${boxId}`), ...availableBoxes.map((box) => api(`/api/caja/historial?boxId=${box.id}`))]).then(
      ([current, past, settings, ...allPast]) => {
        setCaja(current);
        setHistory(past);
        setBoxHistories(Object.fromEntries(availableBoxes.map((box, index) => [box.id, allPast[index]])));
        setConfig(settings);
      },
      );
    }).catch((error) => setApiError(error.message));
  }, []);
  const changeBox = (boxId) => {
    setBonusViewRequest(0); setBonusEditorRequest(0); setActiveBoxId(boxId); setSelectedIndex(0); setConfigurationOpen(false); setStatisticsOpen(false); setLogisticsOpen(false); setCaja(null); setConfig(null);
    Promise.all([api(`/api/caja/actual?boxId=${boxId}`), api(`/api/caja/historial?boxId=${boxId}`), api(`/api/configuracion?boxId=${boxId}`), ...boxes.map((box) => api(`/api/caja/historial?boxId=${box.id}`))]).then(([current, past, settings, ...allPast]) => { setCaja(current); setHistory(past); setBoxHistories(Object.fromEntries(boxes.map((box, index) => [box.id, allPast[index]]))); setConfig(settings); });
  };
  useEffect(() => {
    if (!activeBoxId || saving) return undefined;
    let cancelled = false;
    const refresh = async () => {
      const [current, past] = await Promise.all([
        api(`/api/caja/actual?boxId=${activeBoxId}`),
        api(`/api/caja/historial?boxId=${activeBoxId}`),
      ]);
      if (cancelled || current?.error || !Array.isArray(past)) return;
      setHistory(past);
      setCaja(selectedIndex === 0 ? current : past.find((item) => String(item.id) === String(caja?.id)) || current);
    };
    const interval = window.setInterval(refresh, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [activeBoxId, saving, selectedIndex, caja?.id]);
  const assignWallet = async (holder, wallet, boxId) => {
    const result = await api("/api/caja/asignacion-billetera", { method: "PUT", body: JSON.stringify({ holder, wallet, boxId }) });
    if (result.error) return;
    setCaja(result.currents[activeBoxId]);
  };
  const flushSave = async () => {
    if (saveInFlightRef.current || !pendingSaveRef.current) return;
    const queuedSave = pendingSaveRef.current;
    pendingSaveRef.current = null;
    saveInFlightRef.current = true;
    try {
      const savedCaja = await api(`${queuedSave.selectedIndex === 0 ? `/api/caja/actualizar?boxId=${queuedSave.boxId}` : `/api/caja/${queuedSave.cajaId}?boxId=${queuedSave.boxId}`}`, {
        method: "PUT",
        body: JSON.stringify(queuedSave.patch),
      });
      if (!pendingSaveRef.current) setCaja(savedCaja);
    } catch (error) {
      notify(error.message);
    } finally {
      saveInFlightRef.current = false;
      if (pendingSaveRef.current) {
        setSaving(true);
        flushSave();
      } else {
        setSaving(false);
      }
    }
  };
  const update = (patch, immediate = false) => {
    setCaja((current) => ({ ...current, ...patch }));
    pendingSaveRef.current = {
      patch: { ...(pendingSaveRef.current?.patch || {}), ...patch },
      boxId: activeBoxId,
      cajaId: caja?.id,
      selectedIndex,
    };
    setSaving(true);
    clearTimeout(saveTimerRef.current);
    if (immediate) {
      flushSave();
    } else {
      saveTimerRef.current = window.setTimeout(flushSave, 350);
    }
  };
  const updateLogisticsConfig = async (nextConfig) => {
    setConfig(nextConfig);
    const result = await api(`/api/configuracion?boxId=${activeBoxId}`, { method: "PUT", body: JSON.stringify(nextConfig) });
    if (result.config) setConfig(result.config);
  };
  const updateStatisticsConfig = async (nextConfig) => {
    setConfig(nextConfig);
    const result = await api(`/api/configuracion?boxId=${activeBoxId}`, { method: "PUT", body: JSON.stringify(nextConfig) });
    if (result.config) setConfig(result.config);
  };
  const updateAccountsFromLogistics = (accounts) => update({ accounts }, true);
  const saveConfig = async (nextConfig, boxId) => {
    const result = await api(`/api/configuracion?boxId=${boxId}`, { method: "PUT", body: JSON.stringify(nextConfig) });
    if (boxId === activeBoxId) {
      setConfig(result.config);
      setCaja(result.current);
    }
  };
  const manageBoxes = async ({ type, id, patch }) => {
    if (type === "create") { const created = await api("/api/cajas", { method: "POST", body: JSON.stringify({ title: "Nueva caja", color: "blue" }) }); const next = [...boxes, created]; setBoxes(next); changeBox(created.id); return; }
    if (type === "delete") { const next = await api(`/api/cajas/${id}`, { method: "DELETE" }); setBoxes(next); if (id === activeBoxId) changeBox(next[0].id); return; }
    const updated = await api(`/api/cajas/${id}`, { method: "PUT", body: JSON.stringify(patch) }); setBoxes(boxes.map((box) => box.id === id ? updated : box));
  };
  const navigate = (direction) => {
    if (direction > 0 && selectedIndex >= history.length - 1) {
      setCreatePreviousError("");
      setCreatePreviousOpen(true);
      return;
    }
    const nextIndex = Math.max(
      0,
      Math.min(history.length - 1, selectedIndex + direction),
    );
    setSelectedIndex(nextIndex);
    setCaja(history[nextIndex]);
  };
  const createPrevious = async () => {
    setCreatingPrevious(true);
    setCreatePreviousError("");
    try {
      const previous = await api(`/api/caja/crear-anterior?boxId=${activeBoxId}`, { method: "POST" });
      setHistory((currentHistory) => [...currentHistory, previous]);
      setSelectedIndex(history.length);
      setCaja(previous);
      setCreatePreviousOpen(false);
    } catch (error) {
      setCreatePreviousError(error.message);
    } finally {
      setCreatingPrevious(false);
    }
  };
  const calculations = useMemo(() => {
    if (!caja || !config) return {};
    const accounts = caja.accounts
      .flatMap((r) => Object.entries(r.values).filter(([wallet]) => walletBelongsToBox(r, wallet, config, activeBoxId)).map(([, value]) => value))
      .reduce((s, x) => s + number(x), 0);
    const bonuses = caja.bonuses.reduce(
      (s, x) => s + number(x.granted) - number(x.recovered),
      0,
    );
    const ta = caja.ta.reduce((s, x) => s + number(x.amount), 0);
    const tips = caja.tips.reduce((s, x) => s + number(x.amount), 0);
    const expenses = caja.expenses.reduce((s, x) => {
      const category = config.expenses.find((item) => item.name === x.category);
      return s + number(x.amount) * (category?.inverted ? -1 : 1);
    }, 0);
    const balance = caja.chips.reduce(
      (s, x) => s + number(x.initial) - number(x.final),
      0,
    );
    const cashInitial = number(caja.cashInitial);
    const cashFinal = accounts;
    const preDifference = expenses + ta + cashFinal + bonuses;
    const difference = preDifference - cashInitial;
    const cashDifference = cashFinal - cashInitial;
    const transferAdjustment = (caja.transfers || []).reduce((sum, transfer) => sum + (transfer.fromBoxId === activeBoxId ? number(transfer.amount) : transfer.toBoxId === activeBoxId ? -number(transfer.amount) : 0), 0);
    const realDifference = difference - bonuses + transferAdjustment;
    const foundTotal = Array.isArray(caja.foundMoney) ? caja.foundMoney.reduce((sum, record) => sum + number(record.amount), 0) : number(caja.found);
    const shortage = difference - balance - tips + foundTotal + number(caja.found) + transferAdjustment;
    return {
      accounts,
      cashInitial,
      cashFinal,
      bonuses,
      ta,
      tips,
      expenses,
      foundTotal,
      preDifference,
      difference,
      balance,
      cashDifference,
      realDifference,
      transferAdjustment,
      shortage,
    };
  }, [caja, config, activeBoxId]);
  const hasPendingNotes = [caja?.notes, caja?.nextNotes].some((note) => typeof note === "string" && note.trim().length > 0);
  if (apiError) return <div className="loading api-error"><X size={20} /><div><strong>No se pudo cargar la caja</strong><p>{apiError}</p><button className="close-button" onClick={() => window.location.reload()}>Reintentar <RefreshCw size={15} /></button></div></div>;
  if (!caja || !boxes)
    return (
      <div className="loading">
        <RefreshCw className="spin" /> Cargando caja...
      </div>
    );
  if (!config) return <div className="loading"><RefreshCw className="spin" /> Cargando configuración...</div>;
  const close = () =>
    api(`/api/caja/cerrar?boxId=${activeBoxId}`, {
      method: "POST",
      body: JSON.stringify(caja),
    }).then((next) => {
      setCaja(next);
      setHistory([next, ...history]);
      setSelectedIndex(0);
      setConfirm(false);
      notify(`Cerrada Caja del turno ${caja.shift} / ${new Date(caja.date).toLocaleDateString("es-AR")}`);
    });
  const confirmClose = () => {
    if (calculations.shortage !== 0) {
      setConfirm(false);
      setCloseWarning(true);
      return;
    }
    close();
  };
  const downloadSnapshot = async () => {
    if (capturing) return;
    setCapturing(true);
    try {
      await document.fonts.ready;
      await new Promise((resolve) => requestAnimationFrame(resolve));
      if (!snapshotRef.current) throw new Error("No se encontró el reporte para capturar.");
      const canvas = await html2canvas(snapshotRef.current, {
        backgroundColor: "#11121d",
        logging: false,
        scale: 2,
        width: 1920,
        height: 1080,
        useCORS: true,
        windowWidth: 1920,
        windowHeight: 1080,
      });
      const link = document.createElement("a");
      const snapshotDate = new Intl.DateTimeFormat("es-AR", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
      })
        .format(new Date(caja.date))
        .replace(/^./, (letter) => letter.toUpperCase())
        .replace(",", "")
        .replaceAll("/", "-");
      link.download = `Caja ${snapshotDate} Turno ${caja.shift}.png`;
      link.href = canvas.toDataURL("image/png");
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();
      link.remove();
      notify("Captura de caja descargada");
    } catch (error) {
      console.error("No se pudo generar la captura de caja", error);
      notify("No se pudo generar la captura de caja");
    } finally {
      setCapturing(false);
    }
  };
  return (
    <div ref={captureRef} className={`app-shell box-theme-${activeBox.color}`} style={boxColorStyle(activeBox.color)}>
      <SummaryHeader
        caja={caja}
        saving={saving}
        readOnly={readOnly}
        onPrevious={() => navigate(1)}
        onNext={() => navigate(-1)}
        onClose={() => setConfirm(true)}
        onSnapshot={downloadSnapshot}
        capturing={capturing}
        onConfigure={() => setConfigurationOpen(true)}
        boxes={boxes}
        activeBoxId={activeBoxId}
        onBoxChange={changeBox}
      />
      <main>
        <div className="page-title">
          <div className="current-shift-heading">
            <h1>Turno {caja.shift} <em>/</em> {caja.shift === "Noche" ? "00:00 - 08:00" : caja.shift === "Mañana" ? "08:00 - 16:00" : "16:00 - 00:00"}</h1>
            <h2>{new Date(caja.date).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</h2>
          </div>
          <div className="history-actions">
            <button className="history-trigger statistics-trigger" onClick={() => { setStatisticsOpen(!statisticsOpen); setConfigurationOpen(false); setLogisticsOpen(false); setBonusViewRequest(0); setBonusEditorRequest(0); }}><BarChart3 size={16} /> {statisticsOpen ? "Caja" : "Estadísticas"}</button>
            <button className="history-trigger logistics-trigger" onClick={() => { setLogisticsOpen(!logisticsOpen); setConfigurationOpen(false); setStatisticsOpen(false); setBonusViewRequest(0); setBonusEditorRequest(0); }}><WalletCards size={16} /> {logisticsOpen ? "Caja" : "Logística"}</button>
            <button className="history-trigger" onClick={() => setHistoryOpen(true)}><Clock3 size={16} /> Cajas recientes</button>
            <button className="history-trigger" disabled={readOnly} onClick={() => { setConfigurationOpen(!configurationOpen); setStatisticsOpen(false); setLogisticsOpen(false); }}><Settings2 size={16} /> {configurationOpen ? "Caja" : "Configurar"}</button>
            {hasPendingNotes && <span className="pending-notes">Notas Pendientes</span>}
          </div>
        </div>
        <MonthlyGoalProgress config={config} boxColor={activeBox.color} />
        <div className={`box-content ${readOnly ? "read-only" : ""}`} onClickCapture={(event) => { if (readOnly && !isReadOnlyAction(event.target)) { event.preventDefault(); event.stopPropagation(); } }}>
        {configurationOpen ? <ConfigurationPage config={config} boxes={boxes} activeBoxId={activeBoxId} onSave={saveConfig} onBack={() => setConfigurationOpen(false)} onBoxesChanged={manageBoxes} embedded /> : statisticsOpen ? <StatisticsPage history={history} config={config} activeBoxId={activeBoxId} boxes={boxes} boxHistories={boxHistories} onConfigChange={updateStatisticsConfig} /> : logisticsOpen ? <LogisticsPage caja={caja} config={config} boxes={boxes} activeBoxId={activeBoxId} onUpdateAccounts={updateAccountsFromLogistics} onAssignWallet={assignWallet} onConfigChange={updateLogisticsConfig} /> : <><SummaryCard
          caja={caja}
          calculations={calculations}
          update={update}
        />
        <div className="dashboard-grid">
          <div className="content-column">
            <AdvertisingSectionRebuilt caja={caja} update={update} boxes={boxes} config={config} onViewBonuses={() => setBonusViewRequest((request) => request + 1)} onAddManualBonus={() => setBonusEditorRequest((request) => request + 1)} onNotify={notify} />
            <AccountsGrid caja={caja} update={update} config={config} boxes={boxes} activeBoxId={activeBoxId} onAssignWallet={assignWallet} notesEnabled={notesEnabled} />
            <WalletRoute caja={caja} config={config} onUpdateAccounts={updateAccountsFromLogistics} />
            <div className="operations-grid">
              <QuickMovementSection
                title="Gastos"
                tone="red"
                rows={caja.expenses}
                update={update}
                kind="expenses"
                              config={config}
              />
              <QuickMovementSection
                title="Propinas"
                tone="red"
                rows={caja.tips}
                update={update}
                kind="tips"
                              config={config}
              />
              <BonusesSection caja={caja} update={update} viewRequest={bonusViewRequest} editorRequest={bonusEditorRequest} />
              <QuickMovementSection
                title="Cargas T.A."
                tone="green"
                rows={caja.ta}
                update={update}
                kind="ta"
                              config={config}
              />
              <FoundMoneySection caja={caja} update={update} config={config} />
            </div>
            <div className="notes-transfer-layout">
            <section className="panel notes">
              <SectionHead
                icon={<FileText size={18} />}
                title="Notas del turno"
              />
              <div className="notes-grid">
                <div className="notes-column">
                  <label>
                    Turno actual
                    <textarea
                      value={caja.notes}
                      placeholder="Escribí una nota para el equipo..."
                      onChange={(e) => update({ notes: e.target.value })}
                    />
                  </label>
                  <label>
                    Turno siguiente
                    <textarea
                      value={caja.nextNotes}
                      placeholder="Información para quien toma la próxima caja..."
                      onChange={(e) => update({ nextNotes: e.target.value })}
                    />
                  </label>
                </div>
              </div>
            </section>
              <TransferSection
                boxes={boxes}
                activeBoxId={activeBoxId}
                transfers={caja.transfers || []}
                onCreate={async (transfer) => {
                  const result = await api("/api/traspasos", { method: "POST", body: JSON.stringify(transfer) });
                  if (result.error) throw new Error(result.error);
                  setCaja(result[activeBoxId === transfer.fromBoxId ? "from" : "to"]);
                }}
                onUpdateTransfer={async (transfer) => {
                  const result = await api(`/api/traspasos/${transfer.id}`, { method: "PUT", body: JSON.stringify(transfer) });
                  if (result.error) throw new Error(result.error);
                  setCaja(result.currents[activeBoxId]);
                }}
                onDeleteTransfer={async (transferId) => {
                  const result = await api(`/api/traspasos/${transferId}`, { method: "DELETE" });
                  if (result.error) throw new Error(result.error);
                  setCaja(result.currents[activeBoxId]);
                }}
              />
              <ChipsSection caja={caja} update={update} config={config} />
            </div>
          </div>
        </div></>}
        </div>
      </main>
      <SnapshotView caja={caja} calculations={calculations} snapshotRef={snapshotRef} config={config} boxes={boxes} activeBox={activeBox} />
      {confirm && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setConfirm(false)}>
              <X size={18} />
            </button>
            <div className="modal-icon">
              <LockKeyhole size={22} />
            </div>
            <h2>¿Cerrar esta caja?</h2>
            <p>
              La caja quedará congelada y se abrirá automáticamente el turno
              siguiente con los saldos heredados.
            </p>
            <div className="modal-actions">
              <button
                className="ghost-button"
                onClick={() => setConfirm(false)}
              >
                Cancelar
              </button>
              <button className="close-button" onClick={confirmClose}>
                Confirmar cierre <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
      {closeWarning && (
        <div className="modal-backdrop">
          <div className="modal">
            <button className="modal-close" onClick={() => setCloseWarning(false)}>
              <X size={18} />
            </button>
            <div className="modal-icon">
              <LockKeyhole size={22} />
            </div>
            <h2>¿Cerrar con diferencia?</h2>
            <p>
              Hay <strong className={calculations.shortage < 0 ? "negative" : "positive"}>
                {money(Math.abs(calculations.shortage))}
              </strong> de {calculations.shortage < 0 ? "faltante" : "sobrante"}. ¿Estás seguro de cerrar la caja?
            </p>
            <div className="modal-actions">
              <button className="ghost-button" onClick={() => setCloseWarning(false)}>
                Cancelar
              </button>
              <button className="close-button" onClick={() => { setCloseWarning(false); close(); }}>
                Cerrar caja <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}
      {createPreviousOpen && (
        <div className="modal-backdrop" onClick={() => !creatingPrevious && setCreatePreviousOpen(false)}>
          <div className="modal confirm-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="modal-icon"><Clock3 size={21} /></div>
            <h2>No existe un turno anterior</h2>
            <p>Este es el primer turno registrado. ¿Querés crear un turno anterior vacío para cargar manualmente la información?</p>
            {createPreviousError && <p className="transfer-error">{createPreviousError}</p>}
            <div className="modal-actions">
              <button className="ghost-button" disabled={creatingPrevious} onClick={() => setCreatePreviousOpen(false)}>Cancelar</button>
              <button className="close-button" disabled={creatingPrevious} onClick={createPrevious}>{creatingPrevious ? "Creando..." : "Crear turno anterior"} <ArrowLeft size={16} /></button>
            </div>
          </div>
        </div>
      )}
      {historyOpen && <HistoryModal history={history} onClose={() => setHistoryOpen(false)} onSelect={(index) => { setSelectedIndex(index); setCaja(history[index]); setHistoryOpen(false); }} config={config} activeBoxId={activeBoxId} />}
      {toast && <div className="app-toast" role="status">{toast}</div>}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
