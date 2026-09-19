import { useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import {
  useLoaderData,
  useNavigate,
  useRouteError,
  useSearchParams,
} from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

const PRODUCT_QUERY = `#graphql
  query getProduct($id: ID!) {
    product(id: $id) {
      id
      title
      descriptionHtml
      status
      vendor
      productType
      tags
      createdAt
      updatedAt
      totalInventory
      featuredMedia {
        preview {
          image {
            url
            altText
          }
        }
      }
      media(first: 8) {
        nodes {
          preview {
            image {
              url
              altText
            }
          }
        }
      }
      variants(first: 50) {
        nodes {
          id
          title
          sku
          price
          inventoryQuantity
        }
      }
    }
  }
`;

function numericProductId(gid: string) {
  return gid.split("/").pop() ?? gid;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Rebuild the Admin API global ID from the numeric ID in the URL.
  const id = params.id ?? "";
  if (!/^\d+$/.test(id)) {
    return { product: null, error: `"${id}" is not a valid product ID.` };
  }
  const gid = `gid://shopify/Product/${id}`;

  try {
    const response = await admin.graphql(PRODUCT_QUERY, {
      variables: { id: gid },
    });
    const json = await response.json();

    if (!json.data?.product) {
      return { product: null, error: "This product could not be found." };
    }

    return { product: json.data.product, error: null };
  } catch (error) {
    console.error(`Failed to load product ${gid}`, error);
    return {
      product: null,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while loading the product.",
    };
  }
};

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

export default function ProductDetails() {
  const { product, error } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const shopify = useAppBridge();

  // The edit page redirects back here with ?updated=1 — show a confirmation.
  useEffect(() => {
    if (searchParams.get("updated")) {
      shopify.toast.show("Product updated");
      searchParams.delete("updated");
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, shopify]);

  if (error || !product) {
    return (
      <s-page heading="Product not found">
        <s-button slot="secondary-actions" onClick={() => navigate("/app")}>
          Back to products
        </s-button>
        <s-banner tone="critical" heading="Could not load product">
          {error ?? "This product could not be found."}
        </s-banner>
      </s-page>
    );
  }

  const images =
    product.media?.nodes.flatMap((node) => {
      const image = node?.preview?.image;
      return image?.url ? [image] : [];
    }) ?? [];

  return (
    <s-page heading={product.title}>
      <s-button slot="secondary-actions" onClick={() => navigate("/app")}>
        Back to products
      </s-button>
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={() =>
          navigate(`/app/products/${numericProductId(product.id)}/edit`)
        }
      >
        Edit product
      </s-button>

      <s-section heading="Details">
        <s-stack direction="block" gap="base">
          <s-stack direction="inline" gap="base" alignItems="center">
            <s-badge tone={statusTone(product.status)}>{product.status}</s-badge>
            <s-text type="strong">{product.vendor || "No vendor"}</s-text>
            <s-text color="subdued">{product.productType || "No type"}</s-text>
          </s-stack>
          <s-paragraph>
            <s-text color="subdued">
              Total inventory: {product.totalInventory} · Updated{" "}
              {new Date(product.updatedAt).toLocaleString()}
            </s-text>
          </s-paragraph>
          {product.descriptionHtml ? (
            <s-box
              padding="base"
              borderWidth="base"
              borderRadius="base"
              background="subdued"
            >
              <div
                dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
              />
            </s-box>
          ) : (
            <s-paragraph>
              <s-text color="subdued">No description.</s-text>
            </s-paragraph>
          )}
        </s-stack>
      </s-section>

      {images.length > 0 ? (
        <s-section heading="Images">
          <s-stack direction="inline" gap="base">
            {images.map((image, index) => (
              <s-thumbnail
                key={index}
                size="large"
                src={image.url}
                alt={image.altText ?? product.title}
              />
            ))}
          </s-stack>
        </s-section>
      ) : null}

      <s-section padding="none" heading="Variants">
        <s-table>
          <s-table-header-row>
            <s-table-header listSlot="primary">Variant</s-table-header>
            <s-table-header listSlot="labeled">SKU</s-table-header>
            <s-table-header listSlot="labeled" format="currency">
              Price
            </s-table-header>
            <s-table-header listSlot="labeled" format="numeric">
              Inventory
            </s-table-header>
          </s-table-header-row>
          <s-table-body>
            {product.variants.nodes.map((variant) => (
              <s-table-row key={variant.id}>
                <s-table-cell>{variant.title}</s-table-cell>
                <s-table-cell>{variant.sku || "—"}</s-table-cell>
                <s-table-cell>{variant.price}</s-table-cell>
                <s-table-cell>{variant.inventoryQuantity ?? 0}</s-table-cell>
              </s-table-row>
            ))}
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
