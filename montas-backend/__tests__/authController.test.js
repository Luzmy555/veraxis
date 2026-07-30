jest.mock('../db', () => ({ query: jest.fn() }));
jest.mock('bcryptjs', () => ({ compare: jest.fn() }));
jest.mock('jsonwebtoken', () => ({ sign: jest.fn(() => 'token-de-prueba') }));

const pool = require('../db');
const bcrypt = require('bcryptjs');
const authController = require('../controllers/authController');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('authController.login', () => {
  afterEach(() => jest.clearAllMocks());

  test('usuario que no existe -> 401', async () => {
    pool.query.mockResolvedValue({ rowCount: 0, rows: [] });
    const req = { body: { usuario: 'nadie', clave: 'x' } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('cuenta desactivada -> 403', async () => {
    pool.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 1, usuario: 'juan', rol: 'usuario', estado: 'Inactivo', clave: 'hash' }] });
    const req = { body: { usuario: 'juan', clave: 'x' } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });

  test('clave incorrecta -> 401', async () => {
    pool.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 1, usuario: 'juan', rol: 'usuario', estado: 'Activo', clave: 'hash' }] });
    bcrypt.compare.mockResolvedValue(false);
    const req = { body: { usuario: 'juan', clave: 'incorrecta' } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('login correcto -> devuelve token y rol', async () => {
    pool.query.mockResolvedValue({ rowCount: 1, rows: [{ id: 1, usuario: 'juan', rol: 'admin', estado: 'Activo', clave: 'hash' }] });
    bcrypt.compare.mockResolvedValue(true);
    const req = { body: { usuario: 'juan', clave: 'correcta' } };
    const res = mockRes();

    await authController.login(req, res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'token-de-prueba', usuario: 'juan', rol: 'admin' }));
  });
});
