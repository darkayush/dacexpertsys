import bcrypt from 'bcrypt';
import {
  getAllUsersService,
  getUserByIdService,
  createUserService,
  updateUserService,
  deleteUserService,
  updateUserRoleService,
  resetUserPasswordService,
} from '../services/users.service.js';

const ALLOWED_ROLES = new Set(['student', 'warden', 'chief_warden', 'dsw', 'admin']);

function generateTempPassword() {
  const random = Math.floor(1000 + Math.random() * 9000);
  return `Temp@${random}`;
}

export async function getAllUsersController(req, res) {
  try {
    const excludeRole = req.query?.excludeRole ? String(req.query.excludeRole).toLowerCase() : null;
    const users = await getAllUsersService({ excludeRole });
    res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

export async function getUserByIdController(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'A valid user id is required' });
    }

    const user = await getUserByIdService(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}

export async function createUserController(req, res) {
  try {
    const {
      name,
      email,
      role,
      program = null,
      enrollment_no = null,
      year = null,
      hostel = null,
      room = null,
      password = null,
    } = req.body || {};

    const normalizedRole = String(role || '').toLowerCase();
    if (!name || !email || !ALLOWED_ROLES.has(normalizedRole)) {
      return res.status(400).json({ error: 'name, email, and valid role are required' });
    }

    const tempPassword = password ? null : generateTempPassword();
    const finalPassword = password || tempPassword;
    const hash = finalPassword ? await bcrypt.hash(finalPassword, 10) : null;

    const createdUser = await createUserService({
      name,
      email,
      password: hash,
      role: normalizedRole,
      program,
      enrollment_no,
      year,
      hostel,
      room,
    });

    if (!createdUser) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    return res.status(201).json({
      user: createdUser,
      tempPassword: tempPassword || undefined,
    });
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Failed to create user' });
  }
}

export async function updateUserController(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'A valid user id is required' });
    }

    if (Object.prototype.hasOwnProperty.call(req.body || {}, 'role')) {
      const nextRole = String(req.body?.role || '').toLowerCase();
      if (!ALLOWED_ROLES.has(nextRole)) {
        return res.status(400).json({ error: 'A valid role is required' });
      }
    }

    const updatedUser = await updateUserService(userId, req.body || {});
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Failed to update user' });
  }
}

export async function deleteUserController(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'A valid user id is required' });
    }

    const deletedUser = await deleteUserService(userId);
    if (!deletedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ message: 'User deleted successfully', user: deletedUser });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Failed to delete user' });
  }
}

export async function updateUserRoleController(req, res) {
  try {
    const userId = Number(req.params.id);
    const nextRole = String(req.body?.role || '').toLowerCase();

    if (!userId || !ALLOWED_ROLES.has(nextRole)) {
      return res.status(400).json({ error: 'A valid user id and role are required' });
    }

    const updatedUser = await updateUserRoleService(userId, nextRole);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      message: 'Role updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({ error: 'Failed to update role' });
  }
}

export async function resetUserPasswordController(req, res) {
  try {
    const userId = Number(req.params.id);
    if (!userId) {
      return res.status(400).json({ error: 'A valid user id is required' });
    }

    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, 10);

    const updatedUser = await resetUserPasswordService(userId, hash);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      message: 'Password reset successfully',
      tempPassword,
    });
  } catch (error) {
    console.error('Error resetting user password:', error);
    return res.status(500).json({ error: 'Failed to reset password' });
  }
}
