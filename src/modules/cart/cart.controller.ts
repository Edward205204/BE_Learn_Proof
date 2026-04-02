import { Controller, Get, Post, Delete, Param, Body } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger'
import { CartService } from './cart.service'
import { ActiveUser } from 'src/shared/decorators/active-user.decorator'
import { TokenPayload } from 'src/shared/types/jwt.type'

@ApiTags('Cart')
@ApiBearerAuth('access-token')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy giỏ hàng của người dùng' })
  @ApiResponse({ status: 200, description: 'Thông tin giỏ hàng và các khoá học' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getCart(@ActiveUser() user: TokenPayload) {
    return this.cartService.getCart(user.userId)
  }

  @Post('items')
  @ApiOperation({ summary: 'Thêm khoá học vào giỏ hàng' })
  @ApiBody({ schema: { type: 'object', properties: { courseId: { type: 'string', example: 'abc-123' } } } })
  @ApiResponse({ status: 201, description: 'Thêm vào giỏ hàng thành công' })
  @ApiResponse({ status: 400, description: 'courseId không hợp lệ hoặc không tìm thấy' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  addToCart(@ActiveUser() user: TokenPayload, @Body('courseId') courseId: string) {
    return this.cartService.addToCart(user.userId, courseId)
  }

  @Delete('items/:courseId')
  @ApiOperation({ summary: 'Xoá khoá học khỏi giỏ hàng' })
  @ApiParam({ name: 'courseId', description: 'ID của khoá học cần xoá' })
  @ApiResponse({ status: 200, description: 'Xoá khỏi giỏ hàng thành công' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khoá học trong giỏ hàng' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  removeFromCart(@ActiveUser() user: TokenPayload, @Param('courseId') courseId: string) {
    return this.cartService.removeFromCart(user.userId, courseId)
  }
}
