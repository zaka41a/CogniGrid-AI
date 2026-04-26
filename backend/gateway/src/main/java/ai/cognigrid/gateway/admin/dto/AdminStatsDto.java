package ai.cognigrid.gateway.admin.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class AdminStatsDto {
    private long totalUsers;
    private long activeUsers;
    private long suspendedUsers;
    private long admins;
    private Map<String, Long> roleCounts;
}
