/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

@Injectable()
export class EventsService {
  constructor(
    private prisma: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(userId: number, createEventDto: CreateEventDto) {
    return this.prisma.event.create({
      data: {
        ...createEventDto,
        organizerId: userId,
      },
    });
  }

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const events = await this.prisma.event.findMany({
      skip,
      take: limit,
      where: { status: 'active' }, // Only return active events
      select: {
        id: true,
        title: true,
        date: true,
        location: true,
        maxCapacity: true,
        rsvps: true, // Include RSVPs to count
      },
      orderBy: { date: 'asc' }, // Sort by date ascending
    });

    // Transform to include rsvpCount
    const transformedEvents = events.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      location: event.location,
      maxCapacity: event.maxCapacity,
      rsvpCount: event.rsvps.length,
    }));

    return transformedEvents;
  }

  async findOne(id: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        date: true,
        location: true,
        maxCapacity: true,
        rsvps: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return {
      ...event,
      rsvpCount: event.rsvps.length,
    };
  }

  async update(id: number, userId: number, updateEventDto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== userId) {
      throw new ForbiddenException('Only organizer can update event');
    }

    return this.prisma.event.update({
      where: { id },
      data: updateEventDto,
    });
  }

  async delete(id: number, userId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.organizerId !== userId) {
      throw new ForbiddenException('Only organizer can delete event');
    }

    // Soft delete (mark as cancelled instead of deleting)
    return this.prisma.event.update({
      where: { id },
      data: { status: 'cancelled' },
    });
  }

  // Bookmark event //
  async toggleBookmark(userId: number, eventId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Check if already bookmarked
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { bookmarks: { where: { id: eventId } } },
    });

    if (user && user.bookmarks.length > 0) {
      // Remove bookmark
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          bookmarks: {
            disconnect: { id: eventId },
          },
        },
      });
      return { bookmarked: false };
    } else {
      // Add bookmark
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          bookmarks: {
            connect: { id: eventId },
          },
        },
      });
      return { bookmarked: true };
    }
  }

  async getBookmarkedEvents(
    userId: number,
    page: number = 1,
    limit: number = 10,
  ) {
    const skip = (page - 1) * limit;

    const events = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        bookmarks: {
          skip,
          take: limit,
          where: { status: 'active' },
          select: {
            id: true,
            title: true,
            date: true,
            location: true,
            maxCapacity: true,
            rsvps: true,
          },
          orderBy: { date: 'asc' },
        },
      },
    });

    if (!events) {
      throw new NotFoundException('User not found');
    }

    return events.bookmarks.map((event) => ({
      id: event.id,
      title: event.title,
      date: event.date,
      location: event.location,
      maxCapacity: event.maxCapacity,
      rsvpCount: event.rsvps.length,
    }));
  }

  async updateImage(id: number, userId: number, file: Express.Multer.File) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    if (event.organizerId !== userId) {
      throw new ForbiddenException('Only organizer can update event image');
    }

    const { url, publicId } = await this.cloudinaryService.uploadImage(
      file,
      id,
    );

    // Optimistic concurrency: only commit if imagePublicId hasn't moved since
    // we read it. If another request updated it in between, this affects 0 rows.
    const result = await this.prisma.event.updateMany({
      where: { id, imagePublicId: event.imagePublicId },
      data: { imageUrl: url, imagePublicId: publicId },
    });

    if (result.count === 0) {
      // lost the race — our upload is now orphaned, clean it up before failing
      await this.cloudinaryService.deleteImage(publicId).catch(() => undefined);
      throw new ConflictException('Image was updated concurrently, retry');
    }

    let cleanupWarning: string | undefined;
    if (event.imagePublicId) {
      await this.cloudinaryService
        .deleteImage(event.imagePublicId)
        .catch((err) => {
          console.error(
            `Failed to delete old image ${event.imagePublicId}:`,
            err,
          );
          cleanupWarning = 'Old image could not be deleted';
        });
    }

    const updated = await this.prisma.event.findUnique({ where: { id } });
    return cleanupWarning
      ? { ...updated, imageCleanupWarning: cleanupWarning }
      : updated;
  }
}
