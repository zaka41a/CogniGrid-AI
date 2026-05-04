package ai.cognigrid.gateway.system.dto;

import java.time.Instant;
import java.util.List;

public record SystemHealthDto(
        String overall,
        List<ServiceHealthEntry> services,
        Instant checked_at
) {
    public record ServiceHealthEntry(
            String name,
            String status,
            Long latency_ms,
            String error
    ) {}
}
