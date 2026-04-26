package ai.cognigrid.gateway.admin.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Audit-log row.
 *
 * Records every login attempt and every admin action that mutates a user account.
 * Read by {@code GET /api/admin/activity}; written by {@code ActivityService}.
 */
@Entity
@Table(name = "activity_events")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class ActivityEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "actor_email", nullable = false)
    private String actorEmail;

    @Column(name = "target_id")
    private UUID targetId;

    @Column(name = "target_email")
    private String targetEmail;

    @Column(nullable = false, length = 64)
    private String type;

    @Column(length = 1024)
    private String detail;

    @Column(name = "ip_address", length = 64)
    private String ipAddress;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
}
