// @ts-nocheck
import { createClient } from "npm:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const TREATMENTS = {
  tr_hilot: "Traditional Hilot",
  tr_ventosa: "Ventosa Hilot",
  tr_swedish: "Swedish Relaxation",
  tr_deep: "Deep Tissue",
  tr_prenatal: "Prenatal Comfort",
  tr_combo: "Hilot and Massage",
  tr_foot: "Foot Hilot",
  tr_sports: "Sports Recovery",
};

const EVENTS = ["created", "confirmed", "payment_received", "cancelled", "completed"];

function pesos(value) {
  const amount = Math.round(Number(value) || 0);
  return `₱${amount.toLocaleString("en-PH")}`;
}

function whenLabel(booking) {
  const [year, month, day] = String(booking.date).split("-");
  const [hourValue, minute] = String(booking.time).slice(0, 5).split(":");
  const hour = Number(hourValue);
  const suffix = hour >= 12 ? "PM" : "AM";
  const clock = `${hour % 12 || 12}:${minute} ${suffix}`;
  return `${month}/${day}/${year} at ${clock}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function messagesFor(event, booking, customer, therapist) {
  const treatment = TREATMENTS[booking.treatment_id] ?? "session";
  const when = whenLabel(booking);
  const customerName = booking.customer_name || customer?.name || "Customer";
  const therapistName = therapist?.name || "your therapist";
  const paid = pesos(booking.amount_paid || booking.service_total);
  const customerMail = customer?.email;
  const therapistMail = therapist?.email;

  if (event === "created") {
    return [
      therapistMail && {
        to: therapistMail,
        subject: "New Hilotcare booking",
        text: `${customerName} booked ${treatment} for ${when}. Open the therapist desk to confirm it.`,
      },
      customerMail && {
        to: customerMail,
        subject: "Hilotcare booking received",
        text: `Your ${treatment} on ${when} was sent to ${therapistName}. You will get another email when it is confirmed.`,
      },
    ].filter(Boolean);
  }

  if (event === "confirmed") {
    return [
      customerMail && {
        to: customerMail,
        subject: "Hilotcare booking confirmed",
        text: `${therapistName} confirmed your ${treatment} on ${when}.`,
      },
    ].filter(Boolean);
  }

  if (event === "payment_received") {
    return [
      therapistMail && {
        to: therapistMail,
        subject: "Hilotcare payment received",
        text: `Payment of ${paid} was received from ${customerName} for ${treatment} on ${when}.`,
      },
      customerMail && {
        to: customerMail,
        subject: "Hilotcare payment receipt",
        text: `We received your payment of ${paid} for ${treatment} on ${when}.`,
      },
    ].filter(Boolean);
  }

  if (event === "completed") {
    return [
      customerMail && {
        to: customerMail,
        subject: "Hilotcare session finished",
        text: `Your ${treatment} on ${when} is marked finished.`,
      },
      therapistMail && {
        to: therapistMail,
        subject: "Hilotcare session finished",
        text: `The ${treatment} with ${customerName} on ${when} is marked finished.`,
      },
    ].filter(Boolean);
  }

  const note = booking.cancel_note ? ` ${booking.cancel_note}` : "";
  return [
    customerMail && {
      to: customerMail,
      subject: "Hilotcare booking cancelled",
      text: `The ${treatment} on ${when} was cancelled.${note}`,
    },
    therapistMail && {
      to: therapistMail,
      subject: "Hilotcare booking cancelled",
      text: `The ${treatment} with ${customerName} on ${when} was cancelled.${note}`,
    },
  ].filter(Boolean);
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return Response.json({ error: "Use POST." }, { status: 405 });

  const authHeader = req.headers.get("Authorization");
  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SECRET_KEY");
  if (!authHeader || !url || !anon || !service) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return Response.json({ error: "Sign in required." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!body.bookingId || !EVENTS.includes(body.event)) {
    return Response.json({ error: "Unknown notice." }, { status: 400 });
  }

  const admin = createClient(url, service);
  const { data: booking, error } = await admin.from("bookings").select("*").eq("id", body.bookingId).maybeSingle();
  if (error || !booking) return Response.json({ error: "Booking not found." }, { status: 404 });
  if (booking.customer_id !== userData.user.id && booking.therapist_id !== userData.user.id) {
    return Response.json({ error: "Not allowed." }, { status: 403 });
  }

  const [{ data: customer }, { data: therapist }] = await Promise.all([
    admin.from("customers").select("email, name").eq("id", booking.customer_id).maybeSingle(),
    admin.from("therapists").select("email, name").eq("id", booking.therapist_id).maybeSingle(),
  ]);

  const smtpUser = Deno.env.get("SMTP_USER");
  const smtpPass = Deno.env.get("SMTP_PASS");
  const smtpFrom = Deno.env.get("SMTP_FROM") || smtpUser;
  if (!smtpUser || !smtpPass || !smtpFrom) {
    return Response.json({
      sent: 0,
      reason: "Add SMTP_USER, SMTP_PASS, and SMTP_FROM in Edge Function secrets.",
    });
  }

  const port = Number(Deno.env.get("SMTP_PORT") ?? "465");
  const client = new SMTPClient({
    connection: {
      hostname: Deno.env.get("SMTP_HOST") ?? "smtp.gmail.com",
      port,
      tls: port === 465,
      auth: { username: smtpUser, password: smtpPass },
    },
  });

  const messages = messagesFor(body.event, booking, customer, therapist);
  try {
    for (const message of messages) {
      await client.send({
        from: smtpFrom,
        to: message.to,
        subject: message.subject,
        content: message.text,
        html: `<p>${escapeHtml(message.text).replaceAll("\n", "<br>")}</p>`,
      });
    }
  } finally {
    await client.close();
  }

  return Response.json({ sent: messages.length });
});
