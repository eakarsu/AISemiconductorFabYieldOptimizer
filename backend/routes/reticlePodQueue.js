const express = require('express');

const router = express.Router();

let queue = [
  { id: 1, reticle: 'RX-14A', lot: 'LOT-7712', tool: 'Scanner-03', podState: 'clean hold', priority: 'hot lot', etaMinutes: 22, risk: 'particle recheck' },
  { id: 2, reticle: 'RX-22C', lot: 'LOT-7720', tool: 'Scanner-07', podState: 'released', priority: 'normal', etaMinutes: 48, risk: 'none' },
  { id: 3, reticle: 'RX-09B', lot: 'LOT-7704', tool: 'Scanner-02', podState: 'transport delay', priority: 'expedite', etaMinutes: 75, risk: 'queue slip' }
];

router.get('/', (req, res) => {
  const summary = queue.reduce((acc, item) => {
    acc.total += 1;
    acc.hot += item.priority === 'hot lot' || item.priority === 'expedite' ? 1 : 0;
    acc.delayed += Number(item.etaMinutes || 0) > 60 ? 1 : 0;
    return acc;
  }, { total: 0, hot: 0, delayed: 0 });
  res.json({ queue, summary });
});

router.post('/', (req, res) => {
  const item = {
    id: Date.now(),
    reticle: req.body.reticle || 'RX-pending',
    lot: req.body.lot || 'LOT-pending',
    tool: req.body.tool || 'Scanner TBD',
    podState: req.body.podState || 'queued',
    priority: req.body.priority || 'normal',
    etaMinutes: Number(req.body.etaMinutes || 30),
    risk: req.body.risk || 'none'
  };
  queue = [item, ...queue];
  res.status(201).json(item);
});

module.exports = router;
