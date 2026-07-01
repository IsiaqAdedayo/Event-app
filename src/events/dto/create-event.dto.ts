import { IsString, IsDateString, IsInt, Min } from 'class-validator';

export class CreateEventDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsDateString()
  date: string; // ISO 8601: "2026-07-05T10:00:00Z"

  @IsString()
  location: string;

  @IsInt()
  @Min(1)
  maxCapacity: number;
}
