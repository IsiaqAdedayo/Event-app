import { IsString, IsIn } from 'class-validator';

export class CreateRsvpDto {
  @IsString()
  @IsIn(['yes', 'no', 'maybe'])
  status: string; // yes, no, maybe
}
