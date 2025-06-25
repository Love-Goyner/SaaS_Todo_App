import { Webhook } from "svix";
import { WebhookEvent } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const WEHBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEHBHOOK_SECRET) throw new Error("Missing Webhook Secret");

  const headerPayload = await headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("error occured - no svix headers", { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

//   console.log("body of the request", body);
  

  const wh = new Webhook(WEHBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (error) {
    console.log("error in verifying the webhook", error);
    return new Response("error occured", { status: 400 });
  }

//   console.log("event", evt);
  
  const { id } = evt.data;
  const eventType = evt.type;

  if (eventType === "user.created") {
    try {
      const { email_addresses, primary_email_address_id } = evt.data;
      const primaryEmail = email_addresses.find(
        (email: any) => email.id === primary_email_address_id
      );

      if (!primaryEmail) {
        return new Response("error occured - no primary email", {
          status: 400,
        });
      }
      
    //   console.log("Primary email:", primaryEmail);
      

      const newUser = await prisma.user.create({
        data: {
          id: evt.data.id!,
          email: primaryEmail.email_address,
          isSubscribed: false, // Default setting
        },
      });
    //   console.log("New user created:", newUser);
    } catch (error) {
      console.error("Error creating user in database:", error);
      return new Response("Error creating user", { status: 500 });
    }
  }
  return new Response("Webhook received successfully", { status: 200 });
}
