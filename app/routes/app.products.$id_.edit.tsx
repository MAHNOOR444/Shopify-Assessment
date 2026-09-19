import type {
  ActionFunctionArgs,
  HeadersFunction,
  LoaderFunctionArgs,
} from "react-router";
import {
  Form,
  redirect,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
  useRouteError,
} from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { recordProductActivity } from "../product-activity.server";
import type { ProductStatus } from "../types/admin.types";

const EDITABLE_FIELDS = [
  "title",
  "descriptionHtml",
  "status",
  "productType",
  "vendor",
] as const;

const PRODUCT_STATUSES = ["ACTIVE", "DRAFT", "ARCHIVED"] as const;

const PRODUCT_QUERY = `#graphql
  query getProductForEdit($id: ID!) {
    product(id: $id) {
      id
      title
      descriptionHtml
      status
      productType
      vendor
    }
  }
`;

const PRODUCT_UPDATE_MUTATION = `#graphql
  mutation productUpdate($product: ProductUpdateInput!) {
    productUpdate(product: $product) {
      product {
        id
        title
        descriptionHtml
        status
        productType
        vendor
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function fetchProduct(
  admin: { graphql: (query: string, options?: object) => Promise<Response> },
  gid: string,
) {
  const response = await admin.graphql(PRODUCT_QUERY, {
    variables: { id: gid },
  });
  const json = await response.json();
  return json.data?.product ?? null;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const id = params.id ?? "";
  if (!/^\d+$/.test(id)) {
    return { product: null, error: `"${id}" is not a valid product ID.` };
  }

  try {
    const product = await fetchProduct(
      admin,
      `gid://shopify/Product/${id}`,
    );
    if (!product) {
      return { product: null, error: "This product could not be found." };
    }
    return { product, error: null };
  } catch (error) {
    console.error(`Failed to load product ${id} for editing`, error);
    return {
      product: null,
      error:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while loading the product.",
    };
  }
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const id = params.id ?? "";
  if (!/^\d+$/.test(id)) {
    return { formError: `"${id}" is not a valid product ID.` };
  }
  const gid = `gid://shopify/Product/${id}`;

  const formData = await request.formData();
  const title = String(formData.get("title") ?? "").trim();
  const descriptionHtml = String(formData.get("descriptionHtml") ?? "");
  const status = String(formData.get("status") ?? "");
  const productType = String(formData.get("productType") ?? "").trim();
  const vendor = String(formData.get("vendor") ?? "").trim();

  // Server-side validation — never trust the embedded client alone.
  if (!title) {
    return { fieldErrors: { title: "Title is required" } };
  }
  if (!(PRODUCT_STATUSES as readonly string[]).includes(status)) {
    return { fieldErrors: { status: "Select a valid status" } };
  }
  // Validated above; the generated enum is ambient (type-only).
  const productStatus = status as unknown as ProductStatus;

  // Shopify is the source of truth: read the product before updating so the
  // activity log can record an accurate old/new diff.
  let previous;
  try {
    previous = await fetchProduct(admin, gid);
  } catch (error) {
    console.error(`Failed to read product ${gid} before update`, error);
    return { formError: "Could not read the product from Shopify." };
  }
  if (!previous) {
    return { formError: "This product could not be found." };
  }

  try {
    const response = await admin.graphql(PRODUCT_UPDATE_MUTATION, {
      variables: {
        product: {
          id: gid,
          title,
          descriptionHtml,
          status: productStatus,
          productType,
          vendor,
        },
      },
    });
    const json = await response.json();
    const payload = json.data?.productUpdate;

    if (!payload) {
      return { formError: "Shopify returned an unexpected response." };
    }
    if (payload.userErrors?.length) {
      return {
        formError: payload.userErrors
          .map((e: { message: string }) => e.message)
          .join(" "),
      };
    }

    // Record only the fields that actually changed.
    const next = payload.product;
    const changed = EDITABLE_FIELDS.filter(
      (field) => (previous[field] ?? "") !== (next?.[field] ?? ""),
    );

    if (changed.length && next) {
      const pick = (obj: Record<string, unknown>) =>
        Object.fromEntries(changed.map((field) => [field, obj[field]]));
      await recordProductActivity({
        shop: session.shop,
        productId: gid,
        action: "product.update",
        source: "app",
        oldValue: pick(previous),
        newValue: pick(next),
      });
    }
  } catch (error) {
    console.error(`Failed to update product ${gid}`, error);
    return {
      formError:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred while saving the product.",
    };
  }

  return redirect(`/app/products/${id}?updated=1`);
};

export default function EditProduct() {
  const { product, error } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const isSaving = navigation.state === "submitting";

  if (error || !product) {
    return (
      <s-page heading="Edit product">
        <s-button slot="secondary-actions" onClick={() => navigate("/app")}>
          Back to products
        </s-button>
        <s-banner tone="critical" heading="Could not load product">
          {error ?? "This product could not be found."}
        </s-banner>
      </s-page>
    );
  }

  const productId = product.id.split("/").pop();

  return (
    <s-page heading={`Edit: ${product.title}`}>
      <s-button
        slot="secondary-actions"
        onClick={() => navigate(`/app/products/${productId}`)}
      >
        Cancel
      </s-button>

      {actionData?.formError ? (
        <s-banner tone="critical" heading="Could not save product">
          {actionData.formError}
        </s-banner>
      ) : null}

      <Form method="post">
        <s-section heading="Product information">
          <s-stack direction="block" gap="base">
            <s-text-field
              name="title"
              label="Title"
              defaultValue={product.title}
              required
              error={actionData?.fieldErrors?.title}
            />
            <s-text-area
              name="descriptionHtml"
              label="Description (HTML)"
              rows={6}
              defaultValue={product.descriptionHtml ?? ""}
            />
            <s-select
              name="status"
              label="Status"
              value={product.status}
              error={actionData?.fieldErrors?.status}
            >
              <s-option value="ACTIVE">Active</s-option>
              <s-option value="DRAFT">Draft</s-option>
              <s-option value="ARCHIVED">Archived</s-option>
            </s-select>
            <s-text-field
              name="productType"
              label="Product type"
              defaultValue={product.productType ?? ""}
            />
            <s-text-field
              name="vendor"
              label="Vendor"
              defaultValue={product.vendor ?? ""}
            />
            <s-stack direction="inline" gap="base">
              <s-button
                type="submit"
                variant="primary"
                loading={isSaving}
                disabled={isSaving}
              >
                Save
              </s-button>
              <s-button
                variant="secondary"
                disabled={isSaving}
                onClick={() => navigate(`/app/products/${productId}`)}
              >
                Cancel
              </s-button>
            </s-stack>
          </s-stack>
        </s-section>
      </Form>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
