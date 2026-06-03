export interface SaleItem {
    productId: string;
    name: string;
    price: number;
    quantity: number;
    image_url?: string;
}

export interface Sale {
    id?: string;
    clientId?: string;
    clientName?: string;
    items: SaleItem[];
    subtotal: number;
    tax: number;
    total: number;
    date: Date;
    userId?: string;
}