import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RejectApplicationDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  feedback: string;
}
