import { RuleScope } from '../enums/ruleScope.enum.g';
import { CommissionType } from '../enums/commissionType.enum.g';
export declare class CommissionRuleDto {
    id: number;
    commissionModelId: number;
    scope: RuleScope;
    scopeId: number;
    commissionType: CommissionType;
    percentageRate: number;
    fixedAmount: number;
    isActive: boolean;
}
