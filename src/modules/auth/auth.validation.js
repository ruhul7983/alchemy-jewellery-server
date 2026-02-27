const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  phone: z.string().optional(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginSchema = z.object({
  // Change 'email' to 'identifier' to match your Service logic
  identifier: z.string().min(1, 'Email or Phone is required'), 
  password: z.string().min(1, 'Password is required'),
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  imageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
  currentPassword: z.string().min(6).optional(),
  newPassword: z.string().min(6).optional(),
}).refine((data) => {
  if (data.newPassword && !data.currentPassword) return false;
  return true;
}, {
  message: "Current password is required to set a new password",
  path: ["currentPassword"],
});

const adminLoginSchema = z.object({
  identifier: z.string().min(1, 'Admin Email or Phone is required'),
  password: z.string().min(1, 'Password is required'),
});

const validateRequest = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
};




module.exports = { registerSchema, loginSchema,updateProfileSchema, adminLoginSchema, validateRequest };
