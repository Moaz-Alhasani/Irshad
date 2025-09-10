import { IsEmail, IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class SendInterviewLinkDto {

    @IsString()
    @IsNotEmpty()
    @IsUrl()
    linkGoogleMeet: string;

    @IsString()
    @IsNotEmpty()
    subject: string;

    @IsString()
    @IsNotEmpty()
    message: string;
}
