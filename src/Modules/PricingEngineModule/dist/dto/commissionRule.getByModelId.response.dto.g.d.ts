import { RuleScope } from '../enums/ruleScope.enum.g';
import { CommissionType } from '../enums/commissionType.enum.g';
export declare class CommissionRuleGetByModelIdResponseDto {
    id: number;
    scope: RuleScope;
    scopeId: number;
    commissionType: CommissionType;
    percentageRate: number;
    fixedAmount: number;
}
