import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
    private transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.EMAIL_USER, 
            pass: process.env.EMAIL_PASS,
        },
        });
    }

    async sendEmail(option: { email: string; subject: string; message: string }) {
        const emailOptions = {
        from: `"Irshad" <${process.env.EMAIL_COMPANY}>`,
        to: option.email,
        subject: option.subject,
        text: option.message,
        };

        try {
        await this.transporter.sendMail(emailOptions);
        console.log(`✅ Email sent to: ${option.email}`);
        } catch (error) {
        console.error(`❌ Failed to send to ${option.email}:`, error);
        throw error;
        }
    }
}
