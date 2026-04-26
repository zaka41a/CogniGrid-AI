package ai.cognigrid.gateway.admin.controller;

import ai.cognigrid.gateway.admin.dto.AdminStatsDto;
import ai.cognigrid.gateway.admin.dto.AdminUserDto;
import ai.cognigrid.gateway.admin.dto.ResetPasswordRequest;
import ai.cognigrid.gateway.admin.dto.UpdateUserRequest;
import ai.cognigrid.gateway.admin.service.AdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin", description = "User administration endpoints (ADMIN only)")
public class AdminUserController {

    private final AdminUserService adminUserService;

    @GetMapping("/users")
    @Operation(summary = "List all users")
    public ResponseEntity<List<AdminUserDto>> listUsers() {
        return ResponseEntity.ok(adminUserService.listUsers());
    }

    @GetMapping("/users/{id}")
    @Operation(summary = "Get a single user")
    public ResponseEntity<AdminUserDto> getUser(@PathVariable UUID id) {
        return ResponseEntity.ok(adminUserService.getUser(id));
    }

    @PutMapping("/users/{id}")
    @Operation(summary = "Update a user (full name, role, active flag)")
    public ResponseEntity<AdminUserDto> updateUser(
            @PathVariable UUID id, @RequestBody UpdateUserRequest req) {
        return ResponseEntity.ok(adminUserService.updateUser(id, req));
    }

    @PutMapping("/users/{id}/password")
    @Operation(summary = "Admin-reset a user's password")
    public ResponseEntity<Map<String, String>> resetPassword(
            @PathVariable UUID id, @Valid @RequestBody ResetPasswordRequest req) {
        adminUserService.resetPassword(id, req.getNewPassword());
        return ResponseEntity.ok(Map.of("message", "Password reset successfully"));
    }

    @PostMapping("/users/{id}/suspend")
    @Operation(summary = "Suspend a user account")
    public ResponseEntity<AdminUserDto> suspendUser(@PathVariable UUID id) {
        return ResponseEntity.ok(adminUserService.setActive(id, false));
    }

    @PostMapping("/users/{id}/activate")
    @Operation(summary = "Re-activate a suspended user")
    public ResponseEntity<AdminUserDto> activateUser(@PathVariable UUID id) {
        return ResponseEntity.ok(adminUserService.setActive(id, true));
    }

    @DeleteMapping("/users/{id}")
    @Operation(summary = "Delete a user (cannot delete yourself)")
    public ResponseEntity<Map<String, String>> deleteUser(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserDetails principal) {
        adminUserService.deleteUser(id, principal != null ? principal.getUsername() : null);
        return ResponseEntity.ok(Map.of("message", "User deleted"));
    }

    @GetMapping("/stats")
    @Operation(summary = "Aggregate user stats")
    public ResponseEntity<AdminStatsDto> stats() {
        return ResponseEntity.ok(adminUserService.stats());
    }
}
