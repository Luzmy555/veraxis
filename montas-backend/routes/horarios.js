const express = require("express");
const router = express.Router();

const {
  obtenerHorarios,
  crearHorario,
  eliminarHorario,
  marcarClaseComoHecha
} = require("../controllers/horariosController");

router.get("/", obtenerHorarios);
router.post("/", crearHorario);
router.delete("/:id", eliminarHorario);
router.patch("/hecho/:id", marcarClaseComoHecha);
router.patch("/:id", marcarClaseComoHecha);

module.exports = router;
