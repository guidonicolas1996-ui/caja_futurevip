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
  Download,
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
  SlidersHorizontal,
  Trash2,
  ReceiptText,
  Target,
  Ticket,
  Upload,
  UserPlus,
  Users,
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
  if (parsed === 0) return "";
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
  const bonusSlotFor = (createdAt, cajaDate, shiftStart) => {
    const bonusDate = new Date(createdAt);
    const minutes = bonusDate.getHours() * 60 + bonusDate.getMinutes();
    if (shiftStart === 0 && minutes >= 16 * 60) return 0;
    if (shiftStart === 16 && minutes < 8 * 60) return 3;
    const elapsed = minutes - shiftStart * 60;
    return elapsed < 0 ? 0 : Math.min(3, Math.floor(elapsed / 120));
  };
const isShiftOutOfTime = (shift) => {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const currentMinutes = hour * 60 + minute;

  if (shift === "Noche") return currentMinutes >= 8 * 60;
  if (shift === "Mañana") return currentMinutes >= 16 * 60;
  if (shift === "Tarde") return currentMinutes < 16 * 60;
  return false;
};
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

let confirmDialogController = null;

const confirmDelete = (message = "¿Estás seguro?") =>
  new Promise((resolve) => {
    if (confirmDialogController) {
      confirmDialogController({ message, onConfirm: () => resolve(true), onCancel: () => resolve(false), confirmLabel: "Eliminar" });
    } else {
      const confirmed = window.confirm(message);
      resolve(confirmed);
    }
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
      <div className="transfer-history"><div className="recent-movements"><span>Últimos traspasos</span>{transfers.slice().reverse().map((transfer) => { const outgoing = transfer.fromBoxId === activeBoxId; const otherBox = boxes.find((box) => box.id === (outgoing ? transfer.toBoxId : transfer.fromBoxId)); return <div className="recent-movement transfer-row" key={transfer.id}><span>{outgoing ? "Salida a" : "Entrada de"} {otherBox?.title || "otra caja"}{transfer.note ? ` · ${transfer.note}` : ""}</span><b className={outgoing ? "transfer-out" : "transfer-in"}>{outgoing ? "-" : "+"}{money(transfer.amount)}</b></div>; })}{transfers.length === 0 && <small>Sin traspasos todavía</small>}</div></div>
      {editorOpen && <div className="modal-backdrop" onClick={() => setEditorOpen(false)}><div className="modal transfer-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setEditorOpen(false)}><X size={18} /></button><div className="modal-icon"><ArrowLeftRight size={20} /></div><h2>Traspasos del turno</h2><p>Editá el origen, destino, monto o nota de cada movimiento.</p><div className="transfer-edit-list">{transfers.length === 0 && <div className="empty-state">Todavía no hay traspasos.</div>}{transfers.map((transfer) => <div className="transfer-edit-row" key={transfer.id}><time className="movement-time">{formatMovementTime(transfer.createdAt)}</time><div><b>{boxes.find((box) => box.id === transfer.fromBoxId)?.title}</b><span>hacia {boxes.find((box) => box.id === transfer.toBoxId)?.title}</span></div><strong>{money(transfer.amount)}</strong><button className="icon-button" title="Editar traspaso" onClick={() => setEditingTransfer({ ...transfer })}><Settings2 size={14} /></button><button className="delete-button" title="Eliminar traspaso" onClick={() => setDeleteTransferId(transfer.id)}><Trash2 size={14} /></button></div>)}</div><div className="modal-actions"><button className="close-button" onClick={() => setEditorOpen(false)}>Listo <Check size={16} /></button></div></div></div>}
      {editingTransfer && <div className="modal-backdrop" onClick={() => setEditingTransfer(null)}><div className="modal transfer-edit-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setEditingTransfer(null)}><X size={18} /></button><div className="modal-icon"><Settings2 size={20} /></div><h2>Editar traspaso</h2><div className="transfer-edit-fields"><TransferBoxPicker label="Desde" boxes={boxes} value={editingTransfer.fromBoxId} onChange={(value) => setEditingTransfer({ ...editingTransfer, fromBoxId: value })} /><TransferBoxPicker label="Hasta" boxes={boxes} value={editingTransfer.toBoxId} excludeId={editingTransfer.fromBoxId} onChange={(value) => setEditingTransfer({ ...editingTransfer, toBoxId: value })} /><label><span>Monto</span><AmountInput value={editingTransfer.amount} onChange={(value) => setEditingTransfer({ ...editingTransfer, amount: value })} /></label><label><span>Nota</span><input value={editingTransfer.note || ""} onChange={(event) => setEditingTransfer({ ...editingTransfer, note: event.target.value })} /></label></div><div className="modal-actions"><button className="ghost-button" onClick={() => setEditingTransfer(null)}>Cancelar</button><button className="close-button" onClick={saveTransfer}>Guardar <Check size={16} /></button></div></div></div>}
      {deleteTransferId && <ConfirmDialog dialog={{ message: "¿Seguro que querés eliminar este traspaso de ambas cajas?", onConfirm: async () => { await onDeleteTransfer(deleteTransferId); setDeleteTransferId(null); } }} onClose={() => setDeleteTransferId(null)} />}
    </section>
  );
}

function ConfigList({ title, items, onChange, placeholder, sortable = false, onItemChange, entities = [], onEntitiesChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const reorder = (targetIndex) => {
    if (dragIndex === null || dragIndex === targetIndex) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    if (onEntitiesChange) {
      const nextEntities = [...entities];
      const [movedEntity] = nextEntities.splice(dragIndex, 1);
      nextEntities.splice(targetIndex, 0, movedEntity);
      onEntitiesChange(nextEntities);
    }
    onChange(next);
    setDragIndex(null);
  };
  return (
    <div className="config-list">
      <div className="config-list-head"><h3>{title}</h3><span>{items.length} elementos</span></div>
      {items.map((item, index) => (
        <div className={`config-list-row ${sortable ? "sortable" : ""}`} key={index} draggable={sortable} onDragStart={() => setDragIndex(index)} onDragOver={(event) => { if (sortable) event.preventDefault(); }} onDrop={() => sortable && reorder(index)} onDragEnd={() => setDragIndex(null)}>
          {sortable && <span className="drag-handle" title="Arrastrar para reordenar"><GripVertical size={15} /></span>}
          <input value={item} placeholder={placeholder} onChange={(event) => { const next = [...items]; next[index] = event.target.value; if (onItemChange) onItemChange(index, event.target.value); else onChange(next); if (onEntitiesChange && entities[index]) onEntitiesChange(entities.map((entity, entityIndex) => entityIndex === index ? { ...entity, name: event.target.value } : entity)); }} />
          <button className="delete-button" title={`Eliminar ${title.toLowerCase()}`} onClick={() => { onChange(items.filter((_, itemIndex) => itemIndex !== index)); if (onEntitiesChange) onEntitiesChange(entities.filter((_, entityIndex) => entityIndex !== index)); }}><Trash2 size={15} /></button>
        </div>
      ))}
      <button className="config-add" onClick={() => { onChange([...items, ""]); if (onEntitiesChange) onEntitiesChange([...entities, { id: `entity-${crypto.randomUUID()}`, name: "" }]); }}><Plus size={15} /> Agregar</button>
    </div>
  );
}

function UserInfoOptionsConfig({ draft, setDraft }) {
  const options = Array.isArray(draft.userInfoOptions) ? draft.userInfoOptions : [];
  return <section className="config-card user-info-options-config"><div className="config-list-head"><h3>Panel</h3><span>{options.length} opciones</span></div>{options.map((option, index) => <div className="config-list-row" key={index}><input value={option} placeholder="Opción de información" onChange={(event) => setDraft((current) => ({ ...current, userInfoOptions: options.map((item, itemIndex) => itemIndex === index ? event.target.value : item) }))} /><button className="delete-button" type="button" title="Eliminar opción" onClick={() => setDraft((current) => ({ ...current, userInfoOptions: options.filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={15} /></button></div>)}<button className="config-add" type="button" onClick={() => setDraft((current) => ({ ...current, userInfoOptions: [...options, ""] }))}><Plus size={15} /> Agregar opción</button></section>;
}

function PlatformConfigList({ platforms, platformColors, platformEntities = [], onPlatformsChange, onEntitiesChange, onColorChange, platformSubPlatforms = {}, onSubPlatformsChange }) {
  const [subplatformModal, setSubplatformModal] = useState(null);
  const [subplatformsInEdit, setSubplatformsInEdit] = useState([]);
  const colorNames = { teal: "Turquesa", blue: "Azul", green: "Verde", orange: "Naranja", pink: "Rosa", red: "Rojo", yellow: "Amarillo", violet: "Violeta", slate: "Pizarra" };
  const normalizeSubPlatforms = (subs) => {
    if (!Array.isArray(subs)) return [];
    return subs.map(sub => typeof sub === "string" ? { name: sub, color: "teal" } : sub);
  };
  const openModal = (platform) => {
    setSubplatformModal(platform);
    setSubplatformsInEdit(normalizeSubPlatforms(platformSubPlatforms[platform] || []));
  };
  const closeModal = () => {
    setSubplatformModal(null);
    setSubplatformsInEdit([]);
  };
  const saveModal = () => {
    onSubPlatformsChange({ ...platformSubPlatforms, [subplatformModal]: subplatformsInEdit });
    closeModal();
  };
  return <>
    <div className="config-list platform-config-list">
      <div className="config-list-head"><h3>Plataformas</h3><span>{platforms.length} elementos</span></div>
      {platforms.map((platform, index) => (
        <div className="platform-config-row" key={platformEntities[index]?.id || index}>
          <i className={`box-swatch ${platformColors[platform] || "teal"}`} />
          <input value={platform} placeholder="Nombre de plataforma" onChange={(event) => { const next = [...platforms]; const previous = next[index]; next[index] = event.target.value; onPlatformsChange(next); if (onEntitiesChange && platformEntities[index]) onEntitiesChange(platformEntities.map((entity, entityIndex) => entityIndex === index ? { ...entity, name: event.target.value } : entity)); if (previous !== event.target.value) onColorChange(event.target.value, platformColors[previous] || "teal", previous); }} />
          <select value={platformColors[platform] || "teal"} aria-label={`Color de ${platform}`} onChange={(event) => onColorChange(platform, event.target.value)}>{Object.entries(colorNames).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
          <button className="delete-button" title="Eliminar plataforma" onClick={async () => { if (await confirmDelete(`¿Eliminar plataforma "${platform}"?`)) { onPlatformsChange(platforms.filter((_, itemIndex) => itemIndex !== index)); if (onEntitiesChange) onEntitiesChange(platformEntities.filter((_, entityIndex) => entityIndex !== index)); const newSubs = { ...platformSubPlatforms }; delete newSubs[platform]; if (onSubPlatformsChange) onSubPlatformsChange(newSubs); } }}><Trash2 size={15} /></button>
        </div>
      ))}
      <button className="config-add" onClick={() => { onPlatformsChange([...platforms, ""]); if (onEntitiesChange) onEntitiesChange([...platformEntities, { id: `platform-${crypto.randomUUID()}`, name: "" }]); }}><Plus size={15} /> Agregar plataforma</button>
    </div>
    {subplatformModal && <div className="modal-backdrop" onClick={closeModal}>
      <div className="modal" onClick={(event) => event.stopPropagation()} style={{ maxWidth: "500px" }}>
        <button className="modal-close" type="button" title="Cerrar" onClick={closeModal}><X size={18} /></button>
        <h2 style={{ marginBottom: "16px" }}>Subplataformas de {subplatformModal}</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
          {subplatformsInEdit.map((sub, index) => (
            <div key={index} style={{ display: "grid", gridTemplateColumns: "1fr 100px auto", gap: "8px", alignItems: "center" }}>
              <input value={sub.name || ""} placeholder="Nombre subplataforma" onChange={(event) => { const newSubs = [...subplatformsInEdit]; newSubs[index] = { ...newSubs[index], name: event.target.value }; setSubplatformsInEdit(newSubs); }} />
              <select value={sub.color || "teal"} onChange={(event) => { const newSubs = [...subplatformsInEdit]; newSubs[index] = { ...newSubs[index], color: event.target.value }; setSubplatformsInEdit(newSubs); }}>{Object.entries({ teal: "Turquesa", blue: "Azul", green: "Verde", orange: "Naranja", pink: "Rosa", red: "Rojo", yellow: "Amarillo", violet: "Violeta", slate: "Pizarra" }).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select>
              <button className="delete-button" title="Eliminar" onClick={async () => { if (await confirmDelete(`¿Eliminar "${sub.name || 'sin nombre'}"?`)) { setSubplatformsInEdit(subplatformsInEdit.filter((_, i) => i !== index)); } }}><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
        <button className="config-add" onClick={() => { setSubplatformsInEdit([...subplatformsInEdit, { name: "", color: "teal" }]); }} style={{ width: "100%", marginBottom: "12px" }}><Plus size={15} /> Agregar subplataforma</button>
        <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
          <button onClick={closeModal} style={{ padding: "8px 16px", borderRadius: "4px", border: "1px solid var(--line)", background: "transparent", cursor: "pointer", color: "var(--text-secondary)" }}>Cancelar</button>
          <button onClick={saveModal} style={{ padding: "8px 16px", borderRadius: "4px", background: "var(--box-accent)", color: "white", cursor: "pointer", fontWeight: "600", border: "none" }}>Guardar</button>
        </div>
      </div>
    </div>}
  </>;
}

function WalletConfigList({ wallets, modes, walletEntities = [], onChange, onEntitiesChange, onModeChange }) {
  const [dragIndex, setDragIndex] = useState(null);
  const reorder = (targetIndex) => { if (dragIndex === null || dragIndex === targetIndex) return; const next = [...wallets]; const [moved] = next.splice(dragIndex, 1); next.splice(targetIndex, 0, moved); if (onEntitiesChange) { const nextEntities = [...walletEntities]; const [movedEntity] = nextEntities.splice(dragIndex, 1); nextEntities.splice(targetIndex, 0, movedEntity); onEntitiesChange(nextEntities); } onChange(next); setDragIndex(null); };
  return <div className="config-list wallet-config-list"><div className="config-list-head"><h3>Billeteras</h3><span>{wallets.length} elementos</span></div>{wallets.map((wallet, index) => <div className="wallet-config-row" key={walletEntities[index]?.id || index} draggable onDragStart={() => setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorder(index)} onDragEnd={() => setDragIndex(null)}><span className="drag-handle" title="Arrastrar para reordenar"><GripVertical size={15} /></span><input value={wallet} placeholder="Nombre de billetera" onChange={(event) => { const next = [...wallets]; const previous = next[index]; next[index] = event.target.value; onChange(next); if (onEntitiesChange && walletEntities[index]) onEntitiesChange(walletEntities.map((entity, entityIndex) => entityIndex === index ? { ...entity, name: event.target.value } : entity)); if (previous !== event.target.value) onModeChange(event.target.value, modes[previous] || "Cobros + Retiros"); }} /><select aria-label={`Tipo de ${wallet}`} value={modes[wallet] || "Cobros + Retiros"} onChange={(event) => onModeChange(wallet, event.target.value)}><option>Cobros + Retiros</option><option>Solo Cobros</option><option>Solo Depósito</option></select><button className="delete-button" title="Eliminar billetera" onClick={async () => { if (await confirmDelete(`¿Eliminar billetera "${wallet}"?`)) { onChange(wallets.filter((_, itemIndex) => itemIndex !== index)); if (onEntitiesChange) onEntitiesChange(walletEntities.filter((_, entityIndex) => entityIndex !== index)); } }}><Trash2 size={15} /></button></div>)}<button className="config-add" onClick={() => { onChange([...wallets, ""]); if (onEntitiesChange) onEntitiesChange([...walletEntities, { id: `wallet-${crypto.randomUUID()}`, name: "" }]); }}><Plus size={15} /> Agregar billetera</button></div>;
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
      <ConfigList title="Titulares" items={draft.accounts.holders} entities={draft.accounts.holderEntities} onEntitiesChange={(holderEntities) => updateAccounts({ holderEntities })} placeholder="Nombre del titular" sortable onChange={(holders) => updateAccounts({ holders })} onItemChange={renameHolder} />
      <WalletConfigList wallets={draft.accounts.wallets} walletEntities={draft.accounts.walletEntities} onEntitiesChange={(walletEntities) => updateAccounts({ walletEntities })} modes={walletModes} onChange={updateWallets} onModeChange={(wallet, mode) => updateAccounts({ walletModes: { ...walletModes, [wallet]: mode } })} />
    </div>
    <section className="config-card"><div className="config-list-head"><h3>Billeteras utilizables por titular</h3><span>Activá y configurá cada cuenta</span></div><div className="availability-table"><div className="availability-row availability-head" style={{ "--wallet-count": draft.accounts.wallets.length }}><b>Titular</b>{draft.accounts.wallets.map((wallet) => <span key={wallet}>{wallet}</span>)}</div>{draft.accounts.holders.map((holder, index) => <div className="availability-row" style={{ "--wallet-count": draft.accounts.wallets.length }} key={index}><b>{holder || "Sin nombre"}</b>{draft.accounts.wallets.map((wallet) => { const setting = walletSettings[holder]?.[wallet] || { category: "Normal" }; const enabled = availability[holder]?.[wallet] !== false; return <div className="account-config-cell" key={wallet}><label className="toggle-cell"><input type="checkbox" checked={enabled} onChange={() => { const nextAvailability = structuredClone(availability); nextAvailability[holder] = { ...(nextAvailability[holder] || {}), [wallet]: !enabled }; updateAccounts({ availability: nextAvailability }); }} /><span /></label><button type="button" className="account-settings-button" title={`Configurar ${holder} · ${wallet}`} onClick={() => setSettingsTarget({ holder, wallet })}><Settings2 size={14} /></button></div>; })}</div>)}</div></section>
    {settingsTarget && <div className="modal-backdrop" onClick={() => setSettingsTarget(null)}><div className="modal account-settings-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" onClick={() => setSettingsTarget(null)} title="Cerrar"><X size={18} /></button><div className="modal-icon"><Settings2 size={21} /></div><h2>{settingsTarget.holder} · {settingsTarget.wallet}</h2><p>Datos disponibles para copiar desde la caja.</p><div className="account-settings-fields"><label><span>Alias</span><input value={targetSetting.alias || ""} onChange={(event) => updateTargetSetting({ alias: event.target.value })} /></label><label><span>CUIL</span><input value={targetSetting.cuil || ""} onChange={(event) => updateTargetSetting({ cuil: event.target.value })} /></label><label><span>Contraseña</span><input value={targetSetting.password || ""} onChange={(event) => updateTargetSetting({ password: event.target.value })} /></label><label><span>Tipo de billetera</span><select value={targetSetting.category || "Normal"} onChange={(event) => updateTargetSetting({ category: event.target.value })}><option>Normal</option><option>Depósitos</option><option>Compartidas</option></select></label><label className="account-settings-note"><span>Nota</span><textarea rows="4" value={targetSetting.note || ""} onChange={(event) => updateTargetSetting({ note: event.target.value })} /></label></div><div className="modal-actions"><button className="close-button" onClick={() => setSettingsTarget(null)}>Listo <Check size={16} /></button></div></div></div>}
  </>;
}
function MonthlyGoalConfig({ draft, boxes, api, update }) {
  const [depositModalOpen, setDepositModalOpen] = useState(false);
  const [depositValues, setDepositValues] = useState({});
  const [platformsByBox, setPlatformsByBox] = useState({});
  const [loadingPlatforms, setLoadingPlatforms] = useState(false);
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvModalTarget, setCsvModalTarget] = useState(null); // { boxId, platform }
  const [csvFormat, setCsvFormat] = useState("MultiPanel");
  const [csvFile, setCsvFile] = useState(null);
  const [csvProcessing, setCsvProcessing] = useState(false);
  const monthlyGoal = draft.monthlyGoal || { final: 0, achieved: 0 };
  const updateValue = (name, value) => update({ monthlyGoal: { ...monthlyGoal, [name]: number(value) } });
  
  const handleOpenDepositModal = async () => {
    const savedDeposits = draft.monthlyGoal?.platformDeposits || {};
    setDepositValues(savedDeposits);
    setLoadingPlatforms(true);
    setDepositModalOpen(true);
    
    // Load configurations from all boxes
    try {
      const boxPlatforms = {};
      for (const box of boxes) {
        const config = await api(`/api/configuracion?boxId=${box.id}`);
        const platforms = config.platforms || [];
        boxPlatforms[box.id] = { title: box.title, platforms, color: box.color };
      }
      setPlatformsByBox(boxPlatforms);
    } catch (error) {
      console.error("Error loading platforms:", error);
      setPlatformsByBox({});
    } finally {
      setLoadingPlatforms(false);
    }
  };
  
  const handleDepositModalSave = () => {
    const total = Object.values(depositValues).reduce((sum, val) => sum + number(val), 0);
    update({ monthlyGoal: { ...monthlyGoal, achieved: total, platformDeposits: depositValues } });
    setDepositModalOpen(false);
    setDepositValues({});
    setPlatformsByBox({});
  };
  
  const handleOpenCsvModal = (boxId, platform) => {
    setCsvModalTarget({ boxId, platform });
    setCsvFile(null);
    setCsvFormat("MultiPanel");
    setCsvModalOpen(true);
  };
  
  const handleCsvFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFile(file);
    }
  };
  
  const parseMultiPanelCSV = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n').filter(line => line.trim());
          let total = 0;
          
          for (const line of lines) {
            const parts = line.split(',');
            if (parts.length >= 3) {
              const amount = parseFloat(parts[2].trim());
              if (!isNaN(amount) && amount > 0) {
                total += amount;
              }
            }
          }
          
          resolve(total);
        } catch (error) {
          reject(new Error("Error al procesar el CSV: " + error.message));
        }
      };
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsText(file);
    });
  };
  
  const handleCsvImport = async () => {
    if (!csvFile || !csvModalTarget) return;
    
    setCsvProcessing(true);
    try {
      let total = 0;
      
      if (csvFormat === "MultiPanel") {
        total = await parseMultiPanelCSV(csvFile);
      }
      
      setDepositValues({
        ...depositValues,
        [`${csvModalTarget.boxId}-${csvModalTarget.platform}`]: total
      });
      
      setCsvModalOpen(false);
      setCsvModalTarget(null);
      setCsvFile(null);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setCsvProcessing(false);
    }
  };
  
  const boxColorStyle = (color) => {
    const colors = {
      teal: { "--box-accent": "#72d7ca", "--box-soft": "rgba(114, 215, 202, 0.08)", "--box-glow": "rgba(114, 215, 202, 0.3)", "--box-line": "rgba(114, 215, 202, 0.2)" },
      blue: { "--box-accent": "#5aa8d8", "--box-soft": "rgba(90, 168, 216, 0.08)", "--box-glow": "rgba(90, 168, 216, 0.3)", "--box-line": "rgba(90, 168, 216, 0.2)" },
      green: { "--box-accent": "#83d5a2", "--box-soft": "rgba(131, 213, 162, 0.08)", "--box-glow": "rgba(131, 213, 162, 0.3)", "--box-line": "rgba(131, 213, 162, 0.2)" },
      orange: { "--box-accent": "#f5ad69", "--box-soft": "rgba(245, 173, 105, 0.08)", "--box-glow": "rgba(245, 173, 105, 0.3)", "--box-line": "rgba(245, 173, 105, 0.2)" },
      pink: { "--box-accent": "#f597b1", "--box-soft": "rgba(245, 151, 177, 0.08)", "--box-glow": "rgba(245, 151, 177, 0.3)", "--box-line": "rgba(245, 151, 177, 0.2)" },
      red: { "--box-accent": "#ef8888", "--box-soft": "rgba(239, 136, 136, 0.08)", "--box-glow": "rgba(239, 136, 136, 0.3)", "--box-line": "rgba(239, 136, 136, 0.2)" },
      yellow: { "--box-accent": "#f5d547", "--box-soft": "rgba(245, 213, 71, 0.08)", "--box-glow": "rgba(245, 213, 71, 0.3)", "--box-line": "rgba(245, 213, 71, 0.2)" },
      violet: { "--box-accent": "#b7a3e5", "--box-soft": "rgba(183, 163, 229, 0.08)", "--box-glow": "rgba(183, 163, 229, 0.3)", "--box-line": "rgba(183, 163, 229, 0.2)" },
      slate: { "--box-accent": "#8b92a9", "--box-soft": "rgba(139, 146, 169, 0.08)", "--box-glow": "rgba(139, 146, 169, 0.3)", "--box-line": "rgba(139, 146, 169, 0.2)" },
    };
    return colors[color] || colors.teal;
  };
  
  return <>
    <section className="config-card monthly-goal-card">
      <div className="config-list-head"><h3>Objetivo de Depósitos General</h3><span>Se actualiza manualmente</span></div>
      <div className="monthly-goal-fields">
        <label><span>Objetivo final</span><AmountInput value={monthlyGoal.final} onChange={(value) => updateValue("final", value)} /></label>
        <label><span>Objetivo alcanzado</span><div style={{ display: "flex", gap: "8px", alignItems: "center" }}><AmountInput value={monthlyGoal.achieved} onChange={(value) => updateValue("achieved", value)} /><button type="button" className="icon-button" title="Importar depósitos por plataforma" onClick={handleOpenDepositModal} style={{ width: "32px", height: "32px", minWidth: "32px", padding: "4px" }}><Download size={16} /></button></div></label>
      </div>
    </section>
    
    {depositModalOpen && <div className="modal-backdrop" onClick={() => setDepositModalOpen(false)}>
      <div className="modal" onClick={(event) => event.stopPropagation()} style={{ maxHeight: "85vh", maxWidth: "700px", overflowY: "auto", overflowX: "hidden", padding: "24px" }}>
        <button className="modal-close" onClick={() => setDepositModalOpen(false)} title="Cerrar"><X size={18} /></button>
        <div className="modal-icon"><Download size={21} /></div>
        <h2>Importar depósitos por plataforma</h2>
        <p>Ingresá los depósitos de cada plataforma en cada caja</p>
        {loadingPlatforms ? (
          <div style={{ padding: "60px 40px", textAlign: "center", color: "var(--text-muted)" }}>Cargando plataformas...</div>
        ) : Object.keys(platformsByBox).length === 0 ? (
          <div style={{ padding: "60px 40px", textAlign: "center", color: "var(--text-muted)" }}>No hay plataformas configuradas</div>
        ) : (
          <div style={{ padding: "20px 0", display: "flex", flexDirection: "column", gap: "24px" }}>
            {Object.entries(platformsByBox).map(([boxId, { title, platforms, color }]) => (
              platforms.length > 0 && (
                <div key={boxId} style={{ ...boxColorStyle(color), borderBottom: `1px solid var(--box-line)`, paddingBottom: "20px" }}>
                  <h3 style={{ fontSize: "0.95em", fontWeight: "700", marginBottom: "14px", color: "var(--box-accent)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
                    {platforms.map((platform) => (
                      <div key={`${boxId}-${platform}`} style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <label style={{ fontSize: "0.8em", fontWeight: "600", color: "var(--text-secondary)" }}>Depósitos {platform}</label>
                        <div style={{ display: "flex", gap: "6px", alignItems: "stretch" }}>
                          <div style={{ display: "flex", alignItems: "center", backgroundColor: "#202a2c", border: `1px solid var(--box-line)`, borderRadius: "5px", paddingLeft: "8px", color: "#758689", fontFamily: "DM Mono", fontSize: "11px", flex: 1 }}>
                            <span>$</span>
                            <input 
                              type="text" 
                              inputMode="decimal"
                              placeholder="0,00"
                              value={formatNumberInput(depositValues[`${boxId}-${platform}`] || 0)} 
                              onChange={(event) => {
                                const rawValue = event.target.value.replace(/\./g, '').replace(',', '.');
                                setDepositValues({ ...depositValues, [`${boxId}-${platform}`]: rawValue || "" });
                              }}
                              style={{ 
                                border: "0",
                                background: "transparent",
                                width: "100%",
                                padding: "8px 8px 8px 4px",
                                textAlign: "right",
                                fontFamily: "DM Mono",
                                fontSize: "11px",
                                color: "inherit"
                              }}
                            />
                          </div>
                          <button type="button" onClick={() => handleOpenCsvModal(boxId, platform)} style={{ padding: "8px 10px", backgroundColor: "var(--box-line)", border: "1px solid var(--box-line)", borderRadius: "5px", color: "var(--text-secondary)", cursor: "pointer", fontSize: "0.8em", fontWeight: "600", whiteSpace: "nowrap" }}>CSV</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", alignItems: "center", marginTop: "20px", paddingTop: "16px", borderTop: "1px solid var(--line)" }}>
          <small style={{ color: "var(--text-muted)", fontSize: "0.75em" }}>Suma total:</small>
          <div style={{ fontSize: "0.9em", fontWeight: "600", color: "var(--box-accent)", fontFamily: "DM Mono" }}>${formatNumberInput(Object.values(depositValues).reduce((sum, val) => sum + number(val), 0))}</div>
        </div>
        <div className="modal-actions" style={{ marginTop: "16px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={() => setDepositModalOpen(false)} style={{ padding: "8px 16px", backgroundColor: "transparent", border: "1px solid var(--line)", borderRadius: "5px", color: "var(--text-secondary)", cursor: "pointer", fontWeight: "500", transition: "all 0.2s" }}>Cancelar</button>
          <button className="close-button" onClick={handleDepositModalSave} disabled={loadingPlatforms}>Listo <Check size={16} /></button>
        </div>
      </div>
    </div>}
    
    {csvModalOpen && <div className="modal-backdrop" onClick={() => setCsvModalOpen(false)}>
      <div className="modal" onClick={(event) => event.stopPropagation()} style={{ maxHeight: "85vh", maxWidth: "500px", overflowY: "auto", overflowX: "hidden", padding: "24px" }}>
        <button className="modal-close" onClick={() => setCsvModalOpen(false)} title="Cerrar"><X size={18} /></button>
        <div className="modal-icon"><Upload size={21} /></div>
        <h2>Importar desde CSV</h2>
        <p>Selecciona el formato y sube el archivo CSV</p>
        
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "20px" }}>
          <div>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "0.85em", fontWeight: "600", color: "var(--text-secondary)" }}>Formato</span>
              <select value={csvFormat} onChange={(e) => setCsvFormat(e.target.value)} style={{ padding: "8px 12px", border: "1px solid var(--line)", borderRadius: "5px", backgroundColor: "#202a2c", color: "var(--text-primary)", fontFamily: "inherit" }}>
                <option value="MultiPanel">MultiPanel</option>
              </select>
            </label>
          </div>
          
          <div>
            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "0.85em", fontWeight: "600", color: "var(--text-secondary)" }}>Archivo CSV</span>
              <input 
                type="file" 
                accept=".csv"
                onChange={handleCsvFileChange}
                style={{ padding: "8px 12px", border: "1px solid var(--line)", borderRadius: "5px", backgroundColor: "#202a2c", color: "var(--text-secondary)", cursor: "pointer" }}
              />
              {csvFile && <small style={{ color: "var(--box-accent)", fontWeight: "600" }}>✓ {csvFile.name}</small>}
            </label>
          </div>
          
          <small style={{ color: "var(--text-muted)", lineHeight: "1.4" }}>El sistema sumará solo los valores positivos de la tercera columna del CSV, ignorando los negativos.</small>
        </div>
        
        <div className="modal-actions" style={{ marginTop: "24px", display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button onClick={() => setCsvModalOpen(false)} style={{ padding: "8px 16px", backgroundColor: "transparent", border: "1px solid var(--line)", borderRadius: "5px", color: "var(--text-secondary)", cursor: "pointer", fontWeight: "500" }}>Cancelar</button>
          <button className="close-button" onClick={handleCsvImport} disabled={!csvFile || csvProcessing}>Importar {csvProcessing && "..."}</button>
        </div>
      </div>
    </div>}
  </>;
}

function getProgressAccentState(percent, fallback) {
  if (percent >= 85) {
    return { accent: "#e8d477", glow: "rgba(232, 212, 119, 0.58)", line: "rgba(232, 212, 119, 0.46)" };
  }
  return { accent: fallback.accent, glow: fallback.glow, line: fallback.line };
}

function getBonusProgressAccentState(percent, fallback) {
  if (percent >= 100) {
    return { accent: "#ff5a5a", glow: "rgba(255, 90, 90, 0.58)", line: "rgba(255, 90, 90, 0.46)" };
  }
  if (percent >= 85) {
    return { accent: "#ff9f43", glow: "rgba(255, 159, 67, 0.62)", line: "rgba(255, 159, 67, 0.5)" };
  }
  return { accent: fallback.accent, glow: fallback.glow, line: fallback.line };
}

function MonthlyGoalProgress({ config, boxColor }) {
  const goal = config.monthlyGoal || {};
  const finalGoal = Math.max(0, number(goal.final));
  const achieved = Math.max(0, number(goal.achieved));
  const percentage = finalGoal > 0 ? (achieved / finalGoal) * 100 : 0;
  const colors = boxColorStyle(boxColor);
  const state = getProgressAccentState(percentage, { accent: colors["--box-accent"], glow: colors["--box-glow"], line: colors["--box-line"] });
  return <section className="monthly-goal-progress" aria-label="Progreso del objetivo de depósitos general" style={{ "--goal-accent": state.accent, "--goal-soft": colors["--box-soft"], "--goal-glow": state.glow, "--goal-line": state.line }}>
    <div className="goal-bar-header"><span>Objetivo de Depósitos General</span></div>
    <div className="goal-bar-body">
      <div className="monthly-goal-track"><span style={{ width: `${Math.min(100, percentage)}%` }} /></div>
      <div className="monthly-goal-values"><strong>{Math.round(percentage)}%</strong><span className="monthly-goal-achieved">{money(achieved)}</span><i>/</i><span className="monthly-goal-final">{money(finalGoal)}</span></div>
    </div>
  </section>;
}

function BonusMonthlyGoalConfig({ draft, update }) {
  const bonusGoal = draft.bonusGoal || { total: 0, percentages: { Noche: 33, Mañana: 33, Tarde: 34 } };
  const updateValue = (name, value) => update({ bonusGoal: { ...bonusGoal, [name]: number(value) } });
  const updatePercent = (shift, value) => update({ bonusGoal: { ...bonusGoal, percentages: { ...(bonusGoal.percentages || {}), [shift]: Math.max(0, Math.min(100, number(value))) } } });
  return <section className="config-card monthly-goal-card bonus-goal-card">
    <div className="config-list-head"><h3>Obj. Bonos Mes</h3><span>Se calcula solo con bonos netos</span></div>
    <div className="monthly-goal-fields bonus-goal-fields">
      <label><span>Objetivo total</span><AmountInput value={bonusGoal.total} onChange={(value) => updateValue("total", value)} /></label>
      <div className="bonus-goal-percentages">
        {Object.keys(bonusGoal.percentages || {}).map((shift) => (
          <label key={shift}><span>{shift}</span><input type="number" value={bonusGoal.percentages?.[shift] ?? 0} min="0" max="100" onChange={(event) => updatePercent(shift, event.target.value)} /></label>
        ))}
      </div>
    </div>
  </section>;
}

function BonusMonthlyGoalProgress({ config, caja, history, boxColor }) {
  if (!config || !caja) return null;
  const goal = config.bonusGoal || { total: 0, percentages: { Noche: 33, Mañana: 33, Tarde: 34 } };
  const monthItems = [...(Array.isArray(history) ? history : []), caja].filter((item, index, list) => item && list.findIndex((candidate) => String(candidate.id) === String(item.id)) === index);
  const currentDate = new Date(caja.date);
  const sameDateItems = monthItems.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate.getFullYear() === currentDate.getFullYear() && itemDate.getMonth() === currentDate.getMonth() && itemDate.getDate() === currentDate.getDate();
  });
  const monthItemsInMonth = monthItems.filter((item) => {
    const itemDate = new Date(item.date);
    return itemDate.getFullYear() === currentDate.getFullYear() && itemDate.getMonth() === currentDate.getMonth();
  });
  const monthBonusNet = (row) => (row.bonuses || []).reduce((sum, bonus) => sum + number(bonus.granted) - number(bonus.recovered), 0);
  const dayBonusNet = sameDateItems.reduce((sum, item) => sum + monthBonusNet(item), 0);
  const shiftBonusNet = (shift) => sameDateItems.reduce((sum, item) => sum + (item.bonuses || []).reduce((itemSum, bonus) => {
    const hour = new Date(bonus.createdAt).getHours();
    const bonusShift = hour >= 0 && hour < 8 ? "Noche" : hour < 16 ? "Mañana" : "Tarde";
    return itemSum + (bonusShift === shift ? number(bonus.granted) - number(bonus.recovered) : 0);
  }, 0), 0);
  const totalTarget = Math.max(0, number(goal.total));
  const currentMonth = new Date(caja.date);
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const currentDay = currentMonth.getDate();
  const monthTarget = totalTarget;
  const monthAchieved = monthItemsInMonth.reduce((sum, item) => sum + monthBonusNet(item), 0);
  const remainingGoal = Math.max(0, monthTarget - monthAchieved);
  const remainingDays = Math.max(1, daysInMonth - currentDay + 1);
  const dailyTarget = remainingGoal > 0 ? remainingGoal / remainingDays : 0;
  const currentShift = caja.shift;
  const currentPercent = number(goal.percentages?.[currentShift] || 0);
  const currentShiftTarget = dailyTarget * (currentPercent / 100);
  const currentShiftAchieved = shiftBonusNet(currentShift);
  const colors = boxColorStyle(boxColor);
  const renderBar = (label, value, target, percent) => {
    const state = getBonusProgressAccentState(percent, { accent: colors["--box-accent"], glow: colors["--box-glow"], line: colors["--box-line"] });
    return (
      <div className="bonus-goal-row" style={{ "--goal-accent": state.accent, "--goal-soft": colors["--box-soft"], "--goal-glow": state.glow, "--goal-line": state.line, "--goal-row-bg": `color-mix(in srgb, ${colors["--box-soft"]} 82%, rgba(15, 17, 22, 0.82))`, "--goal-row-border": state.line }}>
        <div className="bonus-goal-label"><span>{label}</span><strong>{money(target)}</strong></div>
        <div className="bonus-goal-main">
          <div className="monthly-goal-track"><span style={{ width: `${Math.min(100, percent)}%` }} /></div>
          <div className="monthly-goal-values"><strong>{Math.round(percent)}%</strong><span className="monthly-goal-achieved">{money(value)}</span><i>/</i><span className="monthly-goal-final">{money(target)}</span></div>
        </div>
      </div>
    );
  };
  return <div className="bonus-goal-panel" aria-label="Progreso del objetivo de bonos" style={{ "--bonus-soft": colors["--box-soft"], "--bonus-line": colors["--box-line"], "--bonus-glow": colors["--box-glow"], "--bonus-accent": colors["--box-accent"] }}>
    {renderBar("Obj. Bonos Mes", monthAchieved, monthTarget, monthTarget > 0 ? (monthAchieved / monthTarget) * 100 : 0)}
    <div className="bonus-goal-lower-row">
      {renderBar("Obj. Bonos Día", dayBonusNet, dailyTarget, dailyTarget > 0 ? (dayBonusNet / dailyTarget) * 100 : 0)}
      {renderBar(`Obj. Turno · ${currentShift.toUpperCase()}`, currentShiftAchieved, currentShiftTarget, currentShiftTarget > 0 ? (currentShiftAchieved / currentShiftTarget) * 100 : 0)}
    </div>
  </div>;
}

function BonusConfig({ draft, setDraft }) {
  const types = draft.bonusTypes || [];
  const conditions = draft.bonusConditions || [];
  return <div className="config-two-columns"><section className="config-card"><div className="config-list-head"><h3>Tipos de bonos</h3><span>{types.length} elementos</span></div>{types.map((type, index) => <div className="config-list-row" key={type.id}><input value={type.name} placeholder="Nombre del tipo" onChange={(event) => setDraft((current) => ({ ...current, bonusTypes: (current.bonusTypes || []).map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item) }))} /><input className="bonus-type-count" type="number" min="1" max="20" value={type.percentageCount || 1} title="Cantidad de porcentajes" onChange={(event) => setDraft((current) => ({ ...current, bonusTypes: (current.bonusTypes || []).map((item, itemIndex) => itemIndex === index ? { ...item, percentageCount: Math.max(1, Math.min(20, Number(event.target.value) || 1)) } : item) }))} /><button className="delete-button" type="button" title="Eliminar tipo" onClick={() => setDraft((current) => ({ ...current, bonusTypes: (current.bonusTypes || []).filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={15} /></button></div>)}<button className="config-add" type="button" onClick={() => setDraft((current) => ({ ...current, bonusTypes: [...(current.bonusTypes || []), { id: `bonus-type-${crypto.randomUUID()}`, name: "", percentageCount: 1 }] }))}><Plus size={15} /> Agregar tipo</button></section><section className="config-card"><div className="config-list-head"><h3>Condiciones de bono</h3><span>{conditions.length} elementos</span></div>{conditions.map((condition, index) => <div className="config-list-row bonus-condition-config-row" key={condition.id}><input value={condition.label} placeholder="Etiqueta de condición" onChange={(event) => setDraft((current) => ({ ...current, bonusConditions: (current.bonusConditions || []).map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item) }))} /><label className="bonus-platform-toggle" title="Permitir asignar una plataforma a los porcentajes"><input type="checkbox" checked={condition.allowPlatform === true} onChange={(event) => setDraft((current) => ({ ...current, bonusConditions: (current.bonusConditions || []).map((item, itemIndex) => itemIndex === index ? { ...item, allowPlatform: event.target.checked } : item) }))} /><span /> Plataforma</label><button className="delete-button" type="button" title="Eliminar condición" onClick={() => setDraft((current) => ({ ...current, bonusConditions: (current.bonusConditions || []).filter((_, itemIndex) => itemIndex !== index) }))}><Trash2 size={15} /></button></div>)}<button className="config-add" type="button" onClick={() => setDraft((current) => ({ ...current, bonusConditions: [...(current.bonusConditions || []), { id: `bonus-condition-${crypto.randomUUID()}`, label: "", allowPlatform: false }] }))}><Plus size={15} /> Agregar condición</button></section></div>;
}

function ConfigurationPage({ config, boxes, activeBoxId, onSave, onBack, onBoxesChanged, onNotify, api, embedded = false }) {
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
    }).catch((error) => { if (!cancelled) { setLoadingConfig(false); onNotify?.(error.message); } });
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
      } catch (error) {
        onNotify?.(error.message);
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
          <button className={tab === "users" ? "active" : ""} onClick={() => setTab("users")}><Users size={17} /> Usuarios</button>
          <button className={tab === "bonuses" ? "active" : ""} onClick={() => setTab("bonuses")}><Gift size={17} /> Bonos</button>
          <button className={tab === "monthly-goal" ? "active" : ""} onClick={() => setTab("monthly-goal")}><Target size={17} /> Objetivos</button>
        </nav>
        <main className="configuration-content">
          {tab === "users" && !loadingConfig && draft && <UserInfoOptionsConfig draft={draft} setDraft={setDraft} />}
          {tab === "bonuses" && !loadingConfig && draft && <BonusConfig draft={draft} setDraft={setDraft} />}
          {loadingConfig && <div className="config-loading">Cargando configuración de {configTarget?.title}...</div>}
          {!loadingConfig && draft && <>
          {tab === "boxes" && <><div className="config-intro"><span className="eyebrow">Espacios de trabajo</span><h2>Edición de cajas</h2><p>Administrá el nombre, color y existencia de cada caja independiente.</p></div><section className="config-card box-management-list"><div className="config-list-head"><h3>Mis cajas</h3><span>{boxes.length} espacios</span></div>{boxes.map((box) => <div className="box-management-row" key={box.id}><i className={`box-swatch ${box.color}`} /><input value={box.title} onChange={(event) => onBoxesChanged({ type: "update", id: box.id, patch: { title: event.target.value } })} /><select value={box.color} onChange={(event) => onBoxesChanged({ type: "update", id: box.id, patch: { color: event.target.value } })}><option value="teal">Turquesa</option><option value="blue">Azul</option><option value="green">Verde</option><option value="orange">Naranja</option><option value="pink">Rosa</option><option value="red">Rojo</option><option value="yellow">Amarillo</option><option value="violet">Violeta</option><option value="slate">Pizarra</option></select><button className="delete-button" disabled={boxes.length === 1} title="Eliminar caja" onClick={() => onBoxesChanged({ type: "delete", id: box.id })}><Trash2 size={15} /></button></div>)}<button className="config-add" onClick={() => onBoxesChanged({ type: "create" })}><Plus size={15} /> Nueva caja</button></section></>}
          {tab === "accounts" && <>
            <div className="config-intro"><span className="eyebrow">Matriz de cuentas</span><h2>Titulares y billeteras</h2><p>Creá las listas y definí qué billeteras puede usar cada titular.</p></div>
            <AccountsConfig draft={draft} boxes={boxes} updateAccounts={updateAccounts} />
          </>}
          {tab === "expenses" && <><div className="config-intro"><span className="eyebrow">Gastos</span><h2>Categorías de gastos</h2><p>Definí las opciones del selector y si cada categoría suma o resta al resumen.</p></div><section className="config-card expense-config-list"><div className="config-list-head"><h3>Opciones del selector</h3><span>{draft.expenses.length} categorías</span></div>{draft.expenses.map((expense, index) => <div className="expense-config-row" key={index}><input value={expense.name} placeholder="Nombre del gasto" onChange={(event) => { const expenses = structuredClone(draft.expenses); expenses[index].name = event.target.value; setDraft({ ...draft, expenses }); }} /><label className="invert-toggle"><input type="checkbox" checked={expense.inverted} onChange={() => { const expenses = structuredClone(draft.expenses); expenses[index].inverted = !expenses[index].inverted; setDraft({ ...draft, expenses }); }} /><span /> Invierte el signo</label><button className="delete-button" title="Eliminar categoría" onClick={async () => { if (await confirmDelete(`¿Eliminar categoría "${expense.name}"?`)) setDraft({ ...draft, expenses: draft.expenses.filter((_, itemIndex) => itemIndex !== index) }); }}><Trash2 size={15} /></button></div>)}<button className="config-add" onClick={() => setDraft({ ...draft, expenses: [...draft.expenses, { name: "", inverted: false }] })}><Plus size={15} /> Agregar categoría</button></section></>}
          {tab === "platforms" && <><div className="config-intro"><span className="eyebrow">Control de fichas</span><h2>Plataformas</h2><p>Administrá las plataformas, los nombres, colores y subplataformas de cada una.</p></div><div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}><button className="config-add" type="button" onClick={async () => { if (await confirmDelete("¿Vaciar TODAS las subplataformas en TODAS las cajas? Esto no se puede deshacer.")) { setSaving(true); try { for (const box of (boxes || [])) { const boxConfig = await api(`/api/configuracion?boxId=${box.id}`).catch(() => null); if (boxConfig) { await onSaveRef.current({ ...boxConfig, platformSubPlatforms: {} }, box.id); } } if (configBoxId) { const reloadedConfig = await api(`/api/configuracion?boxId=${configBoxId}`).catch(() => null); if (reloadedConfig) setDraft(reloadedConfig); } onNotify?.("Subplataformas limpias en todas las cajas."); } catch (error) { onNotify?.(error?.message || "Error al limpiar subplataformas."); } finally { setSaving(false); } } }} style={{ background: "rgba(255, 90, 90, 0.2)", color: "#ff5a5a", borderColor: "rgba(255, 90, 90, 0.3)" }} title="Vaciar todas las subplataformas en todas las cajas" disabled={saving}><Trash2 size={15} /> Limpiar todas subplataformas</button></div><PlatformConfigList platforms={draft.platforms} platformEntities={draft.platformEntities} onEntitiesChange={(platformEntities) => setDraft((current) => ({ ...current, platformEntities }))} platformColors={draft.platformColors || {}} onPlatformsChange={(platforms) => setDraft((current) => ({ ...current, platforms }))} onColorChange={(platform, color, previous) => setDraft((current) => { const platformColors = { ...(current.platformColors || {}), [platform]: color }; if (previous) { delete platformColors[previous]; return { ...current, platforms: current.platforms.map((item) => item === previous ? platform : item), platformColors }; } return { ...current, platformColors }; })} platformSubPlatforms={draft.platformSubPlatforms || {}} onSubPlatformsChange={(platformSubPlatforms) => setDraft((current) => ({ ...current, platformSubPlatforms }))} /></>}
          {tab === "monthly-goal" && <><div className="config-intro"><span className="eyebrow">Objetivos</span><h2>Objetivo de Depósitos General y Bonos mensuales</h2><p>Configurá el objetivo general de depósitos y la meta exclusiva de bonos por caja para ese mes.</p></div><MonthlyGoalConfig draft={draft} boxes={boxes} api={api} update={(patch) => setDraft({ ...draft, ...patch })} /><BonusMonthlyGoalConfig draft={draft} update={(patch) => setDraft({ ...draft, ...patch })} /></>}
          {tab === "users" && <><div className="config-intro"><span className="eyebrow">Usuarios</span><h2>Conf. de usuarios y aclaraciones</h2><p>Definí las aclaraciones rápidas que se podrán asociar a cada usuario.</p></div><section className="config-card"><div className="config-list-head"><h3>Aclaraciones</h3><span>{draft.userClarifications?.length || 0} elementos</span></div>{(draft.userClarifications || []).map((clarification, index) => <div className="platform-config-row" key={clarification.id || index} style={{ display: "grid", gridTemplateColumns: "1.2fr 120px 88px auto", gap: "8px", alignItems: "center" }}><input value={clarification.text} onChange={(event) => setDraft((current) => ({ ...current, userClarifications: (current.userClarifications || []).map((item, itemIndex) => itemIndex === index ? { ...item, text: event.target.value } : item) }))} placeholder="Texto aclaración" /><select value={clarification.color} onChange={(event) => setDraft((current) => ({ ...current, userClarifications: (current.userClarifications || []).map((item, itemIndex) => itemIndex === index ? { ...item, color: event.target.value } : item) }))}>{Object.entries({ teal: "Turquesa", blue: "Azul", green: "Verde", orange: "Naranja", pink: "Rosa", red: "Rojo", yellow: "Amarillo", violet: "Violeta", slate: "Pizarra" }).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select><input value={clarification.emoji || ""} maxLength={2} onChange={(event) => setDraft((current) => ({ ...current, userClarifications: (current.userClarifications || []).map((item, itemIndex) => itemIndex === index ? { ...item, emoji: event.target.value } : item) }))} placeholder="🙂" /><button className="delete-button" title="Eliminar aclaración" onClick={async () => { if (await confirmDelete(`¿Eliminar aclaración "${clarification.text}"?`)) setDraft((current) => ({ ...current, userClarifications: (current.userClarifications || []).filter((_, itemIndex) => itemIndex !== index) })); }}><Trash2 size={15} /></button></div>)}<button className="config-add" onClick={() => setDraft((current) => ({ ...current, userClarifications: [...(current.userClarifications || []), { id: `clarification-${crypto.randomUUID()}`, text: "", color: "teal", emoji: "" }] }))}><Plus size={15} /> Agregar aclaración</button></section></>}
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
          <LockKeyhole size={16} />
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
  const hasExplicitValue = value !== null && value !== undefined && value !== "";
  const [inputValue, setInputValue] = useState(
    hasExplicitValue ? (numericOnly ? String(normalizedValue) : formatNumberInput(value)) : "",
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
      if (hasExplicitValue) {
        const displayValue = numericOnly ? formatNumberInput(normalizedValue) : formatNumberInput(value);
        setInputValue(displayValue);
      } else {
        setInputValue("");
      }
    }
  }, [value, numericOnly, normalizedValue, isFocused, hasExplicitValue]);
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
          const formattedValue = hasExplicitValue ? formatNumberInput(normalizedValue) : "";
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
          const numericText = hasExplicitValue ? String(normalizedValue) : "";
          setInputValue(numericText);
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
        onChange(numericOnly ? (nextValue === "" ? "" : Number(nextValue)) : parseNumberInput(nextValue));
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
        const formattedValue = numericOnly ? (inputValue === "" ? "" : formatNumberInput(inputValue)) : formatNumberInput(inputValue);
        setInputValue(formattedValue);
      }}
    />
  );
}
function AmountInput({ value, onChange, placeholder = "0,00", className = "", selectAllOnFirstClick = false, inputProps = {} }) {
  return (
    <div className={`amount-input ${className}`}>
      <span>$</span>
      <NumericInput
        value={value ?? ""}
        placeholder={placeholder}
        onChange={onChange}
        selectAllOnFirstClick={selectAllOnFirstClick}
        inputProps={inputProps}
      />
    </div>
  );
}

function QuickBonusAccess({ caja, update, onViewBonuses, onAddManualBonus }) {
  const [quick, setQuick] = useState("");
  const [recoveredMode, setRecoveredMode] = useState(false);
  const granted = caja.bonuses.reduce((sum, bonus) => sum + number(bonus.granted), 0);
  const recovered = caja.bonuses.reduce((sum, bonus) => sum + number(bonus.recovered), 0);
  const recentBonuses = caja.bonuses.slice(-5).reverse();
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
    <div className="quick-recent-bonuses"><span className="quick-recent-title">Últimos 5 bonos</span>{recentBonuses.map((bonus) => { const isRecovered = number(bonus.recovered) > 0; return <div className={`quick-recent-bonus ${isRecovered ? "recovered" : "granted"}`} key={bonus.id}><span>{isRecovered ? "Recuperado" : "Otorgado"}</span><div className="recent-bonus-value"><span className="recent-bonus-time">{formatMovementTime(bonus.createdAt)} -</span><input defaultValue={money(isRecovered ? bonus.recovered : bonus.granted)} aria-label="Editar bono reciente" onFocus={(event) => { event.currentTarget.value = formatNumberInput(isRecovered ? bonus.recovered : bonus.granted); event.currentTarget.select(); }} onBlur={(event) => { const value = parseNumberInput(event.currentTarget.value); event.currentTarget.value = value ? money(value) : "-"; editRecentBonus(bonus.id, value); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} /></div></div>; })}</div>
  </div>;
}

function AdvertisingSection({ caja, update, boxes, config, onViewBonuses, onAddManualBonus, onNotify, notesEnabled, onNotesEnabledChange }) {
  const advertising = caja.advertising || { "Publicidad A": { total: 0, new: 0, repeated: 0, derived: {} }, "Publicidad B": { total: 0, new: 0, repeated: 0, derived: {} } };
  const updateAdvertising = (name, patch) => update({ advertising: { ...advertising, [name]: { ...advertising[name], ...patch } } });
  const updateValue = (name, field, value) => {
    const cleaned = String(value).replace(/\D/g, "").slice(0, 3);
    const numValue = cleaned === "" ? "" : Math.max(0, Number(cleaned));
    updateAdvertising(name, { [field]: numValue });
  };
    const copySummary = async () => {
    const text = ["*Conteo de Publi:*", "", ...["Publicidad A", "Publicidad B"].flatMap((name) => {
      const item = advertising[name] || {};
      const total = number(item.total);
      const newCount = number(item.new);
      const repeated = number(item.repeated);
      const response = total - newCount - repeated;
      const derivedTotal = boxes.reduce((sum, box) => sum + number(item.derived?.[box.id]), 0);
      return [`*${name}*`, `*Efectividad: ${total ? Math.round((derivedTotal / total) * 100) : 0}%*`, "", `Llegados: ${total}`, `- Nuevos: ${newCount}`, `- Repetidos: ${repeated}`, `- S/Respuesta: ${response}`, `Derivados: ${derivedTotal}`, ...boxes.map((box) => `- ${box.title}: ${number(item.derived?.[box.id])}`), ""];
    })].join("\n");
    await navigator.clipboard?.writeText(text);
    onNotify("Copiado al portapapeles");
  };
  return <section className="advertising-panel">
    <div className="advertising-card"><SectionHead icon={<ReceiptText size={16} />} title="Publicidad" action={<button className="icon-button advertising-copy" title="Copiar conteo de publicidad" onClick={copySummary}><Copy size={15} /></button>} /><div className="advertising-content">{["Publicidad A", "Publicidad B"].map((name) => { const item = advertising[name] || {}; const response = number(item.new) + number(item.repeated) - number(item.total); const derivedTotal = boxes.reduce((sum, box) => sum + number(item.derived?.[box.id]), 0); const effectiveness = item.total ? Math.round((derivedTotal / number(item.total)) * 100) : 0; return <div className="advertising-row" key={name}><strong><ReceiptText size={12} />{name}</strong><div className="advertising-subgroup"><div className="advertising-fields"><label><small>Lleg. Total</small><input maxLength={3} inputMode="numeric" value={item.total || ""} onChange={(event) => updateValue(name, "total", event.target.value)} /></label><label><small>Nuevos</small><input maxLength={3} inputMode="numeric" value={item.new || ""} onChange={(event) => updateValue(name, "new", event.target.value)} /></label><label><small>Repetidos</small><input maxLength={3} inputMode="numeric" value={item.repeated || ""} onChange={(event) => updateValue(name, "repeated", event.target.value)} /></label><label><small>S/Resp</small><b>{response}</b></label></div></div><div className="advertising-subgroup"><span>Derivados <b>{derivedTotal}</b></span><div className="advertising-derived">{boxes.map((box) => <label key={box.id}><small className="advertising-box-label">{box.title}</small><input maxLength={3} inputMode="numeric" value={item.derived?.[box.id] || ""} onChange={(event) => updateAdvertising(name, { derived: { ...(item.derived || {}), [box.id]: Math.max(0, Number(String(event.target.value).replace(/\D/g, "").slice(0, 3)) || 0) } })} /></label>)}</div></div><strong className="advertising-effectiveness"><ReceiptText size={11} />{effectiveness}%</strong></div>; })}</div></div>
    <div className="bonus-card"><QuickBonusAccess caja={caja} update={update} onViewBonuses={onViewBonuses} onAddManualBonus={onAddManualBonus} /></div>
    <div className="chips-card"><div className="section-head chips-section-head"><div className="section-title"><Ticket size={16} /><div><h2>Fichas Finales</h2></div></div><label className="notes-toggle" title="Mostrar u ocultar notas de cuentas"><span>Notas</span><input type="checkbox" checked={notesEnabled} onChange={(event) => onNotesEnabledChange(event.target.checked)} /><i /></label></div><div className="final-chip-fields">{caja.chips.map((chip, index) => { const balance = number(chip.initial) - number(chip.final); const platformColor = boxColorStyle(config.platformColors?.[chip.platform] || "teal")["--box-accent"]; const isZero = number(chip.final) === 0; return <label className={`final-chip-field ${!isZero ? "has-value" : ""}`} style={{ "--platform-accent": platformColor }} key={chip.platform}><span>Ficha Final ({chip.platform})</span><AmountInput value={chip.final} className={isZero ? "zero-value" : "non-zero-value"} selectAllOnFirstClick inputProps={{ "aria-label": `Ficha final ${chip.platform}` }} onChange={(value) => { const chips = structuredClone(caja.chips); chips[index].final = value; update({ chips }); }} /><small className={balance < 0 ? "negative" : balance > 0 ? "positive" : "neutral"}>Saldo {money(balance)}</small></label>; })}</div></div>
  </section>;
}

function AdvertisingSectionRebuilt({ caja, update, boxes, config, onViewBonuses, onAddManualBonus, onNotify }) {
  const advertising = caja.advertising || {};
  const updateAdvertising = (name, patch) => update({ advertising: { ...advertising, [name]: { ...(advertising[name] || {}), ...patch } } });
  const updateValue = (name, field, value) => {
    const cleaned = String(value).replace(/\D/g, "").slice(0, 3);
    const numValue = cleaned === "" ? "" : Math.max(0, Number(cleaned));
    updateAdvertising(name, { [field]: numValue });
  };
  const copySummary = async () => {
    const lines = ["*CONTEO DE PUBLICIDAD:*", ""];
    ["Publicidad A", "Publicidad B"].forEach((name, index) => {
      const item = advertising[name] || {};
      const total = number(item.total);
      const derived = boxes.reduce((sum, box) => sum + number(item.derived?.[box.id]), 0);
      lines.push(`*${name}*`, `*Efectividad: ${total ? Math.round((derived / total) * 100) : 0}%*`, "", `*Llegados: ${total}*`, `Nuevos: ${number(item.new)}`, `Repetidos: ${number(item.repeated)}`, `S/Resp: ${total - number(item.new) - number(item.repeated)}`, "", `*Derivados: ${derived}*`, ...boxes.map((box) => `${box.title}: ${number(item.derived?.[box.id])}`), "", ...(index === 0 ? ["---------------------", ""] : []));
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
    <section className="panel publicity-panel"><SectionHead icon={<ReceiptText size={16} />} title="Publicidad" action={<button className="icon-button" title="Copiar conteo de publicidad" onClick={copySummary}><Copy size={15} /></button>} /><div className="publicity-list">{["Publicidad A", "Publicidad B"].map((name) => { const item = advertising[name] || {}; const total = number(item.total); const derived = boxes.reduce((sum, box) => sum + number(item.derived?.[box.id]), 0); const response = total - number(item.new) - number(item.repeated); const stepper = (field, label) => <label><span>{label}</span><div className="publicity-stepper"><button type="button" title={`Disminuir ${label.toLowerCase()}`} aria-label={`Disminuir ${label.toLowerCase()}`} onClick={() => updateValue(name, field, number(item[field]) - 1)}><ArrowLeft size={10} /></button><input maxLength={3} inputMode="numeric" value={item[field] ?? 0} onChange={(event) => updateValue(name, field, event.target.value)} /><button type="button" title={`Aumentar ${label.toLowerCase()}`} aria-label={`Aumentar ${label.toLowerCase()}`} onClick={() => updateValue(name, field, number(item[field]) + 1)}><ArrowRight size={10} /></button></div></label>; const derivedStepper = (box) => <label key={box.id}><small>{box.title}</small><div className="publicity-stepper"><button type="button" title={`Disminuir derivados de ${box.title}`} aria-label={`Disminuir derivados de ${box.title}`} onClick={() => updateAdvertising(name, { derived: { ...(item.derived || {}), [box.id]: Math.max(0, number(item.derived?.[box.id]) - 1) } })}><ArrowLeft size={10} /></button><input maxLength={3} inputMode="numeric" value={item.derived?.[box.id] ?? 0} onChange={(event) => updateAdvertising(name, { derived: { ...(item.derived || {}), [box.id]: Math.max(0, Number(String(event.target.value).replace(/\D/g, "").slice(0, 3)) || 0) } })} /><button type="button" title={`Aumentar derivados de ${box.title}`} aria-label={`Aumentar derivados de ${box.title}`} onClick={() => updateAdvertising(name, { derived: { ...(item.derived || {}), [box.id]: number(item.derived?.[box.id]) + 1 } })}><ArrowRight size={10} /></button></div></label>; return <div className="publicity-item" key={name}><strong className="publicity-name"><ReceiptText size={13} />{name}</strong><div className="publicity-numbers">{stepper("total", "Total")}{stepper("new", "Nuevos")}{stepper("repeated", "Repetidos")}<label><span>S/Resp</span><b>{response}</b></label></div><div className="publicity-derived"><span>Derivados <b>{derived}</b></span><div>{boxes.map(derivedStepper)}</div></div><strong className="publicity-rate"><ReceiptText size={11} />{total ? Math.round((derived / total) * 100) : 0}%</strong></div>; })}</div></section>
    <section className="panel publicity-bonus-panel"><QuickBonusAccess caja={caja} update={update} onViewBonuses={onViewBonuses} onAddManualBonus={onAddManualBonus} /></section>
    <section className="panel publicity-chips-panel"><SectionHead icon={<Ticket size={16} />} title="Fichas Finales" /><div className="publicity-chip-list">{caja.chips.map((chip, index) => { const balance = number(chip.initial) - number(chip.final); return <label key={chip.platform} style={{ "--platform-accent": boxColorStyle(config.platformColors?.[chip.platform] || "teal")["--box-accent"] }}><span>Ficha Final ({chip.platform})</span><AmountInput value={chip.final} onChange={(value) => { const chips = structuredClone(caja.chips); chips[index].final = value; update({ chips }); }} /><small className={balance < 0 ? "negative" : balance > 0 ? "positive" : "neutral"}>{money(balance)}</small></label>; })}</div></section>
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
  const [editorAmount, setEditorAmount] = useState("");
  const [editorWithdrawal, setEditorWithdrawal] = useState("");
  const [editorPercent, setEditorPercent] = useState("");
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
      return bonusSlotFor(bonus.createdAt, caja.date, shiftStart) === slot;
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
    setEditorAmount("");
    setEditorWithdrawal("");
    setEditorPercent("");
    setRecoveredMode(false);
    setEditorOpen(true);
  };
  const calculatedBonusAmount = Math.ceil(number(editorAmount) * (number(editorPercent) > 0 ? number(editorPercent) / 100 : 1));
  const addEditedBonus = () => {
    const amountValue = number(editorAmount);
    const withdrawalValue = number(editorWithdrawal);
    const percentValue = number(editorPercent);
    
    if (!amountValue || (recoveredMode && !withdrawalValue)) return;
    const amount = calculatedBonusAmount;
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
              {recoveredMode && <label className="bonus-editor-withdrawal">
                <span>Monto a retirar</span>
                <AmountInput value={editorWithdrawal} onChange={setEditorWithdrawal} />
              </label>}
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
              {recoveredMode
                ? <>
                  <div className="bonus-editor-complete"><span>Retiro completo</span><b>{money(number(editorWithdrawal) - calculatedBonusAmount)}</b></div>
                  <div className="bonus-editor-preview-row"><span>Bono a recuperar</span><b>{money(calculatedBonusAmount)}</b></div>
                </>
                : <>
                  {number(editorPercent) > 0 && number(editorPercent) !== 100 && <div className="bonus-editor-complete"><span>Carga completa</span><b>{money(number(editorAmount) + calculatedBonusAmount)}</b></div>}
                  <div className="bonus-editor-preview-row"><span>Bono a agregar</span><b>{money(calculatedBonusAmount)}</b></div>
                </>}
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
              <div className="recent-bonus-value"><span className="recent-bonus-time">{formatMovementTime(bonus.createdAt)} -</span><input
                  className="recent-bonus-amount"
                  defaultValue={money(amount)}
                  aria-label={`Valor del bono ${isRecovered ? "recuperado" : "otorgado"}`}
                  inputMode="decimal"
                  onFocus={(event) => { event.currentTarget.value = formatNumberInput(amount); event.currentTarget.select(); }}
                  onBlur={(event) => { const value = parseNumberInput(event.currentTarget.value); if (!value) { removeBonus(bonusIndex); return; } event.currentTarget.value = money(value); editBonus(bonusIndex, isRecovered ? { recovered: value, granted: 0 } : { granted: value, recovered: 0 }); }}
                  onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
                /></div>
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
  const isPaymentWallet = (wallet) => config.accounts.walletModes?.[wallet] === "Cobros + Retiros";
  const items = caja.accounts.flatMap((row) => config.accounts.wallets.filter((wallet) => isNormalWallet(row, wallet)).map((wallet) => ({
    key: `${row.holder}::${wallet}`,
    holder: row.holder,
    wallet,
    state: stateFor(row, wallet),
    balance: number(row.values?.[wallet]),
    paymentWallet: isPaymentWallet(wallet),
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
  const hasPaymentBalance = items.some((item) => item.paymentWallet && item.balance > 0);
  const recommendationPool = hasPaymentBalance ? items : items.filter((item) => item.paymentWallet);
  const recommended = recommendationPool.filter((item) => item.key !== currentItem.key).sort((first, second) => dateValue(first.restart) - dateValue(second.restart))[0] || recommendationPool[0] || currentItem;
  const recommendationReason = !hasPaymentBalance && recommended.paymentWallet ? "Reinicio más antiguo de billetera de pagos" : "Reinicio más antiguo";
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
        if (previous.collections !== nextState.collections) {
          if (previous.collections) nextState.lastCollectionsAt = now;
          row.walletRestartAt = { ...(row.walletRestartAt || {}), [wallet]: now };
        }
        row.verified = { ...(row.verified || {}), [wallet]: nextState };
      });
    });
    onUpdateAccounts(accounts);
  };
  const requestInUse = (target) => setPendingWallet(target);
  const moveRoute = (offset) => requestInUse(items[(currentIndex + offset + items.length) % items.length]);

  return <section className="panel wallet-route" aria-label="Seguimiento de billeteras">
    <div className="wallet-recommendation"><span><WalletCards size={15} /> Billetera recomendada</span><strong>{recommended.holder} · {recommended.wallet}</strong><small>{recommendationReason} · {formatRestart(recommended.restart)}</small></div>
    <div className="wallet-route-head"><h2><WalletCards size={16} /> Próximas Billeteras</h2><span>Ruta normal</span><div className="wallet-route-actions"><button type="button" title="Billetera anterior" onClick={() => moveRoute(-1)}><ArrowLeft size={13} /> Anterior</button><button type="button" title="Próxima billetera" onClick={() => moveRoute(1)}>Próxima <ArrowRight size={13} /></button><button type="button" title="Usar billetera recomendada" onClick={() => requestInUse(recommended)}><WalletCards size={13} /> Recomendada</button></div></div>
    <div className="wallet-route-list">{route.map((item, index) => <div className={`wallet-route-item ${index === 0 ? "current" : "clickable"}`} key={`${item.key}-${index}`} onClick={() => index > 0 && requestInUse(item)} role={index > 0 ? "button" : undefined} tabIndex={index > 0 ? 0 : undefined} onKeyDown={(event) => { if (index > 0 && (event.key === "Enter" || event.key === " ")) requestInUse(item); }}><span className="wallet-route-index">{index === 0 ? "En uso" : `+${index}`}</span><strong>{item.holder} · {item.wallet}</strong>{item.key === recommended.key && <small>Recomendada</small>}</div>)}</div>
    {pendingWallet && <ConfirmDialog dialog={{ message: `¿Desea colocar en uso la billetera ${pendingWallet.holder} · ${pendingWallet.wallet}?`, onConfirm: () => { markInUse(pendingWallet); setPendingWallet(null); } }} onClose={() => setPendingWallet(null)} />}
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
  const [selectedBoxIds, setSelectedBoxIds] = useState(boxes.map(b => b.id));
  const [combinedView, setCombinedView] = useState(true);
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
  
  const metricsConfig = [
    {
      section: "General",
      metrics: [
        { label: "Propinas", key: "tips" },
        { label: "Caja inicial (Promedio)", key: "cashInitial", isAverage: true },
        { label: "Caja final (Promedio)", key: "cashFinal", isAverage: true },
        { label: "Diferencia caja (Promedio)", key: "cashDifference", isAverage: true },
        { label: "Diferencia real (Promedio)", key: "realDifference", isAverage: true },
        { label: "Saldo (Promedio)", key: "balance", isAverage: true },
        { label: "Redondeo (Promedio)", key: "rounding", isAverage: true },
      ]
    },
    {
      section: "Bonos",
      metrics: [
        { label: "Bonos otorgados", key: "granted" },
        { label: "Bonos recuperados", key: "recovered" },
        { label: "Bonos netos", key: "bonusesNet" },
      ]
    },
    {
      section: "Cargas de Fichas",
      dynamic: true
    },
    {
      section: "Traspasos",
      dynamic: true
    },
    {
      section: "Gastos",
      dynamic: true
    }
  ];
  return <main className="statistics-page">
    <section className="panel statistics-toolbar"><div><h2><BarChart3 size={18} /> Estadísticas</h2><span>{filtered.length} turnos dentro del período</span></div><div className="statistics-boxes"><strong>Cajas</strong>{boxes.map((box) => <label key={box.id} style={{ color: boxColorStyle(box.color)["--box-accent"] }}><input type="checkbox" checked={selectedBoxIds.includes(box.id)} onChange={() => setSelectedBoxIds((current) => current.includes(box.id) ? current.filter((id) => id !== box.id) : [...current, box.id])} />{box.title}</label>)}</div><label className="statistics-combined" style={{ color: "white" }}><input type="checkbox" checked={combinedView} onChange={(event) => setCombinedView(event.target.checked)} /> Suma seleccionadas</label><div className="statistics-dates"><label>Desde<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /></label><label>Hasta<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} /></label></div><div className="statistics-shortcuts">{[["hoy", "Hoy"], ["ayer", "Ayer"], ["semana", "Semana actual"], ["mes", "Mes actual"], ["anterior", "Mes anterior"]].map(([key, label]) => <button type="button" key={key} onClick={() => shortcut(key)}>{label}</button>)}</div></section>
    {summarySets.map(({ box, summaries: boxSummaries }) => <section className="statistics-box-section" key={box.id} style={combinedView ? {} : boxColorStyle(box.color)}><h2 className="statistics-box-title" style={{ borderBottom: `3px solid ${combinedView ? "#ffffff" : boxColorStyle(box.color)["--box-accent"]}`, paddingBottom: "8px" }}>{box.title}</h2><section className="statistics-grid">{boxSummaries.map((group) => {
      const renderMetricSection = (section) => {
        const accentColor = combinedView ? "#ffffff" : box.color ? boxColorStyle(box.color)["--box-accent"] : "#72d7ca";
        if (section.dynamic) {
          if (section.section === "Cargas de Fichas") {
            const chipData = (combinedView ? combinedRows : group.rows).flatMap((caja) => caja.chips || []).reduce((acc, chip) => {
              acc[chip.platform] = (acc[chip.platform] || 0) + number(chip.initial);
              return acc;
            }, {});
            return Object.keys(chipData).length > 0 ? (
              <div key={section.section} className="statistics-section">
                <h3 style={{ color: accentColor }}>{section.section}</h3>
                {Object.entries(chipData).map(([platform, value]) => (
                  <div key={platform}>
                    <span>Carga de Fichas {platform}</span>
                    <b>{money(value)}</b>
                  </div>
                ))}
              </div>
            ) : null;
          }
          if (section.section === "Traspasos") {
            const transferData = (combinedView ? combinedRows : group.rows).flatMap((caja) => caja.transfers || []).reduce((acc, transfer) => {
              const fromBox = boxes.find((b) => b.id === transfer.fromBoxId)?.title || "Caja";
              const toBox = boxes.find((b) => b.id === transfer.toBoxId)?.title || "Caja";
              const key = `${fromBox} → ${toBox}`;
              acc[key] = (acc[key] || 0) + number(transfer.amount);
              return acc;
            }, {});
            return Object.keys(transferData).length > 0 ? (
              <div key={section.section} className="statistics-section">
                <h3 style={{ color: accentColor }}>{section.section}</h3>
                {Object.entries(transferData).map(([route, value]) => (
                  <div key={route}>
                    <span>{route}</span>
                    <b>{money(value)}</b>
                  </div>
                ))}
              </div>
            ) : null;
          }
          if (section.section === "Gastos") {
            const expensesObj = group.values.expensesByCategory || {};
            const withoutEmpty = Object.entries(expensesObj).filter(([_, val]) => val !== 0);
            return (
              <div key={section.section} className="statistics-section">
                <h3 style={{ color: accentColor }}>{section.section}</h3>
                {withoutEmpty.length > 0 ? withoutEmpty.map(([category, value]) => (
                  <div key={category}>
                    <span>{category || "Sin Categoría"}</span>
                    <b>{money(value)}</b>
                  </div>
                )) : <small>Sin gastos</small>}
              </div>
            );
          }
        }
        return (
          <div key={section.section} className="statistics-section">
            <h3 style={{ color: accentColor }}>{section.section}</h3>
            {section.metrics.map((metric) => {
              let displayValue = group.values[metric.key];
              if (metric.isAverage && group.rows.length > 0) {
                displayValue = displayValue / group.rows.length;
              }
              const isAverageMetric = metric.isAverage;
              const valueColor = isAverageMetric ? (displayValue >= 0 ? "#6dd5a8" : "#ef8888") : undefined;
              return (
                <div key={metric.key}>
                  <span>{metric.label}</span>
                  <b style={{ color: valueColor }}>{money(displayValue)}</b>
                </div>
              );
            })}
          </div>
        );
      };
      return (
        <section className={`panel statistics-shift ${group.shift === "Total" ? "statistics-total" : ""}`} key={`${box.id}-${group.shift}`}>
          <div className="statistics-shift-head">
            <h2>{group.shift}</h2>
            <span>{group.rows.length} turnos</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {metricsConfig.map((section) => renderMetricSection(section))}
          </div>
        </section>
      );
    })}</section></section>)}
    <section className="statistics-visuals"><section className="panel statistics-chart"><div className="statistics-chart-head"><div><h2>Comparativa por turno</h2><span>Seleccioná una métrica y una barra</span></div><select value={chartMetric} onChange={(event) => { setChartMetric(event.target.value); setSelectedBar(null); }}>{metricOptions.map((metric) => <option value={metric.key} key={metric.key}>{metric.label}</option>)}</select></div><div className="statistics-bars">{chartRows.map((row) => <button type="button" className={selectedBar === row.label ? "selected" : ""} key={row.label} onClick={() => setSelectedBar(row.label)}><span className="statistics-bar-value">{money(row.value)}</span><i style={{ height: `${Math.max(4, row.value / maxChart * 150)}px` }} /><small>{row.label}</small></button>)}</div>{selectedBar && <p className="statistics-chart-detail">{selectedBar}: <b>{money(chartRows.find((row) => row.label === selectedBar)?.value)}</b></p>}</section><section className="panel statistics-tips"><div className="statistics-chart-head"><div><h2>Totalizador de propinas</h2><span>Valores guardados en configuración</span></div><Coins size={18} /></div><div className="statistics-tip-total"><span>Total de propinas</span><strong>{money(total.tips)}</strong></div><div className="statistics-tip-fields"><label>Empleados<input type="number" min="1" step="1" value={statistics.employees ?? 1} onChange={(event) => updateStatistics({ employees: Math.max(1, number(event.target.value)) })} /></label><label>Propinas c/u<strong>{money(total.tips / employees)}</strong></label><label>% proporcional<input type="number" min="0" max="100" step="1" value={statistics.proportionalPercent ?? 100} onChange={(event) => updateStatistics({ proportionalPercent: Math.min(100, Math.max(0, number(event.target.value))) })} /></label><label>Proporcional c/u<strong>{money(total.tips / employees * percent / 100)}</strong></label></div></section></section>
    </main>
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

function UsersPage({ config, boxes, activeBoxId, onConfigChange, onNotify, api }) {
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sortMode, setSortMode] = useState("none");
  const [groupMode, setGroupMode] = useState("none");
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ names: [""], phones: [""], titulars: [""], boxes: [activeBoxId], subPlatforms: [], userInfo: null, createdAt: new Date().toISOString() });
  const configUsers = Array.isArray(config?.users) ? config.users : [];
  const [editableUsers, setEditableUsers] = useState(configUsers);
  const [globalClarifications, setGlobalClarifications] = useState(Array.isArray(config?.userClarifications) ? config.userClarifications : []);
  const [globalPlatformSubPlatforms, setGlobalPlatformSubPlatforms] = useState(config?.platformSubPlatforms || {});
  const [userInfoOptionsByBox, setUserInfoOptionsByBox] = useState({ [String(activeBoxId)]: config?.userInfoOptions || [] });
  const usersLoadedRef = React.useRef(false);
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [dragIndex, setDragIndex] = useState(null);
  const persistUsersRef = React.useRef(false);
  const users = editableUsers;
  const clarifications = globalClarifications;
  const platformSubPlatforms = globalPlatformSubPlatforms;
  const boxById = Object.fromEntries((boxes || []).map((box) => [String(box.id), box]));
  const dedupeSubPlatformEntries = (platform, values) => {
    const next = [];
    const seen = new Set();
    (Array.isArray(values) ? values : []).forEach((sub) => {
      const name = String(typeof sub === "string" ? sub : (sub?.name || "")).trim();
      if (!name) return;
      const signature = `${platform}::${name.toLowerCase()}`;
      if (seen.has(signature)) return;
      seen.add(signature);
      next.push({
        name,
        color: typeof sub === "string" ? (config?.platformColors?.[platform] || "teal") : (sub?.color || config?.platformColors?.[platform] || "teal"),
      });
    });
    return next;
  };
  const boxSubPlatformsFor = (boxId) => {
    const seen = new Set();
    return (config?.platforms || []).flatMap((platform) => {
      return dedupeSubPlatformEntries(platform, platformSubPlatforms[platform] || []).flatMap((sub) => {
        const key = `${boxId}::${platform}::${sub.name}`;
        if (seen.has(key)) return [];
        seen.add(key);
        return [{
          key,
          label: sub.name,
          color: sub.color || config?.platformColors?.[platform] || "teal",
        }];
      });
    });
  };
  const mergeUsers = (userLists) => {
    const merged = new Map();
    userLists.flat().forEach((user) => {
      const names = Array.isArray(user?.names) ? user.names : [user?.name];
      const phones = Array.isArray(user?.phones) ? user.phones : [user?.phone];
      const titulars = Array.isArray(user?.titulars) ? user.titulars : (user?.titular ? [user.titular] : []);
      const identity = user?.id || `${names.find(Boolean) || ""}::${phones.find(Boolean) || ""}`;
      const previous = merged.get(identity);
      const uniqueValues = (values) => [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
      merged.set(identity, {
        ...(previous || {}),
        ...user,
        id: user?.id || previous?.id || `user-${crypto.randomUUID()}`,
        names: uniqueValues([...(previous?.names || []), ...names]),
        phones: uniqueValues([...(previous?.phones || []), ...phones]),
        titulars: uniqueValues([...(previous?.titulars || []), ...titulars]),
        boxes: uniqueValues([...(previous?.boxes || []), ...(user?.boxes || [])]),
        subPlatforms: uniqueValues([...(previous?.subPlatforms || []), ...(user?.subPlatforms || [])]),
        clarifications: uniqueValues([...(previous?.clarifications || []), ...(user?.clarifications || [])]),
        linkedUsers: uniqueValues([...(previous?.linkedUsers || []), ...(user?.linkedUsers || [])]),
        createdAt: previous?.createdAt || user?.createdAt || new Date().toISOString(),
      });
    });
    return [...merged.values()];
  };
  useEffect(() => {
    if (!api || usersLoadedRef.current || !(boxes || []).length) return undefined;
    let cancelled = false;
    Promise.all((boxes || []).map((box) => api(`/api/configuracion?boxId=${box.id}`).catch(() => ({ users: [] }))))
      .then((configs) => {
        if (cancelled) return;
        setEditableUsers(configUsers);
        setGlobalClarifications(Array.isArray(config?.userClarifications) ? config.userClarifications : []);
        setGlobalPlatformSubPlatforms(config?.platformSubPlatforms || {});
        setUserInfoOptionsByBox(Object.fromEntries((boxes || []).map((box, index) => [String(box.id), Array.isArray(configs[index]?.userInfoOptions) ? configs[index].userInfoOptions : []])));
        usersLoadedRef.current = true;
      });
    return () => { cancelled = true; };
  }, [api, boxes, config]);
  const updateUsers = (nextUsers) => {
    persistUsersRef.current = true;
    setEditableUsers(nextUsers);
  };
  const openNewUser = () => {
    setNewUser({ names: [""], phones: [""], titulars: [""], boxes: [activeBoxId], subPlatforms: [], userInfo: null, createdAt: new Date().toISOString() });
    setNewUserOpen(true);
  };
  const saveNewUser = () => {
    const names = newUser.names.map((name) => name.trim()).filter(Boolean);
    const phones = newUser.phones.map((phone) => phone.trim()).filter(Boolean);
    const titulars = newUser.titulars.map((titular) => titular.trim()).filter(Boolean);
    if (!names.length || !phones.length) {
      onNotify?.("El usuario necesita al menos un nombre y un número de teléfono.");
      return;
    }
    if (!userInfoValueFor(newUser.userInfo)) {
      onNotify?.("El usuario necesita un panel.");
      return;
    }
    if (!newUser.boxes.length) {
      onNotify?.("El usuario necesita al menos una caja.");
      return;
    }
    if (!newUser.subPlatforms.length) {
      onNotify?.("El usuario necesita al menos una plataforma.");
      return;
    }
    updateUsers([...users, { ...newUser, id: `user-${crypto.randomUUID()}`, names, phones, titulars, createdAt: new Date(newUser.createdAt).toISOString(), clarifications: [], linkedUsers: [] }]);
    setNewUserOpen(false);
  };
  const userInfoOptionsFor = (selectedBoxes) => selectedBoxes.flatMap((boxId) => (userInfoOptionsByBox[String(boxId)] || []).map((label) => ({ value: `${boxId}::${label}`, label: `${boxById[String(boxId)]?.title || "Caja"} · ${label}`, boxId })));
  const userInfoValueFor = (userInfo) => typeof userInfo === "object" ? (userInfo?.boxId && userInfo?.value ? `${userInfo.boxId}::${userInfo.value}` : "") : String(userInfo || "");
  const userInfoFromValue = (value) => { const separator = value.indexOf("::"); return separator < 0 ? null : { boxId: value.slice(0, separator), value: value.slice(separator + 2) }; };
  useEffect(() => {
    if (!persistUsersRef.current) return undefined;
    const timer = window.setTimeout(() => {
      persistUsersRef.current = false;
      Promise.resolve(onConfigChange({ ...config, users: editableUsers, userClarifications: globalClarifications, platformSubPlatforms: globalPlatformSubPlatforms })).catch((error) => onNotify?.(error.message));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [editableUsers, globalClarifications, globalPlatformSubPlatforms, activeBoxId, boxes, api, config, onConfigChange, onNotify]);
  const normalizeIdList = (list) => Array.isArray(list) ? list.filter(Boolean).map(String) : [];
  const compactValues = (values, fallback) => {
    const cleanValues = values.map((value) => String(value || "").trim()).filter(Boolean);
    if (!cleanValues.length) return fallback;
    return `${cleanValues[0]}${cleanValues.length > 1 ? ` (${cleanValues.slice(1).join(" / ")})` : ""}`;
  };
  const isMatch = (user, query) => {
    if (!query) return true;
    const haystack = [
      ...(user.names || []),
      ...(user.phones || []),
      ...(user.titulars || []),
      user.createdAt,
      ...(user.boxes || []),
      ...(user.boxes || []).map((boxId) => boxById[String(boxId)]?.title || ""),
      ...(user.subPlatforms || []),
      ...(user.linkedUsers || []),
      ...clarifications.filter((clarification) => (user.clarifications || []).includes(clarification.id)).map((clarification) => clarification.text),
    ].join(" ").toLowerCase();
    return haystack.includes(query.toLowerCase());
  };
  const sortUsers = (items) => {
    const sorted = [...items];
    if (sortMode === "name-asc" || sortMode === "name-desc") {
      sorted.sort((first, second) => {
        const firstName = String(first.names?.find(Boolean) || first.titulars?.find(Boolean) || "").toLowerCase();
        const secondName = String(second.names?.find(Boolean) || second.titulars?.find(Boolean) || "").toLowerCase();
        return sortMode === "name-asc" ? firstName.localeCompare(secondName) : secondName.localeCompare(firstName);
      });
    }
    return sorted;
  };
  const groupLabel = (user) => {
    if (groupMode === "box") return user.boxes?.map((id) => boxById[String(id)]?.title).filter(Boolean).join(" / ") || "Sin caja";
    if (groupMode === "clarification") return clarifications.filter((item) => user.clarifications?.includes(item.id)).map((item) => item.text).filter(Boolean).join(" / ") || "Sin aclaración";
    if (groupMode === "subplatform") return user.subPlatforms?.map((item) => item.split("::").at(-1)).filter(Boolean).join(" / ") || "Sin subplataforma";
    if (groupMode === "linked") return user.linkedUsers?.length ? "Vinculados" : "Sin vínculos";
    return "Todos";
  };
  const renderListField = (label, valueList, onAdd, onUpdate, onDelete, onReorder, editable = true) => {
    const addLabel = label.includes("Nombre") ? "Agregar Nombre de Usuario" : label.includes("teléfono") ? "Agregar Número de Teléfono" : "Agregar Titular";
    const reorder = (targetIndex) => {
      if (dragIndex === null || dragIndex === targetIndex) return;
      const next = [...valueList];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIndex, 0, moved);
      onReorder(next);
      setDragIndex(null);
    };
    return (
      <>
      <div className="users-list-field" data-editable={editable}>
        <span>{label}</span>
        <div className="users-inline-list">
          {(valueList.length ? valueList : [""]).map((value, index) => (
            <div key={`${label}-${index}`} className="users-list-item" draggable={editable && index > 0} onDragStart={() => index > 0 && setDragIndex(index)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorder(index)} onDragEnd={() => setDragIndex(null)}>
              <input
                value={value}
                placeholder={label}
                disabled={!editable}
                onChange={(event) => onUpdate(index, event.target.value)}
                data-mode={editable ? "edit" : "readonly"}
              />
              {index > 0 && editable && <button type="button" className="delete-button" title={`Eliminar ${label}`} onClick={async () => { if (await confirmDelete(`¿Eliminar "${value || "vacío"}"?`)) onDelete(index); }}><Trash2 size={13} /></button>}
            </div>
          ))}
          {editable && <button className="config-add" type="button" disabled={!valueList.length || !String(valueList[valueList.length - 1] || "").trim()} onClick={onAdd}><Plus size={15} /> {addLabel}</button>}
        </div>
      </div>
      {valueList === newUser.titulars && <label className="field-block"><span>Panel</span><select value={userInfoValueFor(newUser.userInfo)} onChange={(event) => setNewUser((current) => ({ ...current, userInfo: userInfoFromValue(event.target.value) }))}><option value="">Sin seleccionar</option>{userInfoOptionsFor(newUser.boxes || []).map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>}
      </>
    );
  };
  const visibleUsers = sortUsers(users.filter((user) => isMatch(user, search)));
  const groupedUsers = groupMode === "none"
    ? [["", visibleUsers]]
    : [...new Map(visibleUsers.map((user) => [groupLabel(user), []])).entries()].map(([label]) => [label, visibleUsers.filter((user) => groupLabel(user) === label)]);
  return <main className="users-page">
    <section className="panel users-panel">
      <div className="users-head">
        <div>
          <h2><Users size={18} /> Usuarios</h2>
          <span>{users.length} registros</span>
        </div>
        <div className="users-search">
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, teléfono, titular o caja" />
          <button className={`icon-button users-filter-button ${filtersOpen ? "active" : ""}`} type="button" title="Filtros y orden" onClick={() => setFiltersOpen(!filtersOpen)}><Settings2 size={15} /></button>
          {filtersOpen && <div className="users-filter-menu"><label><span>Ordenar</span><select value={sortMode} onChange={(event) => setSortMode(event.target.value)}><option value="none">Sin ordenar</option><option value="name-asc">Nombre A-Z</option><option value="name-desc">Nombre Z-A</option></select></label><label><span>Agrupar por</span><select value={groupMode} onChange={(event) => setGroupMode(event.target.value)}><option value="none">Sin agrupar</option><option value="clarification">Aclaraciones</option><option value="box">Caja</option><option value="subplatform">Subplataforma</option><option value="linked">Vínculos</option></select></label></div>}
        </div>
      </div>
      <div className="users-actions">
        <button className="config-add" type="button" onClick={openNewUser}><UserPlus size={15} /> Nuevo usuario</button>
      </div>
      <div className="users-list">
        {groupedUsers.map(([groupLabelValue, groupUsers]) => <React.Fragment key={groupLabelValue || "all-users"}>{groupMode !== "none" && <div className="users-group-title">{groupLabelValue}</div>}{groupUsers.map((user) => {
          const selectedUserBoxes = normalizeIdList(user.boxes);
          const selectedClarifications = new Set(normalizeIdList(user.clarifications));
          const linkedOptions = users.filter((other) => other.id !== user.id).map((other) => ({ value: other.id, label: [...(other.names || [])].filter(Boolean).join(" / ") || other.titular || "Usuario sin nombre" }));
          const expanded = expandedUserId === user.id;
          const editing = editingUserId === user.id;
          const displayClarifications = clarifications.filter((clarification) => selectedClarifications.has(clarification.id));
          const userBoxes = selectedUserBoxes.map((boxId) => boxById[boxId]).filter(Boolean);
          const compactName = compactValues(user.names || [], compactValues(user.titulars || [], "Usuario sin nombre"));
          const userSubPlatforms = (boxes || []).filter((box) => selectedUserBoxes.includes(String(box.id))).flatMap((box) => boxSubPlatformsFor(box.id)).filter((option) => (user.subPlatforms || []).includes(option.key));
          const unlinkUser = (linkedUserId) => updateUsers(users.map((item) => item.id === user.id ? { ...item, linkedUsers: (item.linkedUsers || []).filter((id) => id !== linkedUserId) } : item.id === linkedUserId ? { ...item, linkedUsers: (item.linkedUsers || []).filter((id) => id !== user.id) } : item));
          return (
          <div className={`user-card ${expanded ? "expanded" : "compact"}`} key={user.id}>
            <div className="user-card-head" onClick={() => { setExpandedUserId(expanded ? null : user.id); setEditingUserId(null); }} style={{ cursor: "pointer" }}>
              <button className="icon-button user-collapse" type="button" title={expanded ? "Minimizar" : "Expandir"} onClick={(event) => { event.stopPropagation(); setExpandedUserId(expanded ? null : user.id); setEditingUserId(null); }}><ChevronDown size={15} style={{ transform: expanded ? "rotate(0)" : "rotate(-90deg)", transition: "transform 0.2s" }} /></button>
              <div className="user-card-title"><strong>{compactName.toLowerCase()}</strong><div className="clarification-underline" aria-label="Aclaraciones seleccionadas">{displayClarifications.map((clarification) => <i key={clarification.id} title={clarification.text} style={{ background: boxColorStyle(clarification.color || "teal")["--box-accent"] }} />)}</div></div>
              <div className="user-assignment-pills" aria-label="Cajas y subplataformas del usuario"><div className="user-box-pills">{userBoxes.map((box) => <span key={box.id} style={{ "--box-pill-accent": boxColorStyle(box.color)["--box-accent"] }}>{box.title}</span>)}</div>{userSubPlatforms.length > 0 && <b>|</b>}<div className="user-subplatform-pills">{userSubPlatforms.map((option) => <span key={option.key} style={{ "--box-pill-accent": boxColorStyle(option.color)["--box-accent"] }}>{option.label}</span>)}</div></div>
              <button className="icon-button user-edit" type="button" title={editing ? "Salir del modo edición" : "Editar usuario"} onClick={(event) => { event.stopPropagation(); if (editing) { setEditingUserId(null); return; } setExpandedUserId(user.id); setEditingUserId(user.id); }}>{editing ? <Check size={15} /> : <Pencil size={15} />}</button>
              <button className="delete-button user-delete" type="button" title="Eliminar usuario" onClick={async (event) => { event.stopPropagation(); if (await confirmDelete(`¿Eliminar a ${user.names?.[0] || "este usuario"}?`)) updateUsers(users.filter((item) => item.id !== user.id)); }}><Trash2 size={15} /></button>
            </div>
            {expanded && <>
            <div className="user-fields-grid">
              {renderListField("Nombre de usuario", Array.isArray(user.names) && user.names.length ? user.names : [""], () => updateUsers(users.map((item) => item.id === user.id ? { ...item, names: [...(item.names || [""]), ""] } : item)), (index, value) => updateUsers(users.map((item) => item.id === user.id ? { ...item, names: (item.names || [""]).map((name, nameIndex) => nameIndex === index ? value : name) } : item)), (index) => updateUsers(users.map((item) => item.id === user.id ? { ...item, names: (item.names || []).filter((_, nameIndex) => nameIndex !== index) } : item)), (newNames) => updateUsers(users.map((item) => item.id === user.id ? { ...item, names: newNames } : item)), editing)}
              {renderListField("Número de teléfono", Array.isArray(user.phones) && user.phones.length ? user.phones : [""], () => updateUsers(users.map((item) => item.id === user.id ? { ...item, phones: [...(item.phones || [""]), ""] } : item)), (index, value) => updateUsers(users.map((item) => item.id === user.id ? { ...item, phones: (item.phones || [""]).map((phone, phoneIndex) => phoneIndex === index ? value : phone) } : item)), (index) => updateUsers(users.map((item) => item.id === user.id ? { ...item, phones: (item.phones || []).filter((_, phoneIndex) => phoneIndex !== index) } : item)), (newPhones) => updateUsers(users.map((item) => item.id === user.id ? { ...item, phones: newPhones } : item)), editing)}
              {renderListField("Titular", Array.isArray(user.titulars) && user.titulars.length ? user.titulars : [""], () => updateUsers(users.map((item) => item.id === user.id ? { ...item, titulars: [...(item.titulars || [""]), ""] } : item)), (index, value) => updateUsers(users.map((item) => item.id === user.id ? { ...item, titulars: (item.titulars || [""]).map((titular, titularIndex) => titularIndex === index ? value : titular) } : item)), (index) => updateUsers(users.map((item) => item.id === user.id ? { ...item, titulars: (item.titulars || []).filter((_, titularIndex) => titularIndex !== index) } : item)), (newTitulars) => updateUsers(users.map((item) => item.id === user.id ? { ...item, titulars: newTitulars } : item)), editing)}
              <label className="field-block">
                <span>Panel</span>
                <select required disabled={!editing} value={userInfoValueFor(user.userInfo)} onChange={(event) => { if (!event.target.value) { onNotify?.("El usuario necesita un panel."); return; } updateUsers(users.map((item) => item.id === user.id ? { ...item, userInfo: userInfoFromValue(event.target.value) } : item)); }}><option value="">Sin seleccionar</option>{userInfoOptionsFor(selectedUserBoxes).map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select>
              </label>
              <label className="field-block">
                <span>Fecha creación</span>
                <input type="datetime-local" disabled={!editing} value={user.createdAt ? new Date(user.createdAt).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16)} onChange={(event) => updateUsers(users.map((item) => item.id === user.id ? { ...item, createdAt: new Date(event.target.value).toISOString() } : item))} />
              </label>
            </div>
            <div className="user-checks-grid">
              <div className="check-group">
                <span>Cajas</span>
                <div className="checkbox-list">
                  {(boxes || []).filter((box) => editing || selectedUserBoxes.includes(box.id)).map((box) => {
                    const checked = selectedUserBoxes.includes(box.id);
                    return <label className="user-switch" key={box.id} style={{ "--switch-accent": boxColorStyle(box.color)["--box-accent"] }}><input type="checkbox" disabled={!editing} checked={checked} onChange={() => { if (checked && selectedUserBoxes.length <= 1) { onNotify?.("El usuario necesita al menos una caja."); return; } if (checked && (user.subPlatforms || []).filter((key) => key.startsWith(`${box.id}::`)).length === (user.subPlatforms || []).length) { onNotify?.("El usuario necesita al menos una plataforma."); return; } updateUsers(users.map((item) => item.id === user.id ? { ...item, boxes: checked ? (item.boxes || []).filter((id) => id !== box.id) : [...(item.boxes || []), box.id], subPlatforms: checked ? (item.subPlatforms || []).filter((key) => !key.startsWith(`${box.id}::`)) : (item.subPlatforms || []) } : item)); }} /><i /> <span>{box.title}</span></label>;
                  })}
                </div>
              </div>
              <div className="check-group">
                <span>Plataformas</span>
                <div className="checkbox-list subplatforms-grouped">
                  {(boxes || []).filter((box) => selectedUserBoxes.includes(box.id)).map((box) => {
                    const subOptions = boxSubPlatformsFor(box.id);
                    const visibleOptions = subOptions.filter((option) => editing || (user.subPlatforms || []).includes(option.key));
                    if (visibleOptions.length === 0) return null;
                    return <div key={box.id} className="subplatforms-group" style={{ "--box-pill-accent": boxColorStyle(box.color)["--box-accent"] }}><div className="subplatforms-group-title">{box.title}</div>{visibleOptions.map((option) => <label className="user-switch" key={option.key} style={{ "--switch-accent": boxColorStyle(option.color)["--box-accent"] }}><input type="checkbox" disabled={!editing} checked={(user.subPlatforms || []).includes(option.key)} onChange={() => { const checked = (user.subPlatforms || []).includes(option.key); if (checked && (user.subPlatforms || []).length <= 1) { onNotify?.("El usuario necesita al menos una plataforma."); return; } updateUsers(users.map((item) => item.id === user.id ? { ...item, subPlatforms: checked ? (item.subPlatforms || []).filter((sub) => sub !== option.key) : [...(item.subPlatforms || []), option.key] } : item)); }} /><i /> <span>{option.label}</span></label>)}</div>;
                  })}
                </div>
              </div>
            </div>
            <div className="user-clarifications">
              <span>Aclaraciones</span>
              <div className="checkbox-list compact">
                {(clarifications || []).filter((clarification) => editing || selectedClarifications.has(clarification.id)).map((clarification) => {
                  const checked = selectedClarifications.has(clarification.id);
                  return <label key={clarification.id} className="clarification-pill user-switch" style={{ "--switch-accent": boxColorStyle(clarification.color || "teal")["--box-accent"], borderColor: clarification.color ? `var(--${clarification.color})` : undefined, color: `var(--${clarification.color || "teal"})` }}>
                    <input type="checkbox" disabled={!editing} checked={checked} onChange={() => updateUsers(users.map((item) => item.id === user.id ? { ...item, clarifications: checked ? (item.clarifications || []).filter((id) => id !== clarification.id) : [...(item.clarifications || []), clarification.id] } : item))} />
                    <i /> <span>{clarification.emoji || "•"} {clarification.text || "Aclaración"}</span>
                  </label>;
                })}
              </div>
            </div>
            <div className="user-linked-section">
              <span>Usuarios vinculados</span>
              <div className="user-linked-controls">
                <input list={`linked-users-${user.id}`} disabled={!editing} placeholder="Buscar usuario para vincular" />
                <datalist id={`linked-users-${user.id}`}>
                  {linkedOptions.length ? linkedOptions.map((option) => <option key={option.value} value={option.label} />) : <option value="No se encontraron usuarios" disabled />}
                </datalist>
                <button type="button" className="config-add" disabled={!editing} onClick={() => {
                  const list = document.querySelector(`#linked-users-${user.id}`);
                  const input = list?.previousElementSibling;
                  if (!input || !input.value) return;
                  const selected = linkedOptions.find((option) => option.label === input.value);
                  if (!selected) return;
                  if ((user.linkedUsers || []).includes(selected.value)) return;
                  updateUsers(users.map((item) => {
                    if (item.id === user.id) return { ...item, linkedUsers: [...(item.linkedUsers || []), selected.value] };
                    if (item.id === selected.value) return { ...item, linkedUsers: [...(item.linkedUsers || []), user.id] };
                    return item;
                  }));
                  input.value = "";
                }}>Vincular</button>
              </div>
              <div className="linked-tags">
                {((user.linkedUsers || []).map((linkedId) => users.find((entry) => entry.id === linkedId)).filter(Boolean)).map((linkedUser) => <span key={linkedUser.id} className="linked-tag">{((linkedUser.names || []).filter(Boolean).join(" / ") || linkedUser.titular || "Usuario").trim()}<button type="button" title="Desvincular usuario" disabled={!editing} onClick={async () => { if (await confirmDelete(`¿Desvincular de ${((linkedUser.names || []).filter(Boolean)[0] || "este usuario")}?`)) unlinkUser(linkedUser.id); }}><X size={11} /></button></span>)}
              </div>
            </div>
            </>}
          </div>
          );
        })}</React.Fragment>)}
        {users.length === 0 && <div className="empty-state">No hay usuarios cargados todavía.</div>}
      </div>
      {newUserOpen && <div className="modal-backdrop" onClick={() => setNewUserOpen(false)}><div className="modal users-create-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" title="Cancelar" onClick={() => setNewUserOpen(false)}><X size={18} /></button><div className="modal-icon"><UserPlus size={21} /></div><h2>Nuevo usuario</h2><p>Completá los datos obligatorios para darlo de alta.</p><div className="user-fields-grid"><div>{renderListField("Nombre de usuario *", newUser.names, () => setNewUser((current) => ({ ...current, names: [...current.names, ""] })), (index, value) => setNewUser((current) => ({ ...current, names: current.names.map((name, nameIndex) => nameIndex === index ? value : name) })), (index) => setNewUser((current) => ({ ...current, names: current.names.filter((_, nameIndex) => nameIndex !== index) })), (newNames) => setNewUser((current) => ({ ...current, names: newNames })))}</div><div>{renderListField("Número de teléfono *", newUser.phones, () => setNewUser((current) => ({ ...current, phones: [...current.phones, ""] })), (index, value) => setNewUser((current) => ({ ...current, phones: current.phones.map((phone, phoneIndex) => phoneIndex === index ? value : phone) })), (index) => setNewUser((current) => ({ ...current, phones: current.phones.filter((_, phoneIndex) => phoneIndex !== index) })), (newPhones) => setNewUser((current) => ({ ...current, phones: newPhones })))}</div><div>{renderListField("Titular", newUser.titulars, () => setNewUser((current) => ({ ...current, titulars: [...current.titulars, ""] })), (index, value) => setNewUser((current) => ({ ...current, titulars: current.titulars.map((titular, titularIndex) => titularIndex === index ? value : titular) })), (index) => setNewUser((current) => ({ ...current, titulars: current.titulars.filter((_, titularIndex) => titularIndex !== index) })), (newTitulars) => setNewUser((current) => ({ ...current, titulars: newTitulars })))}</div><label className="field-block"><span>Fecha creación</span><input type="datetime-local" value={new Date(newUser.createdAt).toISOString().slice(0, 16)} onChange={(event) => setNewUser((current) => ({ ...current, createdAt: new Date(event.target.value).toISOString() }))} /></label></div><div className="user-checks-grid"><div className="check-group"><span>Cajas</span><div className="checkbox-list">{(boxes || []).map((box) => {const checked = newUser.boxes.includes(box.id); return <label className="user-switch" key={box.id} style={{ "--switch-accent": boxColorStyle(box.color)["--box-accent"] }}><input type="checkbox" checked={checked} onChange={() => setNewUser((current) => ({ ...current, boxes: checked ? (current.boxes || []).filter((id) => id !== box.id) : [...(current.boxes || []), box.id] }))} /><i /> <span>{box.title}</span></label>;})}</div></div><div className="check-group"><span>Subplataformas</span><div className="checkbox-list subplatforms-grouped">{(boxes || []).filter((box) => newUser.boxes.includes(box.id)).map((box) => {const platforms = config?.platforms || []; const subOptions = platforms.flatMap((platform) => {const subsList = Array.isArray(platformSubPlatforms[platform]) ? platformSubPlatforms[platform] : []; if (subsList.length === 0) return []; return subsList.map((sub) => {const subName = typeof sub === 'string' ? sub : sub?.name || ''; const subColor = typeof sub === 'string' ? (config.platformColors?.[platform] || "teal") : (sub?.color || config.platformColors?.[platform] || "teal"); return { key: `${box.id}::${platform}::${subName}`, label: subName, color: subColor };});}); if (subOptions.length === 0) return null; return <div key={box.id} className="subplatforms-group" style={{ "--box-pill-accent": boxColorStyle(box.color)["--box-accent"] }}><div className="subplatforms-group-title">{box.title}</div>{subOptions.map((option) => <label className="user-switch" key={option.key} style={{ "--switch-accent": boxColorStyle(option.color)["--box-accent"] }}><input type="checkbox" checked={((newUser.subPlatforms || []).includes(option.key))} onChange={() => setNewUser((current) => ({ ...current, subPlatforms: ((current.subPlatforms || []).includes(option.key)) ? (current.subPlatforms || []).filter((sub) => sub !== option.key) : [...(current.subPlatforms || []), option.key] }))} /><i /> <span>{option.label}</span></label>)}</div>;})}</div></div></div><div className="modal-actions"><button className="ghost-button" type="button" onClick={() => setNewUserOpen(false)}>Cancelar</button><button className="close-button" type="button" onClick={saveNewUser}>Guardar <Check size={16} /></button></div></div></div>}
    </section>
  </main>;
}

function BonusesPage({ config, activeBoxId, api, onNotify }) {
  const [bonuses, setBonuses] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [sortBy, setSortBy] = useState("percentage");
  const [sortDirection, setSortDirection] = useState("asc");
  const [groupBy, setGroupBy] = useState("type");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const types = config.bonusTypes || [];
  const conditions = config.bonusConditions || [];
  const imageUrl = (id, download = false) => `${import.meta.env.VITE_API_URL || ""}/api/bonos/${id}/imagen?boxId=${activeBoxId}${download ? "&download=1" : ""}`;
  const loadBonuses = async () => setBonuses(await api(`/api/bonos?boxId=${activeBoxId}`));
  const conditionsForType = (typeId, existing = []) => { const count = types.find((type) => type.id === typeId)?.percentageCount || 0; return Array.from({ length: count }, (_, index) => existing[index] ? { platform: "", ...existing[index] } : conditions[index] ? { conditionId: conditions[index].id, percentage: "", platform: "" } : { conditionId: "", percentage: "", platform: "" }); };
  const conditionAllowsPlatform = (conditionId) => conditions.find((condition) => condition.id === conditionId)?.allowPlatform === true;
  useEffect(() => { loadBonuses().catch((error) => onNotify(error.message)); }, [activeBoxId]);
  const openEditor = (bonus = null) => {
    setEditing(bonus);
    setForm(bonus ? { name: bonus.name, typeId: bonus.typeId, conditions: conditionsForType(bonus.typeId, bonus.conditions || []) } : { name: "", typeId: types[0]?.id || "", conditions: conditionsForType(types[0]?.id || "") });
    setImageFile(null);
  };
  const updateCondition = (index, patch) => setForm((current) => ({ ...current, conditions: current.conditions.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) }));
  const save = async () => {
    if (!form?.name.trim() || !form.typeId || (!editing && !imageFile)) { onNotify("Completá nombre, tipo e imagen."); return; }
    setSaving(true);
    try {
      const result = editing ? await api(`/api/bonos/${editing.id}?boxId=${activeBoxId}`, { method: "PUT", body: JSON.stringify(form) }) : await api(`/api/bonos?boxId=${activeBoxId}`, { method: "POST", body: JSON.stringify(form) });
      if (imageFile) { const uploadResponse = await fetch(`${import.meta.env.VITE_API_URL || ""}/api/bonos/${result.bonus.id}/imagen?boxId=${activeBoxId}`, { method: "POST", headers: { "Content-Type": imageFile.type, "X-File-Name": encodeURIComponent(imageFile.name) }, body: imageFile }); const uploadResult = await uploadResponse.json(); if (!uploadResponse.ok || uploadResult.error) throw new Error(uploadResult.error || "No se pudo subir la imagen"); }
      await loadBonuses(); setForm(null); setEditing(null); onNotify("Bono guardado");
    } catch (error) { onNotify(error.message); } finally { setSaving(false); }
  };
  const remove = async (bonus) => { if (!window.confirm(`¿Eliminar el bono "${bonus.name}"?`)) return; setSaving(true); try { await api(`/api/bonos/${bonus.id}?boxId=${activeBoxId}`, { method: "DELETE" }); await loadBonuses(); setForm(null); setEditing(null); onNotify("Bono eliminado"); } catch (error) { onNotify(error.message); } finally { setSaving(false); } };
  const filtered = bonuses.filter((bonus) => (!typeFilter || bonus.typeId === typeFilter) && `${bonus.name} ${types.find((type) => type.id === bonus.typeId)?.name || ""} ${(bonus.conditions || []).map((item) => `${item.percentage}% ${conditions.find((condition) => condition.id === item.conditionId)?.label || ""}`).join(" ")}`.toLowerCase().includes(search.toLowerCase()));
  const percentageFor = (bonus) => number(bonus.conditions?.at(-1)?.percentage);
  const platformFor = (bonus) => bonus.conditions?.at(-1)?.platform || "Todas";
  const typeNameFor = (bonus) => types.find((type) => type.id === bonus.typeId)?.name || "Sin tipo";
  const sorted = filtered.slice().sort((left, right) => {
    const values = sortBy === "name" ? [left.name, right.name] : sortBy === "type" ? [typeNameFor(left), typeNameFor(right)] : sortBy === "percentage" ? [percentageFor(left), percentageFor(right)] : [left.createdAt || "", right.createdAt || ""];
    const comparison = typeof values[0] === "number" ? values[0] - values[1] : String(values[0]).localeCompare(String(values[1]), "es", { sensitivity: "base" });
    return (sortDirection === "asc" ? comparison : -comparison) || left.name.localeCompare(right.name, "es", { sensitivity: "base" });
  });
  const groups = sorted.reduce((result, bonus) => {
    const groupValue = groupBy === "type" ? typeNameFor(bonus) : groupBy === "percentage" ? `${percentageFor(bonus)}%` : groupBy === "platform" ? platformFor(bonus) : "Todos los bonos";
    const group = result.find((item) => item.label === groupValue);
    if (group) group.items.push(bonus);
    else result.push({ label: groupValue, items: [bonus], value: groupBy === "percentage" ? percentageFor(bonus) : groupValue });
    return result;
  }, []);
  if (groupBy === "percentage") groups.sort((left, right) => left.value - right.value);
  else if (groupBy === "type" || groupBy === "platform") groups.sort((left, right) => left.label.localeCompare(right.label, "es", { sensitivity: "base" }));
  const changeType = (typeId) => setForm((current) => ({ ...current, typeId, conditions: conditionsForType(typeId, current.conditions) }));
  return (
    <main className="bonuses-page">
      <section className="panel bonuses-panel">
        <div className="bonuses-head"><div><h2><Gift size={18} /> Bonos</h2><span>{bonuses.length} registros</span></div><div className="bonuses-toolbar"><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar bono, porcentaje o condición" /><button className={`filter-toggle ${filtersOpen ? "active" : ""}`} type="button" title="Mostrar filtros" aria-label="Mostrar filtros" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}><SlidersHorizontal size={16} />{(typeFilter || sortBy !== "percentage" || sortDirection !== "asc" || groupBy !== "type") && <i />}</button><button className="icon-button new-bonus-button" type="button" title="Nuevo bono" aria-label="Nuevo bono" onClick={() => openEditor()}><Plus size={17} /></button>{filtersOpen && <div className="bonus-filters"><label><span>Tipo</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">Todos los tipos</option>{types.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label><label><span>Ordenar por</span><select value={sortBy} onChange={(event) => setSortBy(event.target.value)}><option value="percentage">Porcentaje</option><option value="name">Nombre</option><option value="type">Tipo de bono</option><option value="date">Fecha de alta</option></select></label><label><span>Agrupar por</span><select value={groupBy} onChange={(event) => setGroupBy(event.target.value)}><option value="type">Tipo de bono</option><option value="percentage">Porcentaje</option><option value="platform">Plataforma del porcentaje</option><option value="none">Sin agrupación</option></select></label><button className="sort-direction" type="button" title={sortDirection === "asc" ? "Orden ascendente" : "Orden descendente"} aria-label={sortDirection === "asc" ? "Cambiar a orden descendente" : "Cambiar a orden ascendente"} onClick={() => setSortDirection((direction) => direction === "asc" ? "desc" : "asc")}>{sortDirection === "asc" ? "↑" : "↓"}</button></div>}</div></div>
        <div className="bonus-groups">{groups.map((group) => <section className="bonus-group" key={group.label}><div className="bonus-group-heading"><h3>{groupBy === "none" ? "Resultados" : group.label}</h3><span>{group.items.length} bonos</span></div><div className="bonus-cards">{group.items.map((bonus) => <article className="bonus-card-item" key={bonus.id}>{bonus.imagePath ? <img src={imageUrl(bonus.id)} alt={bonus.name} /> : <div className="bonus-image-empty">Sin imagen</div>}<footer><strong>{bonus.name}</strong><span>{typeNameFor(bonus)}</span><div className="bonus-condition-list">{(bonus.conditions || []).map((item, index) => <small key={`${item.conditionId}-${index}`}>{conditions.find((condition) => condition.id === item.conditionId)?.label || "Sin condición"}: {item.percentage}%{item.platform ? ` · ${item.platform}` : ""}</small>)}</div><div className="bonus-card-actions"><button className="icon-button" title="Editar bono" onClick={() => openEditor(bonus)}><Pencil size={15} /></button><a className="icon-button" title="Descargar imagen original" href={imageUrl(bonus.id, true)}><Download size={15} /></a></div></footer></article>)}</div></section>)}{groups.length === 0 && <div className="empty-state">No se encontraron bonos.</div>}</div>
      </section>
      {form && <div className="modal-backdrop" onClick={() => !saving && setForm(null)}><div className="modal bonus-create-modal" onClick={(event) => event.stopPropagation()}><button className="modal-close" type="button" title="Cancelar" disabled={saving} onClick={() => setForm(null)}><X size={18} /></button><div className="modal-icon"><Gift size={21} /></div><h2>{editing ? "Editar bono" : "Nuevo bono"}</h2><label><span>Imagen</span><input type="file" accept="image/jpeg,image/png,image/webp" disabled={saving} onChange={(event) => setImageFile(event.target.files?.[0] || null)} /></label>{editing?.imageName && !imageFile && <small>Imagen actual: {editing.imageName}</small>}{imageFile && <small className="bonus-upload-status">{saving ? "Subiendo imagen..." : imageFile.name}</small>}<label><span>Nombre</span><input value={form.name} disabled={saving} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label><span>Tipo de bono</span><select value={form.typeId} disabled={saving} onChange={(event) => changeType(event.target.value)}>{types.map((type) => <option value={type.id} key={type.id}>{type.name}</option>)}</select></label><div className="bonus-condition-editor"><div className="bonus-condition-editor-head"><span>Porcentajes y condiciones</span></div>{form.conditions.map((item, index) => <div className="bonus-condition-row" key={`${item.conditionId}-${index}`}><input type="number" min="0" max="100" disabled={saving} value={item.percentage} placeholder="%" onChange={(event) => updateCondition(index, { percentage: event.target.value })} /><select value={item.conditionId} disabled={saving} onChange={(event) => updateCondition(index, { conditionId: event.target.value, platform: "" })}><option value="">Sin condición</option>{conditions.map((condition) => <option value={condition.id} key={condition.id}>{condition.label}</option>)}</select>{conditionAllowsPlatform(item.conditionId) && <select value={item.platform || ""} disabled={saving} title="Plataforma del porcentaje" aria-label="Plataforma del porcentaje" onChange={(event) => updateCondition(index, { platform: event.target.value })}><option value="">-</option>{(config.platforms || []).map((platform) => <option value={platform} key={platform}>{platform}</option>)}</select>}</div>)}</div><div className="modal-actions">{editing && <button className="danger-button bonus-delete-action" type="button" disabled={saving} onClick={() => remove(editing)}><Trash2 size={15} /> Eliminar</button>}<button className="ghost-button" type="button" disabled={saving} onClick={() => setForm(null)}>Cancelar</button><button className="close-button" type="button" disabled={saving} onClick={save}>{saving ? "Subiendo..." : "Guardar"} {!saving && <Check size={16} />}</button></div></div></div>}
    </main>
  );
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
        <h1><strong>Turno {caja.shift} <em>/</em> {caja.shift === "Noche" ? "00:00 - 08:00" : caja.shift === "Mañana" ? "08:00 - 16:00" : "16:00 - 00:00"}</strong>
          {isShiftOutOfTime(caja.shift) && <span style={{ color: "rgb(255, 0, 0)", marginLeft: "1em", fontSize: "1em" }}>CAJA FUERA DE TURNO</span>}
        </h1>
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

function ConfirmDialog({ dialog, onClose, message, onConfirm, onCancel, confirmLabel = "Confirmar" }) {
  const currentDialog = dialog || (message ? { message, onConfirm, onCancel, confirmLabel } : null);
  if (!currentDialog) return null;
  const handleConfirm = () => {
    currentDialog.onConfirm?.(true);
    onClose();
  };
  const handleCancel = () => {
    currentDialog.onCancel?.(false);
    onClose();
  };
  return createPortal(
    <div className="modal-backdrop" onClick={handleCancel} style={{ zIndex: 10000 }}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid var(--line)" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600" }}>Confirmar acción</h2>
          <button className="modal-close" type="button" title="Cerrar" onClick={handleCancel}><X size={18} /></button>
        </div>
        <p style={{ marginBottom: "28px", color: "#c5cdd2", lineHeight: "1.6", fontSize: "15px" }}>{currentDialog.message}</p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button onClick={handleCancel} style={{ padding: "10px 20px", borderRadius: "6px", border: "1px solid var(--line)", background: "transparent", color: "#e7edf1", cursor: "pointer", fontWeight: "500", fontSize: "14px", transition: "all 0.2s", hover: { background: "var(--panel)" } }}>Cancelar</button>
          <button onClick={handleConfirm} style={{ padding: "10px 20px", borderRadius: "6px", background: "var(--danger)", color: "white", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "14px", transition: "all 0.2s" }}>{currentDialog.confirmLabel || "Confirmar"}</button>
        </div>
      </div>
    </div>,
    document.body
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
  const [usersOpen, setUsersOpen] = useState(false);
  const [bonusesOpen, setBonusesOpen] = useState(false);
  const [configurationOpen, setConfigurationOpen] = useState(false);
  const [bonusViewRequest, setBonusViewRequest] = useState(0);
  const [bonusEditorRequest, setBonusEditorRequest] = useState(0);
  const [toast, setToast] = useState("");
  const [apiError, setApiError] = useState("");
  const [config, setConfig] = useState(null);
  const [boxes, setBoxes] = useState(null);
  const [boxHistories, setBoxHistories] = useState({});
  const [activeBoxId, setActiveBoxId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const pendingSaveRef = React.useRef(null);
  const saveTimerRef = React.useRef(null);
  const saveInFlightRef = React.useRef(false);
  const configSaveChainRef = React.useRef(Promise.resolve());
  const [notesEnabled, setNotesEnabled] = useState(true);
  const activeBox = boxes?.find((box) => box.id === activeBoxId) || boxes?.[0];
  const readOnly = caja?.status !== "ABIERTA";
  const currentPage = configurationOpen ? "Configuración" : logisticsOpen ? "Logística" : statisticsOpen ? "Estadísticas" : usersOpen ? "Usuarios" : bonusesOpen ? "Bonos" : "Caja";
  const isReadOnlyAction = (element) => Boolean(element.closest?.(".modal-close, .ghost-button, button[title^='Ver'], button[title^='Cerrar']"));
  useEffect(() => {
    const preventInputDrag = (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      if (target.matches("input, textarea, select, option")) {
        event.preventDefault();
      }
    };
    document.addEventListener("dragstart", preventInputDrag);
    return () => document.removeEventListener("dragstart", preventInputDrag);
  }, []);
  useEffect(() => {
    confirmDialogController = ({ message, onConfirm, onCancel, confirmLabel }) => {
      setConfirmDialog({ message, onConfirm, onCancel, confirmLabel });
    };
    return () => {
      confirmDialogController = null;
    };
  }, []);
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
    const result = await enqueueConfigSave(() => api(`/api/configuracion?boxId=${activeBoxId}`, { method: "PUT", body: JSON.stringify(nextConfig) }));
    if (result.config) setConfig(result.config);
  };
  const updateStatisticsConfig = async (nextConfig) => {
    setConfig(nextConfig);
    const result = await enqueueConfigSave(() => api(`/api/configuracion?boxId=${activeBoxId}`, { method: "PUT", body: JSON.stringify(nextConfig) }));
    if (result.config) setConfig(result.config);
  };
  const updateConfigState = async (nextConfig) => {
    setConfig(nextConfig);
    const result = await enqueueConfigSave(() => api(`/api/configuracion?boxId=${activeBoxId}`, { method: "PUT", body: JSON.stringify(nextConfig) }));
    if (result.config) setConfig(result.config);
  };
  const updateAccountsFromLogistics = (accounts) => update({ accounts }, true);
  const enqueueConfigSave = (operation) => {
    const queuedSave = configSaveChainRef.current.catch(() => undefined).then(operation);
    configSaveChainRef.current = queuedSave.catch(() => undefined);
    return queuedSave;
  };
  const saveConfig = (nextConfig, boxId) => enqueueConfigSave(async () => {
    const result = await api(`/api/configuracion?boxId=${boxId}`, { method: "PUT", body: JSON.stringify(nextConfig) });
    if (boxId === activeBoxId) {
      setConfig(result.config);
      setCaja(result.current);
    }
    // Replicate global user config (clarifications and platformSubPlatforms) to all boxes
    if (nextConfig.userClarifications !== undefined || nextConfig.platformSubPlatforms !== undefined || nextConfig.users !== undefined) {
      const globalUpdate = {};
      if (nextConfig.userClarifications !== undefined) globalUpdate.userClarifications = nextConfig.userClarifications;
      if (nextConfig.platformSubPlatforms !== undefined) globalUpdate.platformSubPlatforms = nextConfig.platformSubPlatforms;
      if (nextConfig.users !== undefined) globalUpdate.users = nextConfig.users;
      for (const box of (boxes || []).filter((item) => item.id !== boxId)) {
        const boxConfig = await api(`/api/configuracion?boxId=${box.id}`);
        await api(`/api/configuracion?boxId=${box.id}`, { method: "PUT", body: JSON.stringify({ ...boxConfig, ...globalUpdate }) });
      }
    }
  });
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
    const shortage = difference - balance - tips - foundTotal + number(caja.found) + transferAdjustment;
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
            <h1>Turno {caja.shift} <em>/</em> {caja.shift === "Noche" ? "00:00 - 08:00" : caja.shift === "Mañana" ? "08:00 - 16:00" : "16:00 - 00:00"}
               <span className="current-page-label">{currentPage}</span>
               {isShiftOutOfTime(caja.shift) && <span style={{ color: "rgb(255, 0, 0)", marginLeft: "0.5em", fontSize: "0.8em" }}>CAJA FUERA DE TURNO</span>}
            </h1>
            <h2>{new Date(caja.date).toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long" })}</h2>
          </div>
           <div className={`history-actions ${currentPage !== "Caja" ? "has-back" : ""}`}>
             {(statisticsOpen || logisticsOpen || usersOpen || bonusesOpen || configurationOpen) && <button className="history-trigger back-to-caja" title="Volver a Caja" aria-label="Volver a Caja" onClick={() => { setStatisticsOpen(false); setLogisticsOpen(false); setUsersOpen(false); setBonusesOpen(false); setConfigurationOpen(false); }}><ArrowLeft size={17} /></button>}
             {!statisticsOpen && <button className="history-trigger statistics-trigger" title="Estadísticas" aria-label="Estadísticas" onClick={() => { setStatisticsOpen(true); setConfigurationOpen(false); setLogisticsOpen(false); setUsersOpen(false); setBonusesOpen(false); setBonusViewRequest(0); setBonusEditorRequest(0); }}><BarChart3 size={17} /></button>}
             {!logisticsOpen && <button className="history-trigger logistics-trigger" title="Logística" aria-label="Logística" onClick={() => { setLogisticsOpen(true); setConfigurationOpen(false); setStatisticsOpen(false); setUsersOpen(false); setBonusesOpen(false); setBonusViewRequest(0); setBonusEditorRequest(0); }}><WalletCards size={17} /></button>}
             {!usersOpen && <button className="history-trigger users-trigger" title="Usuarios" aria-label="Usuarios" onClick={() => { setUsersOpen(true); setBonusesOpen(false); setConfigurationOpen(false); setStatisticsOpen(false); setLogisticsOpen(false); setBonusViewRequest(0); setBonusEditorRequest(0); }}><Users size={17} /></button>}
             {!bonusesOpen && <button className="history-trigger bonuses-trigger" title="Bonos" aria-label="Bonos" onClick={() => { setBonusesOpen(true); setUsersOpen(false); setConfigurationOpen(false); setStatisticsOpen(false); setLogisticsOpen(false); setBonusViewRequest(0); setBonusEditorRequest(0); }}><Gift size={17} /></button>}
             <button className="history-trigger" title="Cajas recientes" aria-label="Cajas recientes" onClick={() => setHistoryOpen(true)}><Clock3 size={17} /></button>
             {!configurationOpen && <button className="history-trigger" disabled={readOnly} title="Configurar" aria-label="Configurar" onClick={() => { setConfigurationOpen(true); setStatisticsOpen(false); setLogisticsOpen(false); setUsersOpen(false); setBonusesOpen(false); }}><Settings2 size={17} /></button>}
            {hasPendingNotes && <span className="pending-notes">Notas Pendientes</span>}
          </div>
        </div>
        <MonthlyGoalProgress config={config} boxColor={activeBox.color} />
        <BonusMonthlyGoalProgress config={config} caja={caja} history={history} boxColor={activeBox.color} />
        <div className={`box-content ${readOnly ? "read-only" : ""}`} onClickCapture={(event) => { if (readOnly && !isReadOnlyAction(event.target)) { event.preventDefault(); event.stopPropagation(); } }}>
        {configurationOpen ? <ConfigurationPage config={config} boxes={boxes} activeBoxId={activeBoxId} onSave={saveConfig} onBack={() => setConfigurationOpen(false)} onBoxesChanged={manageBoxes} onNotify={notify} api={api} embedded /> : statisticsOpen ? <StatisticsPage history={history} config={config} activeBoxId={activeBoxId} boxes={boxes} boxHistories={boxHistories} onConfigChange={updateStatisticsConfig} /> : logisticsOpen ? <LogisticsPage caja={caja} config={config} boxes={boxes} activeBoxId={activeBoxId} onUpdateAccounts={updateAccountsFromLogistics} onAssignWallet={assignWallet} onConfigChange={updateLogisticsConfig} /> : usersOpen ? <UsersPage config={config} boxes={boxes} activeBoxId={activeBoxId} onConfigChange={updateConfigState} onNotify={notify} api={api} /> : bonusesOpen ? <BonusesPage config={config} activeBoxId={activeBoxId} api={api} onNotify={notify} /> : <><SummaryCard
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
                 <ArrowRight size={16} />
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
      <ConfirmDialog dialog={confirmDialog} onClose={() => setConfirmDialog(null)} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
