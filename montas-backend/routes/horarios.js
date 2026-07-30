const express = require("express");
const router = express.Router();

const {
  obtenerHorarios,
  crearHorario,
  eliminarHorario,
  marcarClaseComoHecha,
  getMisHorarios
} = require("../controllers/horariosController");
const { requireStaff } = require('../middlewares/roleMiddleware');

router.get("/me", getMisHorarios);
router.get("/", requireStaff, obtenerHorarios);
router.post("/", requireStaff, crearHorario);
router.delete("/:id", requireStaff, eliminarHorario);
router.patch("/hecho/:id", requireStaff, marcarClaseComoHecha);
router.patch("/:id", requireStaff, marcarClaseComoHecha);

module.exports = router;
