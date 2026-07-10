const express = require("express");
const router = express.Router();
const {
  obtenerPagosPorCliente,
  registrarPago,
  obtenerTodosLosPagos,
  filtrarPagosPorEstado,
  eliminarPago
} = require("../controllers/pagosController");

// Orden correcto de rutas
router.get("/", obtenerTodosLosPagos);
router.get("/cliente/:id", obtenerPagosPorCliente);
router.get("/estado/:estado", filtrarPagosPorEstado);
router.post("/", registrarPago);
router.delete("/:id", eliminarPago);

module.exports = router;
