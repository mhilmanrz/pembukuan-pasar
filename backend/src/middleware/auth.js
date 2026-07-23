const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'pembukuan-semangka-secret-key-change-in-production';

/**
 * Middleware: Verify JWT token from Authorization header
 * Attaches user data to req.user
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token tidak ditemukan' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token sudah expired, silakan login ulang' });
    }
    return res.status(401).json({ error: 'Token tidak valid' });
  }
}

/**
 * Middleware: Require specific role(s)
 * Usage: authorize('admin') or authorize('admin', 'karyawan')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Tidak terautentikasi' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Anda tidak memiliki akses untuk fitur ini' });
    }

    next();
  };
}

module.exports = { authenticate, authorize, JWT_SECRET };
