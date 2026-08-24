import express from 'express';
import cors from 'cors';
import { getBoxes, createBox, updateBox, deleteBox, getCurrent, getHistory, getConfig, updateConfig, updateCurrent, setWalletAssignment, createTransfer, updateTransfer, deleteTransfer, closeCurrent } from './store.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/cajas', (_req, res) => res.json(getBoxes()));
app.post('/api/cajas', (req, res) => { try { res.json(createBox(req.body)); } catch (error) { res.status(400).json({ error: error.message }); } });
app.put('/api/cajas/:id', (req, res) => { try { res.json(updateBox(req.params.id, req.body)); } catch (error) { res.status(400).json({ error: error.message }); } });
app.delete('/api/cajas/:id', (req, res) => { try { res.json(deleteBox(req.params.id)); } catch (error) { res.status(400).json({ error: error.message }); } });
app.get('/api/caja/actual', (req, res) => res.json(getCurrent(req.query.boxId)));
app.get('/api/caja/historial', (req, res) => res.json(getHistory(req.query.boxId)));
app.get('/api/configuracion', (req, res) => res.json(getConfig(req.query.boxId)));
app.put('/api/configuracion', (req, res) => {
  try { res.json(updateConfig(req.body, req.query.boxId)); } catch (error) { res.status(400).json({ error: error.message }); }
});
app.put('/api/caja/actualizar', (req, res) => {
  try { res.json(updateCurrent(req.body, req.query.boxId)); } catch (error) { res.status(400).json({ error: error.message }); }
});
app.put('/api/caja/asignacion-billetera', (req, res) => {
  try { res.json(setWalletAssignment(req.body)); } catch (error) { res.status(400).json({ error: error.message }); }
});
app.post('/api/traspasos', (req, res) => {
  try { res.json(createTransfer(req.body)); } catch (error) { res.status(400).json({ error: error.message }); }
});
app.put('/api/traspasos/:id', (req, res) => {
  try { res.json(updateTransfer(req.params.id, req.body)); } catch (error) { res.status(400).json({ error: error.message }); }
});
app.delete('/api/traspasos/:id', (req, res) => {
  try { res.json(deleteTransfer(req.params.id)); } catch (error) { res.status(400).json({ error: error.message }); }
});
app.post('/api/caja/cerrar', (req, res) => {
  try { res.json(closeCurrent(req.body, req.query.boxId)); } catch (error) { res.status(400).json({ error: error.message }); }
});

const port = Number(process.env.PORT) || 3001;
app.listen(port, '0.0.0.0', () => console.log(`API de caja lista en http://localhost:${port}`));
