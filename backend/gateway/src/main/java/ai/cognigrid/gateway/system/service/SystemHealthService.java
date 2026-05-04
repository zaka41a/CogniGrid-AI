package ai.cognigrid.gateway.system.service;

import ai.cognigrid.gateway.system.dto.SystemHealthDto;
import ai.cognigrid.gateway.system.dto.SystemHealthDto.ServiceHealthEntry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.sql.DataSource;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicReference;

/**
 * Aggregates health of every microservice and core infrastructure.
 *
 * Services are pinged in parallel via the JDK HttpClient (no extra dependency).
 * The result is cached for 5 seconds so a chatty UI does not amplify the load.
 */
@Service
@Slf4j
public class SystemHealthService {

    private static final long CACHE_TTL_MS = 5_000;
    private static final Duration HTTP_TIMEOUT = Duration.ofSeconds(3);

    private record ServiceTarget(String name, String url) {}

    private static final List<ServiceTarget> TARGETS = List.of(
            new ServiceTarget("ingestion",     "http://localhost:8001/health"),
            new ServiceTarget("graph",         "http://localhost:8002/health"),
            new ServiceTarget("ai-engine",     "http://localhost:8003/health"),
            new ServiceTarget("graphrag",      "http://localhost:8004/health"),
            new ServiceTarget("agent",         "http://localhost:8005/health"),
            new ServiceTarget("assume-runner", "http://localhost:8006/health")
    );

    private final HttpClient http = HttpClient.newBuilder()
            .connectTimeout(HTTP_TIMEOUT)
            .build();

    private final DataSource dataSource;

    private final AtomicReference<CachedResult> cache = new AtomicReference<>(null);

    public SystemHealthService(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    public SystemHealthDto getHealth() {
        CachedResult c = cache.get();
        long now = System.currentTimeMillis();
        if (c != null && now - c.computedAt < CACHE_TTL_MS) {
            return c.value;
        }
        SystemHealthDto fresh = computeHealth();
        cache.set(new CachedResult(fresh, now));
        return fresh;
    }

    private SystemHealthDto computeHealth() {
        // Fan out HTTP pings to every microservice in parallel
        List<CompletableFuture<ServiceHealthEntry>> futures = TARGETS.stream()
                .map(t -> CompletableFuture.supplyAsync(() -> pingHttp(t.name(), t.url())))
                .toList();

        // Postgres check runs in parallel too
        CompletableFuture<ServiceHealthEntry> pgFuture =
                CompletableFuture.supplyAsync(this::checkPostgres);

        List<ServiceHealthEntry> entries = new java.util.ArrayList<>(futures.stream()
                .map(CompletableFuture::join)
                .toList());
        entries.add(pgFuture.join());

        long onlineCount = entries.stream().filter(e -> "online".equals(e.status())).count();
        String overall;
        if (onlineCount == entries.size()) overall = "healthy";
        else if (onlineCount == 0)         overall = "down";
        else                                overall = "partial";

        return new SystemHealthDto(overall, List.copyOf(entries), Instant.now());
    }

    private ServiceHealthEntry pingHttp(String name, String url) {
        long t0 = System.nanoTime();
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .timeout(HTTP_TIMEOUT)
                    .GET()
                    .build();
            HttpResponse<Void> resp = http.send(req, HttpResponse.BodyHandlers.discarding());
            long latencyMs = (System.nanoTime() - t0) / 1_000_000L;
            String status = resp.statusCode() == 200 ? "online" : "degraded";
            return new ServiceHealthEntry(name, status, latencyMs, null);
        } catch (java.net.ConnectException e) {
            return new ServiceHealthEntry(name, "offline", null, "connection refused");
        } catch (Exception e) {
            return new ServiceHealthEntry(name, "offline", null, e.getClass().getSimpleName());
        }
    }

    private ServiceHealthEntry checkPostgres() {
        long t0 = System.nanoTime();
        try (Connection c = dataSource.getConnection()) {
            boolean ok = c.isValid(2);
            long latencyMs = (System.nanoTime() - t0) / 1_000_000L;
            return new ServiceHealthEntry("postgres", ok ? "online" : "degraded", latencyMs, null);
        } catch (Exception e) {
            return new ServiceHealthEntry("postgres", "offline", null, e.getClass().getSimpleName());
        }
    }

    private record CachedResult(SystemHealthDto value, long computedAt) {}
}
