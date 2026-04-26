package ai.cognigrid.gateway.admin.dto;

import ai.cognigrid.gateway.auth.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.UUID;

/** Read-only projection of {@link User} returned by /api/admin/users. */
@Data
@Builder
public class AdminUserDto {
    private UUID id;
    private String email;
    private String fullName;
    private String role;
    private boolean active;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static AdminUserDto from(User u) {
        return AdminUserDto.builder()
                .id(u.getId())
                .email(u.getEmail())
                .fullName(u.getFullName())
                .role(u.getRole().name())
                .active(u.isActive())
                .lastLoginAt(u.getLastLoginAt())
                .createdAt(u.getCreatedAt())
                .updatedAt(u.getUpdatedAt())
                .build();
    }
}
