import { RuleScope } from '../enums/ruleScope.enum.g';
import { CommissionType } from '../enums/commissionType.enum.g';
export declare class FilterCommissionRuleDto {
    commissionModelId?: number | null;
    scope?: RuleScope | null;
    scopeId?: number | null;
    commissionType?: CommissionType | null;
    percentageRate?: number | null;
    fixedAmount?: number | null;
    isActive?: boolean | null;
    page?: number;
    size?: number;
}
