const { requireAdmin, requireStaff } = require('../middlewares/roleMiddleware');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('requireAdmin', () => {
  test('permite admin y administrador', () => {
    for (const rol of ['admin', 'administrador']) {
      const req = { user: { rol } };
      const res = mockRes();
      const next = jest.fn();
      requireAdmin(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  test('bloquea instructor y estudiante', () => {
    for (const rol of ['usuario', 'estudiante', undefined]) {
      const req = { user: { rol } };
      const res = mockRes();
      const next = jest.fn();
      requireAdmin(req, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
    }
  });
});

describe('requireStaff', () => {
  test('permite admin, administrador, instructor y usuario', () => {
    for (const rol of ['admin', 'administrador', 'instructor', 'usuario']) {
      const req = { user: { rol } };
      const res = mockRes();
      const next = jest.fn();
      requireStaff(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  test('bloquea a un estudiante', () => {
    const req = { user: { rol: 'estudiante' } };
    const res = mockRes();
    const next = jest.fn();
    requireStaff(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
