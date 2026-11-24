using System;
using System.Collections.Generic;
using System.Linq;

namespace QuickCode.Demo.Portal.Helpers;

/// <summary>
/// Storefront anonymous / public groups — not assignable to Portal admin UI or API keys.
/// Names match seeded PermissionGroups: Public (and aliases Guest / Anonymous).
/// </summary>
public static class StorefrontPermissionGroups
{
    public static bool IsStorefrontPublic(string? permissionGroupName)
    {
        if (string.IsNullOrWhiteSpace(permissionGroupName))
            return false;

        return permissionGroupName.Equals("Public", StringComparison.OrdinalIgnoreCase)
               || permissionGroupName.Equals("Guest", StringComparison.OrdinalIgnoreCase)
               || permissionGroupName.Equals("Anonymous", StringComparison.OrdinalIgnoreCase);
    }

    public static void RemoveFromCombo(
        Dictionary<string, Dictionary<string, string>>? comboList,
        string key = "PermissionGroups")
    {
        if (comboList == null || !comboList.TryGetValue(key, out var groups) || groups.Count == 0)
            return;

        comboList[key] = groups
            .Where(kv => !IsStorefrontPublic(kv.Key))
            .ToDictionary(kv => kv.Key, kv => kv.Value);
    }

    public static string? FirstNonStorefrontName(IEnumerable<string>? names) =>
        names?.FirstOrDefault(n => !IsStorefrontPublic(n));
}
