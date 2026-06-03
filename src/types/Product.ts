export interface Product {
    id: string;
    name?: string;
    description: string;
    category: string;
    price_purchase: number;
    price_buy: number;
    stock: number;
    stock_min?: number;
    refill?: boolean;
    sku?: string;
    image_url?: string;
}

export interface SelectedProduct {
    product: Product;
    quantity: number;
}