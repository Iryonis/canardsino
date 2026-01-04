import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { User } from '../models/User';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { AuthRequest } from '../middleware/auth';

// Validation rules
export const registerValidation = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
];

export const loginValidation = [
  body('email').isEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Register new user
export const register = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, username, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(409).json({ error: 'Email or username already exists' });
    }

    // Create new user
    const user = new User({ email, username, password });
    await user.save();

    // Generate tokens
    const tokenPayload = { userId: user._id.toString(), email: user.email, username: user.username };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Return user data and tokens
    return res.status(201).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Failed to register user' });
  }
};

// Login user
export const login = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate tokens
    const tokenPayload = { userId: user._id.toString(), email: user.email, username: user.username };
    const accessToken = generateAccessToken(tokenPayload);
    const refreshToken = generateRefreshToken(tokenPayload);

    // Return user data and tokens
    return res.status(200).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        createdAt: user.createdAt,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
};

// Refresh access token with token rotation
export const refresh = async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    // Generate new tokens (rotation for security)
    const tokenPayload = { userId: payload.userId, email: payload.email, username: payload.username };
    const newAccessToken = generateAccessToken(tokenPayload);
    const newRefreshToken = generateRefreshToken(tokenPayload);

    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Refresh error:', error);
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }
};

// Get current user profile
export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      id: user._id.toString(),
      email: user.email,
      username: user.username,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ error: 'Failed to get profile' });
  }
};
