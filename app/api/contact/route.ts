import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY);

const contactSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  message: z.string().min(10, 'Message must be at least 10 characters').max(1000),
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 3 contact form submissions per 15 minutes per IP
    const identifier = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous';
    const rateLimitResult = await rateLimit(identifier, 3, 900); // 15 minutes = 900 seconds

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = contactSchema.parse(body);

    const { name, email, message } = validatedData;

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'Contact Form <onboarding@resend.dev>',
      to: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@example.com',
      replyTo: email,
      subject: `New Contact Request from ${name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #f4f4f4; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
              .content { background-color: #ffffff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
              .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
              .label { font-weight: bold; color: #555; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0; color: #333;">New Contact Request</h2>
              </div>
              <div class="content">
                <p><span class="label">From:</span> ${name}</p>
                <p><span class="label">Email:</span> <a href="mailto:${email}">${email}</a></p>
                <p><span class="label">Message:</span></p>
                <p style="white-space: pre-wrap; background-color: #f9f9f9; padding: 15px; border-left: 3px solid #007bff; border-radius: 3px;">${message}</p>
              </div>
              <div class="footer">
                <p>This email was sent from the AI Phone Agents Dashboard contact form.</p>
                <p>Reply directly to this email to respond to ${name}.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send email. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, messageId: data?.id },
      { status: 200 }
    );

  } catch (err: unknown) {
    console.error('Contact form error:', err);

    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: err.issues[0]?.message || 'Validation error' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'An error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
