import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { useLoaderData, useRouteError } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import db from "../db.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  const activities = await db.productActivity.findMany({
    where: { shop: session.shop },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return { activities };
};

function parseValue(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function shortValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value);
  return text.length > 60 ? `${text.slice(0, 60)}…` : text;
}

/** Renders a readable "field: old → new" summary of an activity row. */
function ChangeSummary({
  oldValue,
  newValue,
}: {
  oldValue: string | null;
  newValue: string | null;
}) {
  const oldParsed = parseValue(oldValue);
  const newParsed = parseValue(newValue);

  if (!oldParsed && !newParsed) {
    return <s-text color="subdued">—</s-text>;
  }

  const keys = Array.from(
    new Set([...Object.keys(oldParsed ?? {}), ...Object.keys(newParsed ?? {})]),
  );

  return (
    <s-stack direction="block" gap="small-200">
      {keys.map((key) => (
        <s-text key={key}>
          <s-text type="strong">{key}</s-text>
          {oldParsed ? `: ${shortValue(oldParsed[key])}` : ""}
          {oldParsed && newParsed ? " → " : ": "}
          {newParsed ? shortValue(newParsed[key]) : ""}
        </s-text>
      ))}
    </s-stack>
  );
}

export default function ActivityLog() {
  const { activities } = useLoaderData<typeof loader>();

  return (
    <s-page heading="Activity log">
      <s-section padding="none">
        <s-table>
          <s-table-header-row>
            <s-table-header listSlot="primary">Product</s-table-header>
            <s-table-header listSlot="inline">Action</s-table-header>
            <s-table-header listSlot="labeled">Source</s-table-header>
            <s-table-header listSlot="labeled">Changes</s-table-header>
            <s-table-header listSlot="labeled">Time</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {activities.length === 0 ? (
              <s-table-row>
                <s-table-cell>
                  No activity recorded yet. Edit a product or update one in
                  Shopify admin to trigger the products/update webhook.
                </s-table-cell>
              </s-table-row>
            ) : (
              activities.map((activity) => {
                const numericId = activity.productId.split("/").pop();
                return (
                  <s-table-row key={activity.id}>
                    <s-table-cell>
                      <s-link href={`/app/products/${numericId}`}>
                        {numericId}
                      </s-link>
                    </s-table-cell>
                    <s-table-cell>
                      <s-badge
                        tone={
                          activity.action === "product.update"
                            ? "info"
                            : "neutral"
                        }
                      >
                        {activity.action}
                      </s-badge>
                    </s-table-cell>
                    <s-table-cell>{activity.source}</s-table-cell>
                    <s-table-cell>
                      <ChangeSummary
                        oldValue={activity.oldValue}
                        newValue={activity.newValue}
                      />
                    </s-table-cell>
                    <s-table-cell>
                      {new Date(activity.createdAt).toLocaleString()}
                    </s-table-cell>
                  </s-table-row>
                );
              })
            )}
          </s-table-body>
        </s-table>
      </s-section>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
