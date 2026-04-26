package ai.cognigrid.gateway.auth.service;

import ai.cognigrid.gateway.admin.service.ActivityService;
import ai.cognigrid.gateway.auth.dto.AuthResponse;
import ai.cognigrid.gateway.auth.dto.LoginRequest;
import ai.cognigrid.gateway.auth.dto.RegisterRequest;
import ai.cognigrid.gateway.auth.entity.RefreshToken;
import ai.cognigrid.gateway.auth.entity.Role;
import ai.cognigrid.gateway.auth.entity.User;
import ai.cognigrid.gateway.auth.repository.RefreshTokenRepository;
import ai.cognigrid.gateway.auth.repository.UserRepository;
import ai.cognigrid.gateway.exception.AuthException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final ActivityService activityService;

    @Value("${jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new AuthException("Email already registered");
        }

        User user = User.builder()
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role(Role.ANALYST)
                .build();

        userRepository.save(user);
        log.info("New user registered: {}", user.getEmail());

        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (Exception ex) {
            // Audit failed login attempts (helps detect brute-force attacks)
            activityService.record(ActivityService.LOGIN_FAIL, request.getEmail(),
                    null, request.getEmail(), "bad credentials");
            throw ex;
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new AuthException("User not found"));

        if (!user.isActive()) {
            activityService.record(ActivityService.LOGIN_FAIL, request.getEmail(),
                    user.getId(), user.getEmail(), "account disabled");
            throw new AuthException("Account is disabled");
        }

        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        activityService.record(ActivityService.LOGIN_OK, user.getEmail(),
                user.getId(), user.getEmail(), null);
        return buildAuthResponse(user);
    }

    @Transactional
    public AuthResponse refresh(String refreshTokenValue) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(refreshTokenValue)
                .orElseThrow(() -> new AuthException("Invalid refresh token"));

        if (refreshToken.isExpired()) {
            refreshTokenRepository.delete(refreshToken);
            throw new AuthException("Refresh token expired, please login again");
        }

        User user = refreshToken.getUser();
        String newAccessToken = jwtService.generateToken(
                Map.of("role", user.getRole().name()),
                new org.springframework.security.core.userdetails.User(
                        user.getEmail(), user.getPasswordHash(), java.util.List.of()
                )
        );

        return AuthResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(refreshTokenValue)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpirationMs() / 1000)
                .user(toUserInfo(user))
                .build();
    }

    @Transactional
    public void logout(String refreshTokenValue) {
        refreshTokenRepository.findByToken(refreshTokenValue)
                .ifPresent(refreshTokenRepository::delete);
    }

    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new AuthException("User not found"));

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new AuthException("Current password is incorrect");
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        log.info("Password changed for user: {}", email);
        activityService.record(ActivityService.PASSWORD_CHANGE, email,
                user.getId(), user.getEmail(), "self-service password change");
    }

    private AuthResponse buildAuthResponse(User user) {
        var springUser = new org.springframework.security.core.userdetails.User(
                user.getEmail(), user.getPasswordHash(), java.util.List.of()
        );

        String accessToken = jwtService.generateToken(
                Map.of("role", user.getRole().name(), "userId", user.getId().toString()),
                springUser
        );

        String refreshTokenValue = UUID.randomUUID().toString();
        RefreshToken refreshToken = RefreshToken.builder()
                .token(refreshTokenValue)
                .user(user)
                .expiresAt(LocalDateTime.now().plusSeconds(refreshExpirationMs / 1000))
                .build();
        refreshTokenRepository.save(refreshToken);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenValue)
                .tokenType("Bearer")
                .expiresIn(jwtService.getExpirationMs() / 1000)
                .user(toUserInfo(user))
                .build();
    }

    private AuthResponse.UserInfo toUserInfo(User user) {
        return AuthResponse.UserInfo.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .build();
    }
}
