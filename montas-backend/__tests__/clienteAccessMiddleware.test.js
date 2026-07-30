// La regla de acceso más crítica que se agregó al construir el portal del estudiante:
// un estudiante solo puede ver su propio expediente, nunca el de otro cliente.
jest.mock('../db', () => ({ query: jest.fn() }));
const pool = require('../db');
const { requireOwnClienteOrStaff } = require('../middlewares/clienteAccessMiddleware');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requireOwnClienteOrStaff', () => {
  afterEach(() => jest.clearAllMocks());

  test('deja pasar a admin sin consultar la base de datos', async () => {
    const req = { user: { id: 1, rol: 'admin' }, params: { id: '99' } };
    const res = mockRes();
    const next = jest.fn();

    await requireOwnClienteOrStaff('id')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
  });

  test('deja pasar a instructor (rol usuario) sin consultar la base de datos', async () => {
    const req = { user: { id: 1, rol: 'usuario' }, params: { id: '99' } };
    const res = mockRes();
    const next = jest.fn();

    await requireOwnClienteOrStaff('id')(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('deja pasar a un estudiante que pide su propio expediente', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 5 }] });
    const req = { user: { id: 42, rol: 'estudiante' }, params: { id: '5' } };
    const res = mockRes();
    const next = jest.fn();

    await requireOwnClienteOrStaff('id')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('bloquea a un estudiante que pide el expediente de OTRO cliente (IDOR)', async () => {
    pool.query.mockResolvedValue({ rows: [{ id: 5 }] });
    const req = { user: { id: 42, rol: 'estudiante' }, params: { id: '6' } };
    const res = mockRes();
    const next = jest.fn();

    await requireOwnClienteOrStaff('id')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('bloquea a un estudiante que todavía no está vinculado a ningún cliente', async () => {
    pool.query.mockResolvedValue({ rows: [] });
    const req = { user: { id: 42, rol: 'estudiante' }, params: { id: '6' } };
    const res = mockRes();
    const next = jest.fn();

    await requireOwnClienteOrStaff('id')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('bloquea cualquier otro rol desconocido', async () => {
    const req = { user: { id: 1, rol: 'otro' }, params: { id: '1' } };
    const res = mockRes();
    const next = jest.fn();

    await requireOwnClienteOrStaff('id')(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
