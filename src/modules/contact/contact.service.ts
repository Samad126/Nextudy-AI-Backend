import { Injectable } from '@nestjs/common';
import { MailService } from '../../common/mail/mail.service.js';
import { ContactDto } from './dto/contact.dto.js';

@Injectable()
export class ContactService {
  constructor(private readonly mail: MailService) {}

  send(dto: ContactDto): Promise<void> {
    return this.mail.sendContactEmail(dto.name, dto.email, dto.message);
  }
}
