/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  InternalServerErrorException,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateRsvpDto } from './dto/create-rsvp.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';
import { RsvpService } from './rsvp.service';

@Controller('events')
export class EventsController {
  constructor(
    private eventsService: EventsService,
    private rsvpService: RsvpService,
  ) {}

  @Post()
  @UseGuards(JwtGuard)
  create(@Body() createEventDto: CreateEventDto, @Request() req) {
    return this.eventsService.create(req.user.userId, createEventDto);
  }

  @Get()
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    return this.eventsService.findAll(parseInt(page), parseInt(limit));
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.eventsService.findOne(id);
  }

  @Put(':id')
  @UseGuards(JwtGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEventDto: UpdateEventDto,
    @Request() req,
  ) {
    return this.eventsService.update(id, req.user.userId, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(JwtGuard)
  delete(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.eventsService.delete(id, req.user.userId);
  }

  //RSVP
  @Post(':id/rsvp')
  @UseGuards(JwtGuard)
  createRsvp(
    @Param('id', ParseIntPipe) id: number,
    @Body() createRsvpDto: CreateRsvpDto,
    @Request() req,
  ) {
    return this.rsvpService.createOrUpdateRsvp(
      req.user.userId,
      id,
      createRsvpDto,
    );
  }

  @Get(':id/attendees')
  getAttendees(@Param('id', ParseIntPipe) id: number) {
    return this.rsvpService.getAttendees(id);
  }

  @Delete(':id/rsvp')
  @UseGuards(JwtGuard)
  cancelRsvp(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.rsvpService.cancelRsvp(req.user.userId, id);
  }

  // Bookmark //
  @Post(':id/bookmark')
  @UseGuards(JwtGuard)
  toggleBookmark(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.eventsService.toggleBookmark(req.user.userId, id);
  }

  //Upload//
  @Post(':id/upload-image')
  @UseGuards(JwtGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async uploadEventImage(
    @Param('id', ParseIntPipe) id: number,
    @Req() req,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Image file is required');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File must be an image');
    }
    try {
      return this.eventsService.updateImage(id, req.user.userId, file);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException('Image upload failed');
    }
  }
}
