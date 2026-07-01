/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { EventsService } from '../events/events.service';

@Controller('profile')
export class UsersController {
  constructor(private eventsService: EventsService) {}

  @Get()
  @UseGuards(JwtGuard)
  getProfile(@Request() req) {
    return req.user;
  }

  @Get('bookmarks')
  @UseGuards(JwtGuard)
  getBookmarks(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Request() req,
  ) {
    return this.eventsService.getBookmarkedEvents(
      req.user.userId,
      parseInt(page),
      parseInt(limit),
    );
  }
}
