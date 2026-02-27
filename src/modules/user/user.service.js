const prisma = require('../../lib/prisma');
const { AppError } = require('../../shared/middleware/error.middleware');

class UserService {
  async getAllUsers() {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return users;
  }

  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, 'User not found');
    }

    return user;
  }

  async updateUser(userId, data) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: data.fullName,
        phone: data.phone,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        role: true,
        updatedAt: true,
      },
    });

    return user;
  }

  async deleteUser(userId) {
    await prisma.user.delete({
      where: { id: userId },
    });
  }


  async addAddress(userId, data) {
    const { title, address, phone, isDefault } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. If this is set as default, unset previous default
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // 2. Create the new address
      return await tx.address.create({
        data: { userId, title, address, phone, isDefault },
      });
    });
  }

  async getMyAddresses(userId) {
    return await prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async updateAddress(userId, addressId, data) {
    const { isDefault } = data;

    return await prisma.$transaction(async (tx) => {
      // 1. If setting this one to default, unset others
      if (isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      // 2. Update target address
      return await tx.address.update({
        where: { id: addressId, userId }, // Security: ensure it belongs to user
        data: data,
      });
    });
  }

  async deleteAddress(userId, addressId) {
    const address = await prisma.address.findUnique({ where: { id: addressId } });

    if (!address || address.userId !== userId) {
      throw new AppError(404, "Address not found");
    }

    return await prisma.address.delete({ where: { id: addressId } });
  }
}

module.exports = { UserService };
