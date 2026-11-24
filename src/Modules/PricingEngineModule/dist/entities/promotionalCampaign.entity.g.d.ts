export declare class PromotionalCampaign {
    id: number;
    name: string;
    startDate: Date;
    endDate: Date;
    discountPercentage: number;
    isActive: boolean;
    isDeleted: boolean;
    deletedOnUtc?: Date | null;
}
