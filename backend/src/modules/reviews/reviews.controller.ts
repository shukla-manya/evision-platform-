import {
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateElectricianReviewDto } from './dto/create-electrician-review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private reviews: ReviewsService) {}

  @Post('electrician/:id')
  @Roles('customer', 'dealer')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary:
      'Create review for electrician with rating/comment and optional photo',
  })
  @UseInterceptors(FileInterceptor('photo'))
  createElectricianReview(
    @CurrentUser() user: { id: string },
    @Param('id') electricianId: string,
    @Body() dto: CreateElectricianReviewDto,
    @UploadedFile() photo?: Express.Multer.File,
  ) {
    return this.reviews.createForElectrician(user.id, electricianId, dto, photo);
  }
}
