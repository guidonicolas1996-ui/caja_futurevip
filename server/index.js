import express from 'express';
import cors from 'cors';
import { getBoxes, createBox, updateBox, deleteBox, getCurrent, getHistory, getConfig, updateConfig, updateCurrent, updateCaja, setWalletAssignment, createTransfer, updateTransfer, deleteTransfer, closeCurrent } from './store.js';

const app = express();
app.use(cors());
app.use(express.json());
const handle = (action) => async (req, res) => {
  try { res.json(await action(req)); } catch (error) { res.status(400).json({ error: error.message }); }
};

app.get('/api/cajas', handle(() => getBoxes()));
app.post('/api/cajas', handle((req) => createBox(req.body)));
app.put('/api/cajas/:id', handle((req) => updateBox(req.params.id, req.body)));
app.delete('/api/cajas/:id', handle((req) => deleteBox(req.params.id)));
app.get('/api/caja/actual', handle((req) => getCurrent(req.query.boxId)));
app.get('/api/caja/historial', handle((req) => getHistory(req.query.boxId)));
app.get('/api/configuracion', handle((req) => getConfig(req.query.boxId)));
app.put('/api/configuracion', handle((req) => updateConfig(req.body, req.query.boxId)));
app.put('/api/caja/actualizar', handle((req) => updateCurrent(req.body, req.query.boxId)));
app.put('/api/caja/asignacion-billetera', handle((req) => setWalletAssignment(req.body)));
app.put('/api/caja/:id', handle((req) => updateCaja(req.params.id, req.body, req.query.boxId)));
app.post('/api/traspasos', handle((req) => createTransfer(req.body)));
app.put('/api/traspasos/:id', handle((req) => updateTransfer(req.params.id, req.body)));
app.delete('/api/traspasos/:id', handle((req) => deleteTransfer(req.params.id)));
app.post('/api/caja/cerrar', handle((req) => closeCurrent(req.body, req.query.boxId)));

const port = Number(process.env.PORT) || 3001;
app.get('/api/health', async (req, res) => {
  try { await getBoxes(); res.json({ ok: true, storage: 'supabase' }); }
  catch (error) { res.status(503).json({ ok: false, storage: 'supabase', error: error.message }); }
});
app.listen(port, '0.0.0.0', () => console.log(`API de caja lista en http://localhost:${port} (supabase)`));
