const User = require('../models/User');
const Order = require('../models/Order');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'kynetix_collective_super_secret_jwt_key_2026_egypt',
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

/**
 * @desc    Register new athlete account
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, firstName, lastName, email, password, phone } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
    }

    const parsedFirstName = firstName || (name ? name.split(' ')[0] : 'Athlete');
    const parsedLastName = lastName || (name && name.split(' ').length > 1 ? name.split(' ').slice(1).join(' ') : '');

    const newUser = await User.create({
      email,
      password,
      firstName: parsedFirstName,
      lastName: parsedLastName,
      phone: phone || ''
    });

    const token = generateToken(newUser.id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        name: `${newUser.firstName} ${newUser.lastName}`.trim(),
        role: newUser.role
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Login athlete account
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await User.comparePassword(password, user.password_hash, user.email);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Logged in successfully!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`.trim(),
        role: user.role
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get user profile with recent orders
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getProfile = async (req, res, next) => {
  try {
    const orders = await Order.findByUserId(req.user.id);

    res.json({
      success: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        firstName: req.user.first_name,
        lastName: req.user.last_name,
        phone: req.user.phone,
        role: req.user.role
      },
      orders
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  getProfile
};
