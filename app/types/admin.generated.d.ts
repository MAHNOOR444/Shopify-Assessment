/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */
import type * as AdminTypes from './admin.types.js';

export type GetProductsQueryVariables = AdminTypes.Exact<{
  first?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  last?: AdminTypes.InputMaybe<AdminTypes.Scalars['Int']['input']>;
  after?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  before?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
  query?: AdminTypes.InputMaybe<AdminTypes.Scalars['String']['input']>;
}>;


export type GetProductsQuery = { products: { nodes: Array<(
      Pick<AdminTypes.Product, 'id' | 'title' | 'status' | 'totalInventory'>
      & { featuredMedia?: AdminTypes.Maybe<{ preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url' | 'altText'>> }> }>, variants: { nodes: Array<Pick<AdminTypes.ProductVariant, 'sku' | 'price'>> }, priceRangeV2: { minVariantPrice: Pick<AdminTypes.MoneyV2, 'amount' | 'currencyCode'> } }
    )>, pageInfo: Pick<AdminTypes.PageInfo, 'hasNextPage' | 'hasPreviousPage' | 'startCursor' | 'endCursor'> } };

export type GetProductQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type GetProductQuery = { product?: AdminTypes.Maybe<(
    Pick<AdminTypes.Product, 'id' | 'title' | 'descriptionHtml' | 'status' | 'vendor' | 'productType' | 'tags' | 'createdAt' | 'updatedAt' | 'totalInventory'>
    & { featuredMedia?: AdminTypes.Maybe<{ preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url' | 'altText'>> }> }>, media: { nodes: Array<{ preview?: AdminTypes.Maybe<{ image?: AdminTypes.Maybe<Pick<AdminTypes.Image, 'url' | 'altText'>> }> }> }, variants: { nodes: Array<Pick<AdminTypes.ProductVariant, 'id' | 'title' | 'sku' | 'price' | 'inventoryQuantity'>> } }
  )> };

export type GetProductForEditQueryVariables = AdminTypes.Exact<{
  id: AdminTypes.Scalars['ID']['input'];
}>;


export type GetProductForEditQuery = { product?: AdminTypes.Maybe<Pick<AdminTypes.Product, 'id' | 'title' | 'descriptionHtml' | 'status' | 'productType' | 'vendor'>> };

export type ProductUpdateMutationVariables = AdminTypes.Exact<{
  product: AdminTypes.ProductUpdateInput;
}>;


export type ProductUpdateMutation = { productUpdate?: AdminTypes.Maybe<{ product?: AdminTypes.Maybe<Pick<AdminTypes.Product, 'id' | 'title' | 'descriptionHtml' | 'status' | 'productType' | 'vendor'>>, userErrors: Array<Pick<AdminTypes.UserError, 'field' | 'message'>> }> };

interface GeneratedQueryTypes {
  "#graphql\n      query getProducts($first: Int, $last: Int, $after: String, $before: String, $query: String) {\n        products(first: $first, last: $last, after: $after, before: $before, query: $query) {\n          nodes {\n            id\n            title\n            status\n            totalInventory\n            featuredMedia {\n              preview {\n                image {\n                  url\n                  altText\n                }\n              }\n            }\n            variants(first: 1) {\n              nodes {\n                sku\n                price\n              }\n            }\n            priceRangeV2 {\n              minVariantPrice {\n                amount\n                currencyCode\n              }\n            }\n          }\n          pageInfo {\n            hasNextPage\n            hasPreviousPage\n            startCursor\n            endCursor\n          }\n        }\n      }": {return: GetProductsQuery, variables: GetProductsQueryVariables},
  "#graphql\n  query getProduct($id: ID!) {\n    product(id: $id) {\n      id\n      title\n      descriptionHtml\n      status\n      vendor\n      productType\n      tags\n      createdAt\n      updatedAt\n      totalInventory\n      featuredMedia {\n        preview {\n          image {\n            url\n            altText\n          }\n        }\n      }\n      media(first: 8) {\n        nodes {\n          preview {\n            image {\n              url\n              altText\n            }\n          }\n        }\n      }\n      variants(first: 50) {\n        nodes {\n          id\n          title\n          sku\n          price\n          inventoryQuantity\n        }\n      }\n    }\n  }\n": {return: GetProductQuery, variables: GetProductQueryVariables},
  "#graphql\n  query getProductForEdit($id: ID!) {\n    product(id: $id) {\n      id\n      title\n      descriptionHtml\n      status\n      productType\n      vendor\n    }\n  }\n": {return: GetProductForEditQuery, variables: GetProductForEditQueryVariables},
}

interface GeneratedMutationTypes {
  "#graphql\n  mutation productUpdate($product: ProductUpdateInput!) {\n    productUpdate(product: $product) {\n      product {\n        id\n        title\n        descriptionHtml\n        status\n        productType\n        vendor\n      }\n      userErrors {\n        field\n        message\n      }\n    }\n  }\n": {return: ProductUpdateMutation, variables: ProductUpdateMutationVariables},
}
declare module '@shopify/admin-api-client' {
  type InputMaybe<T> = AdminTypes.InputMaybe<T>;
  interface AdminQueries extends GeneratedQueryTypes {}
  interface AdminMutations extends GeneratedMutationTypes {}
}
