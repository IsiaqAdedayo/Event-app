import { Module } from '@nestjs/common';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { RsvpService } from './rsvp.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Module({
  imports: [PrismaModule],
  controllers: [EventsController],
  providers: [EventsService, RsvpService, CloudinaryService],
  exports: [EventsService],
})
export class EventsModule {}
