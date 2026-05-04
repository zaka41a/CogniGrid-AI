package ai.cognigrid.gateway.system.controller;

import ai.cognigrid.gateway.system.dto.SystemHealthDto;
import ai.cognigrid.gateway.system.service.SystemHealthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/system")
@RequiredArgsConstructor
@Tag(name = "System", description = "Platform health and observability")
public class SystemHealthController {

    private final SystemHealthService systemHealthService;

    @GetMapping("/health")
    @Operation(summary = "Aggregated health of all microservices and core infrastructure")
    public ResponseEntity<SystemHealthDto> health() {
        return ResponseEntity.ok(systemHealthService.getHealth());
    }
}
