package ai.cognigrid.gateway.filter;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

/**
 * Tiny in-memory token-bucket rate limiter.
 *
 * Two policies enforced:
 *  - Auth login attempts:  10 requests / minute / IP    (brute-force protection)
 *  - Admin endpoints:      60 requests / minute / IP    (limits scripted abuse)
 *
 * In-memory only — adequate for a single-instance deployment. For multi-instance
 * scale, swap the bucket store for Redis (the bucket-resolver interface is
 * trivial to externalize).
 *
 * The filter runs BEFORE the JWT auth filter so we never burn CPU on Spring
 * Security for requests that should already be rejected.
 */
@Component
@Order(1)
@Slf4j
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000L;
    private static final int  AUTH_LIMIT  = 10;     // /api/auth/login per IP per minute
    private static final int  ADMIN_LIMIT = 60;     // /api/admin/** per IP per minute

    private final ConcurrentHashMap<String, Bucket> buckets = new ConcurrentHashMap<>();
    private final ObjectMapper json = new ObjectMapper();

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        Integer limit = limitFor(path);
        if (limit == null) {
            chain.doFilter(request, response);
            return;
        }

        String key = clientIp(request) + "|" + scopeFor(path);
        Bucket b = buckets.computeIfAbsent(key, k -> new Bucket(System.currentTimeMillis()));

        long now = System.currentTimeMillis();
        synchronized (b) {
            if (now - b.windowStart.get() > WINDOW_MS) {
                b.windowStart.set(now);
                b.count.set(0);
            }
            long current = b.count.incrementAndGet();
            response.setHeader("X-RateLimit-Limit",     String.valueOf(limit));
            response.setHeader("X-RateLimit-Remaining", String.valueOf(Math.max(0, limit - current)));
            if (current > limit) {
                long retryAfter = (b.windowStart.get() + WINDOW_MS - now + 999) / 1000;
                response.setStatus(429);
                response.setHeader("Retry-After", String.valueOf(retryAfter));
                response.setContentType("application/json");
                json.writeValue(response.getWriter(), Map.of(
                        "status", 429,
                        "error",  "Too Many Requests",
                        "message", "Rate limit exceeded. Try again in " + retryAfter + "s.",
                        "retryAfterSeconds", retryAfter
                ));
                log.info("[rate-limit] 429 for {} on {}", key, path);
                return;
            }
        }
        chain.doFilter(request, response);
    }

    /** @return null if the path isn't rate-limited; otherwise the per-minute cap. */
    private static Integer limitFor(String path) {
        if (path == null) return null;
        if (path.startsWith("/api/auth/login")) return AUTH_LIMIT;
        if (path.startsWith("/api/admin/"))     return ADMIN_LIMIT;
        return null;
    }

    private static String scopeFor(String path) {
        return path.startsWith("/api/auth/login") ? "auth" : "admin";
    }

    /** Honor X-Forwarded-For when running behind a proxy (gateway, nginx, ALB). */
    private static String clientIp(HttpServletRequest req) {
        String fwd = req.getHeader("X-Forwarded-For");
        if (fwd != null && !fwd.isBlank()) {
            return fwd.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }

    private static final class Bucket {
        final AtomicLong windowStart;
        final AtomicLong count = new AtomicLong(0);
        Bucket(long start) { this.windowStart = new AtomicLong(start); }
    }
}
