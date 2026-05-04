package ai.cognigrid.gateway.admin.dto;

import lombok.Data;

@Data
public class UpdateUserRequest {
    private String fullName;
    private String role;       // ADMIN | ANALYST (optional)
    private Boolean active;    // optional
}
