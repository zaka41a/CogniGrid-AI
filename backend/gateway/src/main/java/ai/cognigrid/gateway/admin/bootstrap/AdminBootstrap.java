package ai.cognigrid.gateway.admin.bootstrap;

import ai.cognigrid.gateway.auth.entity.Role;
import ai.cognigrid.gateway.auth.entity.User;
import ai.cognigrid.gateway.auth.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Ensures a known administrator account exists at startup.
 *
 * Behaviour:
 *  • If no user with the configured admin email exists, create one with role ADMIN.
 *  • If the user already exists, only re-seed the password when {@code admin.bootstrap.force-reset=true}.
 *
 * The default credentials (admin@gmail.com / admin4321) are intended for the
 * student/HiWi single-tenant deployment. Override via env vars in production.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class AdminBootstrap implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${admin.bootstrap.email:admin@gmail.com}")
    private String adminEmail;

    @Value("${admin.bootstrap.password:admin4321}")
    private String adminPassword;

    @Value("${admin.bootstrap.full-name:Platform Administrator}")
    private String adminFullName;

    @Value("${admin.bootstrap.force-reset:false}")
    private boolean forceReset;

    @Override
    @Transactional
    public void run(String... args) {
        userRepository.findByEmail(adminEmail).ifPresentOrElse(
                existing -> {
                    boolean changed = false;
                    if (existing.getRole() != Role.ADMIN) {
                        existing.setRole(Role.ADMIN);
                        changed = true;
                    }
                    if (!existing.isActive()) {
                        existing.setActive(true);
                        changed = true;
                    }
                    if (forceReset) {
                        existing.setPasswordHash(passwordEncoder.encode(adminPassword));
                        changed = true;
                        log.warn("[bootstrap] Force-reset admin password for {}", adminEmail);
                    }
                    if (changed) {
                        userRepository.save(existing);
                        log.info("[bootstrap] Refreshed admin account {}", adminEmail);
                    }
                },
                () -> {
                    User admin = User.builder()
                            .email(adminEmail)
                            .passwordHash(passwordEncoder.encode(adminPassword))
                            .fullName(adminFullName)
                            .role(Role.ADMIN)
                            .isActive(true)
                            .build();
                    userRepository.save(admin);
                    log.info("[bootstrap] Created default admin account {}", adminEmail);
                }
        );
    }
}
