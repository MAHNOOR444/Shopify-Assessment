import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { recordProductActivity } from "../product-activity.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  // authenticate.webhook() verifies the X-Shopify-Hmac-Sha256 signature and
  // the webhook topic. It throws a 401/400 response if verification fails,
  // so any code below this line only runs for genuine Shopify webhooks.
  const { shop, topic, payload, webhookId } = await authenticate.webhook(
    request,
  );

  console.log(`Received ${topic} webhook for ${shop} (id: ${webhookId})`);

  // products/update payloads use the REST-style product shape.
  const productGid =
    (payload.admin_graphql_api_id as string | undefined) ??
    `gid://shopify/Product/${payload.id}`;

  try {
    await recordProductActivity({
      shop,
      productId: productGid,
      action: "products/update",
      source: "webhook",
      newValue: {
        webhookId,
        title: payload.title,
        status: payload.status,
        vendor: payload.vendor,
        productType: payload.product_type,
        updatedAt: payload.updated_at,
      },
    });
  } catch (error) {
    console.error("Failed to record products/update webhook", error);
    // Return 500 so Shopify retries the delivery instead of losing the event.
    return new Response(null, { status: 500 });
  }

  return new Response();
};
