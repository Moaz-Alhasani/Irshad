import { IsArray, IsNotEmpty, IsString, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class OptionDto {
  @IsString()
  text: string;

  @IsBoolean()
  isCorrect: boolean;
}

export class CreateQuestionDto {
  @IsNotEmpty()
  @IsString()
  questionText: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OptionDto)
  options: OptionDto[];
}
