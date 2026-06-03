export interface Service {
    id: string;
    clientName: string;
    mechanic: string;
    serviceType: string;
    motorcycle: {
        brand: string;
        model: string;
        plates: string;
        year: string;
    };
    problemDescription: string;
    serviceCost: number;
    totalCost: number;
    status: string;
    products?: Array<{
        productId: string;
        quantity?: number;
    }>;
}