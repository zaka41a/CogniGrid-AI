package ai.cognigrid.gateway.admin.service;

import ai.cognigrid.gateway.admin.entity.ActivityEvent;
import ai.cognigrid.gateway.admin.repository.ActivityEventRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

/**
 * Records audit events. Each call is best-effort and isolated in its own
 * transaction so a failure here never blocks the parent business operation.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityService {

    public static final String LOGIN_OK         = "LOGIN_OK";
    public static final String LOGIN_FAIL       = "LOGIN_FAIL";
    public static final String PASSWORD_RESET   = "PASSWORD_RESET";
    public static final String PASSWORD_CHANGE  = "PASSWORD_CHANGE";
    public static final String ROLE_CHANGE      = "ROLE_CHANGE";
    public static final String SUSPEND          = "SUSPEND";
    public static final String ACTIVATE         = "ACTIVATE";
    public static final String DELETE_USER      = "DELETE_USER";
    public static final String UPDATE_USER      = "UPDATE_USER";

    private final ActivityEventRepository repo;
    /** Optional — current request, only present when called from a web context. */
    private final ObjectProvider<HttpServletRequest> requestProvider;

    @Transactional
    public void record(String type, String actorEmail, UUID targetId,
                       String targetEmail, String detail) {
        try {
            HttpServletRequest req = requestProvider.getIfAvailable();
            String ip = req != null ? extractIp(req) : null;
            ActivityEvent ev = ActivityEvent.builder()
                    .actorEmail(actorEmail != null ? actorEmail : "anonymous")
                    .targetId(targetId)
                    .targetEmail(targetEmail)
                    .type(type)
                    .detail(detail)
                    .ipAddress(ip)
                    .build();
            repo.save(ev);
        } catch (Exception e) {  // Audit logging must never fail the parent flow
            log.warn("Failed to record activity event {}: {}", type, e.getMessage());
        }
    }

    private static String extractIp(HttpServletRequest req) {
        // X-Forwarded-For when running behind a proxy, otherwise remoteAddr.
        String fwd = req.getHeader("X-Forwarded-For");
        if (fwd != null && !fwd.isBlank()) {
            return fwd.split(",")[0].trim();
        }
        return req.getRemoteAddr();
    }
}
