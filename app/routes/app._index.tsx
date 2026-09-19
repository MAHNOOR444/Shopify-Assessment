import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import {
  Form,
  useLoaderData,
  useNavigate,
  useNavigation,
  useRouteError,
} from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

const PAGE_SIZE = 10;
const PRODUCT_STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;

/**
 * Builds a Shopify product search query string.
 * https://shopify.dev/docs/api/usage/search-syntax
 */
function buildProductQuery(search: string, status: string): string | null {
  const parts: string[] = [];

  const terms = search
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => term.replace(/["\\]/g, ""));

  for (const term of terms) {
    parts.push(`(title:*${term}* OR sku:*${term}*)`);
  }

  if (status && (PRODUCT_STATUSES as readonly string[]).includes(status)) {
    parts.push(`status:${status}`);
  }

  return parts.length ? parts.join(" AND ") : null;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const url = new URL(request.url);
  const search = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";
  const after = url.searchParams.get("after");
  const before = url.searchParams.get("before");

  // Cursor-based pagination: going backwards uses `last`/`before`,
  // going forwards (and the first page) uses `first`/`after`.
  const variables = {
    query: buildProductQuery(search, status),
    ...(before
      ? { first: null, last: PAGE_SIZE, before, after: null }
      : { first: PAGE_SIZE, last: null, before: null, after }),
  };

  try {
    const response = await admin.graphql(
      `#graphql
      query getProducts($first: Int, $last: Int, $after: String, $before: String, $query: String) {
        products(first: $first, last: $last, after: $after, before: $before, query: $query) {
          nodes {
            id
            title
            status
            totalInventory
            featuredMedia {
              preview {
                image {
                  url
                  altText
                }
              }
            }
            variants(first: 1) {
              nodes {
                sku
                price
              }
            }
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
            }
          }
          pageInfo {
            hasNextPage
            hasPreviousPage
            startCursor
            endCursor
          }
        }
      }`,
      { variables },
    );

    const json = await response.json();
    const connection = json.data?.products;

    return {
      products: connection?.nodes ?? [],
      pageInfo: connection?.pageInfo ?? null,
      search,
      status,
      error: null,
    };
  } catch (error) {
    console.error("Failed to load products", error);
    return {
      products: [],
      pageInfo: null,
      search,
      status,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while loading products.",
    };
  }
};

function numericProductId(gid: string) {
  return gid.split("/").pop() ?? gid;
}

function statusTone(status: string) {
  switch (status) {
    case "ACTIVE":
      return "success";
    case "DRAFT":
      return "info";
    default:
      return "neutral";
  }
}

export default function ProductDashboard() {
  const { products, pageInfo, search, status, error } =
    useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isLoading =
    navigation.state === "loading" || navigation.state === "submitting";

  const pageParams = (cursor: Record<string, string>) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (status) params.set("status", status);
    for (const [key, value] of Object.entries(cursor)) {
      params.set(key, value);
    }
    return `?${params.toString()}`;
  };

  const changeStatus = (value: string) => {
    const params = new URLSearchParams();
    if (search) params.set("q", search);
    if (value) params.set("status", value);
    navigate(`?${params.toString()}`);
  };

  return (
    <s-page heading="Products">
      {error ? (
        <s-banner tone="critical" heading="Could not load products">
          {error}
        </s-banner>
      ) : null}

      <s-section padding="none">
        <Form method="get">
          <s-table
            paginate
            hasPreviousPage={Boolean(pageInfo?.hasPreviousPage)}
            hasNextPage={Boolean(pageInfo?.hasNextPage)}
            loading={isLoading}
            onPreviousPage={() =>
              pageInfo?.startCursor &&
              navigate(pageParams({ before: pageInfo.startCursor }))
            }
            onNextPage={() =>
              pageInfo?.endCursor &&
              navigate(pageParams({ after: pageInfo.endCursor }))
            }
          >
            <s-stack slot="filters" direction="inline" gap="base" alignItems="end">
              <s-search-field
                name="q"
                label="Search products"
                labelAccessibilityVisibility="exclusive"
                placeholder="Search by title or SKU"
                defaultValue={search}
                disabled={isLoading}
              />
              <s-select
                name="status"
                label="Status"
                labelAccessibilityVisibility="exclusive"
                value={status}
                onChange={(event) =>
                  changeStatus(event.currentTarget.value as string)
                }
              >
                <s-option value="">Any status</s-option>
                <s-option value="ACTIVE">Active</s-option>
                <s-option value="DRAFT">Draft</s-option>
                <s-option value="ARCHIVED">Archived</s-option>
              </s-select>
              <s-button type="submit" variant="secondary" disabled={isLoading}>
                Search
              </s-button>
            </s-stack>

            <s-table-header-row>
              <s-table-header listSlot="primary">Product</s-table-header>
              <s-table-header listSlot="inline">Status</s-table-header>
              <s-table-header listSlot="labeled">SKU</s-table-header>
              <s-table-header listSlot="labeled" format="currency">
                Price
              </s-table-header>
              <s-table-header listSlot="labeled" format="numeric">
                Inventory
              </s-table-header>
            </s-table-header-row>
            <s-table-body>
              {products.length === 0 ? (
                <s-table-row>
                  <s-table-cell>
                    {search || status
                      ? "No products match your search or filters."
                      : "This store has no products yet."}
                  </s-table-cell>
                </s-table-row>
              ) : (
                products.map((product) => {
                  const image =
                    product.featuredMedia?.preview?.image ?? undefined;
                  const variant = product.variants.nodes[0];
                  const price = product.priceRangeV2?.minVariantPrice;

                  return (
                    <s-table-row key={product.id}>
                      <s-table-cell>
                        <s-stack
                          direction="inline"
                          gap="base"
                          alignItems="center"
                        >
                          <s-thumbnail
                            size="small"
                            src={image?.url ?? ""}
                            alt={image?.altText ?? product.title}
                          />
                          <s-link
                            href={`/app/products/${numericProductId(product.id)}`}
                          >
                            {product.title}
                          </s-link>
                        </s-stack>
                      </s-table-cell>
                      <s-table-cell>
                        <s-badge tone={statusTone(product.status)}>
                          {product.status}
                        </s-badge>
                      </s-table-cell>
                      <s-table-cell>{variant?.sku || "—"}</s-table-cell>
                      <s-table-cell>
                        {price
                          ? `${price.amount} ${price.currencyCode}`
                          : "—"}
                      </s-table-cell>
                      <s-table-cell>{product.totalInventory}</s-table-cell>
                    </s-table-row>
                  );
                })
              )}
            </s-table-body>
          </s-table>
        </Form>
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
