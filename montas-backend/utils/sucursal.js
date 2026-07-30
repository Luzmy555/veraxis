// Si el usuario logueado está atado a una sede, esa es la única que puede ver (se ignora
// cualquier ?sucursal_id= que mande, igual que el patrón ya usado para "mis estudiantes" del
// instructor en dashboardController). Si es un usuario global (sucursal_id null en su token),
// puede pedir una sede puntual por query string, o ver todas si no manda ninguna.
function resolverFiltroSucursal(req) {
  if (req.user && req.user.sucursal_id) return req.user.sucursal_id;
  return req.query.sucursal_id || null;
}

module.exports = { resolverFiltroSucursal };
