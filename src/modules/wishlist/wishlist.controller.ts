import { Controller, Get, Post, Delete, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger'
import { WishlistService } from './wishlist.service'
import { ActiveUser } from '../../shared/decorators/active-user.decorator'
import { TokenPayload } from '../../shared/types/jwt.type'

@ApiTags('Wishlist')
@ApiBearerAuth('access-token')
@Controller('wishlist')
export class WishlistController {
  constructor(private readonly wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách khoá học yêu thích' })
  @ApiResponse({ status: 200, description: 'Danh sách wishlist của người dùng' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  getWishlist(@ActiveUser() user: TokenPayload) {
    return this.wishlistService.getWishlist(user.userId)
  }

  @Post(':courseId')
  @ApiOperation({ summary: 'Thêm khoá học vào danh sách yêu thích' })
  @ApiParam({ name: 'courseId', description: 'ID hoặc slug của khoá học' })
  @ApiResponse({ status: 201, description: 'Thêm vào wishlist thành công' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khoá học' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  addToWishlist(@ActiveUser() user: TokenPayload, @Param('courseId') courseId: string) {
    return this.wishlistService.addToWishlist(user.userId, courseId)
  }

  @Delete(':courseId')
  @ApiOperation({ summary: 'Xoá khoá học khỏi danh sách yêu thích' })
  @ApiParam({ name: 'courseId', description: 'ID hoặc slug của khoá học' })
  @ApiResponse({ status: 200, description: 'Xoá khỏi wishlist thành công' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy khoá học' })
  @ApiResponse({ status: 500, description: 'Lỗi server nội bộ' })
  removeFromWishlist(@ActiveUser() user: TokenPayload, @Param('courseId') courseId: string) {
    return this.wishlistService.removeFromWishlist(user.userId, courseId)
  }
}
