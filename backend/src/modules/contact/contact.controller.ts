import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { ContactService } from './contact.service';
import { SubmitContactMessageDto } from './dto/submit-contact-message.dto';
import { SubscribeNewsletterDto } from './dto/subscribe-newsletter.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  @Public()
  @Post('message')
  @ApiOperation({ summary: 'Submit contact form — emails support + sends confirmation to the visitor' })
  submitMessage(@Body() dto: SubmitContactMessageDto) {
    return this.contact.submitMessage(dto);
  }

  @Public()
  @Post('newsletter')
  @ApiOperation({ summary: 'Newsletter signup — emails marketing + confirmation to the subscriber' })
  subscribe(@Body() dto: SubscribeNewsletterDto) {
    return this.contact.subscribe(dto);
  }
}
