using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Http;
using QuickCode.Demo.Infrastructure.Web.Auditing;

namespace QuickCode.Demo.Infrastructure.Web.Middleware;

public class SecurityAuditMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SecurityAuditMiddleware> _logger;
    private readonly IAuditLogWriter _auditLogWriter;

    public SecurityAuditMiddleware(RequestDelegate next, ILogger<SecurityAuditMiddleware> logger, IAuditLogWriter auditLogWriter)
    {
        _next = next;
        _logger = logger;
        _auditLogWriter = auditLogWriter;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (IsHealthPath(context.Request.Path))
        {
            await _next(context);
            return;
        }

        var startTime = DateTime.UtcNow;

        try
        {
            var auditInfo = new SecurityAuditInfo
            {
                Timestamp = startTime,
                UserId = GetUserId(context),
                UserGroup = GetUserGroup(context),
                ClientId = GetClientId(context),
                TokenUse = GetClaimValue(context, "token_use"),
                ClientPlatform = HeaderOrNull(context, "X-Client-Platform"),
                ClientApp = HeaderOrNull(context, "X-Client-App"),
                ClientVersion = HeaderOrNull(context, "X-Client-Version"),
                UserAgent = context.Request.Headers["User-Agent"].ToString(),
                IpAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
                Method = context.Request.Method,
                Path = context.Request.Path.ToString(),
                QueryString = context.Request.QueryString.ToString(),
                IsAuthenticated = context.User.Identity?.IsAuthenticated ?? false,
                Claims = context.User.Claims.Select(c => new ClaimInfo { Type = c.Type, Value = c.Value }).ToList()
            };

            await _next(context);

            auditInfo.StatusCode = context.Response.StatusCode;
            auditInfo.Duration = DateTime.UtcNow - startTime;
            auditInfo.ResponseSize = context.Response.ContentLength ?? 0;

            LogSecurityAudit(auditInfo);
            await QueueSecurityAuditAsync(context, auditInfo);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Security audit error for {Path}", context.Request.Path);
            throw;
        }
    }

    private Task QueueSecurityAuditAsync(HttpContext context, SecurityAuditInfo auditInfo)
    {
        var correlationId = HeaderOrNull(context, "X-Correlation-Id")
            ?? HeaderOrNull(context, "X-Request-Id")
            ?? context.TraceIdentifier;

        var changeSummary = BuildChangeSummary(auditInfo);

        var auditLog = new AuditLog
        {
            EntityName = "HttpRequest",
            EntityId = correlationId,
            Action = auditInfo.Method,
            UserId = auditInfo.UserId,
            UserName = context.User.Identity?.Name,
            UserGroup = auditInfo.UserGroup,
            Timestamp = auditInfo.Timestamp,
            DurationMs = (long)auditInfo.Duration.TotalMilliseconds,
            StatusCode = auditInfo.StatusCode,
            RequestModule = ExtractModuleName(auditInfo.Path),
            RequestPath = auditInfo.Path,
            IpAddress = auditInfo.IpAddress,
            UserAgent = auditInfo.UserAgent,
            ClientId = auditInfo.ClientId,
            CorrelationId = correlationId,
            ChangeSummary = changeSummary,
            IsSuccess = auditInfo.StatusCode < 400,
            IsChanged = false,
            NewValues = JsonSerializer.Serialize(auditInfo)
        };

        return _auditLogWriter.QueueAuditLogAsync(auditLog, context.RequestAborted);
    }

    private static string? BuildChangeSummary(SecurityAuditInfo auditInfo)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(auditInfo.TokenUse))
            parts.Add($"token_use={auditInfo.TokenUse}");
        if (!string.IsNullOrWhiteSpace(auditInfo.ClientApp))
            parts.Add($"client_app={auditInfo.ClientApp}");
        if (!string.IsNullOrWhiteSpace(auditInfo.ClientPlatform))
            parts.Add($"client_platform={auditInfo.ClientPlatform}");
        return parts.Count == 0 ? null : string.Join(';', parts);
    }

    private static string GetUserId(HttpContext context)
    {
        var fromHeader = HeaderOrNull(context, "X-User-Id");
        if (!string.IsNullOrWhiteSpace(fromHeader))
            return fromHeader;

        var nameId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!string.IsNullOrWhiteSpace(nameId))
            return nameId;

        var sub = context.User.FindFirst("sub")?.Value
                  ?? context.User.FindFirst(ClaimTypes.Name)?.Value;
        if (!string.IsNullOrWhiteSpace(sub))
            return sub;

        return "anonymous";
    }

    private static string? GetUserGroup(HttpContext context)
    {
        var fromHeader = HeaderOrNull(context, "X-Permission-Group");
        if (!string.IsNullOrWhiteSpace(fromHeader))
            return fromHeader;

        return GetClaimValue(context, "PermissionGroupName");
    }

    private static string? GetClientId(HttpContext context)
    {
        var fromHeader = HeaderOrNull(context, "X-Client-Id");
        if (!string.IsNullOrWhiteSpace(fromHeader))
            return fromHeader;

        return GetClaimValue(context, "client_id")
               ?? GetClaimValue(context, "guest_client_id");
    }

    private static string? GetClaimValue(HttpContext context, string claimType)
    {
        var value = context.User.FindFirst(claimType)?.Value;
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }

    private static string? HeaderOrNull(HttpContext context, string name)
    {
        if (!context.Request.Headers.TryGetValue(name, out var value) || string.IsNullOrWhiteSpace(value))
            return null;
        return value.ToString().Trim();
    }

    private void LogSecurityAudit(SecurityAuditInfo auditInfo)
    {
        var logLevel = auditInfo.StatusCode >= 400 ? LogLevel.Warning : LogLevel.Information;

        _logger.Log(logLevel,
            "Security Audit: {Method} {Path} - User: {UserId} - Group: {UserGroup} - ClientId: {ClientId} - IP: {IpAddress} - Status: {StatusCode} - Duration: {Duration}ms",
            auditInfo.Method, auditInfo.Path, auditInfo.UserId, auditInfo.UserGroup, auditInfo.ClientId, auditInfo.IpAddress,
            auditInfo.StatusCode, auditInfo.Duration.TotalMilliseconds);

        if (IsCriticalSecurityEvent(auditInfo))
        {
            _logger.LogWarning("CRITICAL SECURITY EVENT: {EventDetails}", auditInfo);
        }
    }

    private static bool IsCriticalSecurityEvent(SecurityAuditInfo auditInfo)
    {
        return auditInfo.StatusCode == 401 ||
               auditInfo.StatusCode == 403 ||
               auditInfo.Path.Contains("/admin") ||
               auditInfo.Path.Contains("/api/auth");
    }

    private static string ExtractModuleName(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return string.Empty;
        var segments = path.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var apiIndex = Array.FindIndex(segments, s => s.Equals("api", StringComparison.OrdinalIgnoreCase));
        if (apiIndex >= 0 && apiIndex + 1 < segments.Length)
            return segments[apiIndex + 1];
        return segments.Length > 0 ? segments[0] : string.Empty;
    }

    /// <summary>Same skip as <see cref="RateLimitingMiddleware"/> / Serilog RequestPath filter — probe noise must not fill AUDIT_LOGS.</summary>
    private static bool IsHealthPath(PathString path)
    {
        var value = path.Value ?? string.Empty;
        return value.StartsWith("/hc", StringComparison.OrdinalIgnoreCase)
               || value.StartsWith("/health", StringComparison.OrdinalIgnoreCase);
    }
}

public class SecurityAuditInfo
{
    public DateTime Timestamp { get; set; }
    public string UserId { get; set; } = string.Empty;
    public string? UserGroup { get; set; }
    /// <summary>Install / guest correlation from <c>X-Client-Id</c> (not auth).</summary>
    public string? ClientId { get; set; }
    public string? TokenUse { get; set; }
    public string? ClientPlatform { get; set; }
    public string? ClientApp { get; set; }
    public string? ClientVersion { get; set; }
    public string UserAgent { get; set; } = string.Empty;
    public string IpAddress { get; set; } = string.Empty;
    public string Method { get; set; } = string.Empty;
    public string Path { get; set; } = string.Empty;
    public string QueryString { get; set; } = string.Empty;
    public bool IsAuthenticated { get; set; }
    public List<ClaimInfo> Claims { get; set; } = new();
    public int StatusCode { get; set; }
    public TimeSpan Duration { get; set; }
    public long ResponseSize { get; set; }
}

public class ClaimInfo
{
    public string Type { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
}

public static class SecurityAuditMiddlewareExtensions
{
    public static IApplicationBuilder UseSecurityAudit(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<SecurityAuditMiddleware>();
    }
}
