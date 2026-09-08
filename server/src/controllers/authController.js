import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_evaluator_2026';
const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'evaluator_admin_secret_2026';

function generateToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Register a new user (Learner by default, or Admin if valid secret key provided)
 * POST /api/auth/register
 */
export async function register(req, res) {
  try {
    const { name, email, password, adminSecretKey } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email is required' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email address already exists' });
    }

    // Determine role
    let role = 'learner';
    if (adminSecretKey && adminSecretKey.trim()) {
      if (adminSecretKey.trim() === ADMIN_SECRET_KEY) {
        role = 'admin';
      } else {
        return res.status(400).json({ error: 'Invalid Admin Secret Key provided' });
      }
    }

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role
    });

    await user.save();

    const token = generateToken(user);

    res.status(201).json({
      message: `Account created successfully as ${role}`,
      token,
      user: user.toJSON()
    });
  } catch (err) {
    console.error('[AuthController] Registration error:', err);
    res.status(500).json({ error: 'Failed to create account', details: err.message });
  }
}

/**
 * Log in an existing user
 * POST /api/auth/login
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+password');

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);

    res.json({
      message: 'Logged in successfully',
      token,
      user: user.toJSON()
    });
  } catch (err) {
    console.error('[AuthController] Login error:', err);
    res.status(500).json({ error: 'Login failed', details: err.message });
  }
}

/**
 * Get current authenticated user profile
 * GET /api/auth/me
 */
export async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({
      user: user.toJSON()
    });
  } catch (err) {
    console.error('[AuthController] GetMe error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile', details: err.message });
  }
}
