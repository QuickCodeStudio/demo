package com.quickcode.module.platform;

import com.quickcode.module.platform.observability.ElasticSink;
import jakarta.servlet.http.HttpServletRequest;
import java.net.URI;
import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

/** Nest {@code global-exception.filter.ts} → RFC 7807 {@code application/problem+json}. */
@RestControllerAdvice
public class ProblemAdvice {

    private static final Logger log = LoggerFactory.getLogger(ProblemAdvice.class);
    private static final URI PROBLEM_TYPE = URI.create("about:blank");

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ProblemDetail> handleStatus(ResponseStatusException ex, HttpServletRequest request) {
        ProblemDetail problem = problem(ex.getStatusCode().value(), title(ex.getReason()), ex.getReason(), request);
        return problemResponse(ex.getStatusCode().value(), problem);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidation(MethodArgumentNotValidException ex, HttpServletRequest request) {
        String detail =
                ex.getBindingResult().getFieldErrors().stream()
                        .map(fe -> fe.getField() + ": " + fe.getDefaultMessage())
                        .reduce((a, b) -> a + "; " + b)
                        .orElse("Validation failed.");
        ProblemDetail problem = problem(400, "Validation failed.", detail, request);
        return problemResponse(400, problem);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ProblemDetail> handleUnreadable(HttpMessageNotReadableException ex, HttpServletRequest request) {
        ProblemDetail problem = problem(400, "Malformed request body.", "Request body could not be read.", request);
        return problemResponse(400, problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception on {}", request.getRequestURI(), ex);
        boolean dev = isDev();

        String detail = dev ? stackOrMessage(ex) : "Please contact support.";
        ProblemDetail problem = problem(500, "An unexpected error occurred.", detail, request);

        Map<String, Object> elastic = new LinkedHashMap<>();
        elastic.put("message", "Unhandled exception occurred");
        elastic.put("level", "Error");
        elastic.put("exception", stackOrMessage(ex));
        ElasticSink.writeLog(elastic);

        return problemResponse(500, problem);
    }

    private static ProblemDetail problem(int status, String title, String detail, HttpServletRequest request) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.valueOf(status), detail);
        problem.setTitle(title);
        problem.setType(PROBLEM_TYPE);
        problem.setProperty("instance", request.getRequestURI());
        return problem;
    }

    private static ResponseEntity<ProblemDetail> problemResponse(int status, ProblemDetail problem) {
        return ResponseEntity.status(status)
                .header("Content-Type", "application/problem+json")
                .body(problem);
    }

    private static String title(String reason) {
        return reason != null && !reason.isBlank() ? reason : "Error";
    }

    private static boolean isDev() {
        return "development".equalsIgnoreCase(System.getenv("NODE_ENV"))
                || "true".equalsIgnoreCase(System.getenv("QUICKCODE_DEV"));
    }

    private static String stackOrMessage(Exception ex) {
        StringBuilder sb = new StringBuilder();
        sb.append(ex.getClass().getName());
        if (ex.getMessage() != null) {
            sb.append(": ").append(ex.getMessage());
        }
        for (StackTraceElement el : ex.getStackTrace()) {
            sb.append("\n at ").append(el);
        }
        return sb.toString();
    }
}
