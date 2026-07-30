const express = require("express");
const router = express.Router();
const {
  obtenerPagosPorCliente,
  registrarPago,
  obtenerTodosLosPagos,
  filtrarPagosPorEstado,
  eliminarPago,
  obtenerNumeroFactura
} = require("../controllers/pagosController");
const { requireStaff } = require('../middlewares/roleMiddleware');
const { requireOwnClienteOrStaff } = require('../middlewares/clienteAccessMiddleware');

// Orden correcto de rutas
router.get("/", requireStaff, obtenerTodosLosPagos);
router.get("/cliente/:id", requireOwnClienteOrStaff('id'), obtenerPagosPorCliente);
router.get("/estado/:estado", requireStaff, filtrarPagosPorEstado);
router.get("/:id/numero-factura", obtenerNumeroFactura);
router.post("/", requireStaff, registrarPago);
router.delete("/:id", requireStaff, eliminarPago);

module.exports = router;
