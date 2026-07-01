/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { EventsService } from './events.service';
import { RsvpService } from './rsvp.service';
import { CreateRsvpDto } from './dto/create-rsvp.dto';

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
}
