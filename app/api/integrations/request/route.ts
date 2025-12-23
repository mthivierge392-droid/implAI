import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { z } from 'zod';
import { rateLimit } from '@/lib/rate-limit';

const resend = new Resend(process.env.RESEND_API_KEY);

// Request schema validation
const integrationRequestSchema = z.object({
  user_email: z.string().email('Invalid email'),
  user_id: z.string(),
  agent_id: z.string(),
  agent_name: z.string(),
  retell_agent_id: z.string(),
  retell_llm_id: z.string().optional(),
  integration_type: z.enum(['transfer_call', 'cal_com']),
  // Transfer Call fields
  phone_number: z.string().optional(),
  transfer_description: z.string().optional(),
  transfer_function_name: z.string().optional(),
  // Cal.com fields
  cal_api_key: z.string().optional(),
  cal_event_type_id: z.string().optional(),
  cal_timezone: z.string().optional(),
}).refine((data) => {
  // Validate Transfer Call fields
  if (data.integration_type === 'transfer_call') {
    return data.phone_number && data.transfer_description && data.transfer_function_name;
  }
  // Validate Cal.com fields
  if (data.integration_type === 'cal_com') {
    return data.cal_api_key && data.cal_event_type_id;
  }
  return true;
}, {
  message: 'Missing required fields for the selected integration type'
});

export async function POST(request: NextRequest) {
  try {
    // Rate limiting - 5 integration requests per hour per IP
    const identifier = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'anonymous';
    const rateLimitResult = await rateLimit(identifier, 5, 3600); // 1 hour = 3600 seconds

    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = integrationRequestSchema.parse(body);

    const {
      user_email: userEmail,
      user_id,
      agent_id,
      agent_name,
      retell_agent_id,
      retell_llm_id,
      integration_type
    } = validatedData;

    // Integration type labels
    const integrationLabels: Record<string, string> = {
      transfer_call: 'Transfer Call Number',
      cal_com: 'Cal.com'
    };

    // Build integration-specific details HTML
    let integrationDetailsHtml = '';

    if (integration_type === 'transfer_call') {
      integrationDetailsHtml = `
        <div class="section">
          <h3 style="margin-top: 0; color: #4F46E5;">Transfer Call Details</h3>
          <p><span class="label">Phone Number:</span> <strong>${validatedData.phone_number}</strong></p>
          <p><span class="label">Function Name:</span> <code>${validatedData.transfer_function_name}</code></p>
          <p><span class="label">When to Transfer:</span></p>
          <div class="highlight">${validatedData.transfer_description}</div>
        </div>
      `;
    } else if (integration_type === 'cal_com') {
      const maskedApiKey = validatedData.cal_api_key
        ? validatedData.cal_api_key.substring(0, 8) + '***' + validatedData.cal_api_key.substring(validatedData.cal_api_key.length - 4)
        : 'N/A';

      integrationDetailsHtml = `
        <div class="section">
          <h3 style="margin-top: 0; color: #4F46E5;">Cal.com Configuration</h3>
          <p><span class="label">Request:</span> Configure <strong>both</strong> Cal.com functions (check availability & book appointment)</p>
          <p><span class="label">API Key:</span> <code>${maskedApiKey}</code></p>
          <p><span class="label">Event Type ID:</span> <code>${validatedData.cal_event_type_id}</code></p>
          ${validatedData.cal_timezone ? `<p><span class="label">Timezone:</span> ${validatedData.cal_timezone}</p>` : ''}
          <p style="color: #666; font-size: 12px; margin-top: 10px;">⚠️ Full API key stored in database - access via Supabase</p>
        </div>
      `;
    }

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: process.env.INTEGRATION_FROM_EMAIL || 'Integration Request <integration@form.impl-ai.com>',
      to: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'hello@impl-ai.com',
      replyTo: userEmail,
      subject: `New Integration Request: ${integrationLabels[integration_type]} - ${agent_name}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #4F46E5; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
              .content { background-color: #ffffff; padding: 20px; border: 1px solid #ddd; border-radius: 5px; }
              .section { margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee; }
              .section:last-child { border-bottom: none; }
              .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px; }
              .label { font-weight: bold; color: #555; display: inline-block; min-width: 150px; }
              .badge { display: inline-block; padding: 4px 12px; border-radius: 12px; background-color: #4F46E5; color: white; font-size: 12px; font-weight: bold; }
              ul { margin: 10px 0; padding-left: 20px; }
              .highlight { background-color: #f9f9f9; padding: 15px; border-left: 3px solid #4F46E5; border-radius: 3px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h2 style="margin: 0;">🔌 New Integration Request</h2>
                <p style="margin: 5px 0 0 0; opacity: 0.9;">A client needs your help setting up an integration</p>
              </div>

              <div class="content">
                <div class="section">
                  <h3 style="margin-top: 0; color: #4F46E5;">Client Information</h3>
                  <p><span class="label">User Email:</span> <a href="mailto:${userEmail}">${userEmail}</a></p>
                  <p><span class="label">User ID:</span> ${user_id}</p>
                </div>

                <div class="section">
                  <h3 style="margin-top: 0; color: #4F46E5;">Agent Details</h3>
                  <p><span class="label">Agent Name:</span> ${agent_name}</p>
                  <p><span class="label">Agent ID:</span> ${agent_id}</p>
                  <p><span class="label">Retell Agent ID:</span> ${retell_agent_id}</p>
                  <p><span class="label">Retell LLM ID:</span> ${retell_llm_id || 'Not set'}</p>
                </div>

                <div class="section">
                  <h3 style="margin-top: 0; color: #4F46E5;">Integration Request</h3>
                  <p><span class="label">Integration Type:</span> <span class="badge">${integrationLabels[integration_type]}</span></p>
                </div>

                ${integrationDetailsHtml}

                <div class="section">
                  <h3 style="margin-top: 0; color: #4F46E5;">Next Steps - Configuration Instructions</h3>
                  ${integration_type === 'transfer_call' ? `
                    <ol>
                      <li>Log into <strong>Retell AI dashboard</strong></li>
                      <li>Navigate to LLM ID: <code>${retell_llm_id || 'N/A'}</code></li>
                      <li>Go to <strong>General Tools</strong> section</li>
                      <li>Add a new tool with type: <code>transfer_call</code></li>
                      <li>Set function name: <code>${validatedData.transfer_function_name}</code></li>
                      <li>Set phone number: <code>${validatedData.phone_number}</code></li>
                      <li>Set description: "${validatedData.transfer_description}"</li>
                      <li>Save the configuration</li>
                      <li>Reply to this email to notify ${userEmail}</li>
                    </ol>
                  ` : `
                    <h4 style="color: #4F46E5; margin-bottom: 10px;">Configure BOTH Cal.com Functions:</h4>

                    <h5 style="margin-top: 15px; color: #374151;">1️⃣ Check Availability Function</h5>
                    <ol>
                      <li>Log into <strong>Retell AI dashboard</strong></li>
                      <li>Navigate to LLM ID: <code>${retell_llm_id || 'N/A'}</code></li>
                      <li>Go to <strong>Preset Tools</strong> section (not General Tools)</li>
                      <li>Click <strong>Add Cal.com Tool</strong></li>
                      <li>Set type: <code>check_calendar_availability_cal</code></li>
                      <li>Set function name: <code>check_availability</code></li>
                      <li>Set description: "Check available time slots for scheduling appointments"</li>
                      <li>Enter Cal.com API Key from database</li>
                      <li>Enter Event Type ID: <code>${validatedData.cal_event_type_id}</code></li>
                      ${validatedData.cal_timezone ? `<li>Set timezone: <code>${validatedData.cal_timezone}</code></li>` : ''}
                      <li>Save the configuration</li>
                    </ol>

                    <h5 style="margin-top: 15px; color: #374151;">2️⃣ Book Appointment Function</h5>
                    <ol>
                      <li>Click <strong>Add Cal.com Tool</strong> again</li>
                      <li>Set type: <code>book_appointment_cal</code></li>
                      <li>Set function name: <code>book_appointment</code></li>
                      <li>Set description: "Book an appointment when user confirms their preferred time slot"</li>
                      <li>Enter Cal.com API Key from database</li>
                      <li>Enter Event Type ID: <code>${validatedData.cal_event_type_id}</code></li>
                      ${validatedData.cal_timezone ? `<li>Set timezone: <code>${validatedData.cal_timezone}</code></li>` : ''}
                      <li>Save the configuration</li>
                    </ol>

                    <p style="margin-top: 15px;"><strong>✅ Final Step:</strong> Reply to this email to notify ${userEmail} that both functions are configured.</p>
                  `}
                </div>
              </div>

              <div class="footer">
                <p>This email was sent from the AI Phone Agents Dashboard.</p>
                <p>Reply directly to this email to contact ${userEmail}.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json(
        { error: 'Failed to send integration request. Please try again.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Integration request sent! We\'ll set this up for you within 24 hours and notify you when it\'s ready.',
      messageId: data?.id
    }, { status: 200 });

  } catch (err: unknown) {
    console.error('Integration request error:', err);

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
