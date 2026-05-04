package ai.cognigrid.gateway.admin.service;

import ai.cognigrid.gateway.admin.dto.AdminStatsDto;
import ai.cognigrid.gateway.admin.dto.AdminUserDto;
import ai.cognigrid.gateway.admin.dto.UpdateUserRequest;
import ai.cognigrid.gateway.auth.entity.RefreshToken;
import ai.cognigrid.gateway.auth.entity.Role;
import ai.cognigrid.gateway.auth.entity.User;
import ai.cognigrid.gateway.auth.repository.RefreshTokenRepository;
import ai.cognigrid.gateway.auth.repository.UserRepository;
import ai.cognigrid.gateway.exception.AuthException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Admin operations on user accounts.
 *
 * Caller must already hold {@code ROLE_ADMIN} — enforced at the controller level.
 * Each method that mutates a user revokes that user's refresh tokens, so the
 * change takes effect on the next access-token expiration without needing a
 * separate session-invalidation flow.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AdminUserService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final ActivityService activityService;

    @Transactional(readOnly = true)
    public List<AdminUserDto> listUsers() {
        return userRepository.findAll().stream()
                .map(AdminUserDto::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public AdminUserDto getUser(UUID id) {
        return userRepository.findById(id)
                .map(AdminUserDto::from)
                .orElseThrow(() -> new AuthException("User not found"));
    }

    @Transactional
    public AdminUserDto updateUser(UUID id, UpdateUserRequest req) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AuthException("User not found"));
        Role oldRole = user.getRole();
        boolean oldActive = user.isActive();

        if (req.getFullName() != null && !req.getFullName().isBlank()) {
            user.setFullName(req.getFullName().trim());
        }
        if (req.getRole() != null && !req.getRole().isBlank()) {
            try {
                user.setRole(Role.valueOf(req.getRole().toUpperCase()));
            } catch (IllegalArgumentException ex) {
                throw new AuthException("Invalid role. Use ADMIN or ANALYST");
            }
        }
        if (req.getActive() != null) {
            user.setActive(req.getActive());
            if (!req.getActive()) {
                refreshTokenRepository.deleteAll(refreshTokenRepository.findAll().stream()
                        .filter(rt -> rt.getUser().getId().equals(id))
                        .toList());
            }
        }
        userRepository.save(user);
        log.info("Admin updated user {} (active={}, role={})", user.getEmail(), user.isActive(), user.getRole());

        String caller = currentCallerEmail();
        if (oldRole != user.getRole()) {
            activityService.record(ActivityService.ROLE_CHANGE, caller, user.getId(), user.getEmail(),
                    oldRole + " → " + user.getRole());
        }
        if (oldActive != user.isActive()) {
            activityService.record(user.isActive() ? ActivityService.ACTIVATE : ActivityService.SUSPEND,
                    caller, user.getId(), user.getEmail(), null);
        }
        if (oldRole == user.getRole() && oldActive == user.isActive()) {
            activityService.record(ActivityService.UPDATE_USER, caller, user.getId(), user.getEmail(),
                    "fullName updated");
        }
        return AdminUserDto.from(user);
    }

    @Transactional
    public void resetPassword(UUID id, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AuthException("User not found"));

        if (newPassword == null || newPassword.length() < 6) {
            throw new AuthException("Password must be at least 6 characters");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        // Revoke this user's existing refresh tokens — they must log back in
        List<RefreshToken> tokens = refreshTokenRepository.findAll().stream()
                .filter(rt -> rt.getUser().getId().equals(id))
                .toList();
        refreshTokenRepository.deleteAll(tokens);

        log.info("Admin reset password for user {}", user.getEmail());
        activityService.record(ActivityService.PASSWORD_RESET, currentCallerEmail(),
                user.getId(), user.getEmail(), "admin reset");
    }

    @Transactional
    public AdminUserDto setActive(UUID id, boolean active) {
        UpdateUserRequest req = new UpdateUserRequest();
        req.setActive(active);
        return updateUser(id, req);
    }

    @Transactional
    public void deleteUser(UUID id, String callerEmail) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new AuthException("User not found"));
        if (callerEmail != null && callerEmail.equalsIgnoreCase(user.getEmail())) {
            throw new AuthException("You cannot delete your own admin account");
        }
        // Revoke any refresh tokens this user holds before delete
        List<RefreshToken> tokens = refreshTokenRepository.findAll().stream()
                .filter(rt -> rt.getUser().getId().equals(id))
                .toList();
        refreshTokenRepository.deleteAll(tokens);
        userRepository.delete(user);
        log.info("Admin deleted user {}", user.getEmail());
        activityService.record(ActivityService.DELETE_USER, callerEmail,
                user.getId(), user.getEmail(), "permanent removal");
    }

    private static String currentCallerEmail() {
        try {
            var auth = org.springframework.security.core.context.SecurityContextHolder
                    .getContext().getAuthentication();
            return auth != null ? auth.getName() : "system";
        } catch (Exception e) {
            return "system";
        }
    }

    @Transactional(readOnly = true)
    public AdminStatsDto stats() {
        List<User> all = userRepository.findAll();
        long admins = 0, active = 0, suspended = 0;
        Map<String, Long> counts = new java.util.HashMap<>();
        for (User u : all) {
            counts.merge(u.getRole().name(), 1L, Long::sum);
            if (u.getRole() == Role.ADMIN) admins++;
            if (u.isActive()) active++; else suspended++;
        }
        return AdminStatsDto.builder()
                .totalUsers(all.size())
                .activeUsers(active)
                .suspendedUsers(suspended)
                .admins(admins)
                .roleCounts(counts)
                .build();
    }
}
