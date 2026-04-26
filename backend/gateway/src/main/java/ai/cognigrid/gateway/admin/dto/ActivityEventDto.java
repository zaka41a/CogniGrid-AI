package ai.cognigrid.gateway.admin.dto;

import ai.cognigrid.gateway.admin.entity.ActivityEvent;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class ActivityEventDto {
    private UUID id;
    private String actorEmail;
    private UUID targetId;
    private String targetEmail;
    private String type;
    private String detail;
    private String ipAddress;
    private LocalDateTime createdAt;

    public static ActivityEventDto from(ActivityEvent e) {
        return ActivityEventDto.builder()
                .id(e.getId())
                .actorEmail(e.getActorEmail())
                .targetId(e.getTargetId())
                .targetEmail(e.getTargetEmail())
                .type(e.getType())
                .detail(e.getDetail())
                .ipAddress(e.getIpAddress())
                .createdAt(e.getCreatedAt())
                .build();
    }
}
