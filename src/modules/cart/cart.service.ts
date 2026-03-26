import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper method to return cart with necessary course info
   */
  private async getCartWithDetails(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            course: {
              include: {
                creator: { select: { fullName: true } }
              }
            }
          }
        }
      }
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              course: {
                include: {
                  creator: { select: { fullName: true } }
                }
              }
            }
          }
        }
      });
    }

    return cart;
  }

  async getCart(userId: string) {
    return this.getCartWithDetails(userId);
  }

  async addToCart(userId: string, courseIdOrSlug: string) {
    let cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }

    // Check if course exists by id or slug
    const course = await this.prisma.course.findFirst({
      where: {
        OR: [
          { id: courseIdOrSlug },
          { slug: courseIdOrSlug }
        ]
      }
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    // Check if item already exists in cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_courseId: {
          cartId: cart.id,
          courseId: course.id,
        }
      }
    });

    if (!existingItem) {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, courseId: course.id }
      });
    }

    return this.getCartWithDetails(userId);
  }

  async removeFromCart(userId: string, courseId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      throw new NotFoundException('Cart not found');
    }

    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        courseId,
      }
    });

    return this.getCartWithDetails(userId);
  }
}
