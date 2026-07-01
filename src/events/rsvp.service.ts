/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRsvpDto } from './dto/create-rsvp.dto';

@Injectable()
export class RsvpService {
  constructor(private prisma: PrismaService) {}

  async createOrUpdateRsvp(
    userId: number,
    eventId: number,
    createRsvpDto: CreateRsvpDto,
  ) {
    // Check event exists and is active
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status === 'cancelled') {
      throw new BadRequestException('Event is cancelled');
    }

    // Check if user already RSVPd
    const existingRsvp = await this.prisma.rsvp.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    // If changing from "no" to "yes", need to check capacity
    if (existingRsvp) {
      // Changing status
      if (existingRsvp.status === 'yes' && createRsvpDto.status === 'yes') {
        // Already yes, no change needed
        return existingRsvp;
      }

      if (createRsvpDto.status === 'yes') {
        // Trying to change to "yes" - check capacity
        const confirmedCount = await this.prisma.rsvp.count({
          where: {
            eventId,
            status: 'yes',
          },
        });

        if (confirmedCount >= event.maxCapacity) {
          // Can't confirm, add to waitlist
          const waitlistPosition = await this.getNextWaitlistPosition(eventId);
          return this.prisma.rsvp.update({
            where: { id: existingRsvp.id },
            data: {
              status: 'yes',
              waitlistPosition,
            },
          });
        }
      }

      // Update status
      return this.prisma.rsvp.update({
        where: { id: existingRsvp.id },
        data: {
          status: createRsvpDto.status,
          waitlistPosition: createRsvpDto.status === 'yes' ? null : undefined,
        },
      });
    }

    // New RSVP
    const confirmedCount = await this.prisma.rsvp.count({
      where: {
        eventId,
        status: 'yes',
      },
    });

    let waitlistPosition: number | null = null;

    if (createRsvpDto.status === 'yes') {
      if (confirmedCount >= event.maxCapacity) {
        // Event is full, add to waitlist
        waitlistPosition = await this.getNextWaitlistPosition(eventId);
      }
    }

    return this.prisma.rsvp.create({
      data: {
        userId,
        eventId,
        status: createRsvpDto.status,
        waitlistPosition,
      },
    });
  }

  async getAttendees(eventId: number) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const rsvps = await this.prisma.rsvp.findMany({
      where: { eventId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { status: 'desc' }, // yes first
        { waitlistPosition: 'asc' }, // then by waitlist position
      ],
    });

    return rsvps.map((rsvp) => ({
      userId: rsvp.user.id,
      name: rsvp.user.name,
      email: rsvp.user.email,
      status: rsvp.status,
      waitlistPosition: rsvp.waitlistPosition,
    }));
  }

  async cancelRsvp(userId: number, eventId: number) {
    const rsvp = await this.prisma.rsvp.findUnique({
      where: {
        userId_eventId: { userId, eventId },
      },
    });

    if (!rsvp) {
      throw new NotFoundException('RSVP not found');
    }

    // Delete the RSVP
    await this.prisma.rsvp.delete({
      where: { id: rsvp.id },
    });

    // If they were confirmed and had a waitlist position, promote first person on waitlist
    if (rsvp.status === 'yes' && rsvp.waitlistPosition === null) {
      await this.promoteFromWaitlist(eventId);
    }

    return { success: true };
  }

  private async getNextWaitlistPosition(eventId: number): Promise<number> {
    const maxPosition = await this.prisma.rsvp.findFirst({
      where: { eventId, waitlistPosition: { not: null } },
      orderBy: { waitlistPosition: 'desc' },
    });

    return (maxPosition?.waitlistPosition ?? 0) + 1;
  }

  private async promoteFromWaitlist(eventId: number) {
    const firstOnWaitlist = await this.prisma.rsvp.findFirst({
      where: { eventId, waitlistPosition: { not: null } },
      orderBy: { waitlistPosition: 'asc' },
    });

    if (firstOnWaitlist) {
      await this.prisma.rsvp.update({
        where: { id: firstOnWaitlist.id },
        data: { waitlistPosition: null },
      });
    }
  }
}
