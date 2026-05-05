import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import {
  getUserByEmail,
  getUserAuthById,
  updateUserPasswordById,
} from '../services/auth.service.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dacexpertsys_dev_secret_change_me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_DEFAULT_ROLE = process.env.GOOGLE_DEFAULT_ROLE || 'student';
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID || undefined);

function buildAuthResponse(user, extra = {}) {
  const tokenPayload = {
    sub: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      ...extra,
    },
  };
}

export async function loginController(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    const user = await getUserByEmail(email);
    if (!user || !user.password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const tokenPayload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to login' });
  }
}

export async function loginWithGoogleController(req, res) {
  try {
    const { credential } = req.body || {};
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    if (!GOOGLE_CLIENT_ID) {
      return res.status(500).json({ error: 'User not configured' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    if (!payload?.email || !payload?.email_verified) {
      return res.status(401).json({ error: 'Google account email is not verified' });
    }

    const email = payload.email;
    const name = payload.name || payload.given_name || 'Student';
    const photoURL = payload.picture || null;

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(403).json({ error: 'Account not provisioned. Contact admin.' });
    }

    const response = buildAuthResponse(user, { photoURL });
    return res.status(200).json(response);
  } catch (error) {
    console.error('Google login error:', error);
    return res.status(500).json({ error: 'Failed to login with Google' });
  }
}

export async function changePasswordController(req, res) {
  try {
    const { userId, currentPassword, newPassword } = req.body || {};
    const requesterId = Number(req.user?.sub);
    const targetUserId = Number(userId);

    if (!targetUserId || !currentPassword || !newPassword) {
      return res.status(400).json({ error: 'userId, currentPassword, and newPassword are required' });
    }

    if (requesterId !== targetUserId) {
      return res.status(403).json({ error: 'You can only change your own password' });
    }

    const user = await getUserAuthById(targetUserId);
    if (!user || !user.password) {
      return res.status(400).json({ error: 'User password is not set' });
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await updateUserPasswordById(targetUserId, newHash);

    return res.status(200).json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return res.status(500).json({ error: 'Failed to change password' });
  }
}
